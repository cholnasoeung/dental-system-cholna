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

function buildPatientMetadata(payload: Omit<PatientProfile, "id">) {
  return JSON.stringify({
    occupation: payload.occupation,
    emergencyContactRelation: payload.emergencyContactRelation,
    medicalHistory: payload.medicalHistory,
    allergies: payload.allergies,
    insuranceProvider: payload.insuranceProvider,
    policyNumber: payload.policyNumber,
    insuranceExpiry: payload.insuranceExpiry,
    documents: payload.documents,
    xrays: payload.xrays,
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

export async function GET() {
  try {
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
          ORDER BY ID DESC
        `,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      ),
    );

    return NextResponse.json((result.rows ?? []).map(serializePatient));
  } catch (error) {
    console.error("GET /api/patients failed", error);
    return errorResponse("Failed to load patients from Oracle.", error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Omit<PatientProfile, "id">;

    const result = await withOracleConnection((connection) =>
      connection.execute<{ ID: number }>(
        `
          INSERT INTO PATIENTS (
            FULL_NAME,
            DATE_OF_BIRTH,
            GENDER,
            PHONE,
            EMAIL,
            ADDRESS,
            EMERGENCY_CONTACT_NAME,
            EMERGENCY_CONTACT_PHONE,
            MEDICAL_NOTES,
            UPDATED_AT
          ) VALUES (
            :fullName,
            CASE
              WHEN :dateOfBirth = '' THEN NULL
              ELSE TO_DATE(:dateOfBirth, 'YYYY-MM-DD')
            END,
            :gender,
            :phone,
            :email,
            :address,
            :emergencyContactName,
            :emergencyContactPhone,
            :medicalNotes,
            CURRENT_TIMESTAMP
          )
          RETURNING ID INTO :id
        `,
        {
          fullName: payload.fullName,
          dateOfBirth: payload.dateOfBirth,
          gender: payload.gender,
          phone: payload.phone,
          email: payload.email,
          address: payload.address,
          emergencyContactName: payload.emergencyContactName,
          emergencyContactPhone: payload.emergencyContactPhone,
          medicalNotes: buildPatientMetadata(payload),
          id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        },
        { autoCommit: true, outFormat: oracledb.OUT_FORMAT_OBJECT },
      ),
    );

    const insertedId = (result.outBinds?.id as number[] | undefined)?.[0];

    return NextResponse.json(
      {
        id: insertedId ? String(insertedId) : "",
        ...payload,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/patients failed", error);
    return errorResponse("Failed to save patient to Oracle.", error);
  }
}
