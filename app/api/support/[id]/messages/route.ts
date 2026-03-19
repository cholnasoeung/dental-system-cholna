import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/mongodb";
import {
  createSupportMessage,
  getStaffSupportSession,
  serializeSupportTicket,
  supportErrorResponse,
  verifyPortalPatientAccess,
  type SupportTicketDocument,
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
      message?: string;
      patientId?: string;
      portalDob?: string;
    };

    if (!payload.message?.trim()) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const db = await getDatabase();
    const ticket = await db
      .collection<SupportTicketDocument>("supportTickets")
      .findOne({ _id: new ObjectId(id) });

    if (!ticket) {
      return NextResponse.json({ error: "Support ticket not found." }, { status: 404 });
    }

    const now = new Date().toISOString();
    const staffSession = await getStaffSupportSession(request);

    if (staffSession) {
      const nextMessage = createSupportMessage(
        "staff",
        staffSession.fullName,
        payload.message.trim(),
      );

      const updatedTicket = await db
        .collection<SupportTicketDocument>("supportTickets")
        .findOneAndUpdate(
        { _id: new ObjectId(id) },
        {
          $push: { messages: nextMessage },
          $set: {
            updatedAt: now,
            lastMessageAt: now,
            status: ticket.status === "closed" ? "closed" : "in-progress",
          },
        },
          { returnDocument: "after" },
        );

      return NextResponse.json(
        serializeSupportTicket(updatedTicket as SupportTicketDocument & { _id: unknown }),
      );
    }

    const patient = await verifyPortalPatientAccess({
      patientId: payload.patientId ?? "",
      portalDob: payload.portalDob ?? "",
    });

    if (!patient || patient.id !== ticket.patientId) {
      return NextResponse.json({ error: "Unauthorized support access." }, { status: 401 });
    }

    if (ticket.status === "resolved" || ticket.status === "closed") {
      return NextResponse.json(
        { error: "Resolved or closed tickets cannot receive new patient replies." },
        { status: 400 },
      );
    }

    const nextMessage = createSupportMessage("patient", patient.fullName, payload.message.trim());
    const updatedTicket = await db
      .collection<SupportTicketDocument>("supportTickets")
      .findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $push: { messages: nextMessage },
        $set: {
          updatedAt: now,
          lastMessageAt: now,
        },
      },
        { returnDocument: "after" },
      );

    return NextResponse.json(
      serializeSupportTicket(updatedTicket as SupportTicketDocument & { _id: unknown }),
    );
  } catch (error) {
    console.error("POST /api/support/[id]/messages failed", error);
    return supportErrorResponse("Failed to save support reply.", error);
  }
}
