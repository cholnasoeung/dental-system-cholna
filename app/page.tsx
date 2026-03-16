import Link from "next/link";

import { AdminShell } from "@/components/admin-shell";

const quickLinks = [
  {
    title: "Patient Management",
    description:
      "Create patient profiles, record medical history, insurance details, and uploads.",
    href: "/patients",
  },
  {
    title: "Appointment Management",
    description:
      "Book visits, manage calendar scheduling, reminders, statuses, and follow-ups.",
    href: "/appointments",
  },
  {
    title: "Dental Records / EMR",
    description:
      "Capture odontogram findings, diagnoses, treatment plans, procedures, and clinical attachments.",
    href: "/emr",
  },
  {
    title: "Billing & Payments",
    description:
      "Generate invoices, add treatment charges, track partial or full payments, and review outstanding balances.",
    href: "/billing",
  },
  {
    title: "Prescription Management",
    description:
      "Create prescriptions, link them to visits or treatments, print them, and review medication history.",
    href: "/prescriptions",
  },
  {
    title: "Staff & Role Management",
    description:
      "Add staff, assign roles and permissions, manage schedules, and monitor dentist availability.",
    href: "/staff",
  },
  {
    title: "Notifications",
    description:
      "Manage SMS and email reminders for appointments, confirmations, payments, and follow-up care.",
    href: "/notifications",
  },
  {
    title: "Reports & Analytics",
    description:
      "Review daily appointments, revenue, outstanding balances, patient growth, dentist workload, and treatment frequency.",
    href: "/reports",
  },
  {
    title: "Patient Portal",
    description:
      "Secure patient access for appointments, treatment history, invoices, prescriptions, and profile updates.",
    href: "/portal",
  },
];

export default function Home() {
  return (
    <AdminShell>
      <div className="w-full space-y-6">
        <header className="rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-700">
            Dashboard Overview
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Dental Management System
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Choose a module from the sidebar to work in a dedicated screen. Patient
            registration and appointment scheduling are now separated for cleaner
            workflows.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-700">
                Module
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-slate-950">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {item.description}
              </p>
              <span className="mt-6 inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white">
                Open Module
              </span>
            </Link>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}

