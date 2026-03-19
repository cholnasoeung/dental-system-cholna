import { NextResponse } from "next/server";

import type { SupportTicket } from "@/lib/clinic-types";
import { getDatabase } from "@/lib/mongodb";
import {
  createSupportMessage,
  getStaffSupportSession,
  isSupportCategory,
  serializeSupportTicket,
  supportErrorResponse,
  type PortalAccess,
  type SupportTicketDocument,
  verifyPortalPatientAccess,
} from "@/lib/support";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const staffSession = await getStaffSupportSession(request);
    const db = await getDatabase();

    if (staffSession) {
      const tickets = await db
        .collection<SupportTicketDocument>("supportTickets")
        .find({})
        .sort({ lastMessageAt: -1, updatedAt: -1, _id: -1 })
        .toArray();

      return NextResponse.json(
        tickets.map((ticket) =>
          serializeSupportTicket(ticket as SupportTicketDocument & { _id: unknown }),
        ),
      );
    }

    const { searchParams } = new URL(request.url);
    const access: PortalAccess = {
      patientId: searchParams.get("patientId") ?? "",
      portalDob: searchParams.get("portalDob") ?? "",
    };
    const patient = await verifyPortalPatientAccess(access);

    if (!patient) {
      return NextResponse.json({ error: "Unauthorized support access." }, { status: 401 });
    }

    const tickets = await db
      .collection<SupportTicketDocument>("supportTickets")
      .find({ patientId: patient.id })
      .sort({ lastMessageAt: -1, updatedAt: -1, _id: -1 })
      .toArray();

    return NextResponse.json(
      tickets.map((ticket) =>
        serializeSupportTicket(ticket as SupportTicketDocument & { _id: unknown }),
      ),
    );
  } catch (error) {
    console.error("GET /api/support failed", error);
    return supportErrorResponse("Failed to load support tickets.", error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      patientId?: string;
      portalDob?: string;
      subject?: string;
      category?: string;
      message?: string;
    };

    if (!payload.patientId || !payload.portalDob) {
      return NextResponse.json(
        { error: "Patient credentials are required." },
        { status: 400 },
      );
    }

    if (!payload.subject?.trim() || !payload.message?.trim() || !payload.category) {
      return NextResponse.json(
        { error: "Subject, category, and message are required." },
        { status: 400 },
      );
    }

    if (!isSupportCategory(payload.category)) {
      return NextResponse.json({ error: "Invalid support category." }, { status: 400 });
    }

    const patient = await verifyPortalPatientAccess({
      patientId: payload.patientId,
      portalDob: payload.portalDob,
    });

    if (!patient) {
      return NextResponse.json(
        {
          error:
            "Patient record not found. Use your patient ID, phone number, or email together with the correct date of birth.",
        },
        { status: 401 },
      );
    }

    const now = new Date().toISOString();
    const ticketPayload: Omit<SupportTicket, "id"> = {
      patientId: patient.id,
      patientName: patient.fullName,
      subject: payload.subject.trim(),
      category: payload.category,
      priority: "medium",
      status: "open",
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
      messages: [
        createSupportMessage("patient", patient.fullName, payload.message.trim()),
      ],
    };

    const db = await getDatabase();
    const result = await db
      .collection<Omit<SupportTicket, "id">>("supportTickets")
      .insertOne(ticketPayload);

    return NextResponse.json(
      {
        id: String(result.insertedId),
        ...ticketPayload,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/support failed", error);
    return supportErrorResponse("Failed to create support ticket.", error);
  }
}
