import { ObjectId } from "mongodb";

import type {
  PatientProfile,
  SupportCategory,
  SupportMessage,
  SupportPriority,
  SupportStatus,
  SupportTicket,
} from "@/lib/clinic-types";
import { getDatabase } from "@/lib/mongodb";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

export type SupportTicketDocument = Omit<SupportTicket, "id"> & {
  _id?: ObjectId;
};

export type PortalAccess = {
  patientId: string;
  portalDob: string;
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function serializeSupportTicket(
  ticket: SupportTicketDocument & { _id: unknown },
): SupportTicket {
  return {
    id: String(ticket._id),
    patientId: ticket.patientId,
    patientName: ticket.patientName,
    subject: ticket.subject,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    lastMessageAt: ticket.lastMessageAt,
    messages: ticket.messages ?? [],
  };
}

export function createSupportMessage(
  senderType: "patient" | "staff",
  senderName: string,
  message: string,
): SupportMessage {
  return {
    id: new ObjectId().toString(),
    senderType,
    senderName,
    message,
    createdAt: new Date().toISOString(),
  };
}

export function isSupportCategory(value: string): value is SupportCategory {
  return value === "general" || value === "billing" || value === "appointment";
}

export function isSupportPriority(value: string): value is SupportPriority {
  return value === "low" || value === "medium" || value === "high";
}

export function isSupportStatus(value: string): value is SupportStatus {
  return value === "open" || value === "in-progress" || value === "resolved" || value === "closed";
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
    { phone: lookupValue },
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
