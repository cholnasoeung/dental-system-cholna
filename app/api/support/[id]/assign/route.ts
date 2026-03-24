import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import type { StaffMember } from "@/lib/clinic-types";
import { getDatabase } from "@/lib/mongodb";
import {
  createAuditEntry,
  createSupportAuditLog,
  getStaffSupportSession,
  hydrateSupportTicket,
  notifySupportEvent,
  supportErrorResponse,
  type SupportTicketDocument,
} from "@/lib/support";

export const runtime = "nodejs";

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
      assignedAgentId?: string;
      assignedTeam?: string;
    };

    const db = await getDatabase();
    const ticketCollection = db.collection<SupportTicketDocument>("supportTickets");
    const ticket = await ticketCollection.findOne({ _id: new ObjectId(id) });

    if (!ticket) {
      return NextResponse.json({ error: "Support ticket not found." }, { status: 404 });
    }

    let assignedAgentName = "";
    if (payload.assignedAgentId) {
      const staff = await db.collection<Omit<StaffMember, "id"> & { _id?: ObjectId }>("staff").findOne({
        _id: new ObjectId(payload.assignedAgentId),
      });
      assignedAgentName = staff?.fullName ?? "";
    }

    await ticketCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          assignedAgentId: payload.assignedAgentId ?? "",
          assignedAgentName,
          assignedTeam: payload.assignedTeam ?? ticket.assignedTeam,
          updatedAt: new Date().toISOString(),
        },
      },
    );

    await createAuditEntry(
      db,
      createSupportAuditLog(
        id,
        "assignment-changed",
        session.userId,
        session.fullName,
        "staff",
        `Assigned ticket to ${assignedAgentName || "unassigned queue"}.`,
      ),
    );

    const updatedTicket = await ticketCollection.findOne({ _id: new ObjectId(id) });
    if (!updatedTicket) {
      return NextResponse.json({ error: "Support ticket not found." }, { status: 404 });
    }

    await notifySupportEvent(
      db,
      updatedTicket,
      "support-assignment",
      `Assignment changed for ${updatedTicket.ticketNumber}`,
      `${updatedTicket.ticketNumber} is assigned to ${updatedTicket.assignedAgentName || "the support queue"}.`,
    );

    return NextResponse.json(await hydrateSupportTicket(db, updatedTicket, { includeStaffData: true }));
  } catch (error) {
    console.error("POST /api/support/[id]/assign failed", error);
    return supportErrorResponse("Failed to assign support ticket.", error);
  }
}
