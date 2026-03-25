"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AdminShell } from "@/components/admin-shell";
import { DonutChart, RankedBars, TrendChart } from "@/components/clinic-charts";
import { useClinicOverviewData } from "@/components/use-clinic-overview-data";
import {
  buildClinicInsights,
  formatCompactCurrency,
  formatCurrency,
  formatDateLabel,
  formatPercent,
  type InsightPeriod,
} from "@/lib/clinic-insights";

const periodOptions: Array<{ value: InsightPeriod; label: string }> = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
];

const quickLinks = [
  {
    href: "/appointments",
    label: "Manage Appointments",
    description: "Update the schedule, waitlist, and patient flow.",
  },
  {
    href: "/patients",
    label: "Review Patients",
    description: "Open patient records, alerts, and treatment history.",
  },
  {
    href: "/billing",
    label: "Check Billing",
    description: "Follow up unpaid balances and print invoices.",
  },
  {
    href: "/reports",
    label: "Open Reports",
    description: "Move into deeper analytics and export-ready views.",
  },
];

const statusColors = ["#0f766e", "#0284c7", "#7c3aed", "#f59e0b", "#ef4444", "#64748b"];

export function DashboardOverview() {
  const [period, setPeriod] = useState<InsightPeriod>("30d");
  const { patients, appointments, invoices, records, staffMembers, isLoading, errorMessage, reload } =
    useClinicOverviewData();

  const insights = useMemo(
    () =>
      buildClinicInsights({
        patients,
        appointments,
        invoices,
        records,
        staffMembers,
        period,
      }),
    [appointments, invoices, patients, period, records, staffMembers],
  );

  const labels = insights.timeSeries.map((point) => point.label);

  return (
    <AdminShell>
      <div className="w-full space-y-6">
        <header className="overflow-hidden rounded-[32px] border border-white/80 bg-[linear-gradient(135deg,rgba(15,23,42,0.98)_0%,rgba(12,74,110,0.95)_48%,rgba(14,116,144,0.92)_100%)] p-6 text-white shadow-[0_22px_70px_rgba(15,23,42,0.18)]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200/85">
                Dashboard Overview
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                Clinic performance at a glance
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-200">
                Track the live schedule, revenue capture, patient intake, and the main issues that need staff attention.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-wrap gap-2">
                {periodOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPeriod(option.value)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      period === option.value
                        ? "bg-white text-slate-950"
                        : "bg-white/10 text-white hover:bg-white/16"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => void reload()}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/16"
              >
                Refresh Data
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-[28px] bg-white/10 p-5 ring-1 ring-white/10">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Today</p>
              <p className="mt-2 text-3xl font-semibold">{insights.todayAppointments.length}</p>
              <p className="mt-2 text-sm text-slate-200">appointments on the chairside board</p>
            </article>
            <article className="rounded-[28px] bg-white/10 p-5 ring-1 ring-white/10">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Collected</p>
              <p className="mt-2 text-3xl font-semibold">
                {formatCompactCurrency(insights.collectedRevenue)}
              </p>
              <p className="mt-2 text-sm text-slate-200">
                {formatPercent(insights.collectionRate)} overall collection rate
              </p>
            </article>
            <article className="rounded-[28px] bg-white/10 p-5 ring-1 ring-white/10">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Completion</p>
              <p className="mt-2 text-3xl font-semibold">
                {formatPercent(insights.completionRate)}
              </p>
              <p className="mt-2 text-sm text-slate-200">
                {formatPercent(insights.noShowRate)} no-show rate in this window
              </p>
            </article>
            <article className="rounded-[28px] bg-white/10 p-5 ring-1 ring-white/10">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Coverage</p>
              <p className="mt-2 text-3xl font-semibold">
                {insights.availableDentists}/{insights.totalDentists || 0}
              </p>
              <p className="mt-2 text-sm text-slate-200">dentists available right now</p>
            </article>
          </div>
        </header>

        {isLoading ? (
          <div className="rounded-[24px] border border-sky-100 bg-sky-50 px-5 py-4 text-sm text-sky-800">
            Loading dashboard data from MongoDB...
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-[24px] border border-rose-100 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.95fr]">
          <section className="rounded-[30px] border border-white/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
                  Operations Trend
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Daily appointment flow
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Compare booked activity against completed visits over the selected period.
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
                {insights.periodAppointments} appointments from{" "}
                {formatDateLabel(insights.startDate)} to {formatDateLabel(insights.endDate)}
              </div>
            </div>

            <div className="mt-5">
              <TrendChart
                labels={labels}
                series={[
                  {
                    label: "Booked",
                    values: insights.timeSeries.map((point) => point.appointments),
                    color: "#0284c7",
                    fillColor: "rgba(2,132,199,0.10)",
                  },
                  {
                    label: "Completed",
                    values: insights.timeSeries.map((point) => point.completed),
                    color: "#0f766e",
                    fillColor: "rgba(15,118,110,0.08)",
                  },
                ]}
              />
            </div>
          </section>

          <section className="rounded-[30px] border border-white/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
              Revenue Pulse
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Collections during this period
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Payments are plotted by recorded payment date, so the curve reflects cash actually collected.
            </p>

            <div className="mt-5 rounded-[28px] bg-slate-950 p-5 text-white">
              <p className="text-sm text-slate-300">Average collected per completed visit</p>
              <p className="mt-2 text-3xl font-semibold">
                {formatCurrency(insights.avgCollectedPerVisit)}
              </p>
            </div>

            <div className="mt-5">
              <TrendChart
                labels={labels}
                series={[
                  {
                    label: "Revenue",
                    values: insights.timeSeries.map((point) => point.revenue),
                    color: "#f97316",
                    fillColor: "rgba(249,115,22,0.12)",
                    formatValue: formatCompactCurrency,
                  },
                ]}
              />
            </div>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <section className="rounded-[30px] border border-white/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
              Visit Status
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Where appointments are landing
            </h2>
            <div className="mt-5">
              {insights.statusBreakdown.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
                  No appointment activity in the selected period yet.
                </p>
              ) : (
                <DonutChart
                  items={insights.statusBreakdown.map((item, index) => ({
                    ...item,
                    color: statusColors[index % statusColors.length],
                  }))}
                  centerLabel="Completion"
                  centerValue={formatPercent(insights.completionRate)}
                />
              )}
            </div>
          </section>

          <section className="rounded-[30px] border border-white/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] xl:col-span-2">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
                  Team Output
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Dentist workload ranking
                </h2>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
                {insights.completedRecords} completed EMR record{insights.completedRecords === 1 ? "" : "s"}
              </div>
            </div>
            <div className="mt-5">
              {insights.dentistLoad.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
                  Dentist workload will appear after appointments are assigned.
                </p>
              ) : (
                  <RankedBars
                  items={insights.dentistLoad.map((item) => ({
                    label: item.label,
                    value: item.appointments,
                    detail: `${item.completed} completed | ${item.minutes} clinical minutes`,
                  }))}
                  color="#0284c7"
                />
              )}
            </div>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr_0.9fr]">
          <section className="rounded-[30px] border border-white/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
              Today&apos;s Queue
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Chairside schedule
            </h2>
            <div className="mt-5 space-y-3">
              {insights.todayAppointments.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
                  No appointments are scheduled for today.
                </p>
              ) : (
                insights.todayAppointments.slice(0, 6).map((appointment) => (
                  <article
                    key={appointment.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{appointment.patientName}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {appointment.startTime} | {appointment.dentist || "Unassigned"}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                        {appointment.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">{appointment.reason}</p>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[30px] border border-white/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
              Attention Board
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              What needs follow-up
            </h2>
            <div className="mt-5 space-y-3">
              {insights.alerts.map((alert) => (
                <article
                  key={alert.title}
                  className={`rounded-2xl border px-4 py-4 ${
                    alert.tone === "rose"
                      ? "border-rose-100 bg-rose-50"
                      : alert.tone === "amber"
                        ? "border-amber-100 bg-amber-50"
                        : "border-sky-100 bg-sky-50"
                  }`}
                >
                  <p className="font-semibold text-slate-900">{alert.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{alert.detail}</p>
                </article>
              ))}
            </div>

            <div className="mt-6 rounded-[28px] bg-slate-950 p-5 text-white">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Upcoming Urgent</p>
              <p className="mt-2 text-3xl font-semibold">{insights.urgentUpcomingCount}</p>
              <p className="mt-2 text-sm text-slate-300">
                urgent visit{insights.urgentUpcomingCount === 1 ? "" : "s"} are already booked.
              </p>
            </div>
          </section>

          <section className="rounded-[30px] border border-white/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
              Quick Actions
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Move into the next workflow
            </h2>
            <div className="mt-5 space-y-3">
              {quickLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-sky-300 hover:bg-sky-50"
                >
                  <p className="font-semibold text-slate-900">{item.label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <section className="rounded-[30px] border border-white/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
                  Patient Intake
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  New registrations over time
                </h2>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
                {insights.activePatients} active patients | {insights.vipPatients} VIP
              </div>
            </div>
            <div className="mt-5">
              <TrendChart
                labels={labels}
                series={[
                  {
                    label: "New Patients",
                    values: insights.timeSeries.map((point) => point.newPatients),
                    color: "#7c3aed",
                    fillColor: "rgba(124,58,237,0.12)",
                  },
                ]}
              />
            </div>
          </section>

          <section className="rounded-[30px] border border-white/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
              Treatment Demand
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Most frequent care types
            </h2>
            <div className="mt-5">
              {insights.treatmentMix.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
                  Treatment demand will appear after records and appointment procedures are saved.
                </p>
              ) : (
                <RankedBars items={insights.treatmentMix} color="#7c3aed" />
              )}
            </div>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
