"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminShell } from "@/components/admin-shell";
import type { Appointment, DentalRecord, Invoice, PatientProfile } from "@/lib/clinic-types";

function currency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

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

function invoiceTotal(invoice: Invoice) {
  return invoice.lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
}

function invoicePaid(invoice: Invoice) {
  return invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
}

function objectIdDate(id: string) {
  if (!/^[a-fA-F0-9]{24}$/.test(id)) {
    return null;
  }

  const timestampHex = id.slice(0, 8);
  const timestamp = Number.parseInt(timestampHex, 16) * 1000;
  return new Date(timestamp);
}

export default function ReportsPage() {
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [records, setRecords] = useState<DentalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadReportData() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const [patientsResponse, appointmentsResponse, invoicesResponse, recordsResponse] =
          await Promise.all([
            fetch("/api/patients", { cache: "no-store" }),
            fetch("/api/appointments", { cache: "no-store" }),
            fetch("/api/billing", { cache: "no-store" }),
            fetch("/api/emr", { cache: "no-store" }),
          ]);

        if (
          !patientsResponse.ok ||
          !appointmentsResponse.ok ||
          !invoicesResponse.ok ||
          !recordsResponse.ok
        ) {
          throw new Error(
            `${patientsResponse.ok ? "" : await patientsResponse.text()} ${
              appointmentsResponse.ok ? "" : await appointmentsResponse.text()
            } ${invoicesResponse.ok ? "" : await invoicesResponse.text()} ${
              recordsResponse.ok ? "" : await recordsResponse.text()
            }`.trim(),
          );
        }

        const [patientsData, appointmentsData, invoicesData, recordsData] =
          await Promise.all([
            (await patientsResponse.json()) as PatientProfile[],
            (await appointmentsResponse.json()) as Appointment[],
            (await invoicesResponse.json()) as Invoice[],
            (await recordsResponse.json()) as DentalRecord[],
          ]);

        setPatients(patientsData);
        setAppointments(appointmentsData);
        setInvoices(invoicesData);
        setRecords(recordsData);
      } catch (error) {
        console.error(error);
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load report data.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadReportData();
  }, []);

  const analytics = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    const dailyAppointments = appointments.filter(
      (appointment) => appointment.date === today,
    );

    const totalRevenue = invoices.reduce((sum, invoice) => sum + invoicePaid(invoice), 0);
    const totalOutstanding = invoices.reduce(
      (sum, invoice) => sum + Math.max(invoiceTotal(invoice) - invoicePaid(invoice), 0),
      0,
    );

    const patientGrowthMap = patients.reduce<Record<string, number>>((acc, patient) => {
      const createdAt = objectIdDate(patient.id);
      if (!createdAt) {
        return acc;
      }
      const key = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const patientGrowth = Object.entries(patientGrowthMap)
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(-6);

    const dentistWorkload = appointments.reduce<Record<string, number>>((acc, appointment) => {
      acc[appointment.dentist] = (acc[appointment.dentist] ?? 0) + 1;
      return acc;
    }, {});

    const treatmentFrequency = records.reduce<Record<string, number>>((acc, record) => {
      const text = `${record.procedureHistory} ${record.treatmentPlan}`.toLowerCase();
      const knownTreatments = [
        "scaling",
        "filling",
        "crown",
        "extraction",
        "root canal",
        "implant",
        "cleaning",
      ];

      knownTreatments.forEach((treatment) => {
        if (text.includes(treatment)) {
          acc[treatment] = (acc[treatment] ?? 0) + 1;
        }
      });

      return acc;
    }, {});

    return {
      dailyAppointments,
      totalRevenue,
      totalOutstanding,
      patientGrowth,
      dentistWorkload: Object.entries(dentistWorkload).sort((a, b) => b[1] - a[1]),
      treatmentFrequency: Object.entries(treatmentFrequency).sort((a, b) => b[1] - a[1]),
    };
  }, [appointments, invoices, patients, records]);

  return (
    <AdminShell>
      <div className="w-full space-y-6">
        <header className="rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-700">
            Module H
          </p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                Reports & Analytics
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                This is the final step in the flow chart, where saved visit, billing,
                and appointment data become dashboard and reporting insights.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">
                  Daily Visits
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {analytics.dailyAppointments.length}
                </p>
              </div>
              <div className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  Revenue
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {currency(analytics.totalRevenue)}
                </p>
              </div>
              <div className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  Outstanding
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {currency(analytics.totalOutstanding)}
                </p>
              </div>
            </div>
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

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] xl:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-950">Daily Appointments</h3>
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
                {formatDateLabel(new Date().toISOString().slice(0, 10))}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {analytics.dailyAppointments.length === 0 ? (
                <p className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
                  No appointments scheduled for today.
                </p>
              ) : (
                analytics.dailyAppointments.map((appointment) => (
                  <article
                    key={appointment.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {appointment.patientName}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {appointment.time} | {appointment.dentist}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                        {appointment.status}
                      </span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/80 bg-slate-950 p-6 text-white shadow-[0_20px_50px_rgba(15,23,42,0.16)]">
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/75">
              Revenue Snapshot
            </p>
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl bg-white/8 p-4">
                <p className="text-sm text-slate-300">Collected Revenue</p>
                <p className="mt-1 text-3xl font-semibold text-white">
                  {currency(analytics.totalRevenue)}
                </p>
              </div>
              <div className="rounded-2xl bg-white/8 p-4">
                <p className="text-sm text-slate-300">Outstanding Balance</p>
                <p className="mt-1 text-3xl font-semibold text-white">
                  {currency(analytics.totalOutstanding)}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <h3 className="text-xl font-semibold text-slate-950">Patient Growth</h3>
            <div className="mt-4 space-y-3">
              {analytics.patientGrowth.length === 0 ? (
                <p className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
                  No patient growth data yet.
                </p>
              ) : (
                analytics.patientGrowth.map(([month, count]) => (
                  <div
                    key={month}
                    className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100"
                  >
                    <p className="font-medium text-slate-900">{month}</p>
                    <span className="rounded-full bg-slate-950 px-3 py-1 text-sm text-white">
                      {count}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <h3 className="text-xl font-semibold text-slate-950">Dentist Workload</h3>
            <div className="mt-4 space-y-3">
              {analytics.dentistWorkload.length === 0 ? (
                <p className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
                  No dentist workload data yet.
                </p>
              ) : (
                analytics.dentistWorkload.map(([dentist, count]) => (
                  <div
                    key={dentist}
                    className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100"
                  >
                    <p className="font-medium text-slate-900">{dentist}</p>
                    <span className="rounded-full bg-sky-700 px-3 py-1 text-sm text-white">
                      {count}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] xl:col-span-3">
            <h3 className="text-xl font-semibold text-slate-950">
              Treatment Frequency Reports
            </h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {analytics.treatmentFrequency.length === 0 ? (
                <p className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600 md:col-span-2 xl:col-span-4">
                  No treatment frequency data yet.
                </p>
              ) : (
                analytics.treatmentFrequency.map(([treatment, count]) => (
                  <div
                    key={treatment}
                    className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100"
                  >
                    <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                      {treatment}
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-slate-950">
                      {count}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}

