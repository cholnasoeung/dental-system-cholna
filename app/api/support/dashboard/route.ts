import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/mongodb";
import { getStaffSupportSession, getSupportDashboard, supportErrorResponse } from "@/lib/support";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await getStaffSupportSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized support access." }, { status: 401 });
    }

    const db = await getDatabase();
    return NextResponse.json(await getSupportDashboard(db));
  } catch (error) {
    console.error("GET /api/support/dashboard failed", error);
    return supportErrorResponse("Failed to load support dashboard.", error);
  }
}
