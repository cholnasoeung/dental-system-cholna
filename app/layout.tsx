import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";

import { AppAnalytics } from "@/components/app-analytics";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "DentalFlow | Dental Management Platform",
    template: "%s | DentalFlow",
  },
  description:
    "DentalFlow is a modern dental management platform for patients, appointments, EMR, billing, staff permissions, and analytics.",
  keywords: [
    "dental software",
    "dental clinic management",
    "dental EMR",
    "appointment scheduling",
    "billing",
    "patient portal",
  ],
  openGraph: {
    title: "DentalFlow | Dental Management Platform",
    description:
      "Manage patients, appointments, EMR, payments, reports, and clinic operations from one dental workspace.",
    url: siteUrl,
    siteName: "DentalFlow",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DentalFlow | Dental Management Platform",
    description:
      "A modern dental clinic workspace for patient records, treatment flows, analytics, and operations.",
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Suspense fallback={null}>
          <AppAnalytics />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
