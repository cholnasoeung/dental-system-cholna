import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import type { StaffMember } from "@/lib/clinic-types";
import { getDatabase } from "@/lib/mongodb";
import {
  canDeleteSupportTickets,
  createAuditEntry,
  createSupportAuditLog,
  getStaffSupportSession,
  hydrateSupportTicket,
  isSupportPriority,
  isSupportStatus,
  markTicketAsRead,
  notifySupportEvent,
  supportErrorResponse,
  type SupportTicketDocument,
  verifyPortalPatientAccess,
} from "@/lib/support";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid support ticket id." }, { status: 400 });
    }

    const db = await getDatabase();
    const ticket = await db
      .collection<SupportTicketDocument>("supportTickets")
      .findOne({ _id: new ObjectId(id) });

    if (!ticket) {
      return NextResponse.json({ error: "Support ticket not found." }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const messagePage = Number.parseInt(searchParams.get("messagePage") ?? "1", 10) || 1;
    const messagePageSize = Number.parseInt(searchParams.get("messagePageSize") ?? "20", 10) || 20;
    const staffSession = await getStaffSupportSession(request);

    if (staffSession) {
      await markTicketAsRead(db, id, "staff");
      return NextResponse.json(
        await hydrateSupportTicket(db, ticket, {
          messagePage,
          messagePageSize,
          includeStaffData: true,
        }),
      );
    }

    const patient = await verifyPortalPatientAccess({
      patientId: searchParams.get("patientId") ?? "",
      portalDob: searchParams.get("portalDob") ?? "",
    });

    if (!patient || patient.id !== ticket.patientId) {
      return NextResponse.json({ error: "Unauthorized support access." }, { status: 401 });
    }

    await markTicketAsRead(db, id, "customer");
    return NextResponse.json(
      await hydrateSupportTicket(db, ticket, {
        messagePage,
        messagePageSize,
      }),
    );
  } catch (error) {
    console.error("GET /api/support/[id] failed", error);
    return supportErrorResponse("Failed to load support ticket.", error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid support ticket id." }, { status: 400 });
    }

    const staffSession = await getStaffSupportSession(request);
    if (!staffSession) {
      return NextResponse.json({ error: "Unauthorized support access." }, { status: 401 });
    }

    const payload = (await request.json()) as {
      status?: string;
      priority?: string;
      category?: string;
      tags?: string[];
      assignedAgentId?: string;
      assignedAgentName?: string;
      assignedTeam?: string;
    };

    const db = await getDatabase();
    const collection = db.collection<SupportTicketDocument>("supportTickets");
    const ticket = await collection.findOne({ _id: new ObjectId(id) });

    if (!ticket) {
      return NextResponse.json({ error: "Support ticket not found." }, { status: 404 });
    }

    const updates: Partial<SupportTicketDocument> = {
      updatedAt: new Date().toISOString(),
    };
    const auditLogs: ReturnType<typeof createSupportAuditLog>[] = [];

    if (payload.status !== undefined) {
      if (!isSupportStatus(payload.status)) {
        return NextResponse.json({ error: "Invalid support status." }, { status: 400 });
      }

      updates.status = payload.status;
      if (payload.status === "resolved") {
        updates.resolvedAt = new Date().toISOString();
        updates.closedAt = "";
      } else if (payload.status === "closed") {
        updates.closedAt = new Date().toISOString();
      } else {
        updates.resolvedAt = "";
        updates.closedAt = "";
      }

      auditLogs.push(
        createSupportAuditLog(
          id,
          "status-changed",
          staffSession.userId,
          staffSession.fullName,
          "staff",
          `Status changed from ${ticket.status} to ${payload.status}.`,
        ),
      );
    }

    if (payload.priority !== undefined) {
      if (!isSupportPriority(payload.priority)) {
        return NextResponse.json({ error: "Invalid support priority." }, { status: 400 });
      }

      updates.priority = payload.priority;
      auditLogs.push(
        createSupportAuditLog(
          id,
          "priority-changed",
          staffSession.userId,
          staffSession.fullName,
          "staff",
          `Priority changed from ${ticket.priority} to ${payload.priority}.`,
        ),
      );
    }

    if (payload.category !== undefined) {
      updates.category = payload.category;
    }

    if (payload.tags !== undefined) {
      updates.tags = payload.tags.map((item) => item.trim()).filter(Boolean);
      auditLogs.push(
        createSupportAuditLog(
          id,
          "tags-changed",
          staffSession.userId,
          staffSession.fullName,
          "staff",
          `Tags updated to ${updates.tags.join(", ") || "none"}.`,
        ),
      );
    }

    if (payload.assignedAgentId !== undefined) {
      let assignedAgentName = payload.assignedAgentName ?? "";

      if (payload.assignedAgentId) {
        const assignedStaff = await db.collection<Omit<StaffMember, "id"> & { _id?: ObjectId }>("staff").findOne({
          _id: new ObjectId(payload.assignedAgentId),
        });
        assignedAgentName = assignedStaff?.fullName ?? assignedAgentName;
      }

      updates.assignedAgentId = payload.assignedAgentId;
      updates.assignedAgentName = assignedAgentName;
      updates.assignedTeam = payload.assignedTeam ?? ticket.assignedTeam;
      auditLogs.push(
        createSupportAuditLog(
          id,
          "assignment-changed",
          staffSession.userId,
          staffSession.fullName,
          "staff",
          `Assigned ticket to ${assignedAgentName || "unassigned queue"}.`,
        ),
      );
    }

    if (Object.keys(updates).length === 1) {
      return NextResponse.json(
        { error: "At least one valid support field is required." },
        { status: 400 },
      );
    }

    await collection.updateOne({ _id: new ObjectId(id) }, { $set: updates });
    for (const log of auditLogs) {
      await createAuditEntry(db, log);
    }

    const updatedTicket = await collection.findOne({ _id: new ObjectId(id) });
    if (!updatedTicket) {
      return NextResponse.json({ error: "Support ticket not found." }, { status: 404 });
    }

    if (payload.status !== undefined) {
      await notifySupportEvent(
        db,
        updatedTicket,
        "support-status",
        `Ticket ${updatedTicket.ticketNumber} updated`,
        `${updatedTicket.ticketNumber} is now ${updatedTicket.status}.`,
      );
    }

    if (payload.assignedAgentId !== undefined) {
      await notifySupportEvent(
        db,
        updatedTicket,
        "support-assignment",
        `Assignment changed for ${updatedTicket.ticketNumber}`,
        `${updatedTicket.ticketNumber} is assigned to ${updatedTicket.assignedAgentName || "the support queue"}.`,
      );
    }

    return NextResponse.json(
      await hydrateSupportTicket(db, updatedTicket, { includeStaffData: true }),
    );
  } catch (error) {
    console.error("PATCH /api/support/[id] failed", error);
    return supportErrorResponse("Failed to update support ticket.", error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid support ticket id." }, { status: 400 });
    }

    const staffSession = await getStaffSupportSession(request);
    if (!canDeleteSupportTickets(staffSession)) {
      return NextResponse.json({ error: "Only admins can delete tickets." }, { status: 403 });
    }

    const db = await getDatabase();
    const ticket = await db
      .collection<SupportTicketDocument>("supportTickets")
      .findOne({ _id: new ObjectId(id) });

    if (!ticket) {
      return NextResponse.json({ error: "Support ticket not found." }, { status: 404 });
    }

    await db.collection<SupportTicketDocument>("supportTickets").deleteOne({ _id: new ObjectId(id) });
    await db.collection("supportMessages").deleteMany({ ticketId: id });
    await db.collection("supportNotes").deleteMany({ ticketId: id });
    await db.collection("supportAuditLogs").deleteMany({ ticketId: id });

    await createAuditEntry(
      db,
      createSupportAuditLog(
        id,
        "ticket-deleted",
        staffSession!.userId,
        staffSession!.fullName,
        "staff",
        `Deleted ticket ${ticket.ticketNumber}.`,
      ),
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/support/[id] failed", error);
    return supportErrorResponse("Failed to delete support ticket.", error);
  }
}
