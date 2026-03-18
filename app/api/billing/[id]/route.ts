import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import type { Invoice, PaymentRecord } from "@/lib/clinic-types";
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
    const payload = (await request.json()) as Partial<Omit<Invoice, "id">> & {
      appendPayment?: PaymentRecord;
    };
    const db = await getDatabase();

    if (payload.appendPayment) {
      await db.collection("billing_invoices").updateOne(
        { _id: new ObjectId(id) },
        { $push: { payments: payload.appendPayment } },
      );

      return NextResponse.json({ ok: true });
    }

    await db.collection("billing_invoices").updateOne(
      { _id: new ObjectId(id) },
      { $set: payload },
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/billing/[id] failed", error);
    return errorResponse("Failed to update invoice.", error);
  }
}

