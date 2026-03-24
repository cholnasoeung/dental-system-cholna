import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/mongodb";
import {
  canManageSupportSettings,
  getStaffSupportSession,
  seedSupportMetadata,
  supportErrorResponse,
} from "@/lib/support";

export const runtime = "nodejs";

type SupportCategoryDocument = {
  _id?: unknown;
  name: string;
  createdAt: string;
};

export async function GET() {
  try {
    const db = await getDatabase();
    await seedSupportMetadata(db);
    const categories = await db
      .collection<SupportCategoryDocument>("supportCategories")
      .find({})
      .sort({ name: 1 })
      .toArray();

    return NextResponse.json(
      categories.map((category) => ({
        id: String(category._id),
        name: category.name,
        createdAt: category.createdAt,
      })),
    );
  } catch (error) {
    console.error("GET /api/support/categories failed", error);
    return supportErrorResponse("Failed to load support categories.", error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getStaffSupportSession(request);
    if (!canManageSupportSettings(session)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const payload = (await request.json()) as { name?: string };
    if (!payload.name?.trim()) {
      return NextResponse.json({ error: "Category name is required." }, { status: 400 });
    }

    const db = await getDatabase();
    const document = {
      name: payload.name.trim(),
      createdAt: new Date().toISOString(),
    };
    const result = await db.collection("supportCategories").insertOne(document);
    return NextResponse.json({ id: String(result.insertedId), ...document }, { status: 201 });
  } catch (error) {
    console.error("POST /api/support/categories failed", error);
    return supportErrorResponse("Failed to create support category.", error);
  }
}
