import { NextResponse } from "next/server";

import { treatmentCatalog } from "@/lib/clinic-types";

export async function GET() {
  return NextResponse.json(treatmentCatalog);
}
