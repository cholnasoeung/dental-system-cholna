import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import { upsertAutoInvoiceForRecord } from "@/lib/billing";
import type { DentalRecord } from "@/lib/clinic-types";
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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as Partial<Omit<DentalRecord, "id">>;
    const db = await getDatabase();

    await db.collection("emr_records").updateOne(
      { _id: new ObjectId(id) },
      { $set: payload },
    );

    const updatedRecord = await db.collection<Omit<DentalRecord, "id">>("emr_records").findOne({
      _id: new ObjectId(id),
    });

    if (updatedRecord) {
      await upsertAutoInvoiceForRecord(db, {
        id,
        patientId: updatedRecord.patientId,
        patientName: updatedRecord.patientName,
        visitDate: updatedRecord.visitDate,
        chiefComplaint: updatedRecord.chiefComplaint,
        consultationNotes: updatedRecord.consultationNotes,
        diagnoses: updatedRecord.diagnoses,
        treatmentPlan: updatedRecord.treatmentPlan,
        treatmentStep: updatedRecord.treatmentStep ?? "",
        treatmentStatus: updatedRecord.treatmentStatus ?? "planned",
        procedureHistory: updatedRecord.procedureHistory,
        clinicalAttachments: updatedRecord.clinicalAttachments ?? [],
        odontogram: (updatedRecord.odontogram ?? []).map((tooth) => ({
          toothNumber: tooth.toothNumber,
          condition: tooth.condition,
          notes: tooth.notes ?? "",
          treatmentProcess: tooth.treatmentProcess ?? "",
          treatmentStatus: tooth.treatmentStatus ?? "planned",
          billableTreatmentId: tooth.billableTreatmentId ?? "",
          billableUnitPrice: tooth.billableUnitPrice ?? null,
        })),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/emr/[id] failed", error);
    return errorResponse("Failed to update EMR record.", error);
  }
}
