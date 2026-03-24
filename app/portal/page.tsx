"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

import {
  type Appointment,
  type DentalRecord,
  type Invoice,
  type PatientProfile,
  type Prescription,
  type SupportAttachment,
  type SupportFaqArticle,
  type SupportTicket,
  type SupportTicketListResponse,
  initialSupportTicketForm,
  supportCategoryOptions,
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

function supportCategoryLabel(category: SupportTicket["category"]) {
  return category
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function supportStatusTone(status: SupportTicket["status"]) {
  switch (status) {
    case "open":
      return "bg-amber-100 text-amber-800";
    case "pending":
      return "bg-violet-100 text-violet-800";
    case "in-progress":
      return "bg-sky-100 text-sky-800";
    case "resolved":
      return "bg-emerald-100 text-emerald-800";
    case "closed":
      return "bg-slate-200 text-slate-700";
  }
}

async function uploadCustomerFiles(files: File[], patientId: string, portalDob: string) {
  const uploads: SupportAttachment[] = [];

  for (const file of files) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("patientId", patientId);
    formData.append("portalDob", portalDob);

    const response = await fetch("/api/support/uploads", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Attachment upload failed.");
    }

    uploads.push((await response.json()) as SupportAttachment);
  }

  return uploads;
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
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [selectedSupportTicket, setSelectedSupportTicket] =
    useState<SupportTicket | null>(null);
  const [supportForm, setSupportForm] = useState(initialSupportTicketForm);
  const [supportReply, setSupportReply] = useState("");
  const [supportFiles, setSupportFiles] = useState<File[]>([]);
  const [supportReplyFiles, setSupportReplyFiles] = useState<File[]>([]);
  const [supportCategories, setSupportCategories] = useState(supportCategoryOptions);
  const [supportFaqArticles, setSupportFaqArticles] = useState<SupportFaqArticle[]>([]);
  const [feedbackRating, setFeedbackRating] = useState("5");
  const [feedbackComment, setFeedbackComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isLoadingSupport, setIsLoadingSupport] = useState(false);
  const [isSavingSupport, setIsSavingSupport] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const suggestedSupportFaq = useMemo(() => {
    const query = `${supportForm.subject} ${supportForm.message}`.trim().toLowerCase();
    if (!query) {
      return supportFaqArticles.slice(0, 3);
    }

    return supportFaqArticles
      .filter((article) =>
        `${article.title} ${article.body} ${article.tags.join(" ")}`.toLowerCase().includes(query),
      )
      .slice(0, 3);
  }, [supportFaqArticles, supportForm.message, supportForm.subject]);

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
          categoriesResponse,
          faqResponse,
        ] = await Promise.all([
          fetch("/api/patients", { cache: "no-store" }),
          fetch("/api/appointments", { cache: "no-store" }),
          fetch("/api/emr", { cache: "no-store" }),
          fetch("/api/billing", { cache: "no-store" }),
          fetch("/api/prescriptions", { cache: "no-store" }),
          fetch("/api/support/categories", { cache: "no-store" }),
          fetch("/api/support/faq", { cache: "no-store" }),
        ]);

        if (
          !patientsResponse.ok ||
          !appointmentsResponse.ok ||
          !recordsResponse.ok ||
          !invoicesResponse.ok ||
          !prescriptionsResponse.ok ||
          !categoriesResponse.ok ||
          !faqResponse.ok
        ) {
          throw new Error("Failed to load patient portal data.");
        }

        const [
          patientsData,
          appointmentsData,
          recordsData,
          invoicesData,
          prescriptionsData,
          categoriesData,
          faqData,
        ] =
          await Promise.all([
            (await patientsResponse.json()) as PatientProfile[],
            (await appointmentsResponse.json()) as Appointment[],
            (await recordsResponse.json()) as DentalRecord[],
            (await invoicesResponse.json()) as Invoice[],
            (await prescriptionsResponse.json()) as Prescription[],
            (await categoriesResponse.json()) as Array<{ id: string; name: string }>,
            (await faqResponse.json()) as SupportFaqArticle[],
          ]);

        setPatients(patientsData);
        setAppointments(appointmentsData);
        setRecords(recordsData);
        setInvoices(invoicesData);
        setPrescriptions(prescriptionsData);
        setSupportCategories(categoriesData.map((item) => item.name));
        setSupportFaqArticles(faqData);
      } catch (error) {
        console.error(error);
        setErrorMessage("Unable to load patient portal data.");
      } finally {
        setIsLoading(false);
      }
    }

    loadPortalData();
  }, []);

  useEffect(() => {
    async function loadSupportTickets() {
      if (!currentPatient || !portalDob) {
        setSupportTickets([]);
        setSelectedSupportTicket(null);
        return;
      }

      try {
        setIsLoadingSupport(true);

        const searchParams = new URLSearchParams({
          patientId: currentPatient.id,
          portalDob,
        });
        const response = await fetch(`/api/support?${searchParams.toString()}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data = (await response.json()) as SupportTicketListResponse;
        setSupportTickets(data.tickets);
        setSelectedSupportTicket((current) => {
          if (current) {
            return data.tickets.some((ticket) => ticket.id === current.id)
              ? current
              : data.tickets[0] ?? null;
          }

          return data.tickets[0] ?? null;
        });
      } catch (error) {
        console.error(error);
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load support tickets.",
        );
      } finally {
        setIsLoadingSupport(false);
      }
    }

    loadSupportTickets();
  }, [currentPatient, portalDob]);

  useEffect(() => {
    async function loadSelectedSupportTicket() {
      if (!currentPatient || !portalDob || !selectedSupportTicket?.id) {
        return;
      }

      try {
        const params = new URLSearchParams({
          patientId: currentPatient.id,
          portalDob,
        });
        const response = await fetch(`/api/support/${selectedSupportTicket.id}?${params.toString()}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data = (await response.json()) as SupportTicket;
        setSelectedSupportTicket(data);
      } catch (error) {
        console.error(error);
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load support ticket.",
        );
      }
    }

    void loadSelectedSupportTicket();
  }, [currentPatient, portalDob, selectedSupportTicket?.id]);

  function handlePortalLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const matchedPatient = patients.find(
      (patient) =>
        (patient.patientId === portalId || patient.id === portalId) &&
        patient.dateOfBirth === portalDob,
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

  async function handleSupportSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentPatient || !portalDob || !supportForm.subject.trim() || !supportForm.message.trim()) {
      return;
    }

    try {
      setIsSavingSupport(true);
      setErrorMessage("");
      const attachments = supportFiles.length > 0
        ? await uploadCustomerFiles(supportFiles, currentPatient.id, portalDob)
        : [];

      const response = await fetch("/api/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId: currentPatient.id,
          portalDob,
          subject: supportForm.subject,
          category: supportForm.category,
          message: supportForm.message,
          sourceChannel: "portal",
          attachments,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const nextTicket = (await response.json()) as SupportTicket;
      setSupportTickets((current) => [nextTicket, ...current]);
      setSelectedSupportTicket(nextTicket);
      setSupportForm(initialSupportTicketForm);
      setSupportFiles([]);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Support ticket could not be created.",
      );
    } finally {
      setIsSavingSupport(false);
    }
  }

  async function handleSupportReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentPatient || !portalDob || !selectedSupportTicket || !supportReply.trim()) {
      return;
    }

    try {
      setIsSavingSupport(true);
      setErrorMessage("");
      const attachments = supportReplyFiles.length > 0
        ? await uploadCustomerFiles(supportReplyFiles, currentPatient.id, portalDob)
        : [];

      const response = await fetch(`/api/support/${selectedSupportTicket.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId: currentPatient.id,
          portalDob,
          message: supportReply,
          attachments,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const updatedTicket = (await response.json()) as SupportTicket;
      setSelectedSupportTicket(updatedTicket);
      setSupportTickets((current) => [
        updatedTicket,
        ...current.filter((ticket) => ticket.id !== updatedTicket.id),
      ]);
      setSupportReply("");
      setSupportReplyFiles([]);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Support reply could not be sent.",
      );
    } finally {
      setIsSavingSupport(false);
    }
  }

  async function handleSupportFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentPatient || !portalDob || !selectedSupportTicket) {
      return;
    }

    try {
      setIsSavingSupport(true);
      setErrorMessage("");

      const response = await fetch(`/api/support/${selectedSupportTicket.id}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId: currentPatient.id,
          portalDob,
          rating: Number(feedbackRating),
          comment: feedbackComment,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const updatedTicket = (await response.json()) as SupportTicket;
      setSelectedSupportTicket(updatedTicket);
      setSupportTickets((current) => [
        updatedTicket,
        ...current.filter((ticket) => ticket.id !== updatedTicket.id),
      ]);
      setFeedbackComment("");
      setFeedbackRating("5");
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Support feedback could not be saved.",
      );
    } finally {
      setIsSavingSupport(false);
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
                setSelectedSupportTicket(null);
                setSupportTickets([]);
                setSupportForm(initialSupportTicketForm);
                setSupportReply("");
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

        <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">Support</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Send a question to the clinic and follow the conversation here.
              </p>
            </div>
            <div className="rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-800 ring-1 ring-sky-100">
              {supportTickets.length} ticket{supportTickets.length === 1 ? "" : "s"}
            </div>
          </div>

          {isLoadingSupport ? (
            <p className="mt-4 rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-800">
              Loading support tickets...
            </p>
          ) : null}

          <div className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <form
              className="rounded-[28px] border border-slate-200 bg-slate-50 p-5"
              onSubmit={handleSupportSubmit}
            >
              <h3 className="text-lg font-semibold text-slate-950">Create Ticket</h3>
              <div className="mt-4 space-y-4">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Subject</span>
                  <input
                    value={supportForm.subject}
                    onChange={(event) =>
                      setSupportForm((current) => ({
                        ...current,
                        subject: event.target.value,
                      }))
                    }
                    placeholder="Need help with my visit"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Category</span>
                  <select
                    value={supportForm.category}
                    onChange={(event) =>
                      setSupportForm((current) => ({
                        ...current,
                        category: event.target.value as SupportTicket["category"],
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400"
                  >
                    {supportCategories.map((category) => (
                      <option key={category} value={category}>
                        {supportCategoryLabel(category)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Message</span>
                  <textarea
                    value={supportForm.message}
                    onChange={(event) =>
                      setSupportForm((current) => ({
                        ...current,
                        message: event.target.value,
                      }))
                    }
                    placeholder="Tell us what you need help with."
                    className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Attachments</span>
                  <input
                    type="file"
                    multiple
                    onChange={(event) => setSupportFiles(Array.from(event.target.files ?? []))}
                    className="block w-full text-sm text-slate-500"
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={isSavingSupport}
                className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSavingSupport ? "Sending..." : "Send Ticket"}
              </button>
              {suggestedSupportFaq.length > 0 ? (
                <div className="mt-5 space-y-3">
                  <p className="text-sm font-semibold text-slate-900">Suggested help articles</p>
                  {suggestedSupportFaq.map((article) => (
                    <article key={article.id} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                      <p className="font-semibold text-slate-900">{article.title}</p>
                      <p className="mt-2 text-sm text-slate-600">{article.body}</p>
                    </article>
                  ))}
                </div>
              ) : null}
            </form>

            <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="space-y-3">
                {supportTickets.length === 0 ? (
                  <p className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
                    No support tickets yet.
                  </p>
                ) : (
                  supportTickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => setSelectedSupportTicket(ticket)}
                      className={`w-full rounded-3xl border p-4 text-left transition ${
                        selectedSupportTicket?.id === ticket.id
                          ? "border-sky-300 bg-sky-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                            {ticket.ticketNumber}
                          </p>
                          <p className="font-semibold text-slate-900">{ticket.subject}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {supportCategoryLabel(ticket.category)} | {ticket.unreadForCustomer} unread
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${supportStatusTone(
                            ticket.status,
                          )}`}
                        >
                          {ticket.status}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-slate-600">
                        Last updated {formatDateLabel(ticket.lastMessageAt)}
                      </p>
                    </button>
                  ))
                )}
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                {selectedSupportTicket ? (
                  <>
                    <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-950">
                          {selectedSupportTicket.subject}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {supportCategoryLabel(selectedSupportTicket.category)} | Priority{" "}
                          {selectedSupportTicket.priority} | {selectedSupportTicket.ticketNumber}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${supportStatusTone(
                          selectedSupportTicket.status,
                        )}`}
                      >
                        {selectedSupportTicket.status}
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {selectedSupportTicket.messages.map((message) => (
                        <article
                          key={message.id}
                          className={`rounded-3xl p-4 ${
                            message.senderType === "patient"
                              ? "bg-white ring-1 ring-slate-200"
                              : "bg-slate-950 text-white"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p
                              className={`font-semibold ${
                                message.senderType === "patient"
                                  ? "text-slate-950"
                                  : "text-white"
                              }`}
                            >
                              {message.senderName}
                            </p>
                            <p
                              className={`text-xs uppercase tracking-[0.2em] ${
                                message.senderType === "patient"
                                  ? "text-slate-400"
                                  : "text-cyan-200"
                              }`}
                          >
                            {formatDateLabel(message.createdAt)}
                          </p>
                        </div>
                          <p
                            className={`mt-3 text-sm leading-6 ${
                              message.senderType === "patient"
                                ? "text-slate-600"
                                : "text-slate-200"
                            }`}
                          >
                            {message.message}
                          </p>
                          {message.attachments.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {message.attachments.map((attachment) => (
                                <a
                                  key={attachment.id}
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                                >
                                  {attachment.name}
                                </a>
                              ))}
                            </div>
                          ) : null}
                        </article>
                      ))}
                    </div>

                    {selectedSupportTicket.status === "open" ||
                    selectedSupportTicket.status === "in-progress" ||
                    selectedSupportTicket.status === "pending" ||
                    selectedSupportTicket.status === "resolved" ? (
                      <form className="mt-5 space-y-3" onSubmit={handleSupportReply}>
                        <label className="space-y-1">
                          <span className="text-sm font-medium text-slate-700">
                            Follow-up message
                          </span>
                          <textarea
                            value={supportReply}
                            onChange={(event) => setSupportReply(event.target.value)}
                            placeholder="Add more details for the clinic team."
                            className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400"
                          />
                        </label>
                        <input
                          type="file"
                          multiple
                          onChange={(event) =>
                            setSupportReplyFiles(Array.from(event.target.files ?? []))
                          }
                          className="block w-full text-sm text-slate-500"
                        />
                        <button
                          type="submit"
                          disabled={isSavingSupport}
                          className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          {isSavingSupport ? "Sending..." : "Send Reply"}
                        </button>
                      </form>
                    ) : (
                      <p className="mt-5 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
                        This ticket is {selectedSupportTicket.status}. New patient replies are disabled.
                      </p>
                    )}

                    {(selectedSupportTicket.status === "resolved" ||
                      selectedSupportTicket.status === "closed") && !selectedSupportTicket.feedbackRating ? (
                      <form className="mt-5 space-y-3" onSubmit={handleSupportFeedback}>
                        <label className="space-y-1">
                          <span className="text-sm font-medium text-slate-700">Rating</span>
                          <select
                            value={feedbackRating}
                            onChange={(event) => setFeedbackRating(event.target.value)}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400"
                          >
                            {[5, 4, 3, 2, 1].map((rating) => (
                              <option key={rating} value={rating}>
                                {rating} star{rating === 1 ? "" : "s"}
                              </option>
                            ))}
                          </select>
                        </label>
                        <textarea
                          value={feedbackComment}
                          onChange={(event) => setFeedbackComment(event.target.value)}
                          placeholder="Tell us how we did."
                          className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400"
                        />
                        <button
                          type="submit"
                          disabled={isSavingSupport}
                          className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          Submit Feedback
                        </button>
                      </form>
                    ) : null}

                    {selectedSupportTicket.feedbackRating ? (
                      <p className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-100">
                        Feedback submitted: {selectedSupportTicket.feedbackRating}/5
                        {selectedSupportTicket.feedbackComment
                          ? ` - ${selectedSupportTicket.feedbackComment}`
                          : ""}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="rounded-2xl bg-white p-4 text-sm text-slate-600 ring-1 ring-slate-200">
                    Select a support ticket to read the conversation.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}


