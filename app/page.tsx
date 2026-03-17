import type { Metadata } from "next";
import Link from "next/link";

import { AdminShell } from "@/components/admin-shell";
import { AiInsightPanel } from "@/components/ai-insight-panel";
import { LiveOperationsPreview } from "@/components/live-operations-preview";

const primaryModules = [
  {
    title: "Patient Management",
    description:
      "Register patients, manage records, and keep every profile ready for reception and clinical teams.",
    href: "/patients",
    eyebrow: "Front Desk",
    accent: "from-cyan-400/30 via-sky-300/20 to-white",
  },
  {
    title: "Appointment Management",
    description:
      "Coordinate bookings, reminders, and follow-ups with a calendar flow tuned for real clinic pressure.",
    href: "/appointments",
    eyebrow: "Scheduling",
    accent: "from-amber-300/30 via-orange-200/20 to-white",
  },
  {
    title: "Dental Records / EMR",
    description:
      "Capture odontograms, treatment steps, diagnoses, and clinical findings in one visual record flow.",
    href: "/emr",
    eyebrow: "Clinical",
    accent: "from-emerald-300/30 via-teal-200/20 to-white",
  },
];

const supportingModules = [
  {
    title: "Billing & Payments",
    description: "Track invoices, collections, and outstanding balances clearly.",
    href: "/billing",
  },
  {
    title: "Prescription Management",
    description: "Create prescriptions connected to treatment context.",
    href: "/prescriptions",
  },
  {
    title: "Notifications",
    description: "Handle reminders, confirmations, and follow-up messaging.",
    href: "/notifications",
  },
  {
    title: "Reports & Analytics",
    description: "Review growth, revenue, workload, and care activity.",
    href: "/reports",
  },
  {
    title: "Staff & Role Management",
    description: "Manage team access, permissions, schedules, and availability.",
    href: "/staff",
  },
  {
    title: "Patient Portal",
    description: "Give patients a cleaner path into their appointments and records.",
    href: "/portal",
  },
];

const highlights = [
  "Real-time operations preview",
  "AI-ready clinic insights",
  "Built-in analytics tracking",
  "SEO and social metadata support",
];

export const metadata: Metadata = {
  title: "Dental Clinic Landing Page",
  description:
    "A modern dental clinic dashboard with patient management, EMR, billing, analytics, AI-ready insight panels, and live operational previews.",
  openGraph: {
    title: "DentalFlow Dental Clinic Platform",
    description:
      "Patients, appointments, treatment flows, analytics, AI-ready insights, and real-time clinic visibility in one dental workspace.",
  },
};

export default function Home() {
  return (
    <AdminShell>
      <div className="w-full space-y-6">
        <section className="relative overflow-hidden rounded-[36px] border border-white/80 bg-[linear-gradient(135deg,rgba(8,47,73,0.96)_0%,rgba(15,23,42,0.96)_42%,rgba(12,74,110,0.92)_100%)] px-6 py-8 text-white shadow-[0_28px_80px_rgba(15,23,42,0.24)] md:px-8 md:py-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.30),transparent_28%),radial-gradient(circle_at_80%_18%,rgba(251,191,36,0.18),transparent_18%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.16),transparent_24%)]" />

          <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.3fr)_380px]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.36em] text-cyan-200/85">
                DentalFlow Platform
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-5xl">
                A cleaner, smarter operating system for modern dental clinics.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">
                Manage patients, appointments, billing, prescriptions, staff access,
                and treatment progress from one calm workspace designed for real
                daily operations.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/patients"
                  className="rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                >
                  Open Patient Hub
                </Link>
                <Link
                  href="/reports"
                  className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/16"
                >
                  View Analytics
                </Link>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {highlights.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm text-slate-100 backdrop-blur-sm"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <LiveOperationsPreview />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_420px]">
          <div className="rounded-[32px] border border-white/80 bg-white/88 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-700">
                  Main Workflows
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  Start with the highest-velocity parts of the clinic
                </h2>
              </div>
              <span className="rounded-full bg-sky-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700 ring-1 ring-sky-100">
                Mobile Ready
              </span>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {primaryModules.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,white_0%,#f8fbff_100%)] p-5 shadow-[0_14px_36px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:shadow-[0_24px_46px_rgba(15,23,42,0.10)]"
                >
                  <div className={`rounded-2xl bg-gradient-to-br ${item.accent} p-4`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                      {item.eyebrow}
                    </p>
                    <h3 className="mt-3 text-2xl font-semibold text-slate-950">
                      {item.title}
                    </h3>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    {item.description}
                  </p>
                  <span className="mt-6 inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition group-hover:bg-sky-700">
                    Open Module
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <AiInsightPanel />
        </section>

        <section className="rounded-[32px] border border-white/80 bg-white/88 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-700">
                Full Platform
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                Supporting modules across the whole dental operation
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              The product now includes better SEO metadata, analytics capture,
              AI-ready insight sections, and a live operations preview without
              losing the focused admin workflow.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {supportingModules.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f9fbff_100%)] p-5 transition hover:border-sky-200 hover:shadow-[0_16px_40px_rgba(14,165,233,0.10)]"
              >
                <h3 className="text-lg font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {item.description}
                </p>
                <span className="mt-5 inline-flex text-sm font-semibold text-sky-700">
                  Explore
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
