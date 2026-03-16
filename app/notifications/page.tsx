"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

import { AdminShell } from "@/components/admin-shell";
import {
  initialNotificationForm,
  notificationCategoryOptions,
  notificationChannelOptions,
  type Appointment,
  type Invoice,
  type NotificationCategory,
  type NotificationFormState,
  type NotificationRecord,
  type NotificationStatus,
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

function invoiceTotal(invoice: Invoice) {
  return invoice.lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
}

function invoicePaid(invoice: Invoice) {
  return invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
}

function buildMessage(
  category: NotificationCategory,
  patientName: string,
  context: { date?: string; amount?: number; treatment?: string },
) {
  switch (category) {
    case "appointment-reminder":
      return `Reminder for ${patientName}: your dental appointment is scheduled on ${context.date}.`;
    case "appointment-confirmation":
      return `Hello ${patientName}, your appointment has been confirmed for ${context.date}.`;
    case "payment-reminder":
      return `Hello ${patientName}, you have an outstanding balance of $${context.amount?.toFixed(
        2,
      )}. Please contact the clinic for payment arrangements.`;
    case "follow-up-reminder":
      return `Hello ${patientName}, this is your follow-up reminder for ${context.date}. ${
        context.treatment ? `Related treatment: ${context.treatment}.` : ""
      }`;
  }
}

function categoryLabel(category: NotificationCategory) {
  switch (category) {
    case "appointment-reminder":
      return "Appointment Reminder";
    case "appointment-confirmation":
      return "Confirmation Alert";
    case "payment-reminder":
      return "Payment Reminder";
    case "follow-up-reminder":
      return "Follow-up Reminder";
  }
}

export default function NotificationsPage() {
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [notificationForm, setNotificationForm] =
    useState<NotificationFormState>(initialNotificationForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadNotificationsData() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const [
          patientsResponse,
          appointmentsResponse,
          invoicesResponse,
          notificationsResponse,
        ] = await Promise.all([
          fetch("/api/patients", { cache: "no-store" }),
          fetch("/api/appointments", { cache: "no-store" }),
          fetch("/api/billing", { cache: "no-store" }),
          fetch("/api/notifications", { cache: "no-store" }),
        ]);

        if (
          !patientsResponse.ok ||
          !appointmentsResponse.ok ||
          !invoicesResponse.ok ||
          !notificationsResponse.ok
        ) {
          throw new Error(
            `${patientsResponse.ok ? "" : await patientsResponse.text()} ${
              appointmentsResponse.ok ? "" : await appointmentsResponse.text()
            } ${invoicesResponse.ok ? "" : await invoicesResponse.text()} ${
              notificationsResponse.ok ? "" : await notificationsResponse.text()
            }`.trim(),
          );
        }

        const [patientsData, appointmentsData, invoicesData, notificationsData] =
          await Promise.all([
            (await patientsResponse.json()) as PatientProfile[],
            (await appointmentsResponse.json()) as Appointment[],
            (await invoicesResponse.json()) as Invoice[],
            (await notificationsResponse.json()) as NotificationRecord[],
          ]);

        setPatients(patientsData);
        setAppointments(appointmentsData);
        setInvoices(invoicesData);
        setNotifications(notificationsData);
      } catch (error) {
        console.error(error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load notification data.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadNotificationsData();
  }, []);

  const suggestions = useMemo(() => {
    const appointmentSuggestions = appointments.flatMap((appointment) => {
      const patient = patients.find((item) => item.id === appointment.patientId);
      const recipient = patient?.phone || patient?.email || "";

      const items: NotificationFormState[] = [];

      if (appointment.reminderDate) {
        items.push({
          patientId: appointment.patientId,
          patientName: appointment.patientName,
          category: "appointment-reminder",
          channel: appointment.reminderChannel === "email" ? "email" : "sms",
          recipient,
          subject: "Appointment Reminder",
          message: buildMessage("appointment-reminder", appointment.patientName, {
            date: `${appointment.date} ${appointment.time}`,
          }),
          scheduledFor: appointment.reminderDate,
          relatedAppointmentId: appointment.id,
          relatedInvoiceId: "",
        });
      }

      if (appointment.status === "confirmed") {
        items.push({
          patientId: appointment.patientId,
          patientName: appointment.patientName,
          category: "appointment-confirmation",
          channel: patient?.email ? "email" : "sms",
          recipient,
          subject: "Appointment Confirmed",
          message: buildMessage("appointment-confirmation", appointment.patientName, {
            date: `${appointment.date} ${appointment.time}`,
          }),
          scheduledFor: appointment.date,
          relatedAppointmentId: appointment.id,
          relatedInvoiceId: "",
        });
      }

      if (appointment.followUpDate) {
        items.push({
          patientId: appointment.patientId,
          patientName: appointment.patientName,
          category: "follow-up-reminder",
          channel: patient?.email ? "email" : "sms",
          recipient,
          subject: "Follow-up Reminder",
          message: buildMessage("follow-up-reminder", appointment.patientName, {
            date: appointment.followUpDate,
            treatment: appointment.reason,
          }),
          scheduledFor: appointment.followUpDate,
          relatedAppointmentId: appointment.id,
          relatedInvoiceId: "",
        });
      }

      return items;
    });

    const paymentSuggestions = invoices
      .map((invoice) => {
        const patient = patients.find((item) => item.id === invoice.patientId);
        const outstanding = Math.max(invoiceTotal(invoice) - invoicePaid(invoice), 0);

        if (outstanding <= 0) {
          return null;
        }

        return {
          patientId: invoice.patientId,
          patientName: invoice.patientName,
          category: "payment-reminder" as const,
          channel: patient?.email ? "email" : "sms",
          recipient: patient?.phone || patient?.email || "",
          subject: "Payment Reminder",
          message: buildMessage("payment-reminder", invoice.patientName, {
            amount: outstanding,
          }),
          scheduledFor: invoice.issueDate,
          relatedAppointmentId: "",
          relatedInvoiceId: invoice.id,
        };
      })
      .filter(Boolean) as NotificationFormState[];

    return [...appointmentSuggestions, ...paymentSuggestions];
  }, [appointments, invoices, patients]);

  function handleFieldChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target;
    setNotificationForm((current) => ({ ...current, [name]: value }));
  }

  function useSuggestion(suggestion: NotificationFormState) {
    setNotificationForm(suggestion);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!notificationForm.patientId || !notificationForm.scheduledFor) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");

      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...notificationForm,
          status: "queued" as NotificationStatus,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const nextNotification = (await response.json()) as NotificationRecord;
      setNotifications((current) => [nextNotification, ...current]);
      setNotificationForm(initialNotificationForm);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Notification could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function updateNotificationStatus(id: string, status: NotificationStatus) {
    const previous = notifications;

    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item)),
    );

    try {
      const response = await fetch(`/api/notifications/${id}`, {
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
      setNotifications(previous);
      setErrorMessage(
        error instanceof Error ? error.message : "Notification update failed.",
      );
    }
  }

  const queuedCount = notifications.filter((item) => item.status === "queued").length;
  const sentCount = notifications.filter((item) => item.status === "sent").length;

  return (
    <AdminShell>
      <div className="w-full space-y-6">
        <header className="rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-700">
            Module G
          </p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                Notifications
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Manage SMS and email reminders for appointments, confirmations,
                follow-up care, and outstanding payments.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">
                  Queue
                </p>
                <p className="mt-2 text-2xl font-semibold">{queuedCount}</p>
              </div>
              <div className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  Sent
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {sentCount}
                </p>
              </div>
              <div className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  Suggestions
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {suggestions.length}
                </p>
              </div>
            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="rounded-[24px] border border-sky-100 bg-sky-50 px-5 py-4 text-sm text-sky-800">
            Loading notifications from MongoDB...
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-[24px] border border-rose-100 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="space-y-6">
          <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <h3 className="text-xl font-semibold text-slate-950">Create Notification</h3>

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Patient</span>
                  <select
                    name="patientId"
                    value={notificationForm.patientId}
                    onChange={(event) => {
                      const selectedPatient = patients.find(
                        (item) => item.id === event.target.value,
                      );
                      setNotificationForm((current) => ({
                        ...current,
                        patientId: event.target.value,
                        patientName: selectedPatient?.fullName ?? "",
                        recipient:
                          current.channel === "email"
                            ? selectedPatient?.email ?? ""
                            : selectedPatient?.phone ?? "",
                      }));
                    }}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  >
                    <option value="">Select patient</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.fullName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Category</span>
                  <select
                    name="category"
                    value={notificationForm.category}
                    onChange={handleFieldChange}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  >
                    {notificationCategoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {categoryLabel(category)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Channel</span>
                  <select
                    name="channel"
                    value={notificationForm.channel}
                    onChange={handleFieldChange}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  >
                    {notificationChannelOptions.map((channel) => (
                      <option key={channel} value={channel}>
                        {channel.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Recipient</span>
                  <input
                    name="recipient"
                    value={notificationForm.recipient}
                    onChange={handleFieldChange}
                    placeholder="Phone number or email"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  />
                </label>
                <label className="space-y-1 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Subject</span>
                  <input
                    name="subject"
                    value={notificationForm.subject}
                    onChange={handleFieldChange}
                    placeholder="Appointment Reminder"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  />
                </label>
                <label className="space-y-1 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Scheduled For</span>
                  <input
                    type="date"
                    name="scheduledFor"
                    value={notificationForm.scheduledFor}
                    onChange={handleFieldChange}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  />
                </label>
              </div>

              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">Message</span>
                <textarea
                  name="message"
                  value={notificationForm.message}
                  onChange={handleFieldChange}
                  placeholder="Message body for SMS or email reminder"
                  className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                />
              </label>

              <button
                type="submit"
                disabled={isSaving}
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSaving ? "Saving Notification..." : "Save Notification"}
              </button>
            </form>
          </section>

          <div className="space-y-6">
            <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <h3 className="text-xl font-semibold text-slate-950">
                Suggested Reminders
              </h3>
              <div className="mt-4 space-y-3">
                {suggestions.length === 0 ? (
                  <p className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
                    No notification suggestions available.
                  </p>
                ) : (
                  suggestions.slice(0, 12).map((suggestion, index) => (
                    <button
                      key={`${suggestion.category}-${suggestion.patientId}-${index}`}
                      type="button"
                      onClick={() => useSuggestion(suggestion)}
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:bg-white"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {suggestion.patientName}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {categoryLabel(suggestion.category)}
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                          {suggestion.channel.toUpperCase()}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-slate-600">
                        {suggestion.message}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-white/80 bg-slate-950 p-6 text-white shadow-[0_20px_50px_rgba(15,23,42,0.16)]">
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/75">
                Notification Queue
              </p>
              <h3 className="mt-2 text-xl font-semibold">Saved Alerts</h3>
              <div className="mt-4 space-y-3">
                {notifications.length === 0 ? (
                  <p className="rounded-2xl bg-white/10 p-4 text-sm text-slate-300">
                    No notifications saved yet.
                  </p>
                ) : (
                  notifications.map((notification) => (
                    <article
                      key={notification.id}
                      className="rounded-3xl border border-white/10 bg-white/6 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">
                            {notification.patientName}
                          </p>
                          <p className="mt-1 text-sm text-slate-300">
                            {categoryLabel(notification.category)} |{" "}
                            {formatDateLabel(notification.scheduledFor)}
                          </p>
                        </div>
                        <select
                          value={notification.status}
                          onChange={(event) =>
                            updateNotificationStatus(
                              notification.id,
                              event.target.value as NotificationStatus,
                            )
                          }
                          className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none"
                        >
                          <option value="queued">queued</option>
                          <option value="sent">sent</option>
                        </select>
                      </div>
                      <p className="mt-3 text-sm text-slate-300">
                        {notification.message}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-cyan-200">
                        {notification.channel} {"->"} {notification.recipient || "No recipient"}
                      </p>
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


