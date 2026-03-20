import { NextResponse } from "next/server";

import type { ClinicalAttachment, DentalRecord, OdontogramTooth } from "@/lib/clinic-types";
import { withOracleConnection } from "@/lib/oracle";

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

function buildMetadata(payload: Partial<Omit<DentalRecord, "id">>) {
  return JSON.stringify({
    patientName: payload.patientName ?? "",
    chiefComplaint: payload.chiefComplaint ?? "",
    consultationNotes: payload.consultationNotes ?? "",
    treatmentStep: payload.treatmentStep ?? "",
    treatmentStatus: payload.treatmentStatus ?? "planned",
    procedureHistory: payload.procedureHistory ?? "",
    clinicalAttachments: payload.clinicalAttachments ?? [],
    odontogram: (payload.odontogram ?? []).map(normalizeTooth),
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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as Partial<Omit<DentalRecord, "id">>;

    await withOracleConnection((connection) =>
      connection.execute(
        `
          UPDATE EMR_RECORDS
          SET
            PATIENT_ID = :patientId,
            DIAGNOSIS = :diagnosis,
            TREATMENT_PLAN = :treatmentPlan,
            CLINICAL_NOTES = :clinicalNotes,
            RECORD_DATE = CASE
              WHEN :visitDate = '' THEN RECORD_DATE
              ELSE TO_TIMESTAMP(:visitDate, 'YYYY-MM-DD')
            END,
            UPDATED_AT = CURRENT_TIMESTAMP
          WHERE ID = :id
        `,
        {
          id: Number(id),
          patientId: payload.patientId ? Number(payload.patientId) : null,
          diagnosis: payload.diagnoses ?? "",
          treatmentPlan: payload.treatmentPlan ?? "",
          clinicalNotes: buildMetadata(payload),
          visitDate: payload.visitDate ?? "",
        },
        { autoCommit: true },
      ),
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/emr/[id] failed", error);
    return errorResponse("Failed to update EMR record.", error);
  }
}
