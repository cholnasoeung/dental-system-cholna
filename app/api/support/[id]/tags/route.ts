import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/mongodb";
import {
  createAuditEntry,
  createSupportAuditLog,
  getStaffSupportSession,
  hydrateSupportTicket,
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

    const payload = (await request.json()) as { tags?: string[] };
    const tags = (payload.tags ?? []).map((item) => item.trim()).filter(Boolean);

    const db = await getDatabase();
    const collection = db.collection<SupportTicketDocument>("supportTickets");
    const ticket = await collection.findOne({ _id: new ObjectId(id) });

    if (!ticket) {
      return NextResponse.json({ error: "Support ticket not found." }, { status: 404 });
    }

    await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          tags,
          updatedAt: new Date().toISOString(),
        },
      },
    );

    await createAuditEntry(
      db,
      createSupportAuditLog(
        id,
        "tags-changed",
        session.userId,
        session.fullName,
        "staff",
        `Tags updated to ${tags.join(", ") || "none"}.`,
      ),
    );

    const updatedTicket = await collection.findOne({ _id: new ObjectId(id) });
    return NextResponse.json(await hydrateSupportTicket(db, updatedTicket!, { includeStaffData: true }));
  } catch (error) {
    console.error("POST /api/support/[id]/tags failed", error);
    return supportErrorResponse("Failed to update support tags.", error);
  }
}
