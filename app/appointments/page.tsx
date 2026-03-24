"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

import { AdminShell } from "@/components/admin-shell";
import {
  branchCatalog,
  chairCatalog,
  initialAppointmentForm,
  procedureCatalog,
  statusOptions,
  statusStyles,
  type Appointment,
  type AppointmentAnalytics,
  type AppointmentFormState,
  type AppointmentStatus,
  type AppointmentWaitlistEntry,
  type PatientProfile,
  type StaffMember,
} from "@/lib/clinic-types";

function formatDateLabel(date: string) {
  return date
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
        new Date(`${date}T00:00:00`),
      )
    : "Not set";
}

function formatMinutes(minutes: number) {
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
}

function inView(date: string, anchorDate: string, view: "day" | "week" | "month") {
  if (!date || !anchorDate) {
    return true;
  }

  if (view === "day") {
    return date === anchorDate;
  }

  if (view === "month") {
    return date.slice(0, 7) === anchorDate.slice(0, 7);
  }

  const base = new Date(`${anchorDate}T00:00:00`);
  const day = base.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(base);
  start.setDate(base.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const target = new Date(`${date}T00:00:00`);
  return target >= start && target <= end;
}

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
  const [errorMessage, setErrorMessage] = useState("");
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function loadData() {
    try {
      setIsLoading(true);
      const [patientsRes, appointmentsRes, staffRes, waitlistRes, analyticsRes] = await Promise.all([
        fetch("/api/patients", { cache: "no-store" }),
        fetch("/api/appointments", { cache: "no-store" }),
        fetch("/api/staff", { cache: "no-store" }),
        fetch("/api/appointments/waitlist", { cache: "no-store" }),
        fetch("/api/appointments/analytics", { cache: "no-store" }),
      ]);

      if (!patientsRes.ok || !appointmentsRes.ok || !staffRes.ok || !waitlistRes.ok || !analyticsRes.ok) {
        throw new Error("Unable to load appointment module data.");
      }

      const [patientsData, appointmentsData, staffData, waitlistData, analyticsData] = await Promise.all([
        patientsRes.json() as Promise<PatientProfile[]>,
        appointmentsRes.json() as Promise<Appointment[]>,
        staffRes.json() as Promise<StaffMember[]>,
        waitlistRes.json() as Promise<AppointmentWaitlistEntry[]>,
        analyticsRes.json() as Promise<AppointmentAnalytics>,
      ]);

      setPatients(patientsData);
      setAppointments(appointmentsData);
      setStaffMembers(staffData);
      setWaitlist(waitlistData);
      setAnalytics(analyticsData);
      setErrorMessage("");
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "Unable to load appointments.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const dentists = useMemo(() => staffMembers.filter((member) => member.role === "dentist"), [staffMembers]);
  const assistants = useMemo(
    () => staffMembers.filter((member) => member.role === "nurse" || member.role === "receptionist"),
    [staffMembers],
  );
  const hygienists = useMemo(() => staffMembers.filter((member) => member.role === "hygienist"), [staffMembers]);
  const selectedProcedures = useMemo(
    () => procedureCatalog.filter((procedure) => form.procedureIds.includes(procedure.id)),
    [form.procedureIds],
  );

  const filteredAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => inView(appointment.date, anchorDate, view))
        .filter((appointment) => statusFilter === "all" || appointment.status === statusFilter)
        .filter((appointment) => {
          const keyword = search.trim().toLowerCase();
          if (!keyword) {
            return true;
          }

          return [appointment.appointmentId, appointment.patientName, appointment.dentist, appointment.reason, appointment.chairName]
            .join(" ")
            .toLowerCase()
            .includes(keyword);
        })
        .sort((left, right) => `${left.date}T${left.startTime}`.localeCompare(`${right.date}T${right.startTime}`)),
    [anchorDate, appointments, search, statusFilter, view],
  );

  function handleFieldChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = event.target;
    const checked = "checked" in event.target ? event.target.checked : false;
    setForm((current) => ({
      ...current,
      [name]:
        type === "checkbox"
          ? checked
          : name === "bufferMinutes" || name === "recurrenceInterval" || name === "recurrenceSessions"
            ? Number(value)
            : value,
    }));
  }

  function toggleProcedure(procedureId: string) {
    setForm((current) => ({
      ...current,
      procedureIds: current.procedureIds.includes(procedureId)
        ? current.procedureIds.filter((item) => item !== procedureId)
        : [...current.procedureIds, procedureId],
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setIsSaving(true);
      setConflicts([]);
      setErrorMessage("");
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (response.status === 409) {
        const payload = (await response.json()) as { conflicts?: Array<{ message: string }> };
        setConflicts(payload.conflicts?.map((conflict) => conflict.message) ?? []);
        setErrorMessage("This slot has conflicts. Try waitlist mode or allow overbooking.");
        return;
      }

      if (!response.ok) {
        throw new Error("Appointment could not be saved.");
      }

      setForm(initialAppointmentForm);
      await loadData();
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "Appointment could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  async function updateStatus(id: string, status: AppointmentStatus) {
    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        throw new Error("Status update failed.");
      }
      await loadData();
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "Status update failed.");
    }
  }

  return (
    <AdminShell>
      <div className="w-full space-y-6">
        <header className="rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-700">Module B</p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Dental Scheduling Hub</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Book by chair, assign procedures and staff, manage waitlists and walk-ins, and let completed visits create EMR and billing records automatically.
              </p>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white"><p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Total</p><p className="mt-2 text-2xl font-semibold">{analytics?.totalAppointments ?? appointments.length}</p></div>
              <div className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100"><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Completed</p><p className="mt-2 text-2xl font-semibold text-slate-900">{analytics?.completedCount ?? 0}</p></div>
              <div className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100"><p className="text-xs uppercase tracking-[0.22em] text-slate-500">No-show</p><p className="mt-2 text-2xl font-semibold text-slate-900">{analytics?.noShowRate ?? 0}%</p></div>
              <div className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100"><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Waitlist</p><p className="mt-2 text-2xl font-semibold text-slate-900">{waitlist.filter((item) => item.status === "waiting").length}</p></div>
            </div>
          </div>
        </header>
        {isLoading ? <div className="rounded-[24px] border border-sky-100 bg-sky-50 px-5 py-4 text-sm text-sky-800">Loading appointment data from MongoDB...</div> : null}
        {errorMessage ? <div className="rounded-[24px] border border-rose-100 bg-rose-50 px-5 py-4 text-sm text-rose-700">{errorMessage}</div> : null}
        {conflicts.length > 0 ? <div className="rounded-[24px] border border-amber-100 bg-amber-50 px-5 py-4 text-sm text-amber-800">{conflicts.map((message) => <p key={message}>{message}</p>)}</div> : null}

        <div className="grid gap-6 xl:grid-cols-[1.05fr,1.35fr]">
          <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <h3 className="text-xl font-semibold text-slate-950">Create Appointment</h3>
            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 md:col-span-2"><span className="text-sm font-medium text-slate-700">Patient</span><select name="patientId" value={form.patientId} onChange={handleFieldChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"><option value="">Select patient</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.fullName} {patient.patientId ? `(${patient.patientId})` : ""}</option>)}</select></label>
                <label className="space-y-1"><span className="text-sm font-medium text-slate-700">Queue mode</span><select name="queueMode" value={form.queueMode} onChange={handleFieldChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"><option value="booked">Booked</option><option value="walk-in">Walk-in</option><option value="waitlist">Waitlist</option></select></label>
                <label className="space-y-1"><span className="text-sm font-medium text-slate-700">Priority</span><select name="priority" value={form.priority} onChange={handleFieldChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"><option value="normal">Normal</option><option value="urgent">Urgent</option></select></label>
                <label className="space-y-1"><span className="text-sm font-medium text-slate-700">Branch</span><select name="branchId" value={form.branchId} onChange={handleFieldChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white">{branchCatalog.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
                <label className="space-y-1"><span className="text-sm font-medium text-slate-700">Chair</span><select name="chairId" value={form.chairId} onChange={handleFieldChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"><option value="">Choose chair</option>{chairCatalog.filter((chair) => chair.branchId === form.branchId).map((chair) => <option key={chair.id} value={chair.id}>{chair.name} | {chair.roomId} | {chair.status}</option>)}</select></label>
                <label className="space-y-1"><span className="text-sm font-medium text-slate-700">Dentist</span><select name="dentistId" value={form.dentistId} onChange={handleFieldChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"><option value="">Assign dentist</option>{dentists.map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}</select></label>
                <label className="space-y-1"><span className="text-sm font-medium text-slate-700">Assistant</span><select name="assistantId" value={form.assistantId} onChange={handleFieldChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"><option value="">Optional</option>{assistants.map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}</select></label>
                <label className="space-y-1"><span className="text-sm font-medium text-slate-700">Hygienist</span><select name="hygienistId" value={form.hygienistId} onChange={handleFieldChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"><option value="">Optional</option>{hygienists.map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}</select></label>
                <label className="space-y-1"><span className="text-sm font-medium text-slate-700">Date</span><input type="date" name="date" value={form.date} onChange={handleFieldChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" /></label>
                <label className="space-y-1"><span className="text-sm font-medium text-slate-700">Start time</span><input type="time" name="startTime" value={form.startTime} onChange={handleFieldChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" /></label>
                <label className="space-y-1"><span className="text-sm font-medium text-slate-700">Buffer</span><input type="number" min="0" name="bufferMinutes" value={form.bufferMinutes} onChange={handleFieldChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" /></label>
                <label className="space-y-1"><span className="text-sm font-medium text-slate-700">Status</span><select name="status" value={form.status} onChange={handleFieldChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white">{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
              </div>

              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-700">Procedures</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {procedureCatalog.map((procedure) => (
                    <label key={procedure.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                      <input type="checkbox" checked={form.procedureIds.includes(procedure.id)} onChange={() => toggleProcedure(procedure.id)} className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
                      <span><span className="block font-medium text-slate-900">{procedure.name}</span><span className="text-sm text-slate-500">{formatMinutes(procedure.durationMinutes)} | ${procedure.defaultPrice}</span></span>
                    </label>
                  ))}
                </div>
              </div>

              <input name="reason" value={form.reason} onChange={handleFieldChange} placeholder="Treatment summary or reason for visit" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" />
              <div className="grid gap-4 md:grid-cols-2"><input type="date" name="reminderDate" value={form.reminderDate} onChange={handleFieldChange} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" /><select name="reminderChannel" value={form.reminderChannel} onChange={handleFieldChange} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"><option value="sms">SMS</option><option value="email">Email</option><option value="both">SMS + Email</option></select></div>
              <div className="grid gap-4 md:grid-cols-2"><textarea name="preVisitNotes" value={form.preVisitNotes} onChange={handleFieldChange} placeholder="Pre-visit notes" className="min-h-24 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" /><textarea name="notes" value={form.notes} onChange={handleFieldChange} placeholder="General notes" className="min-h-24 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" /></div>
              <div className="grid gap-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4 md:grid-cols-4"><label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="recurrenceEnabled" checked={form.recurrenceEnabled} onChange={handleFieldChange} />Recurring</label><select name="recurrenceType" value={form.recurrenceType} onChange={handleFieldChange} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select><input type="number" min="1" name="recurrenceInterval" value={form.recurrenceInterval} onChange={handleFieldChange} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400" /><input type="number" min="1" name="recurrenceSessions" value={form.recurrenceSessions} onChange={handleFieldChange} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400" /></div>
              <div className="rounded-3xl bg-slate-950 p-4 text-white"><p className="text-sm font-semibold">Summary</p><p className="mt-2 text-sm text-slate-300">{selectedProcedures.map((procedure) => procedure.name).join(", ") || "Consultation"} | estimated {formatMinutes(selectedProcedures.reduce((sum, procedure) => sum + procedure.durationMinutes, 0) + form.bufferMinutes)} | ${selectedProcedures.reduce((sum, procedure) => sum + procedure.defaultPrice, 0)}</p></div>
              <button type="submit" disabled={isSaving} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">{isSaving ? "Saving..." : form.queueMode === "waitlist" ? "Add To Waitlist" : "Book Appointment"}</button>
            </form>
          </section>

          <div className="space-y-6">
            <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div><h3 className="text-xl font-semibold text-slate-950">Schedule Board</h3><p className="mt-1 text-sm text-slate-500">Daily, weekly, or monthly view with quick status updates.</p></div>
                <div className="flex flex-wrap gap-2">{(["day", "week", "month"] as const).map((mode) => <button key={mode} type="button" onClick={() => setView(mode)} className={`rounded-full px-4 py-2 text-sm font-semibold ${view === mode ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"}`}>{mode}</button>)}</div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patient, dentist, chair..." className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" /><input type="date" value={anchorDate} onChange={(event) => setAnchorDate(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"><option value="all">All status</option>{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
              <div className="mt-4 space-y-3">{filteredAppointments.length === 0 ? <p className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">No appointments found for the current filters.</p> : filteredAppointments.map((appointment) => <article key={appointment.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="text-lg font-semibold text-slate-950">{appointment.startTime} - {appointment.endTime}</p><span className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyles[appointment.status]}`}>{appointment.status}</span><span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">{appointment.queueMode}</span></div><p className="mt-2 font-medium text-slate-900">{appointment.patientName}</p><p className="text-sm text-slate-600">{formatDateLabel(appointment.date)} | {appointment.dentist || "Unassigned"} | {appointment.chairName || "No chair"}</p><p className="mt-1 text-sm text-slate-600">{appointment.reason}</p><p className="mt-2 text-xs text-slate-500">{appointment.procedures.map((procedure) => procedure.name).join(" | ")}</p></div><select value={appointment.status} onChange={(event) => updateStatus(appointment.id, event.target.value as AppointmentStatus)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400">{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></div></article>)}</div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]"><h3 className="text-xl font-semibold text-slate-950">Waitlist</h3><div className="mt-4 space-y-3">{waitlist.length === 0 ? <p className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">No waitlist requests yet.</p> : waitlist.map((entry) => <article key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="font-medium text-slate-900">{entry.patientName}</p><p className="mt-1 text-sm text-slate-600">{formatDateLabel(entry.preferredDate)} at {entry.preferredStartTime}</p><p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">{entry.priority} | {entry.status}</p></article>)}</div></div>
              <div className="rounded-[28px] border border-white/80 bg-slate-950 p-6 text-white shadow-[0_20px_50px_rgba(15,23,42,0.16)]"><h3 className="text-xl font-semibold">Walk-in Queue</h3><div className="mt-4 space-y-3">{filteredAppointments.filter((appointment) => appointment.queueMode === "walk-in").length === 0 ? <p className="rounded-2xl bg-white/10 p-4 text-sm text-slate-300">No walk-ins in the current view.</p> : filteredAppointments.filter((appointment) => appointment.queueMode === "walk-in").map((appointment) => <article key={appointment.id} className="rounded-2xl border border-white/10 bg-white/6 p-4"><p className="font-medium text-white">Queue #{appointment.queueNumber ?? "-"}</p><p className="mt-1 text-sm text-slate-300">{appointment.patientName} | {appointment.startTime}</p></article>)}</div><div className="mt-6 rounded-2xl bg-white/10 p-4"><p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Busiest Hours</p><div className="mt-3 flex flex-wrap gap-2">{(analytics?.busiestHours ?? []).map((item) => <span key={item.hour} className="rounded-full bg-white/10 px-3 py-1 text-sm text-white">{item.hour} ({item.count})</span>)}</div></div></div>
            </section>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
