import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import type { SupportFaqArticle } from "@/lib/clinic-types";
import { getDatabase } from "@/lib/mongodb";
import {
  canManageSupportSettings,
  getStaffSupportSession,
  seedSupportMetadata,
  supportErrorResponse,
  type SupportFaqArticleDocument,
} from "@/lib/support";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const db = await getDatabase();
    await seedSupportMetadata(db);
    const { searchParams } = new URL(request.url);
    const queryText = searchParams.get("q")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "";
    const query: Record<string, unknown> = {};

    if (queryText) {
      query.$or = [
        { title: { $regex: queryText, $options: "i" } },
        { body: { $regex: queryText, $options: "i" } },
        { tags: { $regex: queryText, $options: "i" } },
      ];
    }
    if (category && category !== "all") {
      query.category = category;
    }

    const articles = await db
      .collection<SupportFaqArticleDocument>("supportFaqArticles")
      .find(query)
      .sort({ updatedAt: -1, _id: -1 })
      .limit(20)
      .toArray();

    return NextResponse.json(
      articles.map((article) => ({
        id: String(article._id),
        title: article.title,
        body: article.body,
        category: article.category,
        tags: article.tags,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
      })) satisfies SupportFaqArticle[],
    );
  } catch (error) {
    console.error("GET /api/support/faq failed", error);
    return supportErrorResponse("Failed to load FAQ articles.", error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getStaffSupportSession(request);
    if (!canManageSupportSettings(session)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const payload = (await request.json()) as {
      id?: string;
      title?: string;
      body?: string;
      category?: string;
      tags?: string[];
    };

    if (!payload.title?.trim() || !payload.body?.trim() || !payload.category?.trim()) {
      return NextResponse.json({ error: "Title, body, and category are required." }, { status: 400 });
    }

    const db = await getDatabase();
    const document: Omit<SupportFaqArticleDocument, "_id"> = {
      title: payload.title.trim(),
      body: payload.body.trim(),
      category: payload.category.trim(),
      tags: (payload.tags ?? []).map((item) => item.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (payload.id && ObjectId.isValid(payload.id)) {
      await db.collection<SupportFaqArticleDocument>("supportFaqArticles").updateOne(
        { _id: new ObjectId(payload.id) },
        {
          $set: {
            title: document.title,
            body: document.body,
            category: document.category,
            tags: document.tags,
            updatedAt: document.updatedAt,
          },
        },
      );

      return NextResponse.json({ id: payload.id, ...document });
    }

    const result = await db.collection<Omit<SupportFaqArticleDocument, "_id">>("supportFaqArticles").insertOne(document);
    return NextResponse.json({ id: String(result.insertedId), ...document }, { status: 201 });
  } catch (error) {
    console.error("POST /api/support/faq failed", error);
    return supportErrorResponse("Failed to save FAQ article.", error);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getStaffSupportSession(request);
    if (!canManageSupportSettings(session)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") ?? "";
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid FAQ id." }, { status: 400 });
    }

    const db = await getDatabase();
    await db.collection("supportFaqArticles").deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/support/faq failed", error);
    return supportErrorResponse("Failed to delete FAQ article.", error);
  }
}
