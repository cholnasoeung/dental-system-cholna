"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";

import { AdminShell } from "@/components/admin-shell";
import {
  branchCatalog,
  chairCatalog,
  initialAppointmentForm,
  procedureCatalog,
  statusOptions,
  type Appointment,
  type AppointmentAnalytics,
  type AppointmentFormState,
  type AppointmentStatus,
  type AppointmentWaitlistEntry,
  type PatientProfile,
  type StaffMember,
} from "@/lib/clinic-types";

const input = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100";
const lbl = "mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-500";

function fmtDate(d: string) {
  return d ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${d}T00:00:00`)) : "Not set";
}
function fmtMin(m: number) {
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}
function inView(date: string, anchor: string, view: "day" | "week" | "month") {
  if (!date || !anchor) return true;
  if (view === "day") return date === anchor;
  if (view === "month") return date.slice(0, 7) === anchor.slice(0, 7);
  const base = new Date(`${anchor}T00:00:00`);
  const d = base.getDay();
  const diff = d === 0 ? -6 : 1 - d;
  const start = new Date(base); start.setDate(base.getDate() + diff); start.setHours(0,0,0,0);
  const end = new Date(start); end.setDate(end.getDate() + 6);
  const t = new Date(`${date}T00:00:00`);
  return t >= start && t <= end;
}

const statusBadge: Record<string, string> = {
  scheduled:    "bg-slate-100 text-slate-600",
  confirmed:    "bg-sky-100 text-sky-700",
  "checked-in": "bg-violet-100 text-violet-700",
  "in-progress":"bg-blue-100 text-blue-700",
  completed:    "bg-emerald-100 text-emerald-700",
  "no-show":    "bg-rose-100 text-rose-700",
  canceled:     "bg-red-100 text-red-600",
};

export default function AppointmentsPage() {
  const [form, setForm] = useState<AppointmentFormState>(initialAppointmentForm);
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [waitlist, setWaitlist] = useState<AppointmentWaitlistEntry[]>([]);
  const [analytics, setAnalytics] = useState<AppointmentAnalytics | null>(null);
  const [view, setView] = useState<"day" | "week" | "month">("day");
  const [anchorDate, setAnchorDate] = useState(new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function loadData() {
    try {
      setIsLoading(true);
      const [pRes, aRes, sRes, wRes, anRes] = await Promise.all([
        fetch("/api/patients", { cache: "no-store" }),
        fetch("/api/appointments", { cache: "no-store" }),
        fetch("/api/staff", { cache: "no-store" }),
        fetch("/api/appointments/waitlist", { cache: "no-store" }),
        fetch("/api/appointments/analytics", { cache: "no-store" }),
      ]);
      if (!pRes.ok || !aRes.ok || !sRes.ok || !wRes.ok || !anRes.ok) throw new Error("Unable to load data.");
      const [p, a, s, w, an] = await Promise.all([pRes.json(), aRes.json(), sRes.json(), wRes.json(), anRes.json()]);
      setPatients(p as PatientProfile[]); setAppointments(a as Appointment[]);
      setStaffMembers(s as StaffMember[]); setWaitlist(w as AppointmentWaitlistEntry[]);
      setAnalytics(an as AppointmentAnalytics); setErrorMessage("");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Unable to load appointments.");
    } finally { setIsLoading(false); }
  }

  useEffect(() => { void loadData(); }, []);

  const dentists   = useMemo(() => staffMembers.filter((m) => m.role === "dentist"), [staffMembers]);
  const assistants = useMemo(() => staffMembers.filter((m) => m.role === "nurse" || m.role === "receptionist"), [staffMembers]);
  const hygienists = useMemo(() => staffMembers.filter((m) => m.role === "hygienist"), [staffMembers]);
  const selectedProcs = useMemo(() => procedureCatalog.filter((p) => form.procedureIds.includes(p.id)), [form.procedureIds]);

  const filtered = useMemo(() =>
    appointments
      .filter((a) => inView(a.date, anchorDate, view))
      .filter((a) => statusFilter === "all" || a.status === statusFilter)
      .filter((a) => {
        const kw = search.trim().toLowerCase();
        return !kw || [a.appointmentId, a.patientName, a.dentist, a.reason, a.chairName].join(" ").toLowerCase().includes(kw);
      })
      .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`)),
  [anchorDate, appointments, search, statusFilter, view]);

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    const checked = "checked" in e.target ? e.target.checked : false;
    setForm((c) => ({
      ...c,
      [name]: type === "checkbox" ? checked
        : (name === "bufferMinutes" || name === "recurrenceInterval" || name === "recurrenceSessions") ? Number(value)
        : value,
    }));
  }

  function toggleProc(id: string) {
    setForm((c) => ({
      ...c,
      procedureIds: c.procedureIds.includes(id) ? c.procedureIds.filter((x) => x !== id) : [...c.procedureIds, id],
    }));
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    try {
      setIsSaving(true); setConflicts([]); setErrorMessage("");
      const res = await fetch("/api/appointments", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (res.status === 409) {
        const payload = (await res.json()) as { conflicts?: Array<{ message: string }> };
        setConflicts(payload.conflicts?.map((c) => c.message) ?? []);
        setErrorMessage("Slot has conflicts — try waitlist mode.");
        return;
      }
      if (!res.ok) throw new Error("Appointment could not be saved.");
      setForm(initialAppointmentForm); setShowForm(false);
      await loadData();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Appointment could not be saved.");
    } finally { setIsSaving(false); }
  }

  async function updateStatus(id: string, status: AppointmentStatus) {
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Status update failed.");
      await loadData();
    } catch (e) { setErrorMessage(e instanceof Error ? e.message : "Status update failed."); }
  }

  const totalEst = selectedProcs.reduce((s, p) => s + p.durationMinutes, 0) + form.bufferMinutes;
  const totalPrice = selectedProcs.reduce((s, p) => s + p.defaultPrice, 0);

  return (
    <AdminShell>
      <div className="mx-auto max-w-[1400px] space-y-6">

        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-sky-600">Module B</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">Appointments</h1>
            <p className="mt-1 text-sm text-slate-500">Book, schedule, and manage patient visits.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5">
              <path d="M8 2v12M2 8h12"/>
            </svg>
            {showForm ? "Hide Form" : "New Appointment"}
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total", value: analytics?.totalAppointments ?? appointments.length, dark: true },
            { label: "Completed", value: analytics?.completedCount ?? 0, dark: false },
            { label: "No-show %", value: `${analytics?.noShowRate ?? 0}%`, dark: false },
            { label: "Waitlist", value: waitlist.filter((w) => w.status === "waiting").length, dark: false },
          ].map((k) => (
            <div key={k.label} className={`rounded-2xl border border-slate-200 px-4 py-3 shadow-sm ${k.dark ? "bg-slate-900" : "bg-white"}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-widest ${k.dark ? "text-slate-400" : "text-slate-400"}`}>{k.label}</p>
              <p className={`mt-1.5 text-2xl font-bold ${k.dark ? "text-white" : "text-slate-900"}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Banners */}
        {isLoading && (
          <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
            <svg className="h-4 w-4 animate-spin shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="8" cy="8" r="6" strokeOpacity=".25"/><path d="M14 8a6 6 0 0 0-6-6" strokeLinecap="round"/>
            </svg>
            Loading appointment data…
          </div>
        )}
        {errorMessage && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mt-0.5 h-4 w-4 shrink-0">
              <circle cx="8" cy="8" r="7"/><path d="M8 5v3M8 11h.01"/>
            </svg>
            {errorMessage}
          </div>
        )}
        {conflicts.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {conflicts.map((c) => <p key={c}>⚠ {c}</p>)}
          </div>
        )}

        {/* ── Booking Form ───────────────────────────────────────────── */}
        {showForm && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Book Appointment</h2>
                <p className="mt-0.5 text-xs text-slate-500">Fill in patient, date, procedures, and staff details.</p>
              </div>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
                Cancel
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              {/* Patient + Queue */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">Patient & Queue</p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="sm:col-span-2">
                    <label className={lbl}>Patient *</label>
                    <select name="patientId" value={form.patientId} onChange={handleChange} className={input}>
                      <option value="">Select patient</option>
                      {patients.map((p) => <option key={p.id} value={p.id}>{p.fullName}{p.patientId ? ` (${p.patientId})` : ""}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Queue Mode</label>
                    <select name="queueMode" value={form.queueMode} onChange={handleChange} className={input}>
                      <option value="booked">Booked</option>
                      <option value="walk-in">Walk-in</option>
                      <option value="waitlist">Waitlist</option>
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Priority</label>
                    <select name="priority" value={form.priority} onChange={handleChange} className={input}>
                      <option value="normal">Normal</option>
                      <option value="urgent">🔴 Urgent</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Schedule */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">Schedule & Location</p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className={lbl}>Date</label>
                    <input type="date" name="date" value={form.date} onChange={handleChange} className={input} />
                  </div>
                  <div>
                    <label className={lbl}>Start Time</label>
                    <input type="time" name="startTime" value={form.startTime} onChange={handleChange} className={input} />
                  </div>
                  <div>
                    <label className={lbl}>Buffer (min)</label>
                    <input type="number" min="0" name="bufferMinutes" value={form.bufferMinutes} onChange={handleChange} className={input} />
                  </div>
                  <div>
                    <label className={lbl}>Status</label>
                    <select name="status" value={form.status} onChange={handleChange} className={input}>
                      {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Branch</label>
                    <select name="branchId" value={form.branchId} onChange={handleChange} className={input}>
                      {branchCatalog.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Chair</label>
                    <select name="chairId" value={form.chairId} onChange={handleChange} className={input}>
                      <option value="">Choose chair</option>
                      {chairCatalog.filter((c) => c.branchId === form.branchId).map((c) => <option key={c.id} value={c.id}>{c.name} · {c.roomId} · {c.status}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Staff */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">Staff Assignment</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className={lbl}>Dentist</label>
                    <select name="dentistId" value={form.dentistId} onChange={handleChange} className={input}>
                      <option value="">Assign dentist</option>
                      {dentists.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Assistant <span className="normal-case text-slate-400">(optional)</span></label>
                    <select name="assistantId" value={form.assistantId} onChange={handleChange} className={input}>
                      <option value="">None</option>
                      {assistants.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Hygienist <span className="normal-case text-slate-400">(optional)</span></label>
                    <select name="hygienistId" value={form.hygienistId} onChange={handleChange} className={input}>
                      <option value="">None</option>
                      {hygienists.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Procedures */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">Procedures</p>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {procedureCatalog.map((proc) => (
                    <label key={proc.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${form.procedureIds.includes(proc.id) ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                      <input type="checkbox" checked={form.procedureIds.includes(proc.id)} onChange={() => toggleProc(proc.id)} className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-sky-600" />
                      <span>
                        <span className="block text-sm font-semibold text-slate-900">{proc.name}</span>
                        <span className="text-xs text-slate-500">{fmtMin(proc.durationMinutes)} · ${proc.defaultPrice}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Notes + Reminder */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={lbl}>Reason / Summary</label>
                  <input name="reason" value={form.reason} onChange={handleChange} placeholder="Reason for visit" className={input} />
                </div>
                <div>
                  <label className={lbl}>Reminder Channel</label>
                  <select name="reminderChannel" value={form.reminderChannel} onChange={handleChange} className={input}>
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                    <option value="both">SMS + Email</option>
                  </select>
                </div>
                <div>
                  <label className={lbl}>Pre-visit Notes</label>
                  <textarea name="preVisitNotes" value={form.preVisitNotes} onChange={handleChange} placeholder="Instructions for patient" rows={3} className={`${input} resize-none`} />
                </div>
                <div>
                  <label className={lbl}>General Notes</label>
                  <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Internal notes" rows={3} className={`${input} resize-none`} />
                </div>
              </div>

              {/* Recurrence */}
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input type="checkbox" name="recurrenceEnabled" checked={form.recurrenceEnabled} onChange={handleChange} className="h-4 w-4 rounded accent-sky-600" />
                  Recurring appointment
                </label>
                {form.recurrenceEnabled && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className={lbl}>Frequency</label>
                      <select name="recurrenceType" value={form.recurrenceType} onChange={handleChange} className={input}>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <div>
                      <label className={lbl}>Interval</label>
                      <input type="number" min="1" name="recurrenceInterval" value={form.recurrenceInterval} onChange={handleChange} className={input} />
                    </div>
                    <div>
                      <label className={lbl}>Sessions</label>
                      <input type="number" min="1" name="recurrenceSessions" value={form.recurrenceSessions} onChange={handleChange} className={input} />
                    </div>
                  </div>
                )}
              </div>

              {/* Summary bar */}
              {selectedProcs.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-900 px-5 py-3.5 text-sm text-white">
                  <span className="text-slate-300">{selectedProcs.map((p) => p.name).join(", ")}</span>
                  <span className="font-bold">{fmtMin(totalEst)} · ${totalPrice}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-1">
                <button type="submit" disabled={isSaving} className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
                  {isSaving ? (
                    <><svg className="h-4 w-4 animate-spin" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="8" r="6" strokeOpacity=".3"/><path d="M14 8a6 6 0 0 0-6-6" strokeLinecap="round"/></svg>Saving…</>
                  ) : form.queueMode === "waitlist" ? "Add to Waitlist" : "Book Appointment"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Schedule Board ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Schedule Board</h2>
              <p className="mt-0.5 text-xs text-slate-500">{filtered.length} appointment{filtered.length !== 1 ? "s" : ""} in view</p>
            </div>
            <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
              {(["day", "week", "month"] as const).map((v) => (
                <button key={v} type="button" onClick={() => setView(v)}
                  className={`rounded-lg px-4 py-1.5 text-xs font-semibold capitalize transition ${view === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 border-b border-slate-100 px-5 py-4 sm:grid-cols-3">
            <div className="relative">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400">
                <circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/>
              </svg>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patient, dentist, chair…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3.5 text-sm outline-none transition focus:border-sky-400 focus:bg-white" />
            </div>
            <input type="date" value={anchorDate} onChange={(e) => setAnchorDate(e.target.value)} className={input} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={input}>
              <option value="all">All statuses</option>
              {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-slate-400">
                    <rect x="2" y="3" width="16" height="15" rx="2"/><path d="M6 2v2M14 2v2M2 8h16"/>
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-500">No appointments in this view</p>
                <button type="button" onClick={() => setShowForm(true)} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800">
                  Book First Appointment
                </button>
              </div>
            ) : (
              filtered.map((apt) => (
                <div key={apt.id} className="flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 shrink-0 rounded-lg px-2 py-1 text-center text-[11px] font-bold ${statusBadge[apt.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {apt.startTime}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-slate-900">{apt.patientName}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge[apt.status] ?? "bg-slate-100 text-slate-600"}`}>{apt.status}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">{apt.queueMode}</span>
                        {apt.priority === "urgent" && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">URGENT</span>}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{fmtDate(apt.date)} · {apt.dentist || "Unassigned"} · {apt.chairName || "No chair"}</p>
                      {apt.reason && <p className="mt-0.5 text-xs text-slate-400">{apt.reason}</p>}
                      {apt.procedures.length > 0 && <p className="mt-1 text-[11px] text-slate-400">{apt.procedures.map((p) => p.name).join(" · ")}</p>}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <label className={lbl}>Update status</label>
                    <select value={apt.status} onChange={(e) => updateStatus(apt.id, e.target.value as AppointmentStatus)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-sky-400">
                      {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Waitlist + Walk-ins ────────────────────────────────────── */}
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-bold text-slate-900">Waitlist</h2>
              <p className="mt-0.5 text-xs text-slate-500">{waitlist.filter((w) => w.status === "waiting").length} waiting</p>
            </div>
            <div className="divide-y divide-slate-50">
              {waitlist.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-400">No waitlist requests yet.</p>
              ) : (
                waitlist.map((entry) => (
                  <div key={entry.id} className="flex items-start justify-between gap-3 px-5 py-3.5">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{entry.patientName}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{fmtDate(entry.preferredDate)} at {entry.preferredStartTime}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${entry.priority === "urgent" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>{entry.priority}</span>
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] text-sky-600">{entry.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-bold text-slate-900">Walk-in Queue</h2>
              <p className="mt-0.5 text-xs text-slate-500">{filtered.filter((a) => a.queueMode === "walk-in").length} walk-ins in view</p>
            </div>
            <div className="divide-y divide-slate-50">
              {filtered.filter((a) => a.queueMode === "walk-in").length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-400">No walk-ins in the current view.</p>
              ) : (
                filtered.filter((a) => a.queueMode === "walk-in").map((apt) => (
                  <div key={apt.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white">
                      #{apt.queueNumber ?? "–"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{apt.patientName}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{apt.startTime} · {apt.chairName || "No chair"}</p>
                    </div>
                    <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge[apt.status] ?? "bg-slate-100 text-slate-600"}`}>{apt.status}</span>
                  </div>
                ))
              )}
            </div>
            {analytics?.busiestHours && analytics.busiestHours.length > 0 && (
              <div className="border-t border-slate-100 px-5 py-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Busiest Hours</p>
                <div className="flex flex-wrap gap-2">
                  {analytics.busiestHours.map((h) => (
                    <span key={h.hour} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{h.hour} <span className="text-slate-400">({h.count})</span></span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </AdminShell>
  );
}
