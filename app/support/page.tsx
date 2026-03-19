"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

import { AdminShell } from "@/components/admin-shell";
import {
  supportCategoryOptions,
  supportPriorityOptions,
  supportStatusOptions,
  type SupportTicket,
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

function supportCategoryLabel(category: SupportTicket["category"]) {
  switch (category) {
    case "general":
      return "General";
    case "billing":
      return "Billing";
    case "appointment":
      return "Appointment";
  }
}

function supportStatusTone(status: SupportTicket["status"]) {
  switch (status) {
    case "open":
      return "bg-amber-100 text-amber-800";
    case "in-progress":
      return "bg-sky-100 text-sky-800";
    case "resolved":
      return "bg-emerald-100 text-emerald-800";
    case "closed":
      return "bg-slate-200 text-slate-700";
  }
}

function supportPriorityTone(priority: SupportTicket["priority"]) {
  switch (priority) {
    case "low":
      return "bg-slate-100 text-slate-700";
    case "medium":
      return "bg-violet-100 text-violet-800";
    case "high":
      return "bg-rose-100 text-rose-800";
  }
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadTickets() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const response = await fetch("/api/support", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data = (await response.json()) as SupportTicket[];
        setTickets(data);
        setSelectedTicket((current) => {
          if (current) {
            return data.find((ticket) => ticket.id === current.id) ?? data[0] ?? null;
          }

          return data[0] ?? null;
        });
      } catch (error) {
        console.error(error);
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load support tickets.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadTickets();
  }, []);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
      const matchesCategory =
        categoryFilter === "all" || ticket.category === categoryFilter;
      const matchesPriority =
        priorityFilter === "all" || ticket.priority === priorityFilter;

      return matchesStatus && matchesCategory && matchesPriority;
    });
  }, [categoryFilter, priorityFilter, statusFilter, tickets]);

  async function updateTicket(
    id: string,
    updates: Partial<Pick<SupportTicket, "status" | "priority">>,
  ) {
    try {
      setIsSaving(true);
      setErrorMessage("");

      const response = await fetch(`/api/support/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const updatedTicket = (await response.json()) as SupportTicket;
      setTickets((current) => [
        updatedTicket,
        ...current.filter((ticket) => ticket.id !== updatedTicket.id),
      ]);
      setSelectedTicket(updatedTicket);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Support ticket update failed.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReplySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTicket || !replyMessage.trim()) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");

      const response = await fetch(`/api/support/${selectedTicket.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: replyMessage,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const updatedTicket = (await response.json()) as SupportTicket;
      setTickets((current) => [
        updatedTicket,
        ...current.filter((ticket) => ticket.id !== updatedTicket.id),
      ]);
      setSelectedTicket(updatedTicket);
      setReplyMessage("");
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Support reply could not be sent.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleFilterChange(
    setter: (value: string) => void,
    event: ChangeEvent<HTMLSelectElement>,
  ) {
    setter(event.target.value);
  }

  const openCount = tickets.filter((ticket) => ticket.status === "open").length;
  const inProgressCount = tickets.filter((ticket) => ticket.status === "in-progress").length;
  const resolvedCount = tickets.filter(
    (ticket) => ticket.status === "resolved" || ticket.status === "closed",
  ).length;

  return (
    <AdminShell>
      <div className="w-full space-y-6">
        <header className="rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-700">
            Operations
          </p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                Customer Support
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Review patient questions, reply in one threaded inbox, and track
                progress from open to resolved.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">
                  Open
                </p>
                <p className="mt-2 text-2xl font-semibold">{openCount}</p>
              </div>
              <div className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  Active
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {inProgressCount}
                </p>
              </div>
              <div className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  Resolved
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {resolvedCount}
                </p>
              </div>
            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="rounded-[24px] border border-sky-100 bg-sky-50 px-5 py-4 text-sm text-sky-800">
            Loading support tickets from MongoDB...
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-[24px] border border-rose-100 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-6">
            <div className="rounded-[28px] border border-white/80 bg-white/85 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <h3 className="text-lg font-semibold text-slate-950">Filters</h3>
              <div className="mt-4 space-y-4">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Status</span>
                  <select
                    value={statusFilter}
                    onChange={(event) => handleFilterChange(setStatusFilter, event)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  >
                    <option value="all">All statuses</option>
                    {supportStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Category</span>
                  <select
                    value={categoryFilter}
                    onChange={(event) => handleFilterChange(setCategoryFilter, event)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  >
                    <option value="all">All categories</option>
                    {supportCategoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {supportCategoryLabel(category)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Priority</span>
                  <select
                    value={priorityFilter}
                    onChange={(event) => handleFilterChange(setPriorityFilter, event)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  >
                    <option value="all">All priorities</option>
                    {supportPriorityOptions.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="space-y-3">
              {filteredTickets.length === 0 ? (
                <p className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
                  No tickets match the current filters.
                </p>
              ) : (
                filteredTickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => setSelectedTicket(ticket)}
                    className={`w-full rounded-[28px] border p-4 text-left shadow-[0_14px_36px_rgba(15,23,42,0.05)] transition ${
                      selectedTicket?.id === ticket.id
                        ? "border-sky-300 bg-sky-50"
                        : "border-white/80 bg-white/85 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{ticket.subject}</p>
                        <p className="mt-1 text-sm text-slate-500">{ticket.patientName}</p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${supportStatusTone(
                          ticket.status,
                        )}`}
                      >
                        {ticket.status}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
                        {supportCategoryLabel(ticket.category)}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${supportPriorityTone(
                          ticket.priority,
                        )}`}
                      >
                        {ticket.priority}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-500">
                      Updated {formatDateLabel(ticket.lastMessageAt)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            {selectedTicket ? (
              <>
                <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-700">
                      Ticket Detail
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-950">
                      {selectedTicket.subject}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                      {selectedTicket.patientName} | {supportCategoryLabel(selectedTicket.category)}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                        Status
                      </span>
                      <select
                        value={selectedTicket.status}
                        disabled={isSaving}
                        onChange={(event) =>
                          void updateTicket(selectedTicket.id, {
                            status: event.target.value as SupportTicket["status"],
                          })
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white"
                      >
                        {supportStatusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                        Priority
                      </span>
                      <select
                        value={selectedTicket.priority}
                        disabled={isSaving}
                        onChange={(event) =>
                          void updateTicket(selectedTicket.id, {
                            priority: event.target.value as SupportTicket["priority"],
                          })
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white"
                      >
                        {supportPriorityOptions.map((priority) => (
                          <option key={priority} value={priority}>
                            {priority}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {selectedTicket.messages.map((message) => (
                    <article
                      key={message.id}
                      className={`rounded-3xl p-4 ${
                        message.senderType === "staff"
                          ? "bg-slate-950 text-white"
                          : "bg-slate-50 ring-1 ring-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p
                          className={`font-semibold ${
                            message.senderType === "staff" ? "text-white" : "text-slate-950"
                          }`}
                        >
                          {message.senderName}
                        </p>
                        <p
                          className={`text-xs uppercase tracking-[0.2em] ${
                            message.senderType === "staff"
                              ? "text-cyan-200"
                              : "text-slate-400"
                          }`}
                        >
                          {formatDateLabel(message.createdAt)}
                        </p>
                      </div>
                      <p
                        className={`mt-3 text-sm leading-6 ${
                          message.senderType === "staff"
                            ? "text-slate-200"
                            : "text-slate-600"
                        }`}
                      >
                        {message.message}
                      </p>
                    </article>
                  ))}
                </div>

                <form className="mt-5 space-y-3" onSubmit={handleReplySubmit}>
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700">Reply</span>
                    <textarea
                      value={replyMessage}
                      onChange={(event) => setReplyMessage(event.target.value)}
                      placeholder="Reply to the patient."
                      className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {isSaving ? "Sending..." : "Send Reply"}
                  </button>
                </form>
              </>
            ) : (
              <p className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
                Select a ticket to open the conversation.
              </p>
            )}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
