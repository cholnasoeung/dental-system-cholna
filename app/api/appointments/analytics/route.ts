import { NextResponse } from "next/server";

import { AppointmentDocument, buildAppointmentAnalytics, serializeAppointment } from "@/lib/appointments";
import { getDatabase } from "@/lib/mongodb";

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
    const appointments = await db.collection<AppointmentDocument>("appointments").find({}).toArray();
    return NextResponse.json(buildAppointmentAnalytics(appointments.map((appointment) => serializeAppointment(appointment))));
  } catch (error) {
    console.error("GET /api/appointments/analytics failed", error);
    return errorResponse("Failed to load appointment analytics.", error);
  }
}
