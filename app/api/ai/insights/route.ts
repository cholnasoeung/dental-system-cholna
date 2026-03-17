import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const currentHour = new Date().getHours();
  const isPeakWindow = currentHour >= 9 && currentHour <= 15;

  return NextResponse.json({
    headline: isPeakWindow
      ? "High chair usage window detected"
      : "Balanced operating window detected",
    summary: isPeakWindow
      ? "Appointment density is likely higher during this time block, so front desk coordination and follow-up queue clarity matter more."
      : "Current operating conditions are better suited for catch-up tasks, plan reviews, and outbound patient reminders.",
    recommendation: isPeakWindow
      ? "Prioritize real-time appointment updates and keep one chair available for urgent walk-ins."
      : "Use this window to clear pending treatment confirmations and prepare next-day billing tasks.",
  });
}
