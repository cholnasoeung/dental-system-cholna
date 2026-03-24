import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import type { Appointment, NotificationRecord, PatientProfile, StaffMember } from "@/lib/clinic-types";
import { getDatabase } from "@/lib/mongodb";
import {
  AppointmentDocument,
  appendStatusHistory,
  buildAppointmentPayload,
  detectAppointmentConflicts,
  ensureAppointmentCompletionArtifacts,
  promoteWaitlistForCancelledAppointment,
  serializeAppointment,
} from "@/lib/appointments";

function errorResponse(message: string, error: unknown) {
  return NextResponse.json(
    {
      error: message,
      details:
        process.env.NODE_ENV === "development"
          ? error instanceof Error
            ? error.message
            : String(error)
          : undefined,
    },
    { status: 500 },
  );
}

async function queueStatusNotification(
  appointment: Appointment,
  patient: PatientProfile,
  category: NotificationRecord["category"],
  subject: string,
  message: string,
) {
  const payloads: Omit<NotificationRecord, "id">[] = [];

  if (patient.phone) {
    payloads.push({
      patientId: patient.id,
      patientName: patient.fullName,
      category,
      channel: "sms",
      recipient: patient.phone,
      subject,
      message,
      scheduledFor: new Date().toISOString(),
      status: "queued",
      relatedAppointmentId: appointment.id,
      relatedInvoiceId: appointment.linkedInvoiceId,
    });
  }

  if (patient.email) {
    payloads.push({
      patientId: patient.id,
      patientName: patient.fullName,
      category,
      channel: "email",
      recipient: patient.email,
      subject,
      message,
      scheduledFor: new Date().toISOString(),
      status: "queued",
      relatedAppointmentId: appointment.id,
      relatedInvoiceId: appointment.linkedInvoiceId,
    });
  }

  if (payloads.length === 0) {
    return;
  }

  const db = await getDatabase();
  await db.collection<Omit<NotificationRecord, "id">>("notifications").insertMany(payloads);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as Record<string, unknown>;
    const db = await getDatabase();

    const [existingAppointment, staffMembers] = await Promise.all([
      db.collection<AppointmentDocument>("appointments").findOne({ _id: new ObjectId(id) }),
      db.collection<Omit<StaffMember, "id"> & { _id?: ObjectId }>("staff").find({}).toArray(),
    ]);

    if (!existingAppointment) {
      return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
    }

    const currentAppointment = serializeAppointment(existingAppointment);
    const patient = await db.collection("patients").findOne({ _id: new ObjectId(currentAppointment.patientId) });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found." }, { status: 404 });
    }

    const serializedStaff = staffMembers.map((member) => ({
      id: String(member._id),
      fullName: member.fullName,
      role: member.role,
      email: member.email,
      phone: member.phone,
      permissions: member.permissions ?? [],
      skills: member.skills ?? [],
      schedule: member.schedule ?? [],
      availabilityStatus: member.availabilityStatus,
    })) satisfies StaffMember[];

    let nextAppointment = buildAppointmentPayload({
      payload,
      appointmentId: currentAppointment.appointmentId,
      patient: { ...(patient as unknown as PatientProfile), id: currentAppointment.patientId },
      staffMembers: serializedStaff,
      existing: currentAppointment,
    });

    const nextStatus = nextAppointment.status;
    const requiresConflictCheck =
      payload.date !== undefined ||
      payload.startTime !== undefined ||
      payload.time !== undefined ||
      payload.dentistId !== undefined ||
      payload.chairId !== undefined ||
      payload.procedureIds !== undefined;

    if (requiresConflictCheck) {
      const allAppointments = await db.collection<AppointmentDocument>("appointments").find({}).toArray();
      const conflicts = detectAppointmentConflicts({
        candidate: nextAppointment,
        appointments: allAppointments.map((appointment) => serializeAppointment(appointment)),
        staffMembers: serializedStaff,
      });

      if (conflicts.length > 0 && !nextAppointment.overbookingApproved) {
        return NextResponse.json(
          { error: "Appointment conflicts detected.", conflicts },
          { status: 409 },
        );
      }

      nextAppointment = {
        ...nextAppointment,
        conflicts,
      };
    }

    if (nextStatus === "completed" && currentAppointment.status !== "completed") {
      const artifacts = await ensureAppointmentCompletionArtifacts(db, {
        ...nextAppointment,
        id,
      });
      nextAppointment = {
        ...nextAppointment,
        actualCost: nextAppointment.actualCost ?? nextAppointment.estimatedCost,
        linkedRecordId: artifacts.linkedRecordId,
        linkedInvoiceId: artifacts.linkedInvoiceId,
      };
    }

    nextAppointment = {
      ...nextAppointment,
      statusHistory: appendStatusHistory(
        currentAppointment,
        nextStatus,
        "Clinic staff",
        typeof payload.statusNote === "string" ? payload.statusNote : "",
      ),
      updatedAt: new Date().toISOString(),
    };

    await db.collection<Omit<Appointment, "id">>("appointments").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...nextAppointment,
          id: undefined,
        },
      },
    );

    let promotedAppointment: Appointment | null = null;
    if (nextStatus === "canceled" && currentAppointment.status !== "canceled") {
      promotedAppointment = await promoteWaitlistForCancelledAppointment(
        db,
        { ...nextAppointment, id },
        serializedStaff,
      );
    }

    if (nextStatus === "no-show" && currentAppointment.status !== "no-show") {
      await queueStatusNotification(
        { ...nextAppointment, id },
        { ...(patient as unknown as PatientProfile), id: currentAppointment.patientId },
        "appointment-missed",
        "Missed Appointment",
        `We missed you on ${nextAppointment.date} at ${nextAppointment.startTime}. Please contact the clinic to reschedule.`,
      );
    }

    if (nextStatus === "confirmed" && currentAppointment.status !== "confirmed") {
      await queueStatusNotification(
        { ...nextAppointment, id },
        { ...(patient as unknown as PatientProfile), id: currentAppointment.patientId },
        "appointment-confirmation",
        "Appointment Confirmed",
        `Your appointment is confirmed for ${nextAppointment.date} at ${nextAppointment.startTime}.`,
      );
    }

    if (promotedAppointment) {
      const promotedPatient = await db.collection("patients").findOne({
        _id: new ObjectId(promotedAppointment.patientId),
      });
      if (promotedPatient) {
        await queueStatusNotification(
          promotedAppointment,
          { ...(promotedPatient as unknown as PatientProfile), id: promotedAppointment.patientId },
          "appointment-confirmation",
          "Appointment Slot Opened",
          `A cancellation opened a slot on ${promotedAppointment.date} at ${promotedAppointment.startTime}. Your waitlist request is now booked.`,
        );
      }
    }

    return NextResponse.json({
      appointment: {
        ...nextAppointment,
        id,
      },
      promotedAppointment,
    });
  } catch (error) {
    console.error("PATCH /api/appointments/[id] failed", error);
    return errorResponse("Failed to update appointment.", error);
  }
}
