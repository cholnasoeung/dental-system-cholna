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

// ─── Period Options ────────────────────────────────────────────────
const periodOptions: Array<{ value: InsightPeriod; label: string }> = [
  { value: "7d",  label: "7 days"  },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

// ─── CRUD Quick Actions ────────────────────────────────────────────
const crudActions = [
  {
    href: "/patients?action=new",
    label: "New Patient",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <circle cx="8" cy="6" r="3"/><path d="M2 18c0-3.3 2.7-6 6-6h2"/><path d="M15 12v6M12 15h6"/>
      </svg>
    ),
    color: "bg-violet-600 hover:bg-violet-500 shadow-violet-500/25",
  },
  {
    href: "/appointments?action=new",
    label: "New Appointment",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <rect x="2" y="3" width="16" height="15" rx="2"/><path d="M6 2v2M14 2v2M2 8h16M10 12v4M8 14h4"/>
      </svg>
    ),
    color: "bg-sky-600 hover:bg-sky-500 shadow-sky-500/25",
  },
  {
    href: "/billing?action=new",
    label: "New Invoice",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <rect x="2" y="4" width="16" height="12" rx="2"/><path d="M2 9h16M10 13a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/>
      </svg>
    ),
    color: "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/25",
  },
  {
    href: "/emr?action=new",
    label: "New Record",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M7 3H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2"/>
        <rect x="7" y="1" width="6" height="4" rx="1"/><path d="M10 10v4M8 12h4"/>
      </svg>
    ),
    color: "bg-amber-600 hover:bg-amber-500 shadow-amber-500/25",
  },
];

// ─── Navigation Cards ──────────────────────────────────────────────
const navCards = [
  {
    href: "/appointments",
    label: "Appointments",
    desc: "Schedule & manage visits",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect x="2" y="3" width="16" height="15" rx="2"/><path d="M6 2v2M14 2v2M2 8h16"/>
      </svg>
    ),
    accent: "text-sky-600 bg-sky-50 ring-sky-200/60",
    border: "hover:border-sky-200",
  },
  {
    href: "/patients",
    label: "Patients",
    desc: "Records & history",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <circle cx="8" cy="6" r="3"/><path d="M2 18c0-3.3 2.7-6 6-6h4"/><circle cx="15" cy="9" r="2.5"/>
      </svg>
    ),
    accent: "text-violet-600 bg-violet-50 ring-violet-200/60",
    border: "hover:border-violet-200",
  },
  {
    href: "/billing",
    label: "Billing",
    desc: "Invoices & payments",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect x="2" y="4" width="16" height="12" rx="2"/><path d="M2 9h16M6 13h2M10 13h4"/>
      </svg>
    ),
    accent: "text-emerald-600 bg-emerald-50 ring-emerald-200/60",
    border: "hover:border-emerald-200",
  },
  {
    href: "/reports",
    label: "Reports",
    desc: "Analytics & export",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M3 17V9M8 17V5M13 17v-6M18 17v-3"/>
      </svg>
    ),
    accent: "text-orange-600 bg-orange-50 ring-orange-200/60",
    border: "hover:border-orange-200",
  },
];

const statusColors = ["#0891b2", "#2563eb", "#7c3aed", "#d97706", "#e11d48", "#64748b"];

// ─── Status badge ──────────────────────────────────────────────────
function statusBadgeClass(status: string) {
  const map: Record<string, string> = {
    completed:    "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    "in-progress":"bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    confirmed:    "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
    "checked-in": "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
    scheduled:    "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
    "no-show":    "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    canceled:     "bg-red-50 text-red-600 ring-1 ring-red-200",
  };
  return map[status] ?? "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
}

// ─── Alert style ───────────────────────────────────────────────────
function alertStyle(tone: string) {
  if (tone === "rose")  return "border-rose-200  bg-rose-50  text-rose-800";
  if (tone === "amber") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-sky-200 bg-sky-50 text-sky-800";
}
function alertDot(tone: string) {
  if (tone === "rose")  return "bg-rose-400";
  if (tone === "amber") return "bg-amber-400";
  return "bg-sky-400";
}

// ─── KPI Card ──────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon, accent = "cyan",
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  accent?: "cyan" | "emerald" | "violet" | "amber";
}) {
  const accents = {
    cyan:    "bg-cyan-50    text-cyan-600    ring-cyan-200/60",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-200/60",
    violet:  "bg-violet-50  text-violet-600  ring-violet-200/60",
    amber:   "bg-amber-50   text-amber-600   ring-amber-200/60",
  };
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ${accents[accent]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        <p className="mt-0.5 truncate text-xs text-slate-500">{sub}</p>
      </div>
    </div>
  );
}

// ─── Section Card ──────────────────────────────────────────────────
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

// ─── Section Header ────────────────────────────────────────────────
function SectionHead({
  tag, title, sub, action,
}: {
  tag: string;
  title: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-cyan-600">{tag}</p>
        <h2 className="mt-0.5 text-base font-bold tracking-tight text-slate-900">{title}</h2>
        {sub ? <p className="mt-0.5 text-xs text-slate-400">{sub}</p> : null}
      </div>
      {action}
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────
export function DashboardOverview() {
  const [period, setPeriod] = useState<InsightPeriod>("30d");
  const { patients, appointments, invoices, records, staffMembers, isLoading, errorMessage, reload } =
    useClinicOverviewData();

  const insights = useMemo(
    () => buildClinicInsights({ patients, appointments, invoices, records, staffMembers, period }),
    [appointments, invoices, patients, period, records, staffMembers],
  );

  const labels = insights.timeSeries.map((p) => p.label);

  return (
    <AdminShell>
      <div className="mx-auto max-w-[1400px] space-y-6">

        {/* ── Page Header ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Welcome back — here's what's happening at your clinic today.
            </p>
          </div>

          {/* Right controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Period selector */}
            <div className="flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
              {periodOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPeriod(opt.value)}
                  className={`rounded-[10px] px-3.5 py-1.5 text-xs font-semibold transition ${
                    period === opt.value
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Refresh */}
            <button
              type="button"
              onClick={() => void reload()}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <path d="M1 8a7 7 0 1 0 2-4.9"/><path d="M1 3v5h5"/>
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Loading / Error banners */}
        {isLoading && (
          <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
            <svg className="h-4 w-4 animate-spin shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="8" cy="8" r="6" strokeOpacity=".25"/><path d="M14 8a6 6 0 0 0-6-6" strokeLinecap="round"/>
            </svg>
            Loading dashboard data…
          </div>
        )}
        {errorMessage && (
          <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4 shrink-0">
              <circle cx="8" cy="8" r="7"/><path d="M8 5v3M8 11h.01"/>
            </svg>
            {errorMessage}
          </div>
        )}

        {/* ── CRUD Quick Actions ────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {crudActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={`flex items-center justify-center gap-2.5 rounded-xl py-3 px-4 text-sm font-semibold text-white shadow-md transition active:scale-95 ${action.color}`}
            >
              {action.icon}
              <span className="hidden sm:inline">{action.label}</span>
              <span className="sm:hidden">{action.label.split(" ")[1]}</span>
            </Link>
          ))}
        </div>

        {/* ── KPI Cards ─────────────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Today's Appointments"
            value={insights.todayAppointments.length}
            sub="on the schedule"
            accent="cyan"
            icon={
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <rect x="2" y="3" width="16" height="15" rx="2"/><path d="M6 2v2M14 2v2M2 8h16"/>
              </svg>
            }
          />
          <KpiCard
            label="Revenue Collected"
            value={formatCompactCurrency(insights.collectedRevenue)}
            sub={`${formatPercent(insights.collectionRate)} collection rate`}
            accent="emerald"
            icon={
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <rect x="2" y="4" width="16" height="12" rx="2"/><path d="M2 9h16M10 13a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/>
              </svg>
            }
          />
          <KpiCard
            label="Completion Rate"
            value={formatPercent(insights.completionRate)}
            sub={`${formatPercent(insights.noShowRate)} no-show rate`}
            accent="violet"
            icon={
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <circle cx="10" cy="10" r="8"/><path d="M6.5 10.5l2.5 2.5 4.5-5"/>
              </svg>
            }
          />
          <KpiCard
            label="Dentists Available"
            value={`${insights.availableDentists} / ${insights.totalDentists || 0}`}
            sub="available right now"
            accent="amber"
            icon={
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <circle cx="8" cy="6" r="3"/><path d="M2 18c0-3.3 2.7-6 6-6h2"/><path d="M12 15l2 2 4-4"/>
              </svg>
            }
          />
        </div>

        {/* ── Charts Row ─────────────────────────────────────────────── */}
        <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          {/* Appointment trend */}
          <Card className="p-5">
            <SectionHead
              tag="Operations Trend"
              title="Daily appointment flow"
              sub={`${insights.periodAppointments} total · ${formatDateLabel(insights.startDate)} – ${formatDateLabel(insights.endDate)}`}
              action={
                <Link href="/appointments" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100">
                  View all
                </Link>
              }
            />
            <div className="mt-4">
              <TrendChart
                labels={labels}
                series={[
                  { label: "Booked",    values: insights.timeSeries.map((p) => p.appointments), color: "#0284c7", fillColor: "rgba(2,132,199,0.10)" },
                  { label: "Completed", values: insights.timeSeries.map((p) => p.completed),    color: "#059669", fillColor: "rgba(5,150,105,0.08)" },
                ]}
              />
            </div>
          </Card>

          {/* Revenue trend */}
          <Card className="p-5">
            <SectionHead
              tag="Revenue Pulse"
              title="Collections this period"
              sub="Payments plotted by recorded date."
            />
            <div className="mt-4 rounded-xl bg-slate-900 px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-500">Avg per completed visit</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-white">{formatCurrency(insights.avgCollectedPerVisit)}</p>
            </div>
            <div className="mt-4">
              <TrendChart
                labels={labels}
                series={[{ label: "Revenue", values: insights.timeSeries.map((p) => p.revenue), color: "#f97316", fillColor: "rgba(249,115,22,0.12)", formatValue: formatCompactCurrency }]}
              />
            </div>
          </Card>
        </div>

        {/* ── Status + Workload ─────────────────────────────────────── */}
        <div className="grid gap-5 xl:grid-cols-3">
          {/* Donut */}
          <Card className="p-5">
            <SectionHead tag="Visit Status" title="Appointment breakdown" />
            <div className="mt-4">
              {insights.statusBreakdown.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                  <p className="text-sm text-slate-400">No appointment activity yet.</p>
                </div>
              ) : (
                <DonutChart
                  items={insights.statusBreakdown.map((item, i) => ({ ...item, color: statusColors[i % statusColors.length] }))}
                  centerLabel="Done"
                  centerValue={formatPercent(insights.completionRate)}
                />
              )}
            </div>
          </Card>

          {/* Dentist workload */}
          <Card className="p-5 xl:col-span-2">
            <SectionHead
              tag="Team Output"
              title="Dentist workload ranking"
              sub={`${insights.completedRecords} completed EMR record${insights.completedRecords === 1 ? "" : "s"}`}
              action={
                <Link href="/staff" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100">
                  Manage staff
                </Link>
              }
            />
            <div className="mt-4">
              {insights.dentistLoad.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                  <p className="text-sm text-slate-400">Workload appears after appointments are assigned.</p>
                </div>
              ) : (
                <RankedBars
                  items={insights.dentistLoad.map((item) => ({
                    label: item.label,
                    value: item.appointments,
                    detail: `${item.completed} completed · ${item.minutes} min`,
                  }))}
                  color="#0284c7"
                />
              )}
            </div>
          </Card>
        </div>

        {/* ── Today Queue + Alerts + Quick Nav ──────────────────────── */}
        <div className="grid gap-5 xl:grid-cols-3">

          {/* Today's Queue */}
          <Card>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <SectionHead tag="Today's Queue" title="Chairside schedule" />
              {insights.todayAppointments.length > 6 && (
                <Link href="/appointments" className="text-xs font-semibold text-cyan-600 hover:underline">
                  View all
                </Link>
              )}
            </div>
            <div className="divide-y divide-slate-50">
              {insights.todayAppointments.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-slate-400">
                      <rect x="2" y="3" width="16" height="15" rx="2"/><path d="M6 2v2M14 2v2M2 8h16"/>
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-500">No appointments today</p>
                  <Link href="/appointments?action=new" className="mt-2 inline-block text-xs font-semibold text-cyan-600 hover:underline">
                    + Schedule one
                  </Link>
                </div>
              ) : (
                insights.todayAppointments.slice(0, 6).map((apt) => (
                  <div key={apt.id} className="flex items-start gap-3 px-5 py-3.5 transition hover:bg-slate-50">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[11px] font-bold text-slate-600">
                      {apt.patientName.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{apt.patientName}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{apt.startTime} · {apt.dentist || "Unassigned"}</p>
                    </div>
                    <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(apt.status)}`}>
                      {apt.status}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-slate-100 px-5 py-3">
              <Link href="/appointments?action=new" className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <path d="M8 3v10M3 8h10"/>
                </svg>
                Book Appointment
              </Link>
            </div>
          </Card>

          {/* Attention Board */}
          <Card>
            <div className="border-b border-slate-100 px-5 py-4">
              <SectionHead tag="Attention Board" title="Needs follow-up" />
            </div>
            <div className="px-5 py-4 space-y-2.5">
              {insights.alerts.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-5 text-center">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-emerald-500">
                    <circle cx="10" cy="10" r="8"/><path d="M6.5 10.5l2.5 2.5 4.5-5"/>
                  </svg>
                  <p className="text-sm font-semibold text-emerald-700">All clear — no alerts</p>
                </div>
              ) : (
                insights.alerts.map((alert) => (
                  <div
                    key={alert.title}
                    className={`flex gap-3 rounded-xl border px-4 py-3.5 ${alertStyle(alert.tone)}`}
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${alertDot(alert.tone)}`} />
                    <div>
                      <p className="text-sm font-semibold">{alert.title}</p>
                      <p className="mt-0.5 text-xs opacity-75">{alert.detail}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mx-5 mb-5 rounded-xl bg-slate-900 px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-500">Urgent booked</p>
              <p className="mt-1 text-3xl font-bold text-white">{insights.urgentUpcomingCount}</p>
              <p className="mt-0.5 text-xs text-slate-500">urgent visit{insights.urgentUpcomingCount === 1 ? "" : "s"} scheduled</p>
            </div>
          </Card>

          {/* Quick Navigation */}
          <Card>
            <div className="border-b border-slate-100 px-5 py-4">
              <SectionHead tag="Quick Navigate" title="Go to module" />
            </div>
            <div className="p-5 space-y-2.5">
              {navCards.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3.5 rounded-xl border border-slate-200 p-3.5 transition hover:shadow-sm ${item.border}`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${item.accent}`}>
                    {item.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{item.desc}</p>
                  </div>
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0 text-slate-300">
                    <path d="M6 3l5 5-5 5"/>
                  </svg>
                </Link>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Patient Intake + Treatment Mix ────────────────────────── */}
        <div className="grid gap-5 xl:grid-cols-2">
          <Card className="p-5">
            <SectionHead
              tag="Patient Intake"
              title="New registrations over time"
              sub={`${insights.activePatients} active · ${insights.vipPatients} VIP`}
              action={
                <Link href="/patients?action=new" className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100">
                  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3 w-3">
                    <path d="M7 2v10M2 7h10"/>
                  </svg>
                  Add patient
                </Link>
              }
            />
            <div className="mt-4">
              <TrendChart
                labels={labels}
                series={[{ label: "New Patients", values: insights.timeSeries.map((p) => p.newPatients), color: "#7c3aed", fillColor: "rgba(124,58,237,0.12)" }]}
              />
            </div>
          </Card>

          <Card className="p-5">
            <SectionHead
              tag="Treatment Demand"
              title="Most frequent care types"
              action={
                <Link href="/emr" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100">
                  View EMR
                </Link>
              }
            />
            <div className="mt-4">
              {insights.treatmentMix.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                  <p className="text-sm text-slate-400">Treatment demand appears after procedures are saved.</p>
                </div>
              ) : (
                <RankedBars items={insights.treatmentMix} color="#7c3aed" />
              )}
            </div>
          </Card>
        </div>

      </div>
    </AdminShell>
  );
}
