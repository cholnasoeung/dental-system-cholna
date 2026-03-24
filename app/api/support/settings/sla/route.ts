import { NextResponse } from "next/server";

import type { SupportSlaSettings } from "@/lib/clinic-types";
import { getDatabase } from "@/lib/mongodb";
import {
  canManageSupportSettings,
  getStaffSupportSession,
  getSupportSettings,
  supportErrorResponse,
  updateSupportSettings,
} from "@/lib/support";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await getStaffSupportSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized support access." }, { status: 401 });
    }

    const db = await getDatabase();
    return NextResponse.json(await getSupportSettings(db));
  } catch (error) {
    console.error("GET /api/support/settings/sla failed", error);
    return supportErrorResponse("Failed to load SLA settings.", error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getStaffSupportSession(request);
    if (!canManageSupportSettings(session)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const payload = (await request.json()) as SupportSlaSettings;
    const db = await getDatabase();
    return NextResponse.json(await updateSupportSettings(db, payload));
  } catch (error) {
    console.error("PATCH /api/support/settings/sla failed", error);
    return supportErrorResponse("Failed to update SLA settings.", error);
  }
}
