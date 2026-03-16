import { NextResponse } from "next/server";

import type { DentalRecord } from "@/lib/clinic-types";
import { getDatabase } from "@/lib/mongodb";

type DentalRecordDocument = Omit<DentalRecord, "id"> & {
  _id?: string;
};

function serializeDentalRecord(
  record: DentalRecordDocument & { _id: unknown },
): DentalRecord {
  return {
    id: String(record._id),
    patientId: record.patientId,
    patientName: record.patientName,
    visitDate: record.visitDate,
    chiefComplaint: record.chiefComplaint,
    consultationNotes: record.consultationNotes,
    diagnoses: record.diagnoses,
    treatmentPlan: record.treatmentPlan,
    procedureHistory: record.procedureHistory,
    clinicalAttachments: record.clinicalAttachments ?? [],
    odontogram: record.odontogram ?? [],
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const db = await getDatabase();
    const records = await db
      .collection<DentalRecordDocument>("emr_records")
      .find(patientId ? { patientId } : {})
      .sort({ visitDate: -1, _id: -1 })
      .toArray();

    return NextResponse.json(
      records.map((record) =>
        serializeDentalRecord(record as DentalRecordDocument & { _id: unknown }),
      ),
    );
  } catch (error) {
    console.error("GET /api/emr failed", error);
    return errorResponse("Failed to load EMR records from MongoDB.", error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Omit<DentalRecord, "id">;
    const db = await getDatabase();
    const result = await db
      .collection<Omit<DentalRecord, "id">>("emr_records")
      .insertOne(payload);

    return NextResponse.json(
      {
        id: String(result.insertedId),
        ...payload,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/emr failed", error);
    return errorResponse("Failed to save EMR record to MongoDB.", error);
  }
}
