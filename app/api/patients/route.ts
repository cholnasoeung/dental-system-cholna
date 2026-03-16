import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/mongodb";
import type { PatientProfile } from "@/lib/clinic-types";

type PatientDocument = Omit<PatientProfile, "id"> & {
  _id?: string;
};

function serializePatient(patient: PatientDocument & { _id: unknown }): PatientProfile {
  return {
    id: String(patient._id),
    fullName: patient.fullName,
    dateOfBirth: patient.dateOfBirth,
    gender: patient.gender,
    phone: patient.phone,
    email: patient.email,
    address: patient.address,
    occupation: patient.occupation,
    emergencyContactName: patient.emergencyContactName,
    emergencyContactRelation: patient.emergencyContactRelation,
    emergencyContactPhone: patient.emergencyContactPhone,
    medicalHistory: patient.medicalHistory,
    allergies: patient.allergies,
    insuranceProvider: patient.insuranceProvider,
    policyNumber: patient.policyNumber,
    insuranceExpiry: patient.insuranceExpiry,
    documents: patient.documents ?? [],
    xrays: patient.xrays ?? [],
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
    const patients = await db
      .collection<PatientDocument>("patients")
      .find({})
      .sort({ _id: -1 })
      .toArray();

    return NextResponse.json(
      patients.map((patient) =>
        serializePatient(patient as PatientDocument & { _id: unknown }),
      ),
    );
  } catch (error) {
    console.error("GET /api/patients failed", error);
    return errorResponse("Failed to load patients from MongoDB.", error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Omit<PatientProfile, "id">;
    const db = await getDatabase();
    const result = await db
      .collection<Omit<PatientProfile, "id">>("patients")
      .insertOne(payload);

    return NextResponse.json(
      {
        id: String(result.insertedId),
        ...payload,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/patients failed", error);
    return errorResponse("Failed to save patient to MongoDB.", error);
  }
}
