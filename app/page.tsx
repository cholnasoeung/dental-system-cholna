import type { Metadata } from "next";

import { DashboardOverview } from "@/components/dashboard-overview";

export const metadata: Metadata = {
  title: "Dashboard Overview",
  description:
    "Operational dashboard for appointments, revenue, patient growth, and clinic activity.",
};

export default function HomePage() {
  return <DashboardOverview />;
}
