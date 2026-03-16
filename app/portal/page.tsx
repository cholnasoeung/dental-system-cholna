"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import {
  type Appointment,
  type DentalRecord,
  type Invoice,
  type PatientProfile,
  type Prescription,
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

function currency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
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

export default function PortalPage() {
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [records, setRecords] = useState<DentalRecord[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [portalId, setPortalId] = useState("");
  const [portalDob, setPortalDob] = useState("");
  const [profileForm, setProfileForm] = useState<Partial<PatientProfile>>({});
  const [currentPatient, setCurrentPatient] = useState<PatientProfile | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedPrescription, setSelectedPrescription] =
    useState<Prescription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadPortalData() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const [
          patientsResponse,
          appointmentsResponse,
          recordsResponse,
          invoicesResponse,
          prescriptionsResponse,
        ] = await Promise.all([
          fetch("/api/patients", { cache: "no-store" }),
          fetch("/api/appointments", { cache: "no-store" }),
          fetch("/api/emr", { cache: "no-store" }),
          fetch("/api/billing", { cache: "no-store" }),
          fetch("/api/prescriptions", { cache: "no-store" }),
        ]);

        if (
          !patientsResponse.ok ||
          !appointmentsResponse.ok ||
          !recordsResponse.ok ||
          !invoicesResponse.ok ||
          !prescriptionsResponse.ok
        ) {
          throw new Error("Failed to load patient portal data.");
        }

        const [patientsData, appointmentsData, recordsData, invoicesData, prescriptionsData] =
          await Promise.all([
            (await patientsResponse.json()) as PatientProfile[],
            (await appointmentsResponse.json()) as Appointment[],
            (await recordsResponse.json()) as DentalRecord[],
            (await invoicesResponse.json()) as Invoice[],
            (await prescriptionsResponse.json()) as Prescription[],
          ]);

        setPatients(patientsData);
        setAppointments(appointmentsData);
        setRecords(recordsData);
        setInvoices(invoicesData);
        setPrescriptions(prescriptionsData);
      } catch (error) {
        console.error(error);
        setErrorMessage("Unable to load patient portal data.");
      } finally {
        setIsLoading(false);
      }
    }

    loadPortalData();
  }, []);

  function handlePortalLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const matchedPatient = patients.find(
      (patient) => patient.id === portalId && patient.dateOfBirth === portalDob,
    );

    if (!matchedPatient) {
      setErrorMessage("Patient ID or date of birth is incorrect.");
      return;
    }

    setCurrentPatient(matchedPatient);
    setProfileForm(matchedPatient);
    setErrorMessage("");
  }

  function handleProfileFieldChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
  }

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentPatient) {
      return;
    }

    try {
      setIsSavingProfile(true);
      setErrorMessage("");

      const response = await fetch(`/api/patients/${currentPatient.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: profileForm.phone,
          email: profileForm.email,
          address: profileForm.address,
          emergencyContactName: profileForm.emergencyContactName,
          emergencyContactRelation: profileForm.emergencyContactRelation,
          emergencyContactPhone: profileForm.emergencyContactPhone,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile.");
      }

      const updatedPatient = {
        ...currentPatient,
        ...profileForm,
      } as PatientProfile;

      setCurrentPatient(updatedPatient);
      setPatients((current) =>
        current.map((patient) =>
          patient.id === updatedPatient.id ? updatedPatient : patient,
        ),
      );
    } catch (error) {
      console.error(error);
      setErrorMessage("Profile update failed.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  const patientAppointments = currentPatient
    ? appointments.filter((item) => item.patientId === currentPatient.id)
    : [];
  const patientRecords = currentPatient
    ? records.filter((item) => item.patientId === currentPatient.id)
    : [];
  const patientInvoices = currentPatient
    ? invoices.filter((item) => item.patientId === currentPatient.id)
    : [];
  const patientPrescriptions = currentPatient
    ? prescriptions.filter((item) => item.patientId === currentPatient.id)
    : [];

  if (!currentPatient) {
    return (
      <div className="min-h-screen bg-[linear-gradient(135deg,#ecfeff_0%,#eef6ff_48%,#f8fafc_100%)] p-4 md:p-8">
        <div className="w-full rounded-[32px] border border-white/80 bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.10)] md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-700">
            Patient Portal
          </p>
          <div className="mt-4 space-y-8">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
                Secure patient access
              </h1>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Sign in with your patient ID and date of birth to view appointments,
                treatment history, invoices, prescriptions, and update your profile.
              </p>
              <div className="mt-6 rounded-[28px] bg-slate-950 p-5 text-white">
                <p className="text-sm text-slate-300">Demo access format</p>
                <p className="mt-2 text-lg font-semibold">Patient ID + Date of Birth</p>
                <p className="mt-2 text-sm text-slate-300">
                  Example patient ID comes from the admin patient list.
                </p>
              </div>
            </div>

            <form
              onSubmit={handlePortalLogin}
              className="rounded-[28px] border border-sky-100 bg-sky-50 p-6 shadow-[0_18px_40px_rgba(14,165,233,0.08)]"
            >
              <h2 className="text-2xl font-semibold text-slate-950">Portal Login</h2>
              <div className="mt-6 space-y-4">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Patient ID</span>
                  <input
                    value={portalId}
                    onChange={(event) => setPortalId(event.target.value)}
                    placeholder="Paste your patient ID"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Date of Birth</span>
                  <input
                    type="date"
                    value={portalDob}
                    onChange={(event) => setPortalDob(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400"
                  />
                </label>
              </div>

              {isLoading ? (
                <p className="mt-4 text-sm text-sky-700">Loading portal data...</p>
              ) : null}

              {errorMessage ? (
                <p className="mt-4 rounded-2xl bg-rose-100 px-4 py-3 text-sm text-rose-700">
                  {errorMessage}
                </p>
              ) : null}

              <button
                type="submit"
                className="mt-6 w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Sign In
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#ecfeff_0%,#eef6ff_48%,#f8fafc_100%)] p-4 md:p-8">
      <div className="w-full space-y-6">
        <header className="rounded-[32px] border border-white/80 bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-700">
                Patient Portal
              </p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
                Welcome, {currentPatient.fullName}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                View your appointments, treatment history, invoices, and prescriptions,
                and keep your profile information up to date.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setCurrentPatient(null);
                setSelectedInvoice(null);
                setSelectedPrescription(null);
                setPortalId("");
                setPortalDob("");
              }}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
            >
              Log Out
            </button>
          </div>
        </header>

        {errorMessage ? (
          <div className="rounded-[24px] border border-rose-100 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="space-y-6">
          <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <h2 className="text-2xl font-semibold text-slate-950">Appointments</h2>
            <div className="mt-4 space-y-3">
              {patientAppointments.length === 0 ? (
                <p className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
                  No appointments found.
                </p>
              ) : (
                patientAppointments.map((appointment) => (
                  <article
                    key={appointment.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {formatDateLabel(appointment.date)} at {appointment.time}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {appointment.dentist} | {appointment.reason || "General visit"}
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

          <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <h2 className="text-2xl font-semibold text-slate-950">Treatment History</h2>
            <div className="mt-4 space-y-3">
              {patientRecords.length === 0 ? (
                <p className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
                  No treatment history available.
                </p>
              ) : (
                patientRecords.map((record) => (
                  <article
                    key={record.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="font-semibold text-slate-900">
                      {formatDateLabel(record.visitDate)}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {record.diagnoses || record.chiefComplaint || "No diagnosis recorded"}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      {record.treatmentPlan || record.procedureHistory || "No treatment plan"}
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-slate-950">Invoices</h2>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-full bg-slate-950 px-4 py-2 text-xs font-medium text-white"
              >
                Print / Download
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {patientInvoices.length === 0 ? (
                <p className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
                  No invoices available.
                </p>
              ) : (
                patientInvoices.map((invoice) => (
                  <button
                    key={invoice.id}
                    type="button"
                    onClick={() => setSelectedInvoice(invoice)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left"
                  >
                    <p className="font-semibold text-slate-900">{invoice.invoiceNumber}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatDateLabel(invoice.issueDate)}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      Total: {currency(invoiceTotal(invoice))} | Balance:{" "}
                      {currency(Math.max(invoiceTotal(invoice) - invoicePaid(invoice), 0))}
                    </p>
                  </button>
                ))
              )}
            </div>
            {selectedInvoice ? (
              <div className="mt-4 rounded-2xl bg-slate-950 p-5 text-white">
                <p className="text-sm text-slate-300">Selected Invoice</p>
                <p className="mt-1 text-xl font-semibold">
                  {selectedInvoice.invoiceNumber}
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  {selectedInvoice.lineItems.length} charges
                </p>
              </div>
            ) : null}
          </section>

          <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-slate-950">Prescriptions</h2>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-full bg-slate-950 px-4 py-2 text-xs font-medium text-white"
              >
                Print / Download
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {patientPrescriptions.length === 0 ? (
                <p className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
                  No prescriptions available.
                </p>
              ) : (
                patientPrescriptions.map((prescription) => (
                  <button
                    key={prescription.id}
                    type="button"
                    onClick={() => setSelectedPrescription(prescription)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left"
                  >
                    <p className="font-semibold text-slate-900">
                      {formatDateLabel(prescription.prescribedDate)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {prescription.medications.length} medications
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {prescription.linkedTreatment || "General prescription"}
                    </p>
                  </button>
                ))
              )}
            </div>
            {selectedPrescription ? (
              <div className="mt-4 rounded-2xl bg-slate-950 p-5 text-white">
                <p className="text-sm text-slate-300">Selected Prescription</p>
                <p className="mt-1 text-xl font-semibold">
                  {formatDateLabel(selectedPrescription.prescribedDate)}
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  {selectedPrescription.medications.map((item) => item.name).join(", ")}
                </p>
              </div>
            ) : null}
          </section>
        </div>

        <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <h2 className="text-2xl font-semibold text-slate-950">Update Profile</h2>
          <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleProfileSave}>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Phone</span>
              <input
                name="phone"
                value={profileForm.phone || ""}
                onChange={handleProfileFieldChange}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                name="email"
                value={profileForm.email || ""}
                onChange={handleProfileFieldChange}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400"
              />
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Address</span>
              <input
                name="address"
                value={profileForm.address || ""}
                onChange={handleProfileFieldChange}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">
                Emergency Contact Name
              </span>
              <input
                name="emergencyContactName"
                value={profileForm.emergencyContactName || ""}
                onChange={handleProfileFieldChange}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">
                Emergency Contact Relation
              </span>
              <input
                name="emergencyContactRelation"
                value={profileForm.emergencyContactRelation || ""}
                onChange={handleProfileFieldChange}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400"
              />
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-slate-700">
                Emergency Contact Phone
              </span>
              <input
                name="emergencyContactPhone"
                value={profileForm.emergencyContactPhone || ""}
                onChange={handleProfileFieldChange}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400"
              />
            </label>

            <button
              type="submit"
              disabled={isSavingProfile}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 md:col-span-2"
            >
              {isSavingProfile ? "Saving Profile..." : "Save Profile"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}


