import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import type { SupportAttachment } from "@/lib/clinic-types";
import { getDatabase } from "@/lib/mongodb";
import {
  addSupportNote,
  createSupportNote,
  getStaffSupportSession,
  loadSupportNotes,
  supportErrorResponse,
  type SupportTicketDocument,
} from "@/lib/support";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getStaffSupportSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized support access." }, { status: 401 });
    }

    const { id } = await context.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid support ticket id." }, { status: 400 });
    }

    const db = await getDatabase();
    return NextResponse.json(await loadSupportNotes(db, id));
  } catch (error) {
    console.error("GET /api/support/[id]/notes failed", error);
    return supportErrorResponse("Failed to load internal notes.", error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getStaffSupportSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized support access." }, { status: 401 });
    }

    const { id } = await context.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid support ticket id." }, { status: 400 });
    }

    const payload = (await request.json()) as {
      message?: string;
      attachments?: SupportAttachment[];
    };

    if (!payload.message?.trim()) {
      return NextResponse.json({ error: "Note message is required." }, { status: 400 });
    }

    const db = await getDatabase();
    const ticket = await db
      .collection<SupportTicketDocument>("supportTickets")
      .findOne({ _id: new ObjectId(id) });

    if (!ticket) {
      return NextResponse.json({ error: "Support ticket not found." }, { status: 404 });
    }

    const note = createSupportNote(
      id,
      session.userId,
      session.fullName,
      payload.message,
      Array.isArray(payload.attachments) ? payload.attachments : [],
    );

    await addSupportNote(db, id, note);
    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error("POST /api/support/[id]/notes failed", error);
    return supportErrorResponse("Failed to save internal note.", error);
  }
}
