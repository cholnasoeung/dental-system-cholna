import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";

type AnalyticsEvent = {
  event: string;
  path: string;
  referrer: string;
  viewport: string;
  userAgent: string;
  occurredAt: string;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as AnalyticsEvent;

    if (!payload.event || !payload.path) {
      return NextResponse.json({ error: "Invalid analytics payload." }, { status: 400 });
    }

    const db = await getDatabase();
    await db.collection<AnalyticsEvent>("analytics_events").insertOne(payload);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/analytics failed", error);
    return NextResponse.json({ error: "Analytics event failed." }, { status: 500 });
  }
}
