import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/mongodb";
import {
  getStaffSupportSession,
  isSupportPriority,
  isSupportStatus,
  serializeSupportTicket,
  supportErrorResponse,
  verifyPortalPatientAccess,
  type SupportTicketDocument,
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

    const staffSession = await getStaffSupportSession(request);
    if (staffSession) {
      return NextResponse.json(
        serializeSupportTicket(ticket as SupportTicketDocument & { _id: unknown }),
      );
    }

    const { searchParams } = new URL(request.url);
    const patient = await verifyPortalPatientAccess({
      patientId: searchParams.get("patientId") ?? "",
      portalDob: searchParams.get("portalDob") ?? "",
    });

    if (!patient || patient.id !== ticket.patientId) {
      return NextResponse.json({ error: "Unauthorized support access." }, { status: 401 });
    }

    return NextResponse.json(
      serializeSupportTicket(ticket as SupportTicketDocument & { _id: unknown }),
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
    };

    const updates: Record<string, string> = {};

    if (payload.status !== undefined) {
      if (!isSupportStatus(payload.status)) {
        return NextResponse.json({ error: "Invalid support status." }, { status: 400 });
      }
      updates.status = payload.status;
    }

    if (payload.priority !== undefined) {
      if (!isSupportPriority(payload.priority)) {
        return NextResponse.json({ error: "Invalid support priority." }, { status: 400 });
      }
      updates.priority = payload.priority;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "At least one valid support field is required." },
        { status: 400 },
      );
    }

    updates.updatedAt = new Date().toISOString();

    const db = await getDatabase();
    const result = await db.collection<SupportTicketDocument>("supportTickets").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updates },
      { returnDocument: "after" },
    );

    if (!result) {
      return NextResponse.json({ error: "Support ticket not found." }, { status: 404 });
    }

    return NextResponse.json(
      serializeSupportTicket(result as SupportTicketDocument & { _id: unknown }),
    );
  } catch (error) {
    console.error("PATCH /api/support/[id] failed", error);
    return supportErrorResponse("Failed to update support ticket.", error);
  }
}
