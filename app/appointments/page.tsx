"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import { AdminShell } from "@/components/admin-shell";
import {
  dentists,
  initialAppointmentForm,
  statusOptions,
  statusStyles,
  type Appointment,
  type AppointmentFormState,
  type AppointmentStatus,
  type PatientProfile,
} from "@/lib/clinic-types";

function formatDateLabel(date: string) {
  if (!date) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export default function AppointmentsPage() {
  const [appointmentForm, setAppointmentForm] = useState<AppointmentFormState>(
    initialAppointmentForm,
  );
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingAppointment, setIsSavingAppointment] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadClinicData() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const [patientsResponse, appointmentsResponse] = await Promise.all([
          fetch("/api/patients", { cache: "no-store" }),
          fetch("/api/appointments", { cache: "no-store" }),
        ]);

        if (!patientsResponse.ok || !appointmentsResponse.ok) {
          throw new Error(
            `${patientsResponse.ok ? "" : await patientsResponse.text()} ${
              appointmentsResponse.ok ? "" : await appointmentsResponse.text()
            }`.trim(),
          );
        }

        const [patientsData, appointmentsData] = await Promise.all([
          (await patientsResponse.json()) as PatientProfile[],
          (await appointmentsResponse.json()) as Appointment[],
        ]);

        setPatients(patientsData);
        setAppointments(appointmentsData);
      } catch (error) {
        console.error(error);
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load appointments.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadClinicData();
  }, []);

  function handleAppointmentFieldChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target;
    setAppointmentForm((current) => ({ ...current, [name]: value }));
  }

  async function handleAppointmentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    const selectedPatient = patients.find(
      (patient) => patient.id === appointmentForm.patientId,
    );

    if (
      !selectedPatient ||
      !appointmentForm.date ||
      !appointmentForm.time ||
      !appointmentForm.dentist
    ) {
      return;
    }

    try {
      setIsSavingAppointment(true);
      setErrorMessage("");

      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...appointmentForm,
          patientName: selectedPatient.fullName,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const nextAppointment = (await response.json()) as Appointment;
      setAppointments((current) =>
        [...current, nextAppointment].sort((left, right) =>
          `${left.date}T${left.time}`.localeCompare(`${right.date}T${right.time}`),
        ),
      );
      setAppointmentForm(initialAppointmentForm);
      form.reset();
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Appointment could not be saved to MongoDB.",
      );
    } finally {
      setIsSavingAppointment(false);
    }
  }

  async function updateAppointmentStatus(id: string, status: AppointmentStatus) {
    const previousAppointments = appointments;

    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === id ? { ...appointment, status } : appointment,
      ),
    );

    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
    } catch (error) {
      console.error(error);
      setAppointments(previousAppointments);
      setErrorMessage(
        error instanceof Error ? error.message : "Status update failed.",
      );
    }
  }

  const groupedDates = Array.from(new Set(appointments.map((item) => item.date)));
  const reminderCount = appointments.filter((item) => item.reminderDate).length;
  const followUpAppointments = appointments.filter((item) => item.followUpDate);

  return (
    <AdminShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-700">
            Module B
          </p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                Appointment Management
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Book appointments by date, time, and dentist, then track statuses,
                reminders, follow-up planning, and calendar visibility.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">
                  Appointments
                </p>
                <p className="mt-2 text-2xl font-semibold">{appointments.length}</p>
              </div>
              <div className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  Reminders
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {reminderCount}
                </p>
              </div>
              <div className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  Follow-Ups
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {followUpAppointments.length}
                </p>
              </div>
            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="rounded-[24px] border border-sky-100 bg-sky-50 px-5 py-4 text-sm text-sky-800">
            Loading appointment data from MongoDB...
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-[24px] border border-rose-100 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <h3 className="text-xl font-semibold text-slate-950">Book Appointment</h3>

            <form className="mt-6 space-y-5" onSubmit={handleAppointmentSubmit}>
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">Patient</span>
                <select required name="patientId" value={appointmentForm.patientId} onChange={handleAppointmentFieldChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white">
                  <option value="">Select patient</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.fullName}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Dentist</span>
                  <select name="dentist" value={appointmentForm.dentist} onChange={handleAppointmentFieldChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white">
                    {dentists.map((dentist) => (
                      <option key={dentist} value={dentist}>
                        {dentist}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Status</span>
                  <select name="status" value={appointmentForm.status} onChange={handleAppointmentFieldChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white">
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Date</span>
                  <input required type="date" name="date" value={appointmentForm.date} onChange={handleAppointmentFieldChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Time</span>
                  <input required type="time" name="time" value={appointmentForm.time} onChange={handleAppointmentFieldChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" />
                </label>
              </div>

              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">Visit Reason</span>
                <input name="reason" value={appointmentForm.reason} onChange={handleAppointmentFieldChange} placeholder="Cleaning, extraction, consultation" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" />
              </label>

              <div className="grid gap-4 rounded-3xl bg-slate-50 p-4 md:grid-cols-3">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Reminder Date</span>
                  <input type="date" name="reminderDate" value={appointmentForm.reminderDate} onChange={handleAppointmentFieldChange} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400" />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Reminder Type</span>
                  <select name="reminderChannel" value={appointmentForm.reminderChannel} onChange={handleAppointmentFieldChange} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400">
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                    <option value="both">SMS and Email</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Follow-Up Date</span>
                  <input type="date" name="followUpDate" value={appointmentForm.followUpDate} onChange={handleAppointmentFieldChange} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400" />
                </label>
              </div>

              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">Notes</span>
                <textarea name="notes" value={appointmentForm.notes} onChange={handleAppointmentFieldChange} placeholder="Special instructions, preferred slot, treatment prep" className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" />
              </label>

              <button type="submit" disabled={patients.length === 0 || isSavingAppointment} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">
                {isSavingAppointment ? "Saving Appointment..." : "Book Appointment"}
              </button>
            </form>
          </section>

          <div className="space-y-6">
            <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-slate-950">Calendar View</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Daily schedule grouped by appointment date.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                {appointments.length === 0 ? (
                  <p className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
                    No appointments yet. Register a patient first, then book a visit.
                  </p>
                ) : (
                  groupedDates.map((date) => (
                    <div key={date} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-700">
                        {formatDateLabel(date)}
                      </p>
                      <div className="mt-3 space-y-3">
                        {appointments
                          .filter((appointment) => appointment.date === date)
                          .map((appointment) => (
                            <article key={appointment.id} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-lg font-semibold text-slate-950">
                                      {appointment.time}
                                    </p>
                                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyles[appointment.status]}`}>
                                      {appointment.status}
                                    </span>
                                  </div>
                                  <p className="mt-2 font-medium text-slate-900">
                                    {appointment.patientName}
                                  </p>
                                  <p className="text-sm text-slate-600">
                                    {appointment.dentist}
                                    {appointment.reason ? ` | ${appointment.reason}` : ""}
                                  </p>
                                  <p className="mt-2 text-xs text-slate-500">
                                    Reminder:{" "}
                                    {appointment.reminderDate
                                      ? `${formatDateLabel(appointment.reminderDate)} via ${appointment.reminderChannel}`
                                      : "Not scheduled"}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Follow-up:{" "}
                                    {appointment.followUpDate
                                      ? formatDateLabel(appointment.followUpDate)
                                      : "Not planned"}
                                  </p>
                                </div>
                                <select value={appointment.status} onChange={(event) => updateAppointmentStatus(appointment.id, event.target.value as AppointmentStatus)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-sky-400">
                                  {statusOptions.map((status) => (
                                    <option key={status} value={status}>
                                      {status}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </article>
                          ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="grid gap-6 md:grid-cols-2">
              <div className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
                <h3 className="text-xl font-semibold text-slate-950">Reminder Queue</h3>
                <div className="mt-4 space-y-3">
                  {reminderCount === 0 ? (
                    <p className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
                      No reminder tasks scheduled yet.
                    </p>
                  ) : (
                    appointments
                      .filter((appointment) => appointment.reminderDate)
                      .sort((left, right) =>
                        left.reminderDate.localeCompare(right.reminderDate),
                      )
                      .map((appointment) => (
                        <article key={`${appointment.id}-reminder`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="font-medium text-slate-900">{appointment.patientName}</p>
                          <p className="mt-1 text-sm text-slate-600">
                            {formatDateLabel(appointment.reminderDate)}
                          </p>
                        </article>
                      ))
                  )}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/80 bg-slate-950 p-6 text-white shadow-[0_20px_50px_rgba(15,23,42,0.16)]">
                <h3 className="text-xl font-semibold">Follow-Up Schedule</h3>
                <div className="mt-4 space-y-3">
                  {followUpAppointments.length === 0 ? (
                    <p className="rounded-2xl bg-white/10 p-4 text-sm text-slate-300">
                      No follow-up appointments planned yet.
                    </p>
                  ) : (
                    followUpAppointments
                      .sort((left, right) =>
                        left.followUpDate.localeCompare(right.followUpDate),
                      )
                      .map((appointment) => (
                        <article key={`${appointment.id}-followup`} className="rounded-2xl border border-white/10 bg-white/6 p-4">
                          <p className="font-medium text-white">{appointment.patientName}</p>
                          <p className="mt-1 text-sm text-slate-300">
                            {appointment.reason || "Follow-up visit"}
                          </p>
                          <p className="mt-3 text-xs uppercase tracking-[0.25em] text-cyan-200">
                            {formatDateLabel(appointment.followUpDate)}
                          </p>
                        </article>
                      ))
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
