import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/mongodb";
import type { AppointmentStatus } from "@/lib/clinic-types";

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
    const { status } = (await request.json()) as { status: AppointmentStatus };
    const db = await getDatabase();

    await db.collection("appointments").updateOne(
      { _id: new ObjectId(id) },
      { $set: { status } },
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/appointments/[id] failed", error);
    return errorResponse("Failed to update appointment status.", error);
  }
}
