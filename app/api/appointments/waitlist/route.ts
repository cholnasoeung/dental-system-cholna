import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import type { PatientProfile } from "@/lib/clinic-types";
import { createWaitlistEntry, listWaitlistEntries } from "@/lib/appointments";
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
    return NextResponse.json(await listWaitlistEntries(db));
  } catch (error) {
    console.error("GET /api/appointments/waitlist failed", error);
    return errorResponse("Failed to load appointment waitlist.", error);
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
    const patient = await db.collection("patients").findOne({ _id: new ObjectId(patientId) });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found." }, { status: 404 });
    }

    const waitlistEntry = await createWaitlistEntry(db, {
      patientId,
      patientName: (patient as unknown as PatientProfile).fullName,
      branchId: typeof payload.branchId === "string" ? payload.branchId : "main-branch",
      preferredDate: typeof payload.preferredDate === "string" ? payload.preferredDate : "",
      preferredStartTime: typeof payload.preferredStartTime === "string" ? payload.preferredStartTime : "09:00",
      priority: payload.priority === "urgent" ? "urgent" : "normal",
      procedureIds: Array.isArray(payload.procedureIds) ? payload.procedureIds.map(String) : [],
      notes: typeof payload.notes === "string" ? payload.notes : "",
    });

    return NextResponse.json(waitlistEntry, { status: 201 });
  } catch (error) {
    console.error("POST /api/appointments/waitlist failed", error);
    return errorResponse("Failed to save waitlist entry.", error);
  }
}
