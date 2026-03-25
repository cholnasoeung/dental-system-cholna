"use client";

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

const reportViews = [
  { value: "overview", label: "Operations" },
  { value: "finance", label: "Finance" },
  { value: "patients", label: "Patients" },
] as const;

const reportColors = ["#0284c7", "#0f766e", "#7c3aed", "#f59e0b", "#ef4444", "#64748b"];

export default function ReportsPage() {
  const [period, setPeriod] = useState<InsightPeriod>("30d");
  const [view, setView] = useState<(typeof reportViews)[number]["value"]>("overview");
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
        <header className="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_22px_60px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-700">
            Module H
          </p>
          <div className="mt-3 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                Reports & Analytics
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Switch between operational, financial, and patient-focused views, then print or refresh without leaving the report workspace.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {periodOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPeriod(option.value)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      period === option.value
                        ? "bg-slate-950 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {reportViews.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setView(option.value)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      view === option.value
                        ? "bg-sky-700 text-white"
                        : "bg-sky-50 text-sky-700 hover:bg-sky-100"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => void reload()}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Print
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <article className="rounded-2xl bg-slate-950 px-4 py-4 text-white">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Appointments</p>
              <p className="mt-2 text-2xl font-semibold">{insights.periodAppointments}</p>
              <p className="mt-1 text-xs text-slate-300">selected period</p>
            </article>
            <article className="rounded-2xl bg-sky-50 px-4 py-4 ring-1 ring-sky-100">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Collected</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {formatCompactCurrency(insights.collectedRevenue)}
              </p>
              <p className="mt-1 text-xs text-slate-500">all-time receipts</p>
            </article>
            <article className="rounded-2xl bg-sky-50 px-4 py-4 ring-1 ring-sky-100">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Outstanding</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {formatCompactCurrency(insights.outstandingRevenue)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {insights.outstandingInvoiceCount} invoice{insights.outstandingInvoiceCount === 1 ? "" : "s"}
              </p>
            </article>
            <article className="rounded-2xl bg-sky-50 px-4 py-4 ring-1 ring-sky-100">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Completion</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {formatPercent(insights.completionRate)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {formatPercent(insights.noShowRate)} no-show rate
              </p>
            </article>
            <article className="rounded-2xl bg-sky-50 px-4 py-4 ring-1 ring-sky-100">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Patients</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{insights.activePatients}</p>
              <p className="mt-1 text-xs text-slate-500">active patient profiles</p>
            </article>
          </div>
        </header>

        {isLoading ? (
          <div className="rounded-[24px] border border-sky-100 bg-sky-50 px-5 py-4 text-sm text-sky-800">
            Loading report data from MongoDB...
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-[24px] border border-rose-100 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        <section className="rounded-[30px] border border-white/80 bg-[linear-gradient(135deg,#0f172a_0%,#102b46_52%,#164e63_100%)] p-6 text-white shadow-[0_20px_50px_rgba(15,23,42,0.16)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/80">
                Reporting Window
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                {formatDateLabel(insights.startDate)} to {formatDateLabel(insights.endDate)}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Use the segmented report views above to focus on workflow, revenue, or patient growth without changing pages.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10">
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Checked In</p>
                <p className="mt-2 text-2xl font-semibold">{formatPercent(insights.checkedInRate)}</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10">
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Avg / Visit</p>
                <p className="mt-2 text-2xl font-semibold">
                  {formatCurrency(insights.avgCollectedPerVisit)}
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10">
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Dentists Ready</p>
                <p className="mt-2 text-2xl font-semibold">
                  {insights.availableDentists}/{insights.totalDentists || 0}
                </p>
              </div>
            </div>
          </div>
        </section>

        {view === "overview" ? (
          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.4fr_0.95fr]">
              <section className="rounded-[30px] border border-white/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
                  Activity Trend
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Scheduled versus completed visits
                </h2>
                <div className="mt-5">
                  <TrendChart
                    labels={labels}
                    series={[
                      {
                        label: "Scheduled",
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
                  Status Mix
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Appointment outcomes
                </h2>
                <div className="mt-5">
                  {insights.statusBreakdown.length === 0 ? (
                    <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
                      No appointment activity was found for this report window.
                    </p>
                  ) : (
                    <DonutChart
                      items={insights.statusBreakdown.map((item, index) => ({
                        ...item,
                        color: reportColors[index % reportColors.length],
                      }))}
                      centerLabel="Completion"
                      centerValue={formatPercent(insights.completionRate)}
                    />
                  )}
                </div>
              </section>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <section className="rounded-[30px] border border-white/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
                  Dentist Load
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Team throughput for this period
                </h2>
                <div className="mt-5">
                  {insights.dentistLoad.length === 0 ? (
                    <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
                      Once appointments are assigned, dentist activity will be ranked here.
                    </p>
                  ) : (
                    <RankedBars
                      items={insights.dentistLoad.map((item) => ({
                        label: item.label,
                        value: item.appointments,
                        detail: `${item.completed} completed | ${item.minutes} minutes`,
                      }))}
                      color="#0284c7"
                    />
                  )}
                </div>
              </section>

              <section className="rounded-[30px] border border-white/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
                  Treatment Mix
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Most common procedures
                </h2>
                <div className="mt-5">
                  {insights.treatmentMix.length === 0 ? (
                    <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
                      Treatment analytics will appear once appointment procedures or EMR notes exist.
                    </p>
                  ) : (
                    <RankedBars items={insights.treatmentMix} color="#7c3aed" />
                  )}
                </div>
              </section>
            </div>
          </div>
        ) : null}

        {view === "finance" ? (
          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
              <section className="rounded-[30px] border border-white/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
                  Revenue Trend
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Recorded collections by day
                </h2>
                <div className="mt-5">
                  <TrendChart
                    labels={labels}
                    series={[
                      {
                        label: "Collections",
                        values: insights.timeSeries.map((point) => point.revenue),
                        color: "#f97316",
                        fillColor: "rgba(249,115,22,0.12)",
                        formatValue: formatCompactCurrency,
                      },
                    ]}
                  />
                </div>
              </section>

              <section className="rounded-[30px] border border-white/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
                  Payment Methods
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Collection channel mix
                </h2>
                <div className="mt-5">
                  {insights.paymentMix.length === 0 ? (
                    <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
                      Payment method analysis appears after recorded payments are saved.
                    </p>
                  ) : (
                    <DonutChart
                      items={insights.paymentMix.map((item, index) => ({
                        ...item,
                        color: reportColors[index % reportColors.length],
                      }))}
                      centerLabel="Collection"
                      centerValue={formatPercent(insights.collectionRate)}
                    />
                  )}
                </div>
              </section>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <section className="rounded-[30px] border border-white/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
                  Outstanding Invoices
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Balances that still need collection
                </h2>
                <div className="mt-5 space-y-3">
                  {insights.outstandingInvoices.length === 0 ? (
                    <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
                      No outstanding invoices were detected.
                    </p>
                  ) : (
                    insights.outstandingInvoices.map((item) => (
                      <article
                        key={item.invoice.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {item.invoice.invoiceNumber}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {item.invoice.patientName} | {formatDateLabel(item.invoice.issueDate)}
                            </p>
                          </div>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-100">
                            {formatCurrency(item.outstanding)}
                          </span>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                          <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                            <p className="text-slate-500">Total</p>
                            <p className="mt-1 font-semibold text-slate-900">
                              {formatCurrency(item.total)}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                            <p className="text-slate-500">Paid</p>
                            <p className="mt-1 font-semibold text-emerald-700">
                              {formatCurrency(item.paid)}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                            <p className="text-slate-500">Balance</p>
                            <p className="mt-1 font-semibold text-rose-700">
                              {formatCurrency(item.outstanding)}
                            </p>
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-[30px] border border-white/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
                  Balance Ranking
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Highest unpaid amounts
                </h2>
                <div className="mt-5">
                  {insights.outstandingInvoices.length === 0 ? (
                    <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
                      There are no unpaid balances to rank right now.
                    </p>
                  ) : (
                    <RankedBars
                      items={insights.outstandingInvoices.map((item) => ({
                        label: item.invoice.patientName,
                        value: item.outstanding,
                        detail: item.invoice.invoiceNumber,
                      }))}
                      color="#ef4444"
                      formatValue={formatCurrency}
                    />
                  )}
                </div>
              </section>
            </div>
          </div>
        ) : null}

        {view === "patients" ? (
          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
              <section className="rounded-[30px] border border-white/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
                  New Registrations
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Intake trend for the selected period
                </h2>
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
                  Patient Profile Mix
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Active and VIP coverage
                </h2>
                <div className="mt-5 grid gap-3">
                  <div className="rounded-2xl bg-slate-950 p-5 text-white">
                    <p className="text-sm text-slate-300">Total patient profiles</p>
                    <p className="mt-2 text-3xl font-semibold">{insights.totalPatients}</p>
                  </div>
                  <div className="rounded-2xl bg-sky-50 p-5 ring-1 ring-sky-100">
                    <p className="text-sm text-slate-500">Active patients</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-950">
                      {insights.activePatients}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-100">
                    <p className="text-sm text-amber-700">VIP patients</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-950">
                      {insights.vipPatients}
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <section className="rounded-[30px] border border-white/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
                  Monthly Growth
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Last six months of registrations
                </h2>
                <div className="mt-5">
                  <RankedBars items={insights.patientGrowth} color="#0f766e" />
                </div>
              </section>

              <section className="rounded-[30px] border border-white/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
                  Care Demand
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Which treatments patients need most
                </h2>
                <div className="mt-5">
                  {insights.treatmentMix.length === 0 ? (
                    <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
                      Patient demand insights will populate after clinical activity is saved.
                    </p>
                  ) : (
                    <RankedBars items={insights.treatmentMix} color="#7c3aed" />
                  )}
                </div>
              </section>
            </div>
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}
