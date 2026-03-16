import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/mongodb";
import type { Appointment } from "@/lib/clinic-types";

type AppointmentDocument = Omit<Appointment, "id"> & {
  _id?: string;
};

function serializeAppointment(
  appointment: AppointmentDocument & { _id: unknown },
): Appointment {
  return {
    id: String(appointment._id),
    patientId: appointment.patientId,
    patientName: appointment.patientName,
    dentist: appointment.dentist,
    date: appointment.date,
    time: appointment.time,
    reason: appointment.reason,
    status: appointment.status,
    reminderDate: appointment.reminderDate,
    reminderChannel: appointment.reminderChannel,
    followUpDate: appointment.followUpDate,
    notes: appointment.notes,
  };
}

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

export async function GET() {
  try {
    const db = await getDatabase();
    const appointments = await db
      .collection<AppointmentDocument>("appointments")
      .find({})
      .sort({ date: 1, time: 1, _id: -1 })
      .toArray();

    return NextResponse.json(
      appointments.map((appointment) =>
        serializeAppointment(appointment as AppointmentDocument & { _id: unknown }),
      ),
    );
  } catch (error) {
    console.error("GET /api/appointments failed", error);
    return errorResponse("Failed to load appointments from MongoDB.", error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Omit<Appointment, "id">;
    const db = await getDatabase();
    const result = await db
      .collection<Omit<Appointment, "id">>("appointments")
      .insertOne(payload);

    return NextResponse.json(
      {
        id: String(result.insertedId),
        ...payload,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/appointments failed", error);
    return errorResponse("Failed to save appointment to MongoDB.", error);
  }
}
