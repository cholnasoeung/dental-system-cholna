import oracledb from "oracledb";
import { NextResponse } from "next/server";

import type { ClinicalAttachment, DentalRecord, OdontogramTooth } from "@/lib/clinic-types";
import { withOracleConnection } from "@/lib/oracle";

type EmrRow = {
  ID: number;
  PATIENT_ID: number;
  DIAGNOSIS: string | null;
  TREATMENT_PLAN: string | null;
  CLINICAL_NOTES: string | null;
  RECORD_DATE: Date | string | null;
};

type EmrMetadata = {
  patientName?: string;
  chiefComplaint?: string;
  consultationNotes?: string;
  treatmentStep?: string;
  treatmentStatus?: DentalRecord["treatmentStatus"];
  procedureHistory?: string;
  clinicalAttachments?: ClinicalAttachment[];
  odontogram?: OdontogramTooth[];
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

function normalizeTooth(tooth: OdontogramTooth): OdontogramTooth {
  return {
    toothNumber: tooth.toothNumber,
    condition: tooth.condition,
    notes: tooth.notes ?? "",
    treatmentProcess: tooth.treatmentProcess ?? "",
    treatmentStatus: tooth.treatmentStatus ?? "planned",
    billableTreatmentId: tooth.billableTreatmentId ?? "",
    billableUnitPrice: tooth.billableUnitPrice ?? null,
  };
}

function serializeRecord(row: EmrRow): DentalRecord {
  const metadata = parseJson<EmrMetadata>(row.CLINICAL_NOTES, {});

  return {
    id: String(row.ID),
    patientId: String(row.PATIENT_ID),
    patientName: metadata.patientName ?? "",
    visitDate: formatDate(row.RECORD_DATE),
    chiefComplaint: metadata.chiefComplaint ?? "",
    consultationNotes: metadata.consultationNotes ?? "",
    diagnoses: row.DIAGNOSIS ?? "",
    treatmentPlan: row.TREATMENT_PLAN ?? "",
    treatmentStep: metadata.treatmentStep ?? "",
    treatmentStatus: metadata.treatmentStatus ?? "planned",
    procedureHistory: metadata.procedureHistory ?? "",
    clinicalAttachments: metadata.clinicalAttachments ?? [],
    odontogram: (metadata.odontogram ?? []).map(normalizeTooth),
  };
}

function buildMetadata(payload: Omit<DentalRecord, "id">) {
  return JSON.stringify({
    patientName: payload.patientName,
    chiefComplaint: payload.chiefComplaint,
    consultationNotes: payload.consultationNotes,
    treatmentStep: payload.treatmentStep,
    treatmentStatus: payload.treatmentStatus,
    procedureHistory: payload.procedureHistory,
    clinicalAttachments: payload.clinicalAttachments,
    odontogram: payload.odontogram.map(normalizeTooth),
  } satisfies EmrMetadata);
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

    const result = await withOracleConnection((connection) =>
      connection.execute<EmrRow>(
        `
          SELECT
            ID,
            PATIENT_ID,
            DIAGNOSIS,
            TREATMENT_PLAN,
            CLINICAL_NOTES,
            RECORD_DATE
          FROM EMR_RECORDS
          WHERE (:patientId IS NULL OR PATIENT_ID = :patientId)
          ORDER BY RECORD_DATE DESC, ID DESC
        `,
        { patientId: patientId ? Number(patientId) : null },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      ),
    );

    return NextResponse.json((result.rows ?? []).map(serializeRecord));
  } catch (error) {
    console.error("GET /api/emr failed", error);
    return errorResponse("Failed to load EMR records from Oracle.", error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Omit<DentalRecord, "id">;

    const result = await withOracleConnection((connection) =>
      connection.execute(
        `
          INSERT INTO EMR_RECORDS (
            PATIENT_ID,
            STAFF_ID,
            DIAGNOSIS,
            TREATMENT_PLAN,
            CLINICAL_NOTES,
            RECORD_DATE,
            UPDATED_AT
          ) VALUES (
            :patientId,
            NULL,
            :diagnosis,
            :treatmentPlan,
            :clinicalNotes,
            CASE
              WHEN :visitDate = '' THEN CURRENT_TIMESTAMP
              ELSE TO_TIMESTAMP(:visitDate, 'YYYY-MM-DD')
            END,
            CURRENT_TIMESTAMP
          )
          RETURNING ID INTO :id
        `,
        {
          patientId: Number(payload.patientId),
          diagnosis: payload.diagnoses,
          treatmentPlan: payload.treatmentPlan,
          clinicalNotes: buildMetadata(payload),
          visitDate: payload.visitDate,
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
    console.error("POST /api/emr failed", error);
    return errorResponse("Failed to save EMR record to Oracle.", error);
  }
}
