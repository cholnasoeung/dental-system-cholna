import { NextResponse } from "next/server";

import { toothConditionOptions, toothConditionPricing } from "@/lib/clinic-types";

export async function GET() {
  return NextResponse.json(toothConditionOptions.map((condition) => toothConditionPricing[condition]));
}
