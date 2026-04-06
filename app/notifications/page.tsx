"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";

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

const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm focus:border-sky-400 focus:bg-white focus:outline-none transition";
const lbl = "mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-500";

function formatDateLabel(date: string) {
  if (!date) return "Not set";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(date));
}

function invoiceTotal(invoice: Invoice) {
  return invoice.lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

function invoicePaid(invoice: Invoice) {
  return invoice.payments.reduce((sum, p) => sum + p.amount, 0);
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
      return `Hello ${patientName}, you have an outstanding balance of $${context.amount?.toFixed(2)}. Please contact the clinic for payment arrangements.`;
    case "follow-up-reminder":
      return `Hello ${patientName}, this is your follow-up reminder for ${context.date}. ${context.treatment ? `Related treatment: ${context.treatment}.` : ""}`;
    default:
      return `Notification for ${patientName}.`;
  }
}

function categoryLabel(category: NotificationCategory) {
  switch (category) {
    case "appointment-reminder":    return "Appointment Reminder";
    case "appointment-confirmation": return "Confirmation Alert";
    case "payment-reminder":        return "Payment Reminder";
    case "follow-up-reminder":      return "Follow-up Reminder";
    default:                        return category;
  }
}

function categoryColor(category: NotificationCategory) {
  switch (category) {
    case "appointment-reminder":    return "bg-sky-100 text-sky-700";
    case "appointment-confirmation": return "bg-emerald-100 text-emerald-700";
    case "payment-reminder":        return "bg-amber-100 text-amber-700";
    case "follow-up-reminder":      return "bg-violet-100 text-violet-700";
    default:                        return "bg-slate-100 text-slate-600";
  }
}

export default function NotificationsPage() {
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [notificationForm, setNotificationForm] = useState<NotificationFormState>(initialNotificationForm);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        setErrorMessage("");
        const [pr, ar, ir, nr] = await Promise.all([
          fetch("/api/patients", { cache: "no-store" }),
          fetch("/api/appointments", { cache: "no-store" }),
          fetch("/api/billing", { cache: "no-store" }),
          fetch("/api/notifications", { cache: "no-store" }),
        ]);
        if (!pr.ok || !ar.ok || !ir.ok || !nr.ok) {
          throw new Error(`${pr.ok ? "" : await pr.text()} ${ar.ok ? "" : await ar.text()} ${ir.ok ? "" : await ir.text()} ${nr.ok ? "" : await nr.text()}`.trim());
        }
        const [pd, ad, id2, nd] = await Promise.all([
          pr.json() as Promise<PatientProfile[]>,
          ar.json() as Promise<Appointment[]>,
          ir.json() as Promise<Invoice[]>,
          nr.json() as Promise<NotificationRecord[]>,
        ]);
        setPatients(pd);
        setAppointments(ad);
        setInvoices(id2);
        setNotifications(nd);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Unable to load notification data.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const suggestions = useMemo(() => {
    const apptSuggestions = appointments.flatMap((apt) => {
      const patient = patients.find((p) => p.id === apt.patientId);
      const recipient = patient?.phone || patient?.email || "";
      const items: NotificationFormState[] = [];

      if (apt.reminderDate) {
        items.push({
          patientId: apt.patientId,
          patientName: apt.patientName,
          category: "appointment-reminder",
          channel: apt.reminderChannel === "email" ? "email" : "sms",
          recipient,
          subject: "Appointment Reminder",
          message: buildMessage("appointment-reminder", apt.patientName, { date: `${apt.date} ${apt.time}` }),
          scheduledFor: apt.reminderDate,
          relatedAppointmentId: apt.id,
          relatedInvoiceId: "",
        });
      }
      if (apt.status === "confirmed") {
        items.push({
          patientId: apt.patientId,
          patientName: apt.patientName,
          category: "appointment-confirmation",
          channel: patient?.email ? "email" : "sms",
          recipient,
          subject: "Appointment Confirmed",
          message: buildMessage("appointment-confirmation", apt.patientName, { date: `${apt.date} ${apt.time}` }),
          scheduledFor: apt.date,
          relatedAppointmentId: apt.id,
          relatedInvoiceId: "",
        });
      }
      if (apt.followUpDate) {
        items.push({
          patientId: apt.patientId,
          patientName: apt.patientName,
          category: "follow-up-reminder",
          channel: patient?.email ? "email" : "sms",
          recipient,
          subject: "Follow-up Reminder",
          message: buildMessage("follow-up-reminder", apt.patientName, { date: apt.followUpDate, treatment: apt.reason }),
          scheduledFor: apt.followUpDate,
          relatedAppointmentId: apt.id,
          relatedInvoiceId: "",
        });
      }
      return items;
    });

    const paymentSuggestions = invoices
      .map((inv) => {
        const patient = patients.find((p) => p.id === inv.patientId);
        const outstanding = Math.max(invoiceTotal(inv) - invoicePaid(inv), 0);
        if (outstanding <= 0) return null;
        return {
          patientId: inv.patientId,
          patientName: inv.patientName,
          category: "payment-reminder" as const,
          channel: patient?.email ? "email" : "sms",
          recipient: patient?.phone || patient?.email || "",
          subject: "Payment Reminder",
          message: buildMessage("payment-reminder", inv.patientName, { amount: outstanding }),
          scheduledFor: inv.issueDate,
          relatedAppointmentId: "",
          relatedInvoiceId: inv.id,
        };
      })
      .filter(Boolean) as NotificationFormState[];

    return [...apptSuggestions, ...paymentSuggestions];
  }, [appointments, invoices, patients]);

  function handleFieldChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setNotificationForm((cur) => ({ ...cur, [name]: value }));
  }

  function applySuggestion(suggestion: NotificationFormState) {
    setNotificationForm(suggestion);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!notificationForm.patientId || !notificationForm.scheduledFor) return;

    try {
      setIsSaving(true);
      setErrorMessage("");
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...notificationForm, status: "queued" as NotificationStatus }),
      });
      if (!res.ok) throw new Error(await res.text());
      const next = (await res.json()) as NotificationRecord;
      setNotifications((cur) => [next, ...cur]);
      setNotificationForm(initialNotificationForm);
      setShowForm(false);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Notification could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  async function updateStatus(id: string, status: NotificationStatus) {
    const prev = notifications;
    setNotifications((cur) => cur.map((n) => (n.id === id ? { ...n, status } : n)));
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (err) {
      setNotifications(prev);
      setErrorMessage(err instanceof Error ? err.message : "Notification update failed.");
    }
  }

  const queuedCount = notifications.filter((n) => n.status === "queued").length;
  const sentCount   = notifications.filter((n) => n.status === "sent").length;

  return (
    <AdminShell>
      <div className="w-full space-y-6 animate-fade-in">

        {/* Page Header */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-600">Module G — Communications</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Notifications</h1>
              <p className="mt-1 max-w-xl text-sm text-slate-500">
                Manage SMS and email reminders for appointments, confirmations, follow-up care, and outstanding payments.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* KPIs */}
              <div className="flex gap-3">
                <div className="rounded-xl bg-slate-900 px-4 py-3 text-white">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-300">Queue</p>
                  <p className="mt-1.5 text-2xl font-bold">{queuedCount}</p>
                </div>
                <div className="rounded-xl border border-slate-200 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Sent</p>
                  <p className="mt-1.5 text-2xl font-bold text-slate-900">{sentCount}</p>
                </div>
                <div className="rounded-xl border border-slate-200 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Suggestions</p>
                  <p className="mt-1.5 text-2xl font-bold text-slate-900">{suggestions.length}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowForm((v) => !v)}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition"
              >
                {showForm ? "Close Form" : "+ New Notification"}
              </button>
            </div>
          </div>
        </div>

        {/* Status banners */}
        {isLoading && (
          <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-700">
            Loading notifications from MongoDB...
          </div>
        )}
        {errorMessage && (
          <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

        {/* Create Form */}
        {showForm && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-fade-in-up">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-600">New Notification</p>
                <h2 className="mt-1 text-base font-bold text-slate-900">Compose & Schedule</h2>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={lbl}>Patient</label>
                  <select
                    name="patientId"
                    value={notificationForm.patientId}
                    onChange={(e) => {
                      const selected = patients.find((p) => p.id === e.target.value);
                      setNotificationForm((cur) => ({
                        ...cur,
                        patientId: e.target.value,
                        patientName: selected?.fullName ?? "",
                        recipient: cur.channel === "email" ? selected?.email ?? "" : selected?.phone ?? "",
                      }));
                    }}
                    className={input}
                  >
                    <option value="">Select patient</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>{p.fullName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={lbl}>Category</label>
                  <select name="category" value={notificationForm.category} onChange={handleFieldChange} className={input}>
                    {notificationCategoryOptions.map((c) => (
                      <option key={c} value={c}>{categoryLabel(c)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={lbl}>Channel</label>
                  <select name="channel" value={notificationForm.channel} onChange={handleFieldChange} className={input}>
                    {notificationChannelOptions.map((c) => (
                      <option key={c} value={c}>{c.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={lbl}>Recipient</label>
                  <input name="recipient" value={notificationForm.recipient} onChange={handleFieldChange} placeholder="Phone or email" className={input} />
                </div>

                <div>
                  <label className={lbl}>Scheduled For</label>
                  <input type="date" name="scheduledFor" value={notificationForm.scheduledFor} onChange={handleFieldChange} className={input} />
                </div>

                <div className="sm:col-span-2">
                  <label className={lbl}>Subject</label>
                  <input name="subject" value={notificationForm.subject} onChange={handleFieldChange} placeholder="Appointment Reminder" className={input} />
                </div>

                <div className="sm:col-span-2">
                  <label className={lbl}>Message</label>
                  <textarea
                    name="message"
                    value={notificationForm.message}
                    onChange={handleFieldChange}
                    placeholder="Message body for SMS or email reminder"
                    rows={4}
                    className={input}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? "Saving..." : "Save Notification"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setNotificationForm(initialNotificationForm); }}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Suggested Reminders */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-600">Smart Suggestions</p>
              <h2 className="mt-1 text-base font-bold text-slate-900">Reminders generated from clinic activity</h2>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
              {suggestions.length} pending
            </span>
          </div>

          {suggestions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
              <p className="text-sm text-slate-400">No suggestions available. Add appointments or invoices to generate reminders.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {suggestions.slice(0, 12).map((suggestion, i) => (
                <button
                  key={`${suggestion.category}-${suggestion.patientId}-${i}`}
                  type="button"
                  onClick={() => applySuggestion(suggestion)}
                  className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-sky-300 hover:bg-sky-50 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{suggestion.patientName}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${categoryColor(suggestion.category)}`}>
                      {suggestion.channel}
                    </span>
                  </div>
                  <span className={`self-start rounded-full px-2.5 py-1 text-xs font-medium ${categoryColor(suggestion.category)}`}>
                    {categoryLabel(suggestion.category)}
                  </span>
                  <p className="text-xs leading-5 text-slate-500 line-clamp-2">{suggestion.message}</p>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Notification Queue */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-600">Notification Queue</p>
              <h2 className="mt-1 text-base font-bold text-slate-900">Saved Alerts</h2>
            </div>
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
              {queuedCount} queued
            </span>
          </div>

          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-400">No notifications saved yet. Use a suggestion or create one above.</p>
              {!showForm && (
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 transition"
                >
                  + New Notification
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((n) => (
                <div key={n.id} className="flex items-start gap-4 px-6 py-4">
                  {/* Category badge */}
                  <div className={`mt-0.5 shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide ${categoryColor(n.category)}`}>
                    {n.channel.toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{n.patientName}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {categoryLabel(n.category)} · {formatDateLabel(n.scheduledFor)}
                        </p>
                      </div>
                      <select
                        value={n.status}
                        onChange={(e) => updateStatus(n.id, e.target.value as NotificationStatus)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-sky-400"
                      >
                        <option value="queued">Queued</option>
                        <option value="sent">Sent</option>
                      </select>
                    </div>
                    <p className="mt-1.5 text-sm text-slate-600 leading-5">{n.message}</p>
                    <p className="mt-1 text-xs text-slate-400">{n.recipient || "No recipient set"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </AdminShell>
  );
}
