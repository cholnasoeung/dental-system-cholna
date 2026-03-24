import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/mongodb";
import {
  buildPatientDuplicateCandidates,
  serializePatient,
  type PatientDocument,
} from "@/lib/patients";

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
    const patients = await db.collection<PatientDocument>("patients").find({}).toArray();
    const serialized = patients.map((patient) => serializePatient(patient, { notesTimeline: [] }));
    const duplicates = serialized
      .map((patient) => ({
        patientId: patient.id,
        fullName: patient.fullName,
        patientCode: patient.patientId,
        duplicateCandidates: buildPatientDuplicateCandidates(patient, serialized),
      }))
      .filter((item) => item.duplicateCandidates.length > 0);

    return NextResponse.json(duplicates);
  } catch (error) {
    console.error("GET /api/patients/duplicates failed", error);
    return errorResponse("Failed to detect duplicate patients.", error);
  }
}
