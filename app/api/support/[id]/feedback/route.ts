import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/mongodb";
import {
  createAuditEntry,
  createSupportAuditLog,
  hydrateSupportTicket,
  supportErrorResponse,
  type SupportTicketDocument,
  verifyPortalPatientAccess,
} from "@/lib/support";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid support ticket id." }, { status: 400 });
    }

    const payload = (await request.json()) as {
      patientId?: string;
      portalDob?: string;
      rating?: number;
      comment?: string;
    };

    if (!payload.patientId || !payload.portalDob) {
      return NextResponse.json({ error: "Patient credentials are required." }, { status: 400 });
    }

    if (!payload.rating || payload.rating < 1 || payload.rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
    }

    const db = await getDatabase();
    const collection = db.collection<SupportTicketDocument>("supportTickets");
    const ticket = await collection.findOne({ _id: new ObjectId(id) });

    if (!ticket) {
      return NextResponse.json({ error: "Support ticket not found." }, { status: 404 });
    }

    const patient = await verifyPortalPatientAccess({
      patientId: payload.patientId,
      portalDob: payload.portalDob,
    });

    if (!patient || patient.id !== ticket.patientId) {
      return NextResponse.json({ error: "Unauthorized support access." }, { status: 401 });
    }

    await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          feedbackRating: payload.rating,
          feedbackComment: payload.comment?.trim() ?? "",
          updatedAt: new Date().toISOString(),
        },
      },
    );

    await createAuditEntry(
      db,
      createSupportAuditLog(
        id,
        "feedback-submitted",
        patient.id,
        patient.fullName,
        "patient",
        `Submitted feedback rating ${payload.rating}.`,
      ),
    );

    const updatedTicket = await collection.findOne({ _id: new ObjectId(id) });
    return NextResponse.json(await hydrateSupportTicket(db, updatedTicket!));
  } catch (error) {
    console.error("POST /api/support/[id]/feedback failed", error);
    return supportErrorResponse("Failed to save feedback.", error);
  }
}
