import { NextResponse } from "next/server";

import type { SupportAttachment } from "@/lib/clinic-types";
import { getDatabase } from "@/lib/mongodb";
import {
  buildSupportListResponse,
  buildSupportSearchQuery,
  createSupportTicketRecord,
  getStaffSupportSession,
  isSupportCategory,
  seedSupportMetadata,
  supportErrorResponse,
  type SupportTicketDocument,
  verifyPortalPatientAccess,
} from "@/lib/support";

export const runtime = "nodejs";

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(request: Request) {
  try {
    const db = await getDatabase();
    await seedSupportMetadata(db);

    const { searchParams } = new URL(request.url);
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const pageSize = parsePositiveInt(searchParams.get("pageSize"), 20);
    const ticketsCollection = db.collection<SupportTicketDocument>("supportTickets");
    const staffSession = await getStaffSupportSession(request);

    if (staffSession) {
      const query = buildSupportSearchQuery(searchParams);
      const [tickets, total] = await Promise.all([
        ticketsCollection
          .find(query)
          .sort({ lastMessageAt: -1, updatedAt: -1, _id: -1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .toArray(),
        ticketsCollection.countDocuments(query),
      ]);

      return NextResponse.json(
        await buildSupportListResponse(db, tickets, total, page, pageSize),
      );
    }

    const patient = await verifyPortalPatientAccess({
      patientId: searchParams.get("patientId") ?? "",
      portalDob: searchParams.get("portalDob") ?? "",
    });

    if (!patient) {
      return NextResponse.json({ error: "Unauthorized support access." }, { status: 401 });
    }

    const query = { patientId: patient.id };
    const [tickets, total] = await Promise.all([
      ticketsCollection
        .find(query)
        .sort({ lastMessageAt: -1, updatedAt: -1, _id: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .toArray(),
      ticketsCollection.countDocuments(query),
    ]);

    return NextResponse.json(
      await buildSupportListResponse(db, tickets, total, page, pageSize),
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
      sourceChannel?: "portal" | "support-center";
      attachments?: SupportAttachment[];
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

    const db = await getDatabase();
    const ticket = await createSupportTicketRecord(db, {
      patientId: patient.id,
      patientName: patient.fullName,
      patientEmail: patient.email,
      patientPhone: patient.phone,
      subject: payload.subject,
      category: payload.category,
      message: payload.message,
      sourceChannel: payload.sourceChannel ?? "portal",
      attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    console.error("POST /api/support failed", error);
    return supportErrorResponse("Failed to create support ticket.", error);
  }
}
