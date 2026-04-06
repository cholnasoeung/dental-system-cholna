"use client";

import { ChangeEvent, useEffect, useState } from "react";

import { AdminShell } from "@/components/admin-shell";
import {
  defaultWeeklySchedule,
  initialStaffForm,
  staffPermissionOptions,
  staffRoleOptions,
  type StaffFormState,
  type StaffMember,
  type StaffScheduleDay,
} from "@/lib/clinic-types";
import { getDefaultPermissionsForRole } from "@/lib/staff-access";

const input = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100";
const lbl = "mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-500";

function roleLabel(r: StaffMember["role"]) { return r.charAt(0).toUpperCase() + r.slice(1); }

function availabilityStyle(s: StaffMember["availabilityStatus"]) {
  return s === "available" ? "bg-emerald-100 text-emerald-700"
    : s === "busy"      ? "bg-amber-100  text-amber-700"
    : "bg-slate-100 text-slate-500";
}

function roleColor(r: StaffMember["role"]) {
  return r === "dentist"      ? "bg-sky-100 text-sky-700"
    : r === "hygienist"    ? "bg-violet-100 text-violet-700"
    : r === "nurse"        ? "bg-rose-100 text-rose-700"
    : "bg-slate-100 text-slate-600";
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function createPreset(role: StaffMember["role"]): StaffFormState {
  return { ...initialStaffForm, role, permissionsText: getDefaultPermissionsForRole(role).join(", ") };
}

export default function StaffPage() {
  const [staffForm, setStaffForm] = useState<StaffFormState>(initialStaffForm);
  const [schedule, setSchedule] = useState<StaffScheduleDay[]>(defaultWeeklySchedule);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/staff", { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        setStaffMembers((await res.json()) as StaffMember[]);
      } catch (e) {
        setErrorMessage(e instanceof Error ? e.message : "Unable to load staff.");
      } finally { setIsLoading(false); }
    }
    void load();
  }, []);

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    if (name === "role") {
      setStaffForm((c) => ({ ...c, role: value as StaffMember["role"], permissionsText: getDefaultPermissionsForRole(value as StaffMember["role"]).join(", ") }));
      return;
    }
    setStaffForm((c) => ({ ...c, [name]: value }));
  }

  function handleScheduleChange(day: string, field: "start" | "end" | "available", value: string | boolean) {
    setSchedule((c) => c.map((e) => e.day === day ? { ...e, [field]: value } : e));
  }

  function applyPreset(role: StaffMember["role"]) {
    setStaffForm(createPreset(role));
    setSchedule(defaultWeeklySchedule);
    setShowForm(true);
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!staffForm.fullName || !staffForm.email) return;
    try {
      setIsSaving(true); setErrorMessage("");
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: staffForm.fullName, role: staffForm.role,
          email: staffForm.email, phone: staffForm.phone,
          permissions: staffForm.permissionsText.split(",").map((s) => s.trim()).filter(Boolean),
          schedule, availabilityStatus: staffForm.availabilityStatus,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const next = (await res.json()) as StaffMember;
      setStaffMembers((c) => [...c, next]);
      setStaffForm(initialStaffForm);
      setSchedule(defaultWeeklySchedule);
      setShowForm(false);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Staff member could not be saved.");
    } finally { setIsSaving(false); }
  }

  const dentists        = staffMembers.filter((m) => m.role === "dentist");
  const availDentists   = dentists.filter((m) => m.availabilityStatus === "available");
  const supportStaff    = staffMembers.filter((m) => m.role !== "dentist");

  return (
    <AdminShell>
      <div className="mx-auto max-w-[1400px] space-y-6">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-sky-600">Module F</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">Staff Management</h1>
            <p className="mt-1 text-sm text-slate-500">Register staff, assign roles, set schedules and permissions.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5"><path d="M8 2v12M2 8h12"/></svg>
            {showForm ? "Hide Form" : "Add Staff"}
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Staff", value: staffMembers.length, dark: true },
            { label: "Dentists",    value: dentists.length,     dark: false },
            { label: "Available",   value: availDentists.length, dark: false },
          ].map((k) => (
            <div key={k.label} className={`rounded-2xl border border-slate-200 px-4 py-3 shadow-sm ${k.dark ? "bg-slate-900" : "bg-white"}`}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{k.label}</p>
              <p className={`mt-1.5 text-2xl font-bold ${k.dark ? "text-white" : "text-slate-900"}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Banners */}
        {isLoading && (
          <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
            <svg className="h-4 w-4 animate-spin shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="8" r="6" strokeOpacity=".25"/><path d="M14 8a6 6 0 0 0-6-6" strokeLinecap="round"/></svg>
            Loading staff data…
          </div>
        )}
        {errorMessage && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mt-0.5 h-4 w-4 shrink-0"><circle cx="8" cy="8" r="7"/><path d="M8 5v3M8 11h.01"/></svg>
            {errorMessage}
          </div>
        )}

        {/* ── Quick Presets ────────────────────────────────────────── */}
        {!showForm && (
          <div className="grid gap-4 sm:grid-cols-2">
            <button type="button" onClick={() => applyPreset("dentist")}
              className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50 p-5 text-left transition hover:border-sky-400 hover:bg-sky-100">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="h-5 w-5"><circle cx="10" cy="6" r="4"/><path d="M3 18c0-3.9 3.1-7 7-7s7 3.1 7 7"/></svg>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Add Doctor / Dentist</p>
                <p className="mt-0.5 text-xs text-slate-500">Preloads dentist role with clinical permissions and weekly schedule.</p>
              </div>
            </button>
            <button type="button" onClick={() => applyPreset("receptionist")}
              className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50 p-5 text-left transition hover:border-amber-400 hover:bg-amber-100">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="h-5 w-5"><rect x="2" y="4" width="16" height="12" rx="2"/><path d="M2 9h16M6 13h2M10 13h4"/></svg>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Add Front Desk / Support</p>
                <p className="mt-0.5 text-xs text-slate-500">Preloads receptionist access for appointments, billing, and support.</p>
              </div>
            </button>
          </div>
        )}

        {/* ── Add Staff Form ───────────────────────────────────────── */}
        {showForm && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Add Staff Member</h2>
                <p className="mt-0.5 text-xs text-slate-500">Fill in details, then save to register the staff member.</p>
              </div>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
                Cancel
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              {/* Core info */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">Personal Information</p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="sm:col-span-2">
                    <label className={lbl}>Full Name *</label>
                    <input name="fullName" value={staffForm.fullName} onChange={handleChange} placeholder="Dr. Lina Sok" className={input} />
                  </div>
                  <div>
                    <label className={lbl}>Role *</label>
                    <select name="role" value={staffForm.role} onChange={handleChange} className={input}>
                      {staffRoleOptions.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Availability</label>
                    <select name="availabilityStatus" value={staffForm.availabilityStatus} onChange={handleChange} className={input}>
                      <option value="available">Available</option>
                      <option value="busy">Busy</option>
                      <option value="off">Off</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={lbl}>Email *</label>
                    <input type="email" name="email" value={staffForm.email} onChange={handleChange} placeholder="staff@clinic.com" className={input} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={lbl}>Phone</label>
                    <input name="phone" value={staffForm.phone} onChange={handleChange} placeholder="+855 12 345 678" className={input} />
                  </div>
                  <div className="sm:col-span-2 xl:col-span-4">
                    <label className={lbl}>Permissions <span className="normal-case text-slate-400">(comma-separated)</span></label>
                    <textarea name="permissionsText" value={staffForm.permissionsText} onChange={handleChange}
                      placeholder={staffPermissionOptions.join(", ")} rows={3} className={`${input} resize-none`} />
                  </div>
                </div>
              </div>

              {/* Weekly schedule */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Weekly Schedule</p>
                  <span className="rounded-lg bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200">7 days</span>
                </div>
                <div className="space-y-2">
                  {schedule.map((day) => (
                    <div key={day.day} className="grid items-center gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200 sm:grid-cols-[100px_1fr_1fr_100px]">
                      <p className="text-sm font-semibold text-slate-800">{day.day}</p>
                      <div>
                        <label className={lbl}>Start</label>
                        <input type="time" value={day.start} onChange={(e) => handleScheduleChange(day.day, "start", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-sky-400" />
                      </div>
                      <div>
                        <label className={lbl}>End</label>
                        <input type="time" value={day.end} onChange={(e) => handleScheduleChange(day.day, "end", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-sky-400" />
                      </div>
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input type="checkbox" checked={day.available} onChange={(e) => handleScheduleChange(day.day, "available", e.target.checked)}
                          className="h-4 w-4 rounded accent-sky-600" />
                        Available
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button type="submit" disabled={isSaving || !staffForm.fullName || !staffForm.email}
                  className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
                  {isSaving ? (
                    <><svg className="h-4 w-4 animate-spin" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="8" r="6" strokeOpacity=".3"/><path d="M14 8a6 6 0 0 0-6-6" strokeLinecap="round"/></svg>Saving…</>
                  ) : "Save Staff Member"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Staff Directory ──────────────────────────────────────── */}
        <div className="grid gap-5 xl:grid-cols-2">
          {/* Dentist Availability */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-bold text-slate-900">Dentist Availability</h2>
              <p className="mt-0.5 text-xs text-slate-500">{availDentists.length} of {dentists.length} available now</p>
            </div>
            <div className="divide-y divide-slate-50">
              {dentists.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-sm text-slate-400">No dentists added yet.</p>
                  <button type="button" onClick={() => applyPreset("dentist")} className="mt-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800">
                    Add Doctor
                  </button>
                </div>
              ) : (
                dentists.map((d) => (
                  <div key={d.id} className="flex items-start justify-between gap-3 px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-sm font-bold text-white">
                        {initials(d.fullName)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{d.fullName}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{d.email}</p>
                        {d.phone && <p className="text-xs text-slate-400">{d.phone}</p>}
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold ${availabilityStyle(d.availabilityStatus)}`}>
                      {d.availabilityStatus}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Full directory */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-bold text-slate-900">All Staff</h2>
              <p className="mt-0.5 text-xs text-slate-500">{dentists.length} doctor{dentists.length !== 1 ? "s" : ""} · {supportStaff.length} support staff</p>
            </div>
            <div className="divide-y divide-slate-50">
              {staffMembers.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-slate-400">No staff records yet.</p>
              ) : (
                staffMembers.map((m) => (
                  <div key={m.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white ${m.role === "dentist" ? "bg-sky-600" : m.role === "hygienist" ? "bg-violet-600" : m.role === "nurse" ? "bg-rose-600" : "bg-slate-700"}`}>
                          {initials(m.fullName)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{m.fullName}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{m.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-lg px-2.5 py-1 text-[10px] font-bold ${roleColor(m.role)}`}>{roleLabel(m.role)}</span>
                        <span className={`rounded-lg px-2.5 py-1 text-[10px] font-bold ${availabilityStyle(m.availabilityStatus)}`}>{m.availabilityStatus}</span>
                      </div>
                    </div>
                    {m.permissions.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {m.permissions.map((p) => (
                          <span key={p} className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">{p}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </AdminShell>
  );
}
