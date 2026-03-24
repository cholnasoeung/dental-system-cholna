import { ObjectId, type Db } from "mongodb";

import type {
  NotificationCategory,
  NotificationChannel,
  NotificationRecord,
  PatientProfile,
  StaffMember,
  SupportAttachment,
  SupportAuditLog,
  SupportCategory,
  SupportDashboardData,
  SupportFaqArticle,
  SupportMessage,
  SupportMessageListResponse,
  SupportNote,
  SupportPriority,
  SupportSavedReply,
  SupportSlaSettings,
  SupportSlaState,
  SupportStatus,
  SupportTag,
  SupportTicket,
  SupportTicketListResponse,
} from "@/lib/clinic-types";
import { getDatabase } from "@/lib/mongodb";
import { SESSION_COOKIE_NAME, type AuthSession, verifySessionToken } from "@/lib/session";

export type PortalAccess = {
  patientId: string;
  portalDob: string;
};

export type SupportTicketDocument = Omit<
  SupportTicket,
  "id" | "messages" | "sla"
> & {
  _id?: ObjectId;
  messages?: SupportMessage[];
  slaFirstResponseWarningSentAt?: string;
  slaFirstResponseBreachSentAt?: string;
  slaResolutionWarningSentAt?: string;
  slaResolutionBreachSentAt?: string;
};

export type SupportMessageDocument = SupportMessage & {
  _id?: ObjectId;
};

export type SupportNoteDocument = SupportNote & {
  _id?: ObjectId;
};

export type SupportAuditLogDocument = SupportAuditLog & {
  _id?: ObjectId;
};

export type SupportTagDocument = Omit<SupportTag, "id"> & {
  _id?: ObjectId;
};

export type SupportFaqArticleDocument = Omit<SupportFaqArticle, "id"> & {
  _id?: ObjectId;
};

export type SupportSavedReplyDocument = Omit<SupportSavedReply, "id"> & {
  _id?: ObjectId;
};

type SupportSettingsDocument = {
  _id?: ObjectId;
  key: "sla";
  value: SupportSlaSettings;
  updatedAt: string;
};

type SupportCounterDocument = {
  _id?: ObjectId;
  key: string;
  value: number;
};

type SupportNotificationPayload = Omit<NotificationRecord, "id">;

const DEFAULT_SUPPORT_CATEGORIES = [
  "general",
  "billing",
  "appointment",
  "payment",
  "bug",
  "login",
  "feature-request",
];

const DEFAULT_SUPPORT_TAGS: Array<{ name: string; color: string }> = [
  { name: "new", color: "#0ea5e9" },
  { name: "patient", color: "#14b8a6" },
  { name: "billing", color: "#f59e0b" },
  { name: "appointment", color: "#6366f1" },
  { name: "urgent", color: "#ef4444" },
  { name: "login", color: "#ec4899" },
  { name: "bug", color: "#8b5cf6" },
];

const DEFAULT_SUPPORT_FAQ: Array<Omit<SupportFaqArticle, "id">> = [
  {
    title: "How do I reschedule my appointment?",
    body: "Open the patient portal or send a support ticket with your preferred date and time. Our team will confirm availability.",
    category: "appointment",
    tags: ["appointment", "reschedule"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: "How do I ask about a bill or invoice?",
    body: "Choose the billing or payment category, include your invoice number if available, and our billing team will review it.",
    category: "billing",
    tags: ["billing", "payment"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: "I cannot access the patient portal",
    body: "Use your patient ID together with your date of birth. If access still fails, submit a login support ticket and include the error you see.",
    category: "login",
    tags: ["login", "portal"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const DEFAULT_SUPPORT_SAVED_REPLIES: Array<Omit<SupportSavedReply, "id">> = [
  {
    title: "Ticket received",
    body: "We received your ticket and a support agent will review it shortly.",
    category: "general",
    createdAt: new Date().toISOString(),
  },
  {
    title: "Billing follow-up",
    body: "Thank you for the billing details. We are reviewing the invoice and will update you as soon as possible.",
    category: "billing",
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_SUPPORT_SLA_SETTINGS: SupportSlaSettings = {
  firstResponseMinutesByPriority: {
    low: 240,
    medium: 120,
    high: 60,
    urgent: 30,
  },
  resolutionHoursByPriority: {
    low: 72,
    medium: 24,
    high: 8,
    urgent: 4,
  },
  warningMinutesBeforeBreach: 15,
};

function toIsoDate(value: number | Date) {
  return new Date(value).toISOString();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function previewText(value: string, length = 140) {
  const normalized = compactText(value);
  return normalized.length > length ? `${normalized.slice(0, length - 1)}...` : normalized;
}

export function parseCookieValue(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") || "";
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");
}

export async function getStaffSupportSession(request: Request) {
  const token = parseCookieValue(request, SESSION_COOKIE_NAME);
  const session = await verifySessionToken(token);

  if (!session || !session.permissions.includes("support-manage")) {
    return null;
  }

  return session;
}

export function canManageSupportSettings(session: AuthSession | null | undefined) {
  return Boolean(
    session &&
      (session.role === "admin" ||
        session.role === "manager" ||
        session.permissions.includes("support-settings")),
  );
}

export function canDeleteSupportTickets(session: AuthSession | null | undefined) {
  return Boolean(
    session &&
      (session.role === "admin" || session.permissions.includes("support-delete")),
  );
}

export async function verifyPortalPatientAccess(access: PortalAccess) {
  const lookupValue = access.patientId.trim();
  const dobValue = access.portalDob.trim();

  if (!lookupValue || !dobValue) {
    return null;
  }

  const db = await getDatabase();
  const patientQuery: {
    dateOfBirth: string;
    $or: Array<Record<string, unknown>>;
  } = {
    dateOfBirth: dobValue,
    $or: [],
  };

  if (ObjectId.isValid(lookupValue)) {
    patientQuery.$or.push({ _id: new ObjectId(lookupValue) });
  }

  patientQuery.$or.push(
    { patientId: lookupValue },
    { phone: lookupValue },
    { phoneNumbers: lookupValue },
    { email: { $regex: `^${escapeRegex(lookupValue)}$`, $options: "i" } },
    { fullName: { $regex: `^${escapeRegex(lookupValue)}$`, $options: "i" } },
  );

  const patient = await db.collection<PatientProfile>("patients").findOne(patientQuery);

  if (!patient) {
    return null;
  }

  return {
    id: String((patient as PatientProfile & { _id?: ObjectId })._id),
    fullName: patient.fullName,
    dateOfBirth: patient.dateOfBirth,
    email: patient.email,
    phone: patient.phone,
  };
}

export function createSupportAttachment(input: Omit<SupportAttachment, "id" | "uploadedAt">) {
  return {
    id: new ObjectId().toString(),
    uploadedAt: new Date().toISOString(),
    ...input,
  };
}

export function createSupportMessage(
  ticketId: string,
  senderType: SupportMessage["senderType"],
  senderName: string,
  message: string,
  attachments: SupportAttachment[] = [],
  isInternal = false,
): SupportMessage {
  return {
    id: new ObjectId().toString(),
    ticketId,
    senderType,
    senderName,
    message: compactText(message),
    createdAt: new Date().toISOString(),
    attachments,
    isInternal,
  };
}

export function createSupportNote(
  ticketId: string,
  authorId: string,
  authorName: string,
  message: string,
  attachments: SupportAttachment[] = [],
): SupportNote {
  return {
    id: new ObjectId().toString(),
    ticketId,
    authorId,
    authorName,
    message: compactText(message),
    createdAt: new Date().toISOString(),
    attachments,
  };
}

export function createSupportAuditLog(
  ticketId: string,
  action: SupportAuditLog["action"],
  actorId: string,
  actorName: string,
  actorType: SupportAuditLog["actorType"],
  details: string,
): SupportAuditLog {
  return {
    id: new ObjectId().toString(),
    ticketId,
    action,
    actorId,
    actorName,
    actorType,
    createdAt: new Date().toISOString(),
    details: compactText(details),
  };
}

export function isSupportPriority(value: string): value is SupportPriority {
  return value === "low" || value === "medium" || value === "high" || value === "urgent";
}

export function isSupportStatus(value: string): value is SupportStatus {
  return (
    value === "open" ||
    value === "pending" ||
    value === "in-progress" ||
    value === "resolved" ||
    value === "closed"
  );
}

export function isSupportCategory(value: string): value is SupportCategory {
  return Boolean(value.trim());
}

export function getSupportTicketSummary(ticket: SupportTicketDocument) {
  return {
    id: String(ticket._id),
    ticketNumber: ticket.ticketNumber,
    patientId: ticket.patientId,
    patientName: ticket.patientName,
    patientEmail: ticket.patientEmail ?? "",
    patientPhone: ticket.patientPhone ?? "",
    subject: ticket.subject,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    tags: ticket.tags ?? [],
    assignedAgentId: ticket.assignedAgentId ?? "",
    assignedAgentName: ticket.assignedAgentName ?? "",
    assignedTeam: ticket.assignedTeam ?? "",
    sourceChannel: ticket.sourceChannel,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    lastMessageAt: ticket.lastMessageAt,
    firstResponseAt: ticket.firstResponseAt ?? "",
    resolvedAt: ticket.resolvedAt ?? "",
    closedAt: ticket.closedAt ?? "",
    lastCustomerReplyAt: ticket.lastCustomerReplyAt ?? "",
    lastAgentReplyAt: ticket.lastAgentReplyAt ?? "",
    unreadForCustomer: ticket.unreadForCustomer ?? 0,
    unreadForStaff: ticket.unreadForStaff ?? 0,
    feedbackRating: ticket.feedbackRating ?? null,
    feedbackComment: ticket.feedbackComment ?? "",
    latestMessagePreview: ticket.latestMessagePreview ?? "",
    messageCount: ticket.messageCount ?? 0,
    notesCount: ticket.notesCount ?? 0,
  };
}

export function computeSupportSla(ticket: SupportTicketDocument, settings: SupportSlaSettings) {
  const createdAtMs = Date.parse(ticket.createdAt);
  const firstResponseDueAt = createdAtMs +
    settings.firstResponseMinutesByPriority[ticket.priority] * 60_000;
  const resolutionDueAt = createdAtMs +
    settings.resolutionHoursByPriority[ticket.priority] * 60 * 60_000;
  const warningThresholdMs = settings.warningMinutesBeforeBreach * 60_000;
  const now = Date.now();

  function stateFor(targetAt: number, completedAt?: string) {
    if (completedAt) {
      return "met" as SupportSlaState;
    }

    if (now >= targetAt) {
      return "breached" as SupportSlaState;
    }

    if (now >= targetAt - warningThresholdMs) {
      return "warning" as SupportSlaState;
    }

    return "on-track" as SupportSlaState;
  }

  return {
    firstResponseDueAt: toIsoDate(firstResponseDueAt),
    resolutionDueAt: toIsoDate(resolutionDueAt),
    firstResponseState: stateFor(firstResponseDueAt, ticket.firstResponseAt),
    resolutionState: stateFor(
      resolutionDueAt,
      ticket.resolvedAt || ticket.closedAt,
    ),
  };
}

export async function seedSupportMetadata(db: Db) {
  const categoriesCollection = db.collection<{ _id?: ObjectId; name: string; createdAt: string }>(
    "supportCategories",
  );
  const existingCategories = await categoriesCollection.countDocuments();
  if (existingCategories === 0) {
    await categoriesCollection.insertMany(
      DEFAULT_SUPPORT_CATEGORIES.map((name) => ({
        name,
        createdAt: new Date().toISOString(),
      })),
    );
  }

  const tagsCollection = db.collection<SupportTagDocument>("supportTags");
  const existingTags = await tagsCollection.countDocuments();
  if (existingTags === 0) {
    await tagsCollection.insertMany(
      DEFAULT_SUPPORT_TAGS.map((tag) => ({
        ...tag,
        createdAt: new Date().toISOString(),
      })),
    );
  }

  const faqCollection = db.collection<SupportFaqArticleDocument>("supportFaqArticles");
  const existingFaq = await faqCollection.countDocuments();
  if (existingFaq === 0) {
    await faqCollection.insertMany(DEFAULT_SUPPORT_FAQ);
  }

  const savedReplyCollection = db.collection<SupportSavedReplyDocument>("supportSavedReplies");
  const existingReplies = await savedReplyCollection.countDocuments();
  if (existingReplies === 0) {
    await savedReplyCollection.insertMany(DEFAULT_SUPPORT_SAVED_REPLIES);
  }
}

export async function getSupportSettings(db: Db) {
  const collection = db.collection<SupportSettingsDocument>("supportSettings");
  const existing = await collection.findOne({ key: "sla" });

  if (existing) {
    return existing.value;
  }

  await collection.insertOne({
    key: "sla",
    value: DEFAULT_SUPPORT_SLA_SETTINGS,
    updatedAt: new Date().toISOString(),
  });

  return DEFAULT_SUPPORT_SLA_SETTINGS;
}

export async function updateSupportSettings(db: Db, value: SupportSlaSettings) {
  await db.collection<SupportSettingsDocument>("supportSettings").updateOne(
    { key: "sla" },
    {
      $set: {
        value,
        updatedAt: new Date().toISOString(),
      },
    },
    { upsert: true },
  );

  return value;
}

export async function createSupportTicketNumber(db: Db) {
  const result = await db
    .collection<SupportCounterDocument>("supportCounters")
    .findOneAndUpdate(
      { key: "ticket-number" },
      { $inc: { value: 1 } },
      { upsert: true, returnDocument: "after" },
    );

  const nextValue = result?.value ?? 1;
  return `TCK-${String(nextValue).padStart(6, "0")}`;
}

async function getSupportStaffDirectory(db: Db) {
  const staff = await db
    .collection<Omit<StaffMember, "id"> & { _id?: ObjectId }>("staff")
    .find({
      permissions: "support-manage",
      availabilityStatus: { $ne: "off" },
    })
    .sort({ role: 1, fullName: 1 })
    .toArray();

  return staff.map((member) => ({
    id: String(member._id),
    fullName: member.fullName,
    role: member.role,
  }));
}

function inferPriority(category: string, content: string): SupportPriority {
  const normalized = `${category} ${content}`.toLowerCase();

  if (/\b(urgent|asap|emergency|severe|pain|bleeding)\b/.test(normalized)) {
    return "urgent";
  }

  if (/\b(login|locked|broken|error|bug|failed)\b/.test(normalized)) {
    return "high";
  }

  if (category === "feature-request") {
    return "low";
  }

  return category === "appointment" || category === "billing" || category === "payment"
    ? "medium"
    : "low";
}

function inferTags(category: string, content: string) {
  const normalized = `${category} ${content}`.toLowerCase();
  const tags = new Set<string>(["new", "patient", category]);

  if (/\b(payment|invoice|billing|refund)\b/.test(normalized)) {
    tags.add("billing");
  }
  if (/\b(appointment|schedule|reschedule)\b/.test(normalized)) {
    tags.add("appointment");
  }
  if (/\b(login|password|portal)\b/.test(normalized)) {
    tags.add("login");
  }
  if (/\b(error|bug|broken|issue)\b/.test(normalized)) {
    tags.add("bug");
  }
  if (/\b(urgent|asap|emergency|pain)\b/.test(normalized)) {
    tags.add("urgent");
  }

  return [...tags];
}

function inferAssignedTeam(category: string) {
  if (category === "billing" || category === "payment") {
    return "billing";
  }

  if (category === "appointment") {
    return "front-desk";
  }

  if (category === "login" || category === "bug" || category === "feature-request") {
    return "support";
  }

  return "general";
}

export async function selectAutoAssignment(db: Db, category: string) {
  const team = inferAssignedTeam(category);
  const staff = await getSupportStaffDirectory(db);

  if (staff.length === 0) {
    return {
      assignedAgentId: "",
      assignedAgentName: "",
      assignedTeam: team,
    };
  }

  const candidates = staff.filter((member) => {
    if (team === "front-desk") {
      return member.role === "receptionist" || member.role === "manager" || member.role === "admin";
    }
    if (team === "billing") {
      return member.role === "manager" || member.role === "receptionist" || member.role === "admin";
    }
    return true;
  });

  const activeCounts = await db
    .collection<SupportTicketDocument>("supportTickets")
    .aggregate<{ _id: string; count: number }>([
      {
        $match: {
          status: { $in: ["open", "pending", "in-progress"] },
          assignedAgentId: { $ne: "" },
        },
      },
      {
        $group: {
          _id: "$assignedAgentId",
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

  const countMap = new Map(activeCounts.map((item) => [item._id, item.count]));
  const selected = (candidates.length > 0 ? candidates : staff).sort((a, b) => {
    return (countMap.get(a.id) ?? 0) - (countMap.get(b.id) ?? 0);
  })[0];

  return {
    assignedAgentId: selected.id,
    assignedAgentName: selected.fullName,
    assignedTeam: team,
  };
}

export async function ensureLegacyTicketBackfill(db: Db, ticket: SupportTicketDocument) {
  if (!ticket._id || !ticket.messages || ticket.messages.length === 0) {
    return;
  }

  const collection = db.collection<SupportMessageDocument>("supportMessages");
  const existingCount = await collection.countDocuments({ ticketId: String(ticket._id) });

  if (existingCount > 0) {
    return;
  }

  await collection.insertMany(
    ticket.messages.map((message) => ({
      ...message,
      ticketId: String(ticket._id),
      attachments: message.attachments ?? [],
      isInternal: Boolean(message.isInternal),
    })),
  );

  await db.collection<SupportTicketDocument>("supportTickets").updateOne(
    { _id: ticket._id },
    {
      $set: {
        messageCount: ticket.messages.length,
        latestMessagePreview:
          ticket.messages.length > 0
            ? previewText(ticket.messages[ticket.messages.length - 1]?.message ?? "")
            : "",
      },
      $unset: {
        messages: "",
      },
    },
  );
}

export async function loadSupportMessages(
  db: Db,
  ticketId: string,
  page = 1,
  pageSize = 20,
  includeInternal = false,
): Promise<SupportMessageListResponse> {
  const safePage = Math.max(page, 1);
  const safePageSize = Math.min(Math.max(pageSize, 1), 100);
  const query: Record<string, unknown> = { ticketId };

  if (!includeInternal) {
    query.isInternal = false;
  }

  const collection = db.collection<SupportMessageDocument>("supportMessages");
  const [messages, total] = await Promise.all([
    collection
      .find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip((safePage - 1) * safePageSize)
      .limit(safePageSize)
      .toArray(),
    collection.countDocuments(query),
  ]);

  return {
    messages: messages.reverse().map((message) => ({
      id: message.id,
      ticketId: message.ticketId,
      senderType: message.senderType,
      senderName: message.senderName,
      message: message.message,
      createdAt: message.createdAt,
      attachments: message.attachments ?? [],
      isInternal: Boolean(message.isInternal),
    })),
    total,
    page: safePage,
    pageSize: safePageSize,
  };
}

export async function loadSupportNotes(db: Db, ticketId: string) {
  const notes = await db
    .collection<SupportNoteDocument>("supportNotes")
    .find({ ticketId })
    .sort({ createdAt: -1, _id: -1 })
    .limit(50)
    .toArray();

  return notes.map((note) => ({
    id: note.id,
    ticketId: note.ticketId,
    authorId: note.authorId,
    authorName: note.authorName,
    message: note.message,
    createdAt: note.createdAt,
    attachments: note.attachments ?? [],
  }));
}

export async function loadSupportAuditLogs(db: Db, ticketId: string) {
  const logs = await db
    .collection<SupportAuditLogDocument>("supportAuditLogs")
    .find({ ticketId })
    .sort({ createdAt: -1, _id: -1 })
    .limit(100)
    .toArray();

  return logs.map((log) => ({
    id: log.id,
    ticketId: log.ticketId,
    action: log.action,
    actorId: log.actorId,
    actorName: log.actorName,
    actorType: log.actorType,
    createdAt: log.createdAt,
    details: log.details,
  }));
}

export async function createAuditEntry(db: Db, entry: SupportAuditLog) {
  await db.collection<SupportAuditLogDocument>("supportAuditLogs").insertOne(entry);
}

function buildSupportNotification(
  ticket: SupportTicketDocument,
  category: NotificationCategory,
  channel: NotificationChannel,
  recipient: string,
  subject: string,
  message: string,
): SupportNotificationPayload {
  return {
    patientId: ticket.patientId,
    patientName: ticket.patientName,
    category,
    channel,
    recipient,
    subject,
    message,
    scheduledFor: new Date().toISOString(),
    status: channel === "in-app" ? "read" : "queued",
    relatedAppointmentId: "",
    relatedInvoiceId: ticket.ticketNumber,
  };
}

export async function notifySupportEvent(
  db: Db,
  ticket: SupportTicketDocument,
  category: NotificationCategory,
  subject: string,
  message: string,
) {
  const payloads: SupportNotificationPayload[] = [
    buildSupportNotification(ticket, category, "in-app", ticket.patientId, subject, message),
  ];

  if (ticket.patientEmail) {
    payloads.push(
      buildSupportNotification(ticket, category, "email", ticket.patientEmail, subject, message),
    );
  }

  await db.collection<SupportNotificationPayload>("notifications").insertMany(payloads);
}

export async function applySlaNotifications(db: Db, ticket: SupportTicketDocument) {
  if (!ticket._id) {
    return;
  }

  const settings = await getSupportSettings(db);
  const sla = computeSupportSla(ticket, settings);
  const updates: Record<string, string> = {};
  const notifications: Array<{ subject: string; message: string; category: NotificationCategory }> =
    [];

  if (sla.firstResponseState === "warning" && !ticket.slaFirstResponseWarningSentAt) {
    updates.slaFirstResponseWarningSentAt = new Date().toISOString();
    notifications.push({
      category: "support-sla-warning",
      subject: `${ticket.ticketNumber} approaching SLA`,
      message: `${ticket.ticketNumber} is approaching its first-response SLA.`,
    });
  }

  if (sla.firstResponseState === "breached" && !ticket.slaFirstResponseBreachSentAt) {
    updates.slaFirstResponseBreachSentAt = new Date().toISOString();
    notifications.push({
      category: "support-sla-breach",
      subject: `${ticket.ticketNumber} breached SLA`,
      message: `${ticket.ticketNumber} has breached its first-response SLA.`,
    });
  }

  if (sla.resolutionState === "warning" && !ticket.slaResolutionWarningSentAt) {
    updates.slaResolutionWarningSentAt = new Date().toISOString();
    notifications.push({
      category: "support-sla-warning",
      subject: `${ticket.ticketNumber} nearing resolution SLA`,
      message: `${ticket.ticketNumber} is nearing its resolution SLA.`,
    });
  }

  if (sla.resolutionState === "breached" && !ticket.slaResolutionBreachSentAt) {
    updates.slaResolutionBreachSentAt = new Date().toISOString();
    notifications.push({
      category: "support-sla-breach",
      subject: `${ticket.ticketNumber} resolution SLA breached`,
      message: `${ticket.ticketNumber} has breached its resolution SLA.`,
    });
  }

  if (Object.keys(updates).length > 0) {
    await db.collection<SupportTicketDocument>("supportTickets").updateOne(
      { _id: ticket._id },
      { $set: updates },
    );
  }

  for (const notification of notifications) {
    await notifySupportEvent(
      db,
      ticket,
      notification.category,
      notification.subject,
      notification.message,
    );
  }
}

export async function hydrateSupportTicket(
  db: Db,
  ticket: SupportTicketDocument,
  options?: {
    messagePage?: number;
    messagePageSize?: number;
    includeStaffData?: boolean;
  },
): Promise<SupportTicket> {
  await ensureLegacyTicketBackfill(db, ticket);

  const settings = await getSupportSettings(db);
  const messagePage = options?.messagePage ?? 1;
  const messagePageSize = options?.messagePageSize ?? 20;
  const includeStaffData = options?.includeStaffData ?? false;
  const ticketId = String(ticket._id);

  const [{ messages }, notes, auditTrail] = await Promise.all([
    loadSupportMessages(db, ticketId, messagePage, messagePageSize, false),
    includeStaffData ? loadSupportNotes(db, ticketId) : Promise.resolve([]),
    includeStaffData ? loadSupportAuditLogs(db, ticketId) : Promise.resolve([]),
  ]);

  await applySlaNotifications(db, ticket);
  const sla = computeSupportSla(ticket, settings);

  return {
    ...getSupportTicketSummary(ticket),
    sla,
    messages,
    ...(includeStaffData
      ? {
          internalNotes: notes,
          auditTrail,
        }
      : {}),
  } as SupportTicket;
}

export async function buildSupportListResponse(
  db: Db,
  tickets: SupportTicketDocument[],
  total: number,
  page: number,
  pageSize: number,
) {
  const settings = await getSupportSettings(db);
  return {
    tickets: tickets.map((ticket) => ({
      ...getSupportTicketSummary(ticket),
      messages: [],
      sla: computeSupportSla(ticket, settings),
    })),
    total,
    page,
    pageSize,
  } satisfies SupportTicketListResponse;
}

export function buildSupportSearchQuery(searchParams: URLSearchParams) {
  const search = searchParams.get("search")?.trim() || "";
  const status = searchParams.get("status")?.trim() || "";
  const priority = searchParams.get("priority")?.trim() || "";
  const category = searchParams.get("category")?.trim() || "";
  const assignedAgentId = searchParams.get("assignedAgentId")?.trim() || "";
  const tag = searchParams.get("tag")?.trim() || "";
  const startDate = searchParams.get("startDate")?.trim() || "";
  const endDate = searchParams.get("endDate")?.trim() || "";

  const query: Record<string, unknown> = {};

  if (search) {
    query.$or = [
      { ticketNumber: { $regex: escapeRegex(search), $options: "i" } },
      { patientName: { $regex: escapeRegex(search), $options: "i" } },
      { patientEmail: { $regex: escapeRegex(search), $options: "i" } },
      { patientPhone: { $regex: escapeRegex(search), $options: "i" } },
      { subject: { $regex: escapeRegex(search), $options: "i" } },
      { latestMessagePreview: { $regex: escapeRegex(search), $options: "i" } },
      { tags: { $regex: escapeRegex(search), $options: "i" } },
    ];
  }

  if (status && status !== "all") {
    query.status = status;
  }
  if (priority && priority !== "all") {
    query.priority = priority;
  }
  if (category && category !== "all") {
    query.category = category;
  }
  if (assignedAgentId && assignedAgentId !== "all") {
    query.assignedAgentId = assignedAgentId;
  }
  if (tag && tag !== "all") {
    query.tags = tag;
  }
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      (query.createdAt as Record<string, unknown>).$gte = startDate;
    }
    if (endDate) {
      (query.createdAt as Record<string, unknown>).$lte = `${endDate}T23:59:59.999Z`;
    }
  }

  return query;
}

export async function markTicketAsRead(
  db: Db,
  ticketId: string,
  viewer: "staff" | "customer",
) {
  await db.collection<SupportTicketDocument>("supportTickets").updateOne(
    { _id: new ObjectId(ticketId) },
    {
      $set: viewer === "staff" ? { unreadForStaff: 0 } : { unreadForCustomer: 0 },
    },
  );
}

export function customerCanReply(status: SupportStatus) {
  return status !== "closed";
}

export function getStatusAfterCustomerReply(status: SupportStatus): SupportStatus {
  if (status === "resolved" || status === "pending") {
    return "in-progress";
  }

  return status;
}

export function getStatusAfterStaffReply(status: SupportStatus): SupportStatus {
  return status === "closed" ? "closed" : "in-progress";
}

export async function createSupportTicketRecord(
  db: Db,
  input: {
    patientId: string;
    patientName: string;
    patientEmail: string;
    patientPhone: string;
    subject: string;
    category: string;
    message: string;
    sourceChannel: SupportTicketDocument["sourceChannel"];
    attachments?: SupportAttachment[];
  },
) {
  await seedSupportMetadata(db);
  const ticketNumber = await createSupportTicketNumber(db);
  const now = new Date().toISOString();
  const combinedText = `${input.subject} ${input.message}`;
  const priority = inferPriority(input.category, combinedText);
  const tags = inferTags(input.category, combinedText);
  const assignment = await selectAutoAssignment(db, input.category);

  const ticketPayload: Omit<SupportTicketDocument, "_id"> = {
    ticketNumber,
    patientId: input.patientId,
    patientName: input.patientName,
    patientEmail: input.patientEmail,
    patientPhone: input.patientPhone,
    subject: compactText(input.subject),
    category: input.category,
    priority,
    status: "open",
    tags,
    assignedAgentId: assignment.assignedAgentId,
    assignedAgentName: assignment.assignedAgentName,
    assignedTeam: assignment.assignedTeam,
    sourceChannel: input.sourceChannel,
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    firstResponseAt: "",
    resolvedAt: "",
    closedAt: "",
    lastCustomerReplyAt: now,
    lastAgentReplyAt: "",
    unreadForCustomer: 0,
    unreadForStaff: 2,
    feedbackRating: null,
    feedbackComment: "",
    latestMessagePreview: previewText(input.message),
    messageCount: 2,
    notesCount: 0,
  };

  const ticketResult = await db.collection<SupportTicketDocument>("supportTickets").insertOne(ticketPayload);
  const ticketId = String(ticketResult.insertedId);

  const customerMessage = createSupportMessage(
    ticketId,
    "patient",
    input.patientName,
    input.message,
    input.attachments ?? [],
  );
  const autoReplyMessage = createSupportMessage(
    ticketId,
    "system",
    "DentalFlow Support",
    "We received your ticket and assigned it to our support queue. A team member will reply shortly.",
  );

  await db.collection<SupportMessageDocument>("supportMessages").insertMany([
    customerMessage,
    autoReplyMessage,
  ]);

  await createAuditEntry(
    db,
    createSupportAuditLog(
      ticketId,
      "ticket-created",
      input.patientId,
      input.patientName,
      "patient",
      `Ticket ${ticketNumber} created from ${input.sourceChannel}.`,
    ),
  );

  if (assignment.assignedAgentId) {
    await createAuditEntry(
      db,
      createSupportAuditLog(
        ticketId,
        "assignment-changed",
        "system",
        "Automation",
        "system",
        `Auto-assigned to ${assignment.assignedAgentName}.`,
      ),
    );
  }

  const insertedTicket = await db
    .collection<SupportTicketDocument>("supportTickets")
    .findOne({ _id: ticketResult.insertedId });

  if (!insertedTicket) {
    throw new Error("Support ticket could not be loaded after creation.");
  }

  await notifySupportEvent(
    db,
    insertedTicket,
    "support-new-ticket",
    `New ticket ${ticketNumber}`,
    `${input.patientName} created ${ticketNumber}: ${previewText(input.subject)}`,
  );

  if (assignment.assignedAgentId) {
    await notifySupportEvent(
      db,
      insertedTicket,
      "support-assignment",
      `Ticket assigned ${ticketNumber}`,
      `${ticketNumber} was assigned to ${assignment.assignedAgentName}.`,
    );
  }

  return hydrateSupportTicket(db, insertedTicket, { includeStaffData: true });
}

export async function appendSupportMessageAndUpdateTicket(
  db: Db,
  ticket: SupportTicketDocument,
  input: {
    senderType: "patient" | "staff";
    senderId: string;
    senderName: string;
    message: string;
    attachments?: SupportAttachment[];
  },
) {
  if (!ticket._id) {
    throw new Error("Ticket id is required.");
  }

  const ticketId = String(ticket._id);
  const nextMessage = createSupportMessage(
    ticketId,
    input.senderType,
    input.senderName,
    input.message,
    input.attachments ?? [],
  );

  await db.collection<SupportMessageDocument>("supportMessages").insertOne(nextMessage);

  const now = nextMessage.createdAt;
  const nextStatus =
    input.senderType === "staff"
      ? getStatusAfterStaffReply(ticket.status)
      : getStatusAfterCustomerReply(ticket.status);

  const updates: Partial<SupportTicketDocument> = {
    updatedAt: now,
    lastMessageAt: now,
    latestMessagePreview: previewText(input.message),
    messageCount: (ticket.messageCount ?? 0) + 1,
    status: nextStatus,
    unreadForCustomer:
      input.senderType === "staff" ? (ticket.unreadForCustomer ?? 0) + 1 : 0,
    unreadForStaff: input.senderType === "patient" ? (ticket.unreadForStaff ?? 0) + 1 : 0,
  };

  if (input.senderType === "staff") {
    updates.lastAgentReplyAt = now;
    updates.firstResponseAt = ticket.firstResponseAt || now;
    if (nextStatus === "in-progress" && ticket.resolvedAt) {
      updates.resolvedAt = "";
    }
  } else {
    updates.lastCustomerReplyAt = now;
    if (ticket.status === "resolved") {
      updates.resolvedAt = "";
    }
  }

  await db.collection<SupportTicketDocument>("supportTickets").updateOne(
    { _id: ticket._id },
    { $set: updates },
  );

  await createAuditEntry(
    db,
    createSupportAuditLog(
      ticketId,
      "message-sent",
      input.senderId,
      input.senderName,
      input.senderType,
      `${input.senderType === "staff" ? "Staff" : "Customer"} replied.`,
    ),
  );

  const refreshedTicket = await db
    .collection<SupportTicketDocument>("supportTickets")
    .findOne({ _id: ticket._id });

  if (!refreshedTicket) {
    throw new Error("Ticket refresh failed after message insert.");
  }

  await notifySupportEvent(
    db,
    refreshedTicket,
    "support-new-message",
    `New message on ${refreshedTicket.ticketNumber}`,
    `${input.senderName} replied on ${refreshedTicket.ticketNumber}.`,
  );

  return hydrateSupportTicket(db, refreshedTicket, { includeStaffData: true });
}

export async function addSupportNote(db: Db, ticketId: string, note: SupportNote) {
  await db.collection<SupportNoteDocument>("supportNotes").insertOne(note);

  await db.collection<SupportTicketDocument>("supportTickets").updateOne(
    { _id: new ObjectId(ticketId) },
    {
      $inc: { notesCount: 1 },
      $set: { updatedAt: new Date().toISOString() },
    },
  );

  await createAuditEntry(
    db,
    createSupportAuditLog(
      ticketId,
      "note-added",
      note.authorId,
      note.authorName,
      "staff",
      "Internal note added.",
    ),
  );
}

export async function getSupportDashboard(db: Db): Promise<SupportDashboardData> {
  const settings = await getSupportSettings(db);
  const tickets = await db.collection<SupportTicketDocument>("supportTickets").find({}).toArray();
  const activeAgents = new Set(
    tickets
      .filter((ticket) => ticket.assignedAgentId)
      .map((ticket) => ticket.assignedAgentId),
  ).size;

  const totalTickets = tickets.length;
  const openTickets = tickets.filter((ticket) => ticket.status === "open").length;
  const pendingTickets = tickets.filter((ticket) => ticket.status === "pending").length;
  const inProgressTickets = tickets.filter((ticket) => ticket.status === "in-progress").length;
  const resolvedTickets = tickets.filter((ticket) => ticket.status === "resolved").length;
  const closedTickets = tickets.filter((ticket) => ticket.status === "closed").length;

  const firstResponseSamples = tickets
    .filter((ticket) => ticket.firstResponseAt)
    .map((ticket) => (Date.parse(ticket.firstResponseAt) - Date.parse(ticket.createdAt)) / 60_000);
  const resolutionSamples = tickets
    .filter((ticket) => ticket.resolvedAt)
    .map((ticket) => (Date.parse(ticket.resolvedAt) - Date.parse(ticket.createdAt)) / 3_600_000);
  const feedbackSamples = tickets
    .map((ticket) => ticket.feedbackRating)
    .filter((value): value is number => typeof value === "number");

  const ticketsPerDayMap = new Map<string, number>();
  const ticketsByCategoryMap = new Map<string, number>();
  const ticketsByTagMap = new Map<string, number>();
  const workloadByAgentMap = new Map<string, { agentId: string; agentName: string; count: number }>();
  let slaWarningCount = 0;
  let slaBreachedCount = 0;

  for (const ticket of tickets) {
    const dateKey = ticket.createdAt.slice(0, 10);
    ticketsPerDayMap.set(dateKey, (ticketsPerDayMap.get(dateKey) ?? 0) + 1);
    ticketsByCategoryMap.set(ticket.category, (ticketsByCategoryMap.get(ticket.category) ?? 0) + 1);
    for (const tag of ticket.tags ?? []) {
      ticketsByTagMap.set(tag, (ticketsByTagMap.get(tag) ?? 0) + 1);
    }
    if (ticket.assignedAgentId) {
      const current = workloadByAgentMap.get(ticket.assignedAgentId) ?? {
        agentId: ticket.assignedAgentId,
        agentName: ticket.assignedAgentName,
        count: 0,
      };
      current.count += 1;
      workloadByAgentMap.set(ticket.assignedAgentId, current);
    }

    const sla = computeSupportSla(ticket, settings);
    if (sla.firstResponseState === "warning" || sla.resolutionState === "warning") {
      slaWarningCount += 1;
    }
    if (sla.firstResponseState === "breached" || sla.resolutionState === "breached") {
      slaBreachedCount += 1;
    }
  }

  return {
    totalTickets,
    openTickets,
    pendingTickets,
    inProgressTickets,
    resolvedTickets,
    closedTickets,
    activeAgents,
    firstResponseAverageMinutes:
      firstResponseSamples.length > 0
        ? Number(
            (
              firstResponseSamples.reduce((sum, value) => sum + value, 0) /
              firstResponseSamples.length
            ).toFixed(1),
          )
        : 0,
    resolutionAverageHours:
      resolutionSamples.length > 0
        ? Number(
            (
              resolutionSamples.reduce((sum, value) => sum + value, 0) /
              resolutionSamples.length
            ).toFixed(1),
          )
        : 0,
    slaWarningCount,
    slaBreachedCount,
    csatAverage:
      feedbackSamples.length > 0
        ? Number(
            (
              feedbackSamples.reduce((sum, value) => sum + value, 0) /
              feedbackSamples.length
            ).toFixed(1),
          )
        : 0,
    ticketsPerDay: [...ticketsPerDayMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count })),
    ticketsByCategory: [...ticketsByCategoryMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count })),
    ticketsByTag: [...ticketsByTagMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count })),
    workloadByAgent: [...workloadByAgentMap.values()].sort((a, b) => b.count - a.count),
  };
}

export function supportErrorResponse(message: string, error: unknown) {
  return Response.json(
    {
      error: message,
      details:
        process.env.NODE_ENV === "development"
          ? error instanceof Error
            ? error.message
            : String(error)
          : undefined,
    },
    { status: 500 },
  );
}
