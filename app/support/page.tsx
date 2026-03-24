"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { AdminShell } from "@/components/admin-shell";
import type {
  StaffMember,
  SupportDashboardData,
  SupportFaqArticle,
  SupportSlaSettings,
  SupportTag,
  SupportTicket,
  SupportTicketListResponse,
} from "@/lib/clinic-types";

function formatDateLabel(date: string) {
  if (!date) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function titleize(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusTone(status: SupportTicket["status"]) {
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

function priorityTone(priority: SupportTicket["priority"]) {
  switch (priority) {
    case "low":
      return "bg-slate-100 text-slate-700";
    case "medium":
      return "bg-sky-100 text-sky-800";
    case "high":
      return "bg-rose-100 text-rose-800";
    case "urgent":
      return "bg-red-600 text-white";
  }
}

function slaTone(state: SupportTicket["sla"]["resolutionState"]) {
  switch (state) {
    case "met":
      return "bg-emerald-100 text-emerald-800";
    case "warning":
      return "bg-amber-100 text-amber-800";
    case "breached":
      return "bg-rose-100 text-rose-800";
    case "on-track":
      return "bg-sky-100 text-sky-800";
  }
}

async function uploadSupportFiles(files: File[]) {
  const uploads = [];

  for (const file of files) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/support/uploads", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload attachment.");
    }

    uploads.push(await response.json());
  }

  return uploads;
}

export default function SupportPage() {
  const [dashboard, setDashboard] = useState<SupportDashboardData | null>(null);
  const [ticketList, setTicketList] = useState<SupportTicketListResponse>({
    tickets: [],
    total: 0,
    page: 1,
    pageSize: 20,
  });
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messagePage, setMessagePage] = useState(1);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [tags, setTags] = useState<SupportTag[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [faqArticles, setFaqArticles] = useState<SupportFaqArticle[]>([]);
  const [slaSettings, setSlaSettings] = useState<SupportSlaSettings | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [noteMessage, setNoteMessage] = useState("");
  const [noteFiles, setNoteFiles] = useState<File[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [faqTitle, setFaqTitle] = useState("");
  const [faqBody, setFaqBody] = useState("");
  const [faqCategory, setFaqCategory] = useState("general");
  const [faqTags, setFaqTags] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const supportAgents = useMemo(
    () => staffMembers.filter((member) => member.permissions.includes("support-manage")),
    [staffMembers],
  );

  const loadTickets = useCallback(async (page = ticketList.page) => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(ticketList.pageSize),
    });

    if (search.trim()) params.set("search", search.trim());
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (priorityFilter !== "all") params.set("priority", priorityFilter);
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    if (agentFilter !== "all") params.set("assignedAgentId", agentFilter);
    if (tagFilter !== "all") params.set("tag", tagFilter);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    const response = await fetch(`/api/support?${params.toString()}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(await response.text());
    }

    const data = (await response.json()) as SupportTicketListResponse;
    setTicketList(data);
    setSelectedTicketId((current) => current || data.tickets[0]?.id || "");
  }, [
    agentFilter,
    categoryFilter,
    endDate,
    priorityFilter,
    search,
    startDate,
    statusFilter,
    tagFilter,
    ticketList.page,
    ticketList.pageSize,
  ]);

  const loadTicketDetail = useCallback(async (ticketId: string, page = messagePage) => {
    if (!ticketId) {
      setSelectedTicket(null);
      return;
    }

    const params = new URLSearchParams({
      messagePage: String(page),
      messagePageSize: "20",
    });
    const response = await fetch(`/api/support/${ticketId}?${params.toString()}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }

    const data = (await response.json()) as SupportTicket;
    setSelectedTicket(data);
    setTagInput(data.tags.join(", "));
  }, [messagePage]);

  async function loadMeta() {
    const [dashboardResponse, staffResponse, tagsResponse, categoriesResponse, faqResponse, slaResponse] =
      await Promise.all([
        fetch("/api/support/dashboard", { cache: "no-store" }),
        fetch("/api/staff", { cache: "no-store" }),
        fetch("/api/support/tags", { cache: "no-store" }),
        fetch("/api/support/categories", { cache: "no-store" }),
        fetch("/api/support/faq", { cache: "no-store" }),
        fetch("/api/support/settings/sla", { cache: "no-store" }),
      ]);

    if (
      !dashboardResponse.ok ||
      !staffResponse.ok ||
      !tagsResponse.ok ||
      !categoriesResponse.ok ||
      !faqResponse.ok ||
      !slaResponse.ok
    ) {
      throw new Error("Failed to load support metadata.");
    }

    const [dashboardData, staffData, tagsData, categoriesData, faqData, slaData] =
      await Promise.all([
        dashboardResponse.json(),
        staffResponse.json(),
        tagsResponse.json(),
        categoriesResponse.json(),
        faqResponse.json(),
        slaResponse.json(),
      ]);

    setDashboard(dashboardData as SupportDashboardData);
    setStaffMembers(staffData as StaffMember[]);
    setTags(tagsData as SupportTag[]);
    setCategories(categoriesData as Array<{ id: string; name: string }>);
    setFaqArticles(faqData as SupportFaqArticle[]);
    setSlaSettings(slaData as SupportSlaSettings);
  }

  useEffect(() => {
    async function loadAll() {
      try {
        setIsLoading(true);
        setErrorMessage("");
        await Promise.all([loadMeta(), loadTickets(1)]);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to load support data.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadAll();
  }, [loadTickets]);

  useEffect(() => {
    if (!selectedTicketId) {
      return;
    }

    void loadTicketDetail(selectedTicketId, messagePage).catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load ticket detail.");
    });
  }, [loadTicketDetail, selectedTicketId, messagePage]);

  async function refreshAll() {
    await Promise.all([loadMeta(), loadTickets(ticketList.page)]);
    if (selectedTicketId) {
      await loadTicketDetail(selectedTicketId, messagePage);
    }
  }

  async function handleTicketUpdate(updates: Record<string, unknown>) {
    if (!selectedTicketId) return;
    setIsSaving(true);
    setErrorMessage("");
    try {
      const response = await fetch(`/api/support/${selectedTicketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error(await response.text());
      const data = (await response.json()) as SupportTicket;
      setSelectedTicket(data);
      await Promise.all([loadTickets(ticketList.page), loadMeta()]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Ticket update failed.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReplySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTicketId || !replyMessage.trim()) return;
    setIsSaving(true);
    setErrorMessage("");
    try {
      const attachments = await uploadSupportFiles(replyFiles);
      const response = await fetch(`/api/support/${selectedTicketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyMessage, attachments }),
      });
      if (!response.ok) throw new Error(await response.text());
      setReplyMessage("");
      setReplyFiles([]);
      await refreshAll();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Reply failed.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleNoteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTicketId || !noteMessage.trim()) return;
    setIsSaving(true);
    setErrorMessage("");
    try {
      const attachments = await uploadSupportFiles(noteFiles);
      const response = await fetch(`/api/support/${selectedTicketId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: noteMessage, attachments }),
      });
      if (!response.ok) throw new Error(await response.text());
      setNoteMessage("");
      setNoteFiles([]);
      await refreshAll();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Note save failed.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveTags() {
    if (!selectedTicketId) return;
    setIsSaving(true);
    setErrorMessage("");
    try {
      const response = await fetch(`/api/support/${selectedTicketId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tags: tagInput.split(",").map((item) => item.trim()).filter(Boolean),
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      const data = (await response.json()) as SupportTicket;
      setSelectedTicket(data);
      await Promise.all([loadTickets(ticketList.page), loadMeta()]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Tag update failed.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAssign(agentId: string) {
    if (!selectedTicketId) return;
    setIsSaving(true);
    setErrorMessage("");
    try {
      const selectedAgent = supportAgents.find((agent) => agent.id === agentId);
      const response = await fetch(`/api/support/${selectedTicketId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedAgentId: agentId,
          assignedTeam: selectedTicket?.assignedTeam ?? "general",
          assignedAgentName: selectedAgent?.fullName ?? "",
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      const data = (await response.json()) as SupportTicket;
      setSelectedTicket(data);
      await Promise.all([loadTickets(ticketList.page), loadMeta()]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Assignment failed.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveFaq(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/support/faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: faqTitle,
          body: faqBody,
          category: faqCategory,
          tags: faqTags.split(",").map((item) => item.trim()).filter(Boolean),
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      setFaqTitle("");
      setFaqBody("");
      setFaqTags("");
      const faqResponse = await fetch("/api/support/faq", { cache: "no-store" });
      setFaqArticles((await faqResponse.json()) as SupportFaqArticle[]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "FAQ save failed.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateTag() {
    if (!newTagName.trim()) return;
    setIsSaving(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/support/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName }),
      });
      if (!response.ok) throw new Error(await response.text());
      setNewTagName("");
      const tagsResponse = await fetch("/api/support/tags", { cache: "no-store" });
      setTags((await tagsResponse.json()) as SupportTag[]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Tag create failed.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateCategory() {
    if (!newCategoryName.trim()) return;
    setIsSaving(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/support/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName }),
      });
      if (!response.ok) throw new Error(await response.text());
      setNewCategoryName("");
      const categoriesResponse = await fetch("/api/support/categories", { cache: "no-store" });
      setCategories((await categoriesResponse.json()) as Array<{ id: string; name: string }>);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Category create failed.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveSla(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!slaSettings) return;
    setIsSaving(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/support/settings/sla", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slaSettings),
      });
      if (!response.ok) throw new Error(await response.text());
      await loadMeta();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "SLA save failed.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AdminShell>
      <div className="w-full space-y-6">
        <header className="rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-700">
            Support Operations
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Ticket Inbox
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Manage support queues, SLA performance, assignments, internal notes, customer messages,
            FAQ articles, and support settings from one workspace.
          </p>
          {dashboard ? (
            <div className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Total</p>
                <p className="mt-2 text-2xl font-semibold">{dashboard.totalTickets}</p>
              </div>
              <div className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Open</p>
                <p className="mt-2 text-2xl font-semibold">{dashboard.openTickets}</p>
              </div>
              <div className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Active</p>
                <p className="mt-2 text-2xl font-semibold">{dashboard.inProgressTickets}</p>
              </div>
              <div className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Agents</p>
                <p className="mt-2 text-2xl font-semibold">{dashboard.activeAgents}</p>
              </div>
              <div className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">SLA Alerts</p>
                <p className="mt-2 text-2xl font-semibold">{dashboard.slaWarningCount + dashboard.slaBreachedCount}</p>
              </div>
              <div className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">CSAT</p>
                <p className="mt-2 text-2xl font-semibold">{dashboard.csatAverage || 0}</p>
              </div>
            </div>
          ) : null}
        </header>

        {isLoading ? (
          <div className="rounded-[24px] border border-sky-100 bg-sky-50 px-5 py-4 text-sm text-sky-800">
            Loading support workspace...
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-[24px] border border-rose-100 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <div className="rounded-[28px] border border-white/80 bg-white/85 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <h3 className="text-lg font-semibold text-slate-950">Filters</h3>
              <div className="mt-4 space-y-3">
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ticket, customer, keyword" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white" />
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white">
                  <option value="all">All statuses</option>
                  {["open", "pending", "in-progress", "resolved", "closed"].map((status) => (
                    <option key={status} value={status}>{titleize(status)}</option>
                  ))}
                </select>
                <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white">
                  <option value="all">All priorities</option>
                  {["low", "medium", "high", "urgent"].map((priority) => (
                    <option key={priority} value={priority}>{titleize(priority)}</option>
                  ))}
                </select>
                <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white">
                  <option value="all">All categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>{titleize(category.name)}</option>
                  ))}
                </select>
                <select value={agentFilter} onChange={(event) => setAgentFilter(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white">
                  <option value="all">All assignees</option>
                  {supportAgents.map((agent) => (
                    <option key={agent.id} value={agent.id}>{agent.fullName}</option>
                  ))}
                </select>
                <select value={tagFilter} onChange={(event) => setTagFilter(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white">
                  <option value="all">All tags</option>
                  {tags.map((tag) => (
                    <option key={tag.id} value={tag.name}>{tag.name}</option>
                  ))}
                </select>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white" />
                  <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white" />
                </div>
                <button type="button" onClick={() => void loadTickets(1)} className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
                  Apply Filters
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {ticketList.tickets.map((ticket) => (
                <button key={ticket.id} type="button" onClick={() => { setSelectedTicketId(ticket.id); setMessagePage(1); }} className={`w-full rounded-[28px] border p-4 text-left shadow-[0_14px_36px_rgba(15,23,42,0.05)] transition ${selectedTicketId === ticket.id ? "border-sky-300 bg-sky-50" : "border-white/80 bg-white/85 hover:bg-white"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">{ticket.ticketNumber}</p>
                      <p className="mt-1 font-semibold text-slate-950">{ticket.subject}</p>
                      <p className="mt-1 text-sm text-slate-500">{ticket.patientName}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone(ticket.status)}`}>{titleize(ticket.status)}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${priorityTone(ticket.priority)}`}>{titleize(ticket.priority)}</span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-600 ring-1 ring-slate-200">{titleize(ticket.category)}</span>
                    {ticket.unreadForStaff > 0 ? <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700">{ticket.unreadForStaff} unread</span> : null}
                  </div>
                  <p className="mt-3 text-sm text-slate-500">{ticket.assignedAgentName || "Unassigned"} | {formatDateLabel(ticket.lastMessageAt)}</p>
                </button>
              ))}
              <div className="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-600">
                <span>{ticketList.total} tickets</span>
                <div className="flex gap-2">
                  <button type="button" disabled={ticketList.page <= 1} onClick={() => void loadTickets(ticketList.page - 1)} className="rounded-xl border border-slate-200 px-3 py-2 disabled:opacity-40">Prev</button>
                  <button type="button" disabled={ticketList.page * ticketList.pageSize >= ticketList.total} onClick={() => void loadTickets(ticketList.page + 1)} className="rounded-xl border border-slate-200 px-3 py-2 disabled:opacity-40">Next</button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            {selectedTicket ? (
              <div className="space-y-6">
                <div className="flex flex-col gap-4 border-b border-slate-200 pb-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-700">{selectedTicket.ticketNumber}</p>
                      <h3 className="mt-2 text-2xl font-semibold text-slate-950">{selectedTicket.subject}</h3>
                      <p className="mt-2 text-sm text-slate-600">{selectedTicket.patientName} | {selectedTicket.patientEmail || selectedTicket.patientPhone || "No contact"}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${slaTone(selectedTicket.sla.resolutionState)}`}>SLA {titleize(selectedTicket.sla.resolutionState)}</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <select value={selectedTicket.status} disabled={isSaving} onChange={(event) => void handleTicketUpdate({ status: event.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white">
                      {["open", "pending", "in-progress", "resolved", "closed"].map((status) => (
                        <option key={status} value={status}>{titleize(status)}</option>
                      ))}
                    </select>
                    <select value={selectedTicket.priority} disabled={isSaving} onChange={(event) => void handleTicketUpdate({ priority: event.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white">
                      {["low", "medium", "high", "urgent"].map((priority) => (
                        <option key={priority} value={priority}>{titleize(priority)}</option>
                      ))}
                    </select>
                    <select value={selectedTicket.assignedAgentId || ""} disabled={isSaving} onChange={(event) => void handleAssign(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white">
                      <option value="">Unassigned</option>
                      {supportAgents.map((agent) => (
                        <option key={agent.id} value={agent.id}>{agent.fullName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <input value={tagInput} onChange={(event) => setTagInput(event.target.value)} placeholder="comma,separated,tags" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white" />
                    <button type="button" onClick={() => void handleSaveTags()} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Save Tags</button>
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedTicket.messages.map((message) => (
                    <article key={message.id} className={`rounded-3xl p-4 ${message.senderType === "staff" || message.senderType === "system" ? "bg-slate-950 text-white" : "bg-slate-50 ring-1 ring-slate-200"}`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">{message.senderName}</p>
                        <p className={`text-xs uppercase tracking-[0.2em] ${message.senderType === "patient" ? "text-slate-400" : "text-cyan-200"}`}>{formatDateLabel(message.createdAt)}</p>
                      </div>
                      <p className={`mt-3 text-sm leading-6 ${message.senderType === "patient" ? "text-slate-600" : "text-slate-200"}`}>{message.message}</p>
                      {message.attachments.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {message.attachments.map((attachment) => (
                            <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer" className="rounded-full bg-white/10 px-3 py-1 text-xs underline">
                              {attachment.name}
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>

                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>Messages {selectedTicket.messageCount}</span>
                  <div className="flex gap-2">
                    <button type="button" disabled={messagePage <= 1} onClick={() => setMessagePage((current) => Math.max(current - 1, 1))} className="rounded-xl border border-slate-200 px-3 py-2 disabled:opacity-40">Prev</button>
                    <button type="button" disabled={messagePage * 20 >= selectedTicket.messageCount} onClick={() => setMessagePage((current) => current + 1)} className="rounded-xl border border-slate-200 px-3 py-2 disabled:opacity-40">Next</button>
                  </div>
                </div>

                <form className="space-y-3" onSubmit={handleReplySubmit}>
                  <textarea value={replyMessage} onChange={(event) => setReplyMessage(event.target.value)} placeholder="Reply to the customer" className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" />
                  <input type="file" multiple onChange={(event) => setReplyFiles(Array.from(event.target.files ?? []))} className="block w-full text-sm text-slate-500" />
                  <button type="submit" disabled={isSaving} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{isSaving ? "Sending..." : "Send Reply"}</button>
                </form>

                <div className="grid gap-6 xl:grid-cols-2">
                  <div className="space-y-3 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                    <h4 className="text-lg font-semibold text-slate-950">Internal Notes</h4>
                    {(selectedTicket.internalNotes ?? []).map((note) => (
                      <article key={note.id} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                        <p className="font-semibold text-slate-900">{note.authorName}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">{formatDateLabel(note.createdAt)}</p>
                        <p className="mt-3 text-sm text-slate-600">{note.message}</p>
                      </article>
                    ))}
                    <form className="space-y-3" onSubmit={handleNoteSubmit}>
                      <textarea value={noteMessage} onChange={(event) => setNoteMessage(event.target.value)} placeholder="Add an internal note" className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400" />
                      <input type="file" multiple onChange={(event) => setNoteFiles(Array.from(event.target.files ?? []))} className="block w-full text-sm text-slate-500" />
                      <button type="submit" disabled={isSaving} className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 disabled:opacity-50">Save Note</button>
                    </form>
                  </div>
                  <div className="space-y-3 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                    <h4 className="text-lg font-semibold text-slate-950">Activity Timeline</h4>
                    {(selectedTicket.auditTrail ?? []).map((entry) => (
                      <article key={entry.id} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                        <p className="font-semibold text-slate-900">{titleize(entry.action)}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">{entry.actorName} | {formatDateLabel(entry.createdAt)}</p>
                        <p className="mt-3 text-sm text-slate-600">{entry.details}</p>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
                Select a ticket to open the conversation and internal workspace.
              </p>
            )}
          </div>

          <div className="space-y-6">
            <section className="rounded-[28px] border border-white/80 bg-white/85 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <h3 className="text-lg font-semibold text-slate-950">Metadata</h3>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-700">Create tag</p>
                  <input value={newTagName} onChange={(event) => setNewTagName(event.target.value)} placeholder="vip" className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400" />
                  <button type="button" onClick={() => void handleCreateTag()} className="mt-3 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Add Tag</button>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-700">Create category</p>
                  <input value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="insurance" className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400" />
                  <button type="button" onClick={() => void handleCreateCategory()} className="mt-3 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Add Category</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span key={tag.id} className="rounded-full px-3 py-1 text-xs font-medium text-white" style={{ backgroundColor: tag.color }}>{tag.name}</span>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-white/80 bg-white/85 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <h3 className="text-lg font-semibold text-slate-950">SLA Settings</h3>
              {slaSettings ? (
                <form className="mt-4 space-y-3" onSubmit={handleSaveSla}>
                  {(["low", "medium", "high", "urgent"] as const).map((priority) => (
                    <div key={priority} className="grid gap-3 md:grid-cols-2">
                      <input type="number" min={1} value={slaSettings.firstResponseMinutesByPriority[priority]} onChange={(event) => setSlaSettings((current) => current ? { ...current, firstResponseMinutesByPriority: { ...current.firstResponseMinutesByPriority, [priority]: Number(event.target.value) } } : current)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400" placeholder={`${titleize(priority)} first response minutes`} />
                      <input type="number" min={1} value={slaSettings.resolutionHoursByPriority[priority]} onChange={(event) => setSlaSettings((current) => current ? { ...current, resolutionHoursByPriority: { ...current.resolutionHoursByPriority, [priority]: Number(event.target.value) } } : current)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400" placeholder={`${titleize(priority)} resolution hours`} />
                    </div>
                  ))}
                  <input type="number" min={1} value={slaSettings.warningMinutesBeforeBreach} onChange={(event) => setSlaSettings((current) => current ? { ...current, warningMinutesBeforeBreach: Number(event.target.value) } : current)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400" placeholder="Warning minutes before breach" />
                  <button type="submit" className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Save SLA</button>
                </form>
              ) : null}
            </section>

            <section className="rounded-[28px] border border-white/80 bg-white/85 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <h3 className="text-lg font-semibold text-slate-950">FAQ / Help Center</h3>
              <form className="mt-4 space-y-3" onSubmit={handleSaveFaq}>
                <input value={faqTitle} onChange={(event) => setFaqTitle(event.target.value)} placeholder="Article title" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400" />
                <select value={faqCategory} onChange={(event) => setFaqCategory(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400">
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>{titleize(category.name)}</option>
                  ))}
                </select>
                <textarea value={faqBody} onChange={(event) => setFaqBody(event.target.value)} placeholder="Helpful answer" className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400" />
                <input value={faqTags} onChange={(event) => setFaqTags(event.target.value)} placeholder="faq,tags" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400" />
                <button type="submit" className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Save FAQ Article</button>
              </form>
              <div className="mt-4 space-y-3">
                {faqArticles.slice(0, 6).map((article) => (
                  <article key={article.id} className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-semibold text-slate-900">{article.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">{titleize(article.category)}</p>
                    <p className="mt-3 text-sm text-slate-600">{article.body}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
