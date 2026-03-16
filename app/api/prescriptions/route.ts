import { NextResponse } from "next/server";

import type { Prescription } from "@/lib/clinic-types";
import { getDatabase } from "@/lib/mongodb";

type PrescriptionDocument = Omit<Prescription, "id"> & {
  _id?: string;
};

function serializePrescription(
  prescription: PrescriptionDocument & { _id: unknown },
): Prescription {
  return {
    id: String(prescription._id),
    patientId: prescription.patientId,
    patientName: prescription.patientName,
    linkedRecordId: prescription.linkedRecordId,
    linkedVisitDate: prescription.linkedVisitDate,
    linkedTreatment: prescription.linkedTreatment,
    prescribedDate: prescription.prescribedDate,
    medications: prescription.medications ?? [],
    notes: prescription.notes,
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
    const prescriptions = await db
      .collection<PrescriptionDocument>("prescriptions")
      .find({})
      .sort({ prescribedDate: -1, _id: -1 })
      .toArray();

    return NextResponse.json(
      prescriptions.map((prescription) =>
        serializePrescription(
          prescription as PrescriptionDocument & { _id: unknown },
        ),
      ),
    );
  } catch (error) {
    console.error("GET /api/prescriptions failed", error);
    return errorResponse("Failed to load prescriptions from MongoDB.", error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Omit<Prescription, "id">;
    const db = await getDatabase();
    const result = await db
      .collection<Omit<Prescription, "id">>("prescriptions")
      .insertOne(payload);

    return NextResponse.json(
      {
        id: String(result.insertedId),
        ...payload,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/prescriptions failed", error);
    return errorResponse("Failed to save prescription to MongoDB.", error);
  }
}
