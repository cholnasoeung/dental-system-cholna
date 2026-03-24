import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/mongodb";
import { mergePatientRecords } from "@/lib/patients";

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

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      sourcePatientId?: string;
      targetPatientId?: string;
    };

    if (!payload.sourcePatientId || !payload.targetPatientId) {
      return NextResponse.json(
        { error: "Source and target patient IDs are required." },
        { status: 400 },
      );
    }

    if (payload.sourcePatientId === payload.targetPatientId) {
      return NextResponse.json(
        { error: "Source and target patient cannot be the same." },
        { status: 400 },
      );
    }

    const db = await getDatabase();
    await mergePatientRecords(db, payload.sourcePatientId, payload.targetPatientId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/patients/merge failed", error);
    return errorResponse("Failed to merge patient records.", error);
  }
}
