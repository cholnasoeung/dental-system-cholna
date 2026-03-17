import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import type { PatientProfile } from "@/lib/clinic-types";
import { getDatabase } from "@/lib/mongodb";

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

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const db = await getDatabase();
    const patient = await db.collection("patients").findOne({ _id: new ObjectId(id) });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found." }, { status: 404 });
    }

    return NextResponse.json(
      serializePatient(patient as unknown as PatientDocument & { _id: unknown }),
    );
  } catch (error) {
    console.error("GET /api/patients/[id] failed", error);
    return errorResponse("Failed to load patient profile.", error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as Partial<Omit<PatientProfile, "id">>;
    const db = await getDatabase();

    await db.collection("patients").updateOne(
      { _id: new ObjectId(id) },
      { $set: payload },
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/patients/[id] failed", error);
    return errorResponse("Failed to update patient profile.", error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const db = await getDatabase();

    await db.collection("patients").deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/patients/[id] failed", error);
    return errorResponse("Failed to delete patient profile.", error);
  }
}
