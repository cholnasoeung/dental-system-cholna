import { NextResponse } from "next/server";

import type { SupportTag } from "@/lib/clinic-types";
import { getDatabase } from "@/lib/mongodb";
import {
  canManageSupportSettings,
  getStaffSupportSession,
  seedSupportMetadata,
  supportErrorResponse,
  type SupportTagDocument,
} from "@/lib/support";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = await getDatabase();
    await seedSupportMetadata(db);
    const tags = await db.collection<SupportTagDocument>("supportTags").find({}).sort({ name: 1 }).toArray();
    return NextResponse.json(
      tags.map((tag) => ({
        id: String(tag._id),
        name: tag.name,
        color: tag.color,
        createdAt: tag.createdAt,
      })) satisfies SupportTag[],
    );
  } catch (error) {
    console.error("GET /api/support/tags failed", error);
    return supportErrorResponse("Failed to load support tags.", error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getStaffSupportSession(request);
    if (!canManageSupportSettings(session)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const payload = (await request.json()) as { name?: string; color?: string };
    if (!payload.name?.trim()) {
      return NextResponse.json({ error: "Tag name is required." }, { status: 400 });
    }

    const db = await getDatabase();
    const document: Omit<SupportTagDocument, "_id"> = {
      name: payload.name.trim(),
      color: payload.color?.trim() || "#0ea5e9",
      createdAt: new Date().toISOString(),
    };
    const result = await db.collection<Omit<SupportTagDocument, "_id">>("supportTags").insertOne(document);
    return NextResponse.json({ id: String(result.insertedId), ...document }, { status: 201 });
  } catch (error) {
    console.error("POST /api/support/tags failed", error);
    return supportErrorResponse("Failed to create support tag.", error);
  }
}
