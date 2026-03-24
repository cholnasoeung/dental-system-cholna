import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import type { SupportAttachment } from "@/lib/clinic-types";
import { getDatabase } from "@/lib/mongodb";
import {
  appendSupportMessageAndUpdateTicket,
  customerCanReply,
  getStaffSupportSession,
  loadSupportMessages,
  supportErrorResponse,
  type SupportTicketDocument,
  verifyPortalPatientAccess,
} from "@/lib/support";

export const runtime = "nodejs";

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

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

    const staffSession = await getStaffSupportSession(request);
    if (!staffSession) {
      const { searchParams } = new URL(request.url);
      const patient = await verifyPortalPatientAccess({
        patientId: searchParams.get("patientId") ?? "",
        portalDob: searchParams.get("portalDob") ?? "",
      });

      if (!patient || patient.id !== ticket.patientId) {
        return NextResponse.json({ error: "Unauthorized support access." }, { status: 401 });
      }
    }

    const { searchParams } = new URL(request.url);
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const pageSize = parsePositiveInt(searchParams.get("pageSize"), 20);

    return NextResponse.json(await loadSupportMessages(db, id, page, pageSize));
  } catch (error) {
    console.error("GET /api/support/[id]/messages failed", error);
    return supportErrorResponse("Failed to load support messages.", error);
  }
}

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
      attachments?: SupportAttachment[];
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

    const attachments = Array.isArray(payload.attachments) ? payload.attachments : [];
    const staffSession = await getStaffSupportSession(request);

    if (staffSession) {
      return NextResponse.json(
        await appendSupportMessageAndUpdateTicket(db, ticket, {
          senderType: "staff",
          senderId: staffSession.userId,
          senderName: staffSession.fullName,
          message: payload.message,
          attachments,
        }),
      );
    }

    const patient = await verifyPortalPatientAccess({
      patientId: payload.patientId ?? "",
      portalDob: payload.portalDob ?? "",
    });

    if (!patient || patient.id !== ticket.patientId) {
      return NextResponse.json({ error: "Unauthorized support access." }, { status: 401 });
    }

    if (!customerCanReply(ticket.status)) {
      return NextResponse.json(
        { error: "Closed tickets cannot receive new customer replies." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      await appendSupportMessageAndUpdateTicket(db, ticket, {
        senderType: "patient",
        senderId: patient.id,
        senderName: patient.fullName,
        message: payload.message,
        attachments,
      }),
    );
  } catch (error) {
    console.error("POST /api/support/[id]/messages failed", error);
    return supportErrorResponse("Failed to save support reply.", error);
  }
}
