import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import type { Appointment, NotificationRecord, PatientProfile, StaffMember } from "@/lib/clinic-types";
import { getDatabase } from "@/lib/mongodb";
import {
  AppointmentDocument,
  appendStatusHistory,
  buildAppointmentPayload,
  createWaitlistEntry,
  detectAppointmentConflicts,
  expandRecurringAppointments,
  generateAppointmentId,
  getNextWalkInQueueNumber,
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

async function queueAppointmentNotifications(
  appointments: Appointment[],
  patient: PatientProfile,
) {
  const payloads: Omit<NotificationRecord, "id">[] = [];

  for (const appointment of appointments) {
    if (appointment.reminderDate && patient.communicationPreferences.appointmentReminders) {
      if (patient.phone) {
        payloads.push({
          patientId: patient.id,
          patientName: patient.fullName,
          category: "appointment-reminder",
          channel: appointment.reminderChannel === "email" ? "email" : "sms",
          recipient: appointment.reminderChannel === "email" ? patient.email : patient.phone,
          subject: "Appointment Reminder",
          message: `Reminder for ${patient.fullName}: your visit is scheduled on ${appointment.date} at ${appointment.startTime}.`,
          scheduledFor: appointment.reminderDate,
          status: "queued",
          relatedAppointmentId: appointment.id,
          relatedInvoiceId: "",
        });
      }
    }

    if (appointment.status === "confirmed") {
      if (patient.phone) {
        payloads.push({
          patientId: patient.id,
          patientName: patient.fullName,
          category: "appointment-confirmation",
          channel: "sms",
          recipient: patient.phone,
          subject: "Appointment Confirmed",
          message: `Your appointment is confirmed for ${appointment.date} at ${appointment.startTime}.`,
          scheduledFor: new Date().toISOString(),
          status: "queued",
          relatedAppointmentId: appointment.id,
          relatedInvoiceId: "",
        });
      }
      if (patient.email) {
        payloads.push({
          patientId: patient.id,
          patientName: patient.fullName,
          category: "appointment-confirmation",
          channel: "email",
          recipient: patient.email,
          subject: "Appointment Confirmed",
          message: `Your appointment is confirmed for ${appointment.date} at ${appointment.startTime}.`,
          scheduledFor: new Date().toISOString(),
          status: "queued",
          relatedAppointmentId: appointment.id,
          relatedInvoiceId: "",
        });
      }
    }
  }

  if (payloads.length === 0) {
    return;
  }

  const db = await getDatabase();
  await db.collection<Omit<NotificationRecord, "id">>("notifications").insertMany(payloads);
}

export async function GET() {
  try {
    const db = await getDatabase();
    const appointments = await db
      .collection<AppointmentDocument>("appointments")
      .find({})
      .sort({ date: 1, startTime: 1, time: 1, _id: -1 })
      .toArray();

    return NextResponse.json(appointments.map((appointment) => serializeAppointment(appointment)));
  } catch (error) {
    console.error("GET /api/appointments failed", error);
    return errorResponse("Failed to load appointments from MongoDB.", error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const patientId = typeof payload.patientId === "string" ? payload.patientId.trim() : "";
    if (!patientId) {
      return NextResponse.json({ error: "Patient is required." }, { status: 400 });
    }

    const db = await getDatabase();
    const [patient, staffMembers, existingAppointments] = await Promise.all([
      db.collection("patients").findOne({ _id: new ObjectId(patientId) }),
      db.collection<Omit<StaffMember, "id"> & { _id?: ObjectId }>("staff").find({}).toArray(),
      db.collection<AppointmentDocument>("appointments").find({}).toArray(),
    ]);

    if (!patient) {
      return NextResponse.json({ error: "Patient was not found." }, { status: 404 });
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

    const appointmentId = await generateAppointmentId(db);
    const baseAppointment = buildAppointmentPayload({
      payload,
      appointmentId,
      patient: { ...(patient as unknown as PatientProfile), id: patientId },
      staffMembers: serializedStaff,
    });

    if (baseAppointment.queueMode === "waitlist") {
      const waitlistEntry = await createWaitlistEntry(db, {
        patientId: baseAppointment.patientId,
        patientName: baseAppointment.patientName,
        branchId: baseAppointment.branchId,
        preferredDate: baseAppointment.date,
        preferredStartTime: baseAppointment.startTime,
        priority: baseAppointment.priority,
        procedureIds: baseAppointment.procedures.map((procedure) => procedure.procedureId),
        notes: baseAppointment.notes,
      });

      return NextResponse.json({ mode: "waitlist", waitlistEntry }, { status: 201 });
    }

    const scheduledAppointments = existingAppointments.map((appointment) => serializeAppointment(appointment));
    const recurringAppointments = expandRecurringAppointments(baseAppointment);
    const preparedAppointments: Appointment[] = [];

    for (const item of recurringAppointments) {
      const nextAppointmentId = item.appointmentId || (await generateAppointmentId(db));
      const nextAppointment = serializeAppointment({
        ...item,
        appointmentId: nextAppointmentId,
        queueNumber:
          item.queueMode === "walk-in"
            ? await getNextWalkInQueueNumber(db, item.date)
            : null,
      });
      const conflicts = detectAppointmentConflicts({
        candidate: nextAppointment,
        appointments: [...scheduledAppointments, ...preparedAppointments],
        staffMembers: serializedStaff,
      });

      if (conflicts.length > 0 && !nextAppointment.overbookingApproved) {
        return NextResponse.json(
          {
            error: "Appointment conflicts detected.",
            conflicts,
            suggestedQueueMode: "waitlist",
          },
          { status: 409 },
        );
      }

      preparedAppointments.push({
        ...nextAppointment,
        conflicts,
        statusHistory: appendStatusHistory(
          nextAppointment,
          nextAppointment.status,
          "Clinic staff",
          conflicts.length > 0 ? "Booked with override" : "Appointment created",
        ),
      });
    }

    const result = await db.collection<Omit<Appointment, "id">>("appointments").insertMany(
      preparedAppointments.map((appointment) => {
        const nextAppointment = { ...appointment } as Partial<Appointment>;
        delete nextAppointment.id;
        return nextAppointment as Omit<Appointment, "id">;
      }),
    );
    const insertedAppointments = preparedAppointments.map((appointment, index) => ({
      ...appointment,
      id: String(Object.values(result.insertedIds)[index]),
    }));

    await queueAppointmentNotifications(insertedAppointments, {
      ...(patient as unknown as PatientProfile),
      id: patientId,
    });

    return NextResponse.json(
      {
        mode: "booked",
        appointments: insertedAppointments,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/appointments failed", error);
    return errorResponse("Failed to save appointment to MongoDB.", error);
  }
}
