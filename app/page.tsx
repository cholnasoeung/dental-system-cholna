import type { Metadata } from "next";

import { HomeSupportLanding } from "@/components/home-support-landing";

export const metadata: Metadata = {
  title: "Customer Support",
  description:
    "Dental support landing page with a clinic-style hero and embedded support request form.",
  openGraph: {
    title: "DentalFlow Customer Support",
    description:
      "Send a support message to the clinic team about appointments, billing, and general questions.",
  },
};

export default function HomePage() {
  return <HomeSupportLanding />;
}
