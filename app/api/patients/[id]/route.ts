import oracledb from "oracledb";
import { NextResponse } from "next/server";

import type { PatientProfile, UploadedFile } from "@/lib/clinic-types";
import { withOracleConnection } from "@/lib/oracle";

type PatientRow = {
  ID: number;
  FULL_NAME: string;
  DATE_OF_BIRTH: Date | string | null;
  GENDER: string | null;
  PHONE: string | null;
  EMAIL: string | null;
  ADDRESS: string | null;
  EMERGENCY_CONTACT_NAME: string | null;
  EMERGENCY_CONTACT_PHONE: string | null;
  MEDICAL_NOTES: string | null;
};

type PatientMetadata = {
  occupation?: string;
  emergencyContactRelation?: string;
  medicalHistory?: string;
  allergies?: string;
  insuranceProvider?: string;
  policyNumber?: string;
  insuranceExpiry?: string;
  documents?: UploadedFile[];
  xrays?: UploadedFile[];
};

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function formatDate(value: Date | string | null) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value.includes("T") ? value.slice(0, 10) : value;
  }

  return value.toISOString().slice(0, 10);
}

function serializePatient(row: PatientRow): PatientProfile {
  const metadata = parseJson<PatientMetadata>(row.MEDICAL_NOTES, {});

  return {
    id: String(row.ID),
    fullName: row.FULL_NAME,
    dateOfBirth: formatDate(row.DATE_OF_BIRTH),
    gender: row.GENDER ?? "",
    phone: row.PHONE ?? "",
    email: row.EMAIL ?? "",
    address: row.ADDRESS ?? "",
    occupation: metadata.occupation ?? "",
    emergencyContactName: row.EMERGENCY_CONTACT_NAME ?? "",
    emergencyContactRelation: metadata.emergencyContactRelation ?? "",
    emergencyContactPhone: row.EMERGENCY_CONTACT_PHONE ?? "",
    medicalHistory: metadata.medicalHistory ?? "",
    allergies: metadata.allergies ?? "",
    insuranceProvider: metadata.insuranceProvider ?? "",
    policyNumber: metadata.policyNumber ?? "",
    insuranceExpiry: metadata.insuranceExpiry ?? "",
    documents: metadata.documents ?? [],
    xrays: metadata.xrays ?? [],
  };
}

function buildPatientMetadata(payload: Partial<Omit<PatientProfile, "id">>, existing: PatientProfile) {
  return JSON.stringify({
    occupation: payload.occupation ?? existing.occupation,
    emergencyContactRelation: payload.emergencyContactRelation ?? existing.emergencyContactRelation,
    medicalHistory: payload.medicalHistory ?? existing.medicalHistory,
    allergies: payload.allergies ?? existing.allergies,
    insuranceProvider: payload.insuranceProvider ?? existing.insuranceProvider,
    policyNumber: payload.policyNumber ?? existing.policyNumber,
    insuranceExpiry: payload.insuranceExpiry ?? existing.insuranceExpiry,
    documents: payload.documents ?? existing.documents,
    xrays: payload.xrays ?? existing.xrays,
  } satisfies PatientMetadata);
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

async function loadPatientById(id: string) {
  const numericId = Number(id);

  if (!Number.isFinite(numericId)) {
    return null;
  }

  const result = await withOracleConnection((connection) =>
    connection.execute<PatientRow>(
      `
        SELECT
          ID,
          FULL_NAME,
          DATE_OF_BIRTH,
          GENDER,
          PHONE,
          EMAIL,
          ADDRESS,
          EMERGENCY_CONTACT_NAME,
          EMERGENCY_CONTACT_PHONE,
          MEDICAL_NOTES
        FROM PATIENTS
        WHERE ID = :id
      `,
      { id: numericId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    ),
  );

  const row = result.rows?.[0];
  return row ? serializePatient(row) : null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const patient = await loadPatientById(id);

    if (!patient) {
      return NextResponse.json({ error: "Patient not found." }, { status: 404 });
    }

    return NextResponse.json(patient);
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
    const existing = await loadPatientById(id);

    if (!existing) {
      return NextResponse.json({ error: "Patient not found." }, { status: 404 });
    }

    await withOracleConnection((connection) =>
      connection.execute(
        `
          UPDATE PATIENTS
          SET
            FULL_NAME = :fullName,
            DATE_OF_BIRTH = CASE
              WHEN :dateOfBirth = '' THEN NULL
              ELSE TO_DATE(:dateOfBirth, 'YYYY-MM-DD')
            END,
            GENDER = :gender,
            PHONE = :phone,
            EMAIL = :email,
            ADDRESS = :address,
            EMERGENCY_CONTACT_NAME = :emergencyContactName,
            EMERGENCY_CONTACT_PHONE = :emergencyContactPhone,
            MEDICAL_NOTES = :medicalNotes,
            UPDATED_AT = CURRENT_TIMESTAMP
          WHERE ID = :id
        `,
        {
          id: Number(id),
          fullName: payload.fullName ?? existing.fullName,
          dateOfBirth: payload.dateOfBirth ?? existing.dateOfBirth,
          gender: payload.gender ?? existing.gender,
          phone: payload.phone ?? existing.phone,
          email: payload.email ?? existing.email,
          address: payload.address ?? existing.address,
          emergencyContactName: payload.emergencyContactName ?? existing.emergencyContactName,
          emergencyContactPhone: payload.emergencyContactPhone ?? existing.emergencyContactPhone,
          medicalNotes: buildPatientMetadata(payload, existing),
        },
        { autoCommit: true },
      ),
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

    await withOracleConnection((connection) =>
      connection.execute(
        `DELETE FROM PATIENTS WHERE ID = :id`,
        { id: Number(id) },
        { autoCommit: true },
      ),
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/patients/[id] failed", error);
    return errorResponse("Failed to delete patient profile.", error);
  }
}
