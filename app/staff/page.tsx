"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";

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

function roleLabel(role: StaffMember["role"]) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function availabilityTone(status: StaffMember["availabilityStatus"]) {
  switch (status) {
    case "available":
      return "bg-emerald-100 text-emerald-800";
    case "busy":
      return "bg-amber-100 text-amber-800";
    case "off":
      return "bg-slate-200 text-slate-700";
  }
}

export default function StaffPage() {
  const [staffForm, setStaffForm] = useState<StaffFormState>(initialStaffForm);
  const [schedule, setSchedule] = useState<StaffScheduleDay[]>(defaultWeeklySchedule);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadStaff() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const response = await fetch("/api/staff", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data = (await response.json()) as StaffMember[];
        setStaffMembers(data);
      } catch (error) {
        console.error(error);
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load staff data.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadStaff();
  }, []);

  function handleFieldChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target;
    setStaffForm((current) => ({ ...current, [name]: value }));
  }

  function handleScheduleChange(
    day: string,
    field: "start" | "end" | "available",
    value: string | boolean,
  ) {
    setSchedule((current) =>
      current.map((entry) =>
        entry.day === day ? { ...entry, [field]: value } : entry,
      ),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    if (!staffForm.fullName || !staffForm.email) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");

      const response = await fetch("/api/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: staffForm.fullName,
          role: staffForm.role,
          email: staffForm.email,
          phone: staffForm.phone,
          permissions: staffForm.permissionsText
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          schedule,
          availabilityStatus: staffForm.availabilityStatus,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const nextMember = (await response.json()) as StaffMember;
      setStaffMembers((current) => [...current, nextMember]);
      setStaffForm(initialStaffForm);
      setSchedule(defaultWeeklySchedule);
      form.reset();
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Staff member could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const dentists = staffMembers.filter((member) => member.role === "dentist");
  const availableDentists = dentists.filter(
    (member) => member.availabilityStatus === "available",
  );

  return (
    <AdminShell>
      <div className="w-full space-y-6">
        <header className="rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-700">
            Module F
          </p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                Staff & Role Management
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                This module supports the appointment flow by showing dentist
                availability before the appointment is confirmed.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">
                  Staff
                </p>
                <p className="mt-2 text-2xl font-semibold">{staffMembers.length}</p>
              </div>
              <div className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  Dentists
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {dentists.length}
                </p>
              </div>
              <div className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  Available
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {availableDentists.length}
                </p>
              </div>
            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="rounded-[24px] border border-sky-100 bg-sky-50 px-5 py-4 text-sm text-sky-800">
            Loading staff data from MongoDB...
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-[24px] border border-rose-100 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="space-y-6">
          <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <h3 className="text-xl font-semibold text-slate-950">Add Staff Member</h3>

            <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Full Name</span>
                  <input
                    name="fullName"
                    value={staffForm.fullName}
                    onChange={handleFieldChange}
                    placeholder="Dr. Lina Sok"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Role</span>
                  <select
                    name="role"
                    value={staffForm.role}
                    onChange={handleFieldChange}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  >
                    {staffRoleOptions.map((role) => (
                      <option key={role} value={role}>
                        {roleLabel(role)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Email</span>
                  <input
                    type="email"
                    name="email"
                    value={staffForm.email}
                    onChange={handleFieldChange}
                    placeholder="staff@clinic.com"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Phone</span>
                  <input
                    name="phone"
                    value={staffForm.phone}
                    onChange={handleFieldChange}
                    placeholder="+855 12 345 678"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">
                    Availability
                  </span>
                  <select
                    name="availabilityStatus"
                    value={staffForm.availabilityStatus}
                    onChange={handleFieldChange}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  >
                    <option value="available">Available</option>
                    <option value="busy">Busy</option>
                    <option value="off">Off</option>
                  </select>
                </label>
                <label className="space-y-1 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">
                    Permissions
                  </span>
                  <textarea
                    name="permissionsText"
                    value={staffForm.permissionsText}
                    onChange={handleFieldChange}
                    placeholder={staffPermissionOptions.join(", ")}
                    className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  />
                </label>
              </div>

              <div className="rounded-3xl bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-semibold text-slate-950">
                    Weekly Schedule
                  </h4>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                    Work schedule
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {schedule.map((day) => (
                    <div
                      key={day.day}
                      className="grid gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200 md:grid-cols-[1fr_0.9fr_0.9fr_0.8fr]"
                    >
                      <p className="self-center font-medium text-slate-900">{day.day}</p>
                      <input
                        type="time"
                        value={day.start}
                        onChange={(event) =>
                          handleScheduleChange(day.day, "start", event.target.value)
                        }
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none transition focus:border-sky-400"
                      />
                      <input
                        type="time"
                        value={day.end}
                        onChange={(event) =>
                          handleScheduleChange(day.day, "end", event.target.value)
                        }
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none transition focus:border-sky-400"
                      />
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={day.available}
                          onChange={(event) =>
                            handleScheduleChange(day.day, "available", event.target.checked)
                          }
                        />
                        Available
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSaving ? "Saving Staff..." : "Save Staff Member"}
              </button>
            </form>
          </section>

          <div className="space-y-6">
            <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <h3 className="text-xl font-semibold text-slate-950">
                Dentist Availability
              </h3>
              <div className="mt-4 space-y-3">
                {dentists.length === 0 ? (
                  <p className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
                    No dentists added yet.
                  </p>
                ) : (
                  dentists.map((dentist) => (
                    <article
                      key={dentist.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {dentist.fullName}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {dentist.email} | {dentist.phone}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${availabilityTone(
                            dentist.availabilityStatus,
                          )}`}
                        >
                          {dentist.availabilityStatus}
                        </span>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-white/80 bg-slate-950 p-6 text-white shadow-[0_20px_50px_rgba(15,23,42,0.16)]">
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/75">
                Staff Directory
              </p>
              <h3 className="mt-2 text-xl font-semibold">Roles & Permissions</h3>
              <div className="mt-4 space-y-3">
                {staffMembers.length === 0 ? (
                  <p className="rounded-2xl bg-white/10 p-4 text-sm text-slate-300">
                    No staff records yet.
                  </p>
                ) : (
                  staffMembers.map((member) => (
                    <article
                      key={member.id}
                      className="rounded-3xl border border-white/10 bg-white/6 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{member.fullName}</p>
                          <p className="mt-1 text-sm text-slate-300">
                            {roleLabel(member.role)}
                          </p>
                        </div>
                        <span className="rounded-full bg-cyan-300 px-3 py-1 text-xs font-semibold text-slate-950">
                          {member.permissions.length} perms
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {member.permissions.map((permission) => (
                          <span
                            key={permission}
                            className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200"
                          >
                            {permission}
                          </span>
                        ))}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}


