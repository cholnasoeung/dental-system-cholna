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
      <div className="w-full space-y-6 animate-fade-in">

        {/* Page Header */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-600">
                Module H — Analytics
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                Reports & Analytics
              </h1>
              <p className="mt-1 max-w-xl text-sm text-slate-500">
                Switch between operational, financial, and patient views. Print or refresh without leaving the workspace.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 xl:items-end">
              {/* Period selector */}
              <div className="flex gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1">
                {periodOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPeriod(opt.value)}
                    className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
                      period === opt.value
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* View selector */}
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1">
                  {reportViews.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setView(opt.value)}
                      className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
                        view === opt.value
                          ? "bg-sky-600 text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => void reload()}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Print
                </button>
              </div>
            </div>
          </div>

          {/* KPI Row */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-xl bg-slate-900 px-4 py-3.5 text-white">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-300">Appointments</p>
              <p className="mt-2 text-2xl font-bold">{insights.periodAppointments}</p>
              <p className="mt-0.5 text-xs text-slate-400">selected period</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Collected</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatCompactCurrency(insights.collectedRevenue)}</p>
              <p className="mt-0.5 text-xs text-slate-400">all-time receipts</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Outstanding</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatCompactCurrency(insights.outstandingRevenue)}</p>
              <p className="mt-0.5 text-xs text-slate-400">
                {insights.outstandingInvoiceCount} invoice{insights.outstandingInvoiceCount === 1 ? "" : "s"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Completion</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatPercent(insights.completionRate)}</p>
              <p className="mt-0.5 text-xs text-slate-400">{formatPercent(insights.noShowRate)} no-show</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Patients</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{insights.activePatients}</p>
              <p className="mt-0.5 text-xs text-slate-400">active profiles</p>
            </div>
          </div>
        </div>

        {/* Status banners */}
        {isLoading && (
          <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-700">
            Loading report data from MongoDB...
          </div>
        )}
        {errorMessage && (
          <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

        {/* Reporting window banner */}
        <div className="rounded-2xl bg-slate-900 p-5 text-white">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-300">Reporting Window</p>
              <h2 className="mt-1.5 text-lg font-bold">
                {formatDateLabel(insights.startDate)} — {formatDateLabel(insights.endDate)}
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-3 lg:min-w-[400px]">
              <div className="rounded-xl bg-white/10 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-300">Checked In</p>
                <p className="mt-1.5 text-xl font-bold">{formatPercent(insights.checkedInRate)}</p>
              </div>
              <div className="rounded-xl bg-white/10 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-300">Avg / Visit</p>
                <p className="mt-1.5 text-xl font-bold">{formatCurrency(insights.avgCollectedPerVisit)}</p>
              </div>
              <div className="rounded-xl bg-white/10 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-300">Dentists</p>
                <p className="mt-1.5 text-xl font-bold">{insights.availableDentists}/{insights.totalDentists || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Operations View ── */}
        {view === "overview" && (
          <div className="space-y-5">
            <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-600">Activity Trend</p>
                <h2 className="mt-1 text-base font-bold text-slate-900">Scheduled vs completed visits</h2>
                <div className="mt-4">
                  <TrendChart
                    labels={labels}
                    series={[
                      { label: "Scheduled", values: insights.timeSeries.map((p) => p.appointments), color: "#0284c7", fillColor: "rgba(2,132,199,0.10)" },
                      { label: "Completed", values: insights.timeSeries.map((p) => p.completed), color: "#0f766e", fillColor: "rgba(15,118,110,0.08)" },
                    ]}
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-600">Status Mix</p>
                <h2 className="mt-1 text-base font-bold text-slate-900">Appointment outcomes</h2>
                <div className="mt-4">
                  {insights.statusBreakdown.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                      No appointment activity in this window.
                    </p>
                  ) : (
                    <DonutChart
                      items={insights.statusBreakdown.map((item, i) => ({ ...item, color: reportColors[i % reportColors.length] }))}
                      centerLabel="Completion"
                      centerValue={formatPercent(insights.completionRate)}
                    />
                  )}
                </div>
              </section>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-600">Dentist Load</p>
                <h2 className="mt-1 text-base font-bold text-slate-900">Team throughput for this period</h2>
                <div className="mt-4">
                  {insights.dentistLoad.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                      Assign appointments to see dentist rankings.
                    </p>
                  ) : (
                    <RankedBars
                      items={insights.dentistLoad.map((item) => ({
                        label: item.label,
                        value: item.appointments,
                        detail: `${item.completed} completed | ${item.minutes} min`,
                      }))}
                      color="#0284c7"
                    />
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-600">Treatment Mix</p>
                <h2 className="mt-1 text-base font-bold text-slate-900">Most common procedures</h2>
                <div className="mt-4">
                  {insights.treatmentMix.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                      Treatment analytics appear after clinical activity is saved.
                    </p>
                  ) : (
                    <RankedBars items={insights.treatmentMix} color="#7c3aed" />
                  )}
                </div>
              </section>
            </div>
          </div>
        )}

        {/* ── Finance View ── */}
        {view === "finance" && (
          <div className="space-y-5">
            <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-600">Revenue Trend</p>
                <h2 className="mt-1 text-base font-bold text-slate-900">Recorded collections by day</h2>
                <div className="mt-4">
                  <TrendChart
                    labels={labels}
                    series={[
                      { label: "Collections", values: insights.timeSeries.map((p) => p.revenue), color: "#f97316", fillColor: "rgba(249,115,22,0.12)", formatValue: formatCompactCurrency },
                    ]}
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-600">Payment Methods</p>
                <h2 className="mt-1 text-base font-bold text-slate-900">Collection channel mix</h2>
                <div className="mt-4">
                  {insights.paymentMix.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                      Payment method analysis appears after payments are recorded.
                    </p>
                  ) : (
                    <DonutChart
                      items={insights.paymentMix.map((item, i) => ({ ...item, color: reportColors[i % reportColors.length] }))}
                      centerLabel="Collection"
                      centerValue={formatPercent(insights.collectionRate)}
                    />
                  )}
                </div>
              </section>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-600">Outstanding Invoices</p>
                <h2 className="mt-1 text-base font-bold text-slate-900">Balances that need collection</h2>
                <div className="mt-4 space-y-3">
                  {insights.outstandingInvoices.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                      No outstanding invoices detected.
                    </p>
                  ) : (
                    insights.outstandingInvoices.map((item) => (
                      <div key={item.invoice.id} className="rounded-xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{item.invoice.invoiceNumber}</p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {item.invoice.patientName} · {formatDateLabel(item.invoice.issueDate)}
                            </p>
                          </div>
                          <span className="rounded-full border border-rose-100 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                            {formatCurrency(item.outstanding)}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                          <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                            <p className="text-slate-400">Total</p>
                            <p className="mt-0.5 font-semibold text-slate-800">{formatCurrency(item.total)}</p>
                          </div>
                          <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                            <p className="text-slate-400">Paid</p>
                            <p className="mt-0.5 font-semibold text-emerald-700">{formatCurrency(item.paid)}</p>
                          </div>
                          <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                            <p className="text-slate-400">Balance</p>
                            <p className="mt-0.5 font-semibold text-rose-700">{formatCurrency(item.outstanding)}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-600">Balance Ranking</p>
                <h2 className="mt-1 text-base font-bold text-slate-900">Highest unpaid amounts</h2>
                <div className="mt-4">
                  {insights.outstandingInvoices.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                      No unpaid balances to rank right now.
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
        )}

        {/* ── Patients View ── */}
        {view === "patients" && (
          <div className="space-y-5">
            <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-600">New Registrations</p>
                <h2 className="mt-1 text-base font-bold text-slate-900">Intake trend for selected period</h2>
                <div className="mt-4">
                  <TrendChart
                    labels={labels}
                    series={[
                      { label: "New Patients", values: insights.timeSeries.map((p) => p.newPatients), color: "#7c3aed", fillColor: "rgba(124,58,237,0.12)" },
                    ]}
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-600">Patient Profile Mix</p>
                <h2 className="mt-1 text-base font-bold text-slate-900">Active and VIP coverage</h2>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-xl bg-slate-900 px-4 py-4 text-white">
                    <p className="text-xs text-slate-400">Total patient profiles</p>
                    <p className="mt-1.5 text-3xl font-bold">{insights.totalPatients}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-200 px-4 py-4">
                      <p className="text-xs text-slate-400">Active</p>
                      <p className="mt-1.5 text-2xl font-bold text-slate-900">{insights.activePatients}</p>
                    </div>
                    <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-4">
                      <p className="text-xs text-amber-600">VIP</p>
                      <p className="mt-1.5 text-2xl font-bold text-slate-900">{insights.vipPatients}</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-600">Monthly Growth</p>
                <h2 className="mt-1 text-base font-bold text-slate-900">Last six months of registrations</h2>
                <div className="mt-4">
                  <RankedBars items={insights.patientGrowth} color="#0f766e" />
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-600">Care Demand</p>
                <h2 className="mt-1 text-base font-bold text-slate-900">Treatments patients need most</h2>
                <div className="mt-4">
                  {insights.treatmentMix.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                      Patient demand insights appear after clinical activity is saved.
                    </p>
                  ) : (
                    <RankedBars items={insights.treatmentMix} color="#7c3aed" />
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
