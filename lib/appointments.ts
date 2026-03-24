import { ObjectId, type Db } from "mongodb";

import type {
  Appointment,
  AppointmentAnalytics,
  AppointmentConflict,
  AppointmentPriority,
  AppointmentProcedure,
  AppointmentQueueMode,
  AppointmentRecurrence,
  AppointmentStatus,
  AppointmentStatusHistoryEntry,
  AppointmentWaitlistEntry,
  DentalRecord,
  Invoice,
  InvoiceLine,
  PatientProfile,
  ProcedureCatalogItem,
  StaffMember,
} from "@/lib/clinic-types";
import { branchCatalog, chairCatalog, odontogramToothNumbers, procedureCatalog } from "@/lib/clinic-types";

export type AppointmentDocument = Omit<Appointment, "id"> & { _id?: ObjectId };
export type AppointmentWaitlistDocument = Omit<AppointmentWaitlistEntry, "id"> & { _id?: ObjectId };

const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "checked-in",
  "in-progress",
];

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeString(item))
    .filter(Boolean)
    .filter((item, index, items) => items.indexOf(item) === index);
}

function normalizeBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeNumber(value: unknown, fallback = 0) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePriority(value: unknown): AppointmentPriority {
  return value === "urgent" ? "urgent" : "normal";
}

function normalizeQueueMode(value: unknown): AppointmentQueueMode {
  return value === "waitlist" || value === "walk-in" ? value : "booked";
}

function normalizeStatus(value: unknown): AppointmentStatus {
  if (
    value === "confirmed" ||
    value === "checked-in" ||
    value === "in-progress" ||
    value === "completed" ||
    value === "canceled" ||
    value === "no-show" ||
    value === "rescheduled"
  ) {
    return value;
  }

  return "scheduled";
}

export function parseTimeToMinutes(time: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(time.trim());
  if (!match) {
    return 0;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
}

export function formatMinutesToTime(totalMinutes: number) {
  const safeMinutes = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = String(Math.floor(safeMinutes / 60)).padStart(2, "0");
  const minutes = String(safeMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function addMinutesToTime(time: string, minutes: number) {
  return formatMinutesToTime(parseTimeToMinutes(time) + minutes);
}

function shiftDate(date: string, days: number) {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function shiftMonthly(date: string, months: number) {
  const next = new Date(`${date}T00:00:00`);
  next.setMonth(next.getMonth() + months);
  return next.toISOString().slice(0, 10);
}

function shiftRecurringDate(date: string, recurrence: AppointmentRecurrence, offset: number) {
  if (!date) {
    return "";
  }

  if (recurrence.type === "daily") {
    return shiftDate(date, offset);
  }

  if (recurrence.type === "monthly") {
    return shiftMonthly(date, offset);
  }

  return shiftDate(date, offset * 7);
}

function datesOverlap(leftStart: string, leftEnd: string, rightStart: string, rightEnd: string) {
  return (
    parseTimeToMinutes(leftStart) < parseTimeToMinutes(rightEnd) &&
    parseTimeToMinutes(rightStart) < parseTimeToMinutes(leftEnd)
  );
}

function getBranch(branchId: string) {
  return branchCatalog.find((branch) => branch.id === branchId) ?? branchCatalog[0];
}

function getChair(chairId: string) {
  return chairCatalog.find((chair) => chair.id === chairId);
}

function getProcedures(procedureIds: string[], fallbackReason = "") {
  const matched = procedureIds
    .map((procedureId) => procedureCatalog.find((item) => item.id === procedureId))
    .filter((item): item is ProcedureCatalogItem => Boolean(item));

  if (matched.length > 0) {
    return matched;
  }

  return [
    procedureCatalog.find((item) => item.id === "consultation") ?? {
      id: "consultation",
      name: fallbackReason || "Consultation",
      category: "consultation",
      durationMinutes: 30,
      defaultPrice: 15,
      pricingModel: "per-case",
      requiredSkills: ["consultation"],
      allowedChairIds: [],
      requiredMaterials: ["mirror", "exam set"],
      patientInstructions: "",
      suggestedFollowUpDays: 30,
    },
  ];
}

function buildProcedureAssignments(procedureIds: string[], fallbackReason = ""): AppointmentProcedure[] {
  return getProcedures(procedureIds, fallbackReason).map((procedure) => ({
    procedureId: procedure.id,
    name: procedure.name,
    category: procedure.category,
    durationMinutes: procedure.durationMinutes,
    unitPrice: procedure.defaultPrice,
    pricingModel: procedure.pricingModel,
    requiredMaterials: procedure.requiredMaterials,
  }));
}

export function buildAppointmentStatusHistoryEntry(
  status: AppointmentStatus,
  changedBy = "System",
  note = "",
): AppointmentStatusHistoryEntry {
  return {
    id: new ObjectId().toString(),
    status,
    changedAt: new Date().toISOString(),
    changedBy: normalizeString(changedBy) || "System",
    note: normalizeString(note),
  };
}

function deriveFollowUpDate(date: string, procedures: AppointmentProcedure[], fallback = "") {
  const suggestedDays = getProcedures(
    procedures.map((procedure) => procedure.procedureId),
  ).reduce((max, procedure) => Math.max(max, procedure.suggestedFollowUpDays), 0);

  return suggestedDays > 0 && date ? shiftDate(date, suggestedDays) : fallback;
}

export function serializeAppointment(
  appointment: Partial<AppointmentDocument> & { _id?: unknown },
): Appointment {
  const procedures =
    Array.isArray(appointment.procedures) && appointment.procedures.length > 0
      ? appointment.procedures.map((procedure) => ({
          procedureId: normalizeString(procedure.procedureId),
          name: normalizeString(procedure.name),
          category: procedure.category ?? "consultation",
          durationMinutes: normalizeNumber(procedure.durationMinutes, 30),
          unitPrice: normalizeNumber(procedure.unitPrice, 0),
          pricingModel: procedure.pricingModel ?? "per-case",
          requiredMaterials: normalizeStringArray(procedure.requiredMaterials),
        }))
      : buildProcedureAssignments([], normalizeString(appointment.reason));
  const startTime = normalizeString(appointment.startTime) || normalizeString(appointment.time) || "09:00";
  const durationMinutes =
    normalizeNumber(appointment.durationMinutes, 0) ||
    procedures.reduce((sum, procedure) => sum + procedure.durationMinutes, 0) ||
    30;
  const bufferMinutes = normalizeNumber(appointment.bufferMinutes, 10);
  const branch = getBranch(normalizeString(appointment.branchId) || branchCatalog[0]?.id || "");
  const chair = getChair(normalizeString(appointment.chairId));
  const recurrence = appointment.recurrence ?? {
    enabled: false,
    type: "weekly",
    interval: 1,
    numberOfSessions: 1,
    groupId: "",
    occurrenceNumber: 1,
  };

  return {
    id: String(appointment._id ?? ""),
    appointmentId: normalizeString(appointment.appointmentId),
    patientId: normalizeString(appointment.patientId),
    patientName: normalizeString(appointment.patientName),
    dentistId: normalizeString(appointment.dentistId),
    dentist: normalizeString(appointment.dentist),
    assistantId: normalizeString(appointment.assistantId),
    assistantName: normalizeString(appointment.assistantName),
    hygienistId: normalizeString(appointment.hygienistId),
    hygienistName: normalizeString(appointment.hygienistName),
    branchId: branch.id,
    branchName: normalizeString(appointment.branchName) || branch.name,
    chairId: normalizeString(appointment.chairId),
    chairName: normalizeString(appointment.chairName) || chair?.name || "",
    roomId: normalizeString(appointment.roomId) || chair?.roomId || "",
    procedures,
    date: normalizeString(appointment.date),
    time: startTime,
    startTime,
    endTime: normalizeString(appointment.endTime) || addMinutesToTime(startTime, durationMinutes + bufferMinutes),
    durationMinutes,
    bufferMinutes,
    reason: normalizeString(appointment.reason) || procedures.map((procedure) => procedure.name).join(", "),
    status: normalizeStatus(appointment.status),
    queueMode: normalizeQueueMode(appointment.queueMode),
    queueNumber:
      appointment.queueNumber === null || appointment.queueNumber === undefined
        ? null
        : normalizeNumber(appointment.queueNumber, 0),
    priority: normalizePriority(appointment.priority),
    overbookingApproved: normalizeBoolean(appointment.overbookingApproved),
    reminderDate: normalizeString(appointment.reminderDate),
    reminderChannel: appointment.reminderChannel ?? "sms",
    followUpDate: normalizeString(appointment.followUpDate) || deriveFollowUpDate(normalizeString(appointment.date), procedures),
    notes: normalizeString(appointment.notes),
    preVisitNotes: normalizeString(appointment.preVisitNotes),
    requiredMaterials: procedures.flatMap((procedure) => normalizeStringArray(procedure.requiredMaterials)),
    patientInstructions:
      normalizeString(appointment.patientInstructions) ||
      getProcedures(procedures.map((procedure) => procedure.procedureId))
        .map((procedure) => procedure.patientInstructions)
        .filter(Boolean)
        .join(" "),
    estimatedCost:
      normalizeNumber(appointment.estimatedCost, 0) ||
      procedures.reduce((sum, procedure) => sum + procedure.unitPrice, 0),
    actualCost:
      appointment.actualCost === null || appointment.actualCost === undefined
        ? null
        : normalizeNumber(appointment.actualCost, 0),
    insuranceCoveragePreview:
      appointment.insuranceCoveragePreview === null || appointment.insuranceCoveragePreview === undefined
        ? null
        : normalizeNumber(appointment.insuranceCoveragePreview, 0),
    linkedRecordId: normalizeString(appointment.linkedRecordId),
    linkedInvoiceId: normalizeString(appointment.linkedInvoiceId),
    recurrence: {
      enabled: normalizeBoolean(recurrence.enabled),
      type: recurrence.type === "daily" || recurrence.type === "monthly" ? recurrence.type : "weekly",
      interval: Math.max(1, normalizeNumber(recurrence.interval, 1)),
      numberOfSessions: Math.max(1, normalizeNumber(recurrence.numberOfSessions, 1)),
      groupId: normalizeString(recurrence.groupId),
      occurrenceNumber: Math.max(1, normalizeNumber(recurrence.occurrenceNumber, 1)),
    },
    statusHistory:
      Array.isArray(appointment.statusHistory) && appointment.statusHistory.length > 0
        ? appointment.statusHistory
        : [buildAppointmentStatusHistoryEntry(normalizeStatus(appointment.status), "System", "Initial status")],
    conflicts: Array.isArray(appointment.conflicts) ? appointment.conflicts : [],
    createdAt: normalizeString(appointment.createdAt) || new Date().toISOString(),
    updatedAt: normalizeString(appointment.updatedAt) || new Date().toISOString(),
  };
}

export function serializeWaitlistEntry(
  entry: Partial<AppointmentWaitlistDocument> & { _id?: unknown },
): AppointmentWaitlistEntry {
  return {
    id: String(entry._id ?? ""),
    patientId: normalizeString(entry.patientId),
    patientName: normalizeString(entry.patientName),
    branchId: normalizeString(entry.branchId) || branchCatalog[0]?.id || "",
    preferredDate: normalizeString(entry.preferredDate),
    preferredStartTime: normalizeString(entry.preferredStartTime) || "09:00",
    priority: normalizePriority(entry.priority),
    procedureIds: normalizeStringArray(entry.procedureIds),
    notes: normalizeString(entry.notes),
    createdAt: normalizeString(entry.createdAt) || new Date().toISOString(),
    status: entry.status === "promoted" || entry.status === "cancelled" ? entry.status : "waiting",
  };
}

export async function generateAppointmentId(db: Db) {
  const prefix = `APT-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`;
  let seed = (await db.collection("appointments").countDocuments({})) + 1;

  while (true) {
    const candidate = `${prefix}-${String(seed).padStart(4, "0")}`;
    const existing = await db.collection("appointments").findOne({ appointmentId: candidate });

    if (!existing) {
      return candidate;
    }

    seed += 1;
  }
}

export function buildAppointmentPayload(input: {
  payload: Record<string, unknown>;
  appointmentId: string;
  patient: PatientProfile;
  staffMembers: StaffMember[];
  existing?: Appointment | null;
}) {
  const { payload, appointmentId, patient, staffMembers, existing } = input;
  const dentist = staffMembers.find((member) => member.id === normalizeString(payload.dentistId));
  const assistant = staffMembers.find((member) => member.id === normalizeString(payload.assistantId));
  const hygienist = staffMembers.find((member) => member.id === normalizeString(payload.hygienistId));
  const branch = getBranch(normalizeString(payload.branchId) || existing?.branchId || branchCatalog[0]?.id || "");
  const chair = getChair(normalizeString(payload.chairId) || existing?.chairId || "");
  const procedureIds =
    Array.isArray(payload.procedureIds) && payload.procedureIds.length > 0
      ? payload.procedureIds.map((value) => normalizeString(value)).filter(Boolean)
      : existing?.procedures.map((procedure) => procedure.procedureId) ?? [];
  const procedures = buildProcedureAssignments(procedureIds, normalizeString(payload.reason));
  const durationMinutes = procedures.reduce((sum, procedure) => sum + procedure.durationMinutes, 0);
  const bufferMinutes = Math.max(0, normalizeNumber(payload.bufferMinutes, existing?.bufferMinutes ?? 10));
  const startTime =
    normalizeString(payload.startTime) ||
    normalizeString(payload.time) ||
    existing?.startTime ||
    "09:00";
  const queueMode = normalizeQueueMode(payload.queueMode ?? existing?.queueMode);
  const recurrenceEnabled =
    payload.recurrenceEnabled === undefined
      ? existing?.recurrence.enabled ?? false
      : normalizeBoolean(payload.recurrenceEnabled);

  return serializeAppointment({
    ...(existing ?? {}),
    appointmentId,
    patientId: patient.id,
    patientName: patient.fullName,
    dentistId: dentist?.id ?? (normalizeString(payload.dentistId) || existing?.dentistId || ""),
    dentist: dentist?.fullName ?? existing?.dentist ?? "",
    assistantId: assistant?.id ?? (normalizeString(payload.assistantId) || existing?.assistantId || ""),
    assistantName: assistant?.fullName ?? existing?.assistantName ?? "",
    hygienistId:
      hygienist?.id ?? (normalizeString(payload.hygienistId) || existing?.hygienistId || ""),
    hygienistName: hygienist?.fullName ?? existing?.hygienistName ?? "",
    branchId: branch.id,
    branchName: branch.name,
    chairId: chair?.id ?? (normalizeString(payload.chairId) || existing?.chairId || ""),
    chairName: chair?.name ?? existing?.chairName ?? "",
    roomId: chair?.roomId ?? existing?.roomId ?? "",
    procedures,
    date: normalizeString(payload.date) || existing?.date || "",
    time: startTime,
    startTime,
    endTime: addMinutesToTime(startTime, durationMinutes + bufferMinutes),
    durationMinutes,
    bufferMinutes,
    reason:
      normalizeString(payload.reason) ||
      existing?.reason ||
      procedures.map((procedure) => procedure.name).join(", "),
    status: normalizeStatus(payload.status ?? existing?.status),
    queueMode,
    queueNumber: queueMode === "walk-in" ? existing?.queueNumber ?? null : null,
    priority: normalizePriority(payload.priority ?? existing?.priority),
    overbookingApproved: normalizeBoolean(payload.overbookingApproved, existing?.overbookingApproved ?? false),
    reminderDate: normalizeString(payload.reminderDate) || existing?.reminderDate || "",
    reminderChannel:
      payload.reminderChannel === "email" || payload.reminderChannel === "both"
        ? payload.reminderChannel
        : existing?.reminderChannel ?? "sms",
    followUpDate:
      normalizeString(payload.followUpDate) ||
      existing?.followUpDate ||
      deriveFollowUpDate(normalizeString(payload.date) || existing?.date || "", procedures),
    notes: normalizeString(payload.notes) || existing?.notes || "",
    preVisitNotes: normalizeString(payload.preVisitNotes) || existing?.preVisitNotes || "",
    requiredMaterials: procedures.flatMap((procedure) => normalizeStringArray(procedure.requiredMaterials)),
    patientInstructions: getProcedures(procedureIds).map((procedure) => procedure.patientInstructions).filter(Boolean).join(" "),
    estimatedCost: procedures.reduce((sum, procedure) => sum + procedure.unitPrice, 0),
    actualCost:
      payload.actualCost === null || payload.actualCost === undefined || payload.actualCost === ""
        ? existing?.actualCost ?? null
        : normalizeNumber(payload.actualCost, 0),
    insuranceCoveragePreview:
      patient.coverageLimit && patient.coverageLimit > 0
        ? Math.min(procedures.reduce((sum, procedure) => sum + procedure.unitPrice, 0), patient.coverageLimit)
        : null,
    linkedRecordId: existing?.linkedRecordId ?? "",
    linkedInvoiceId: existing?.linkedInvoiceId ?? "",
    recurrence: {
      enabled: recurrenceEnabled,
      type:
        payload.recurrenceType === "daily" || payload.recurrenceType === "monthly"
          ? payload.recurrenceType
          : existing?.recurrence.type ?? "weekly",
      interval: Math.max(1, normalizeNumber(payload.recurrenceInterval, existing?.recurrence.interval ?? 1)),
      numberOfSessions: Math.max(
        1,
        normalizeNumber(payload.recurrenceSessions, existing?.recurrence.numberOfSessions ?? 1),
      ),
      groupId: existing?.recurrence.groupId ?? new ObjectId().toString(),
      occurrenceNumber: existing?.recurrence.occurrenceNumber ?? 1,
    },
    statusHistory: existing?.statusHistory ?? [
      buildAppointmentStatusHistoryEntry(normalizeStatus(payload.status ?? existing?.status), "Clinic staff", "Appointment created"),
    ],
    conflicts: [],
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

function matchesChairProcedureRule(candidate: Appointment) {
  if (!candidate.chairId) {
    return true;
  }

  const allowedChairIds = getProcedures(candidate.procedures.map((procedure) => procedure.procedureId))
    .flatMap((procedure) => procedure.allowedChairIds);

  return allowedChairIds.length === 0 || allowedChairIds.includes(candidate.chairId);
}

function isWithinSchedule(member: StaffMember | undefined, appointment: Appointment) {
  if (!member || !Array.isArray(member.schedule) || member.schedule.length === 0) {
    return true;
  }

  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(
    new Date(`${appointment.date}T00:00:00`),
  );
  const scheduleDay = member.schedule.find((item) => item.day === weekday);

  if (!scheduleDay || !scheduleDay.available) {
    return false;
  }

  return (
    parseTimeToMinutes(appointment.startTime) >= parseTimeToMinutes(scheduleDay.start) &&
    parseTimeToMinutes(appointment.endTime) <= parseTimeToMinutes(scheduleDay.end)
  );
}

export function detectAppointmentConflicts(input: {
  candidate: Appointment;
  appointments: Appointment[];
  staffMembers: StaffMember[];
}) {
  const { candidate, appointments, staffMembers } = input;
  const conflicts: AppointmentConflict[] = [];
  const overlappingAppointments = appointments.filter(
    (appointment) =>
      appointment.id !== candidate.id &&
      appointment.date === candidate.date &&
      ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status) &&
      datesOverlap(candidate.startTime, candidate.endTime, appointment.startTime, appointment.endTime),
  );

  const chair = getChair(candidate.chairId);
  if (candidate.queueMode === "booked" && chair && chair.status !== "available") {
    conflicts.push({
      type: "capacity",
      message: `${chair.name} is currently ${chair.status} and cannot accept a booked appointment.`,
    });
  }

  if (candidate.queueMode === "booked" && candidate.chairId) {
    const chairConflict = overlappingAppointments.find((appointment) => appointment.chairId === candidate.chairId);
    if (chairConflict) {
      conflicts.push({
        type: "chair-overlap",
        message: `${candidate.chairName || candidate.chairId} is already occupied at that time.`,
      });
    }
  }

  if (candidate.dentistId) {
    const dentistConflict = overlappingAppointments.find((appointment) => appointment.dentistId === candidate.dentistId);
    if (dentistConflict) {
      conflicts.push({
        type: "dentist-overlap",
        message: `${candidate.dentist || "Assigned dentist"} already has another appointment at that time.`,
      });
    }
  }

  const activeChairsInBranch = chairCatalog.filter(
    (item) => item.branchId === candidate.branchId && item.status !== "maintenance",
  );
  if (
    candidate.queueMode === "booked" &&
    overlappingAppointments.filter((appointment) => appointment.branchId === candidate.branchId).length >=
      activeChairsInBranch.length
  ) {
    conflicts.push({
      type: "capacity",
      message: `${candidate.branchName} is already at chair capacity for that slot.`,
    });
  }

  if (candidate.chairId && !matchesChairProcedureRule(candidate)) {
    conflicts.push({
      type: "capacity",
      message: `${candidate.chairName || "Selected chair"} does not support one or more selected procedures.`,
    });
  }

  const dentist = staffMembers.find((member) => member.id === candidate.dentistId);
  const requiredSkills = getProcedures(candidate.procedures.map((procedure) => procedure.procedureId))
    .flatMap((procedure) => procedure.requiredSkills)
    .filter((skill, index, items) => items.indexOf(skill) === index);

  if (
    dentist &&
    dentist.skills &&
    dentist.skills.length > 0 &&
    requiredSkills.some((skill) => !dentist.skills?.includes(skill))
  ) {
    conflicts.push({
      type: "skill",
      message: `${dentist.fullName} does not match the required skill set for the selected procedures.`,
    });
  }

  if (!isWithinSchedule(dentist, candidate)) {
    conflicts.push({
      type: "capacity",
      message: `${candidate.dentist || "Assigned dentist"} is outside the published schedule for this slot.`,
    });
  }

  return conflicts.filter(
    (conflict, index, items) =>
      items.findIndex((item) => item.type === conflict.type && item.message === conflict.message) === index,
  );
}

export function expandRecurringAppointments(baseAppointment: Appointment) {
  if (!baseAppointment.recurrence.enabled || baseAppointment.recurrence.numberOfSessions <= 1) {
    return [baseAppointment];
  }

  return Array.from({ length: baseAppointment.recurrence.numberOfSessions }, (_, index) => {
    if (index === 0) {
      return baseAppointment;
    }

    const offset = index * baseAppointment.recurrence.interval;
    const nextDate = shiftRecurringDate(baseAppointment.date, baseAppointment.recurrence, offset);

    return {
      ...baseAppointment,
      id: "",
      appointmentId: "",
      date: nextDate,
      followUpDate: shiftRecurringDate(baseAppointment.followUpDate, baseAppointment.recurrence, offset),
      recurrence: {
        ...baseAppointment.recurrence,
        occurrenceNumber: index + 1,
      },
      statusHistory: [
        buildAppointmentStatusHistoryEntry(
          baseAppointment.status,
          "System",
          `Generated from recurrence ${baseAppointment.recurrence.groupId}`,
        ),
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } satisfies Appointment;
  });
}

export function appendStatusHistory(
  appointment: Appointment,
  status: AppointmentStatus,
  changedBy: string,
  note = "",
) {
  if (appointment.status === status && !note) {
    return appointment.statusHistory;
  }

  return [...appointment.statusHistory, buildAppointmentStatusHistoryEntry(status, changedBy, note)];
}

export function buildAppointmentAnalytics(appointments: Appointment[]): AppointmentAnalytics {
  const busiestHoursMap = appointments.reduce<Record<string, number>>((acc, appointment) => {
    const hour = `${appointment.startTime.slice(0, 2)}:00`;
    acc[hour] = (acc[hour] ?? 0) + 1;
    return acc;
  }, {});

  const doctorUtilizationMap = appointments.reduce<Record<string, { dentistName: string; minutes: number }>>(
    (acc, appointment) => {
      if (!appointment.dentistId) {
        return acc;
      }
      acc[appointment.dentistId] = acc[appointment.dentistId] ?? {
        dentistName: appointment.dentist,
        minutes: 0,
      };
      acc[appointment.dentistId].minutes += appointment.durationMinutes;
      return acc;
    },
    {},
  );

  const totalAppointments = appointments.length;
  const noShowCount = appointments.filter((appointment) => appointment.status === "no-show").length;
  const cancelledCount = appointments.filter((appointment) => appointment.status === "canceled").length;

  return {
    totalAppointments,
    scheduledCount: appointments.filter((appointment) => appointment.status === "scheduled").length,
    confirmedCount: appointments.filter((appointment) => appointment.status === "confirmed").length,
    checkedInCount: appointments.filter((appointment) => appointment.status === "checked-in").length,
    inProgressCount: appointments.filter((appointment) => appointment.status === "in-progress").length,
    completedCount: appointments.filter((appointment) => appointment.status === "completed").length,
    cancelledCount,
    noShowCount,
    rescheduledCount: appointments.filter((appointment) => appointment.status === "rescheduled").length,
    noShowRate: totalAppointments > 0 ? Number(((noShowCount / totalAppointments) * 100).toFixed(1)) : 0,
    cancellationRate:
      totalAppointments > 0 ? Number(((cancelledCount / totalAppointments) * 100).toFixed(1)) : 0,
    busiestHours: Object.entries(busiestHoursMap)
      .map(([hour, count]) => ({ hour, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 5),
    doctorUtilization: Object.entries(doctorUtilizationMap)
      .map(([dentistId, value]) => ({
        dentistId,
        dentistName: value.dentistName,
        minutes: value.minutes,
      }))
      .sort((left, right) => right.minutes - left.minutes),
  };
}

export async function getNextWalkInQueueNumber(db: Db, date: string) {
  const latestWalkIn = await db.collection<AppointmentDocument>("appointments").findOne(
    { date, queueMode: "walk-in" },
    { sort: { queueNumber: -1, _id: -1 } },
  );

  return Math.max(1, normalizeNumber(latestWalkIn?.queueNumber, 0) + 1);
}

export async function createWaitlistEntry(
  db: Db,
  input: {
    patientId: string;
    patientName: string;
    branchId: string;
    preferredDate: string;
    preferredStartTime: string;
    priority: AppointmentPriority;
    procedureIds: string[];
    notes: string;
  },
) {
  const entry = serializeWaitlistEntry({
    patientId: input.patientId,
    patientName: input.patientName,
    branchId: input.branchId,
    preferredDate: input.preferredDate,
    preferredStartTime: input.preferredStartTime,
    priority: input.priority,
    procedureIds: input.procedureIds,
    notes: input.notes,
    createdAt: new Date().toISOString(),
    status: "waiting",
  });

  const result = await db.collection<AppointmentWaitlistDocument>("appointmentWaitlist").insertOne({
    patientId: entry.patientId,
    patientName: entry.patientName,
    branchId: entry.branchId,
    preferredDate: entry.preferredDate,
    preferredStartTime: entry.preferredStartTime,
    priority: entry.priority,
    procedureIds: entry.procedureIds,
    notes: entry.notes,
    createdAt: entry.createdAt,
    status: entry.status,
  });

  return {
    ...entry,
    id: String(result.insertedId),
  };
}

export async function listWaitlistEntries(db: Db) {
  const entries = await db
    .collection<AppointmentWaitlistDocument>("appointmentWaitlist")
    .find({})
    .sort({ createdAt: 1, _id: 1 })
    .toArray();

  return entries
    .map((entry) => serializeWaitlistEntry(entry))
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority === "urgent" ? -1 : 1;
      }
      return left.createdAt.localeCompare(right.createdAt);
    });
}

export async function promoteWaitlistForCancelledAppointment(
  db: Db,
  cancelledAppointment: Appointment,
  staffMembers: StaffMember[],
) {
  const waitlistCollection = db.collection<AppointmentWaitlistDocument>("appointmentWaitlist");
  const entries = await listWaitlistEntries(db);
  const nextWaitlistEntry = entries.find(
    (entry) =>
      entry.status === "waiting" &&
      entry.branchId === cancelledAppointment.branchId &&
      entry.preferredDate === cancelledAppointment.date,
  );

  if (!nextWaitlistEntry) {
    return null;
  }

  const patient = await db.collection("patients").findOne({ _id: new ObjectId(nextWaitlistEntry.patientId) });
  if (!patient) {
    return null;
  }

  const appointmentId = await generateAppointmentId(db);
  const promotedAppointment = buildAppointmentPayload({
    payload: {
      dentistId: cancelledAppointment.dentistId,
      assistantId: cancelledAppointment.assistantId,
      hygienistId: cancelledAppointment.hygienistId,
      branchId: cancelledAppointment.branchId,
      chairId: cancelledAppointment.chairId,
      procedureIds: nextWaitlistEntry.procedureIds,
      date: cancelledAppointment.date,
      startTime: cancelledAppointment.startTime,
      reason: cancelledAppointment.reason,
      status: "scheduled",
      queueMode: "booked",
      priority: nextWaitlistEntry.priority,
      notes: `${nextWaitlistEntry.notes}\nPromoted from waitlist.`.trim(),
      bufferMinutes: cancelledAppointment.bufferMinutes,
      reminderDate: cancelledAppointment.reminderDate,
      reminderChannel: cancelledAppointment.reminderChannel,
      followUpDate: cancelledAppointment.followUpDate,
      preVisitNotes: cancelledAppointment.preVisitNotes,
    },
    appointmentId,
    patient: {
      ...(patient as unknown as PatientProfile),
      id: nextWaitlistEntry.patientId,
    },
    staffMembers,
  });

  const result = await db.collection<AppointmentDocument>("appointments").insertOne({
    ...promotedAppointment,
    statusHistory: [
      buildAppointmentStatusHistoryEntry(
        "scheduled",
        "System",
        `Promoted from waitlist ${nextWaitlistEntry.id}`,
      ),
    ],
  });

  await waitlistCollection.updateOne(
    { _id: new ObjectId(nextWaitlistEntry.id) },
    { $set: { status: "promoted" } },
  );

  return {
    ...promotedAppointment,
    id: String(result.insertedId),
  } satisfies Appointment;
}

export async function ensureAppointmentCompletionArtifacts(db: Db, appointment: Appointment) {
  let linkedRecordId = appointment.linkedRecordId;
  let linkedInvoiceId = appointment.linkedInvoiceId;

  if (!linkedRecordId) {
    const emrRecord: Omit<DentalRecord, "id"> = {
      patientId: appointment.patientId,
      patientName: appointment.patientName,
      visitDate: appointment.date,
      chiefComplaint: appointment.reason,
      consultationNotes: appointment.preVisitNotes,
      diagnoses: "",
      treatmentPlan: appointment.procedures.map((procedure) => procedure.name).join(", "),
      treatmentStep: `Completed via appointment ${appointment.appointmentId}`,
      treatmentStatus: "completed",
      procedureHistory: appointment.procedures.map((procedure) => procedure.name).join(", "),
      clinicalAttachments: [],
      odontogram: odontogramToothNumbers.map((toothNumber) => ({
        toothNumber,
        condition: "healthy",
        notes: "",
        treatmentProcess: "",
        treatmentStatus: "planned",
        conditionPrice: null,
      })),
    };

    const recordResult = await db.collection<Omit<DentalRecord, "id">>("emr_records").insertOne(emrRecord);
    linkedRecordId = String(recordResult.insertedId);
  }

  if (!linkedInvoiceId) {
    const lineItems: InvoiceLine[] = appointment.procedures.map((procedure) => ({
      treatmentId: procedure.procedureId,
      treatment: procedure.name,
      quantity: 1,
      unitPrice: procedure.unitPrice,
      pricingModel: procedure.pricingModel,
      linkedRecordId,
      toothNumbers: [],
      autoGenerated: true,
    }));
    const invoice: Omit<Invoice, "id"> = {
      patientId: appointment.patientId,
      patientName: appointment.patientName,
      invoiceNumber: `INV-${appointment.appointmentId}`,
      issueDate: appointment.date,
      linkedRecordId,
      autoGenerated: true,
      lineItems,
      payments: [],
      notes: `Auto-created from appointment ${appointment.appointmentId}`,
    };
    const invoiceResult = await db.collection<Omit<Invoice, "id">>("billing_invoices").insertOne(invoice);
    linkedInvoiceId = String(invoiceResult.insertedId);
  }

  await db.collection("patients").updateOne(
    { _id: new ObjectId(appointment.patientId) },
    { $set: { lastVisitDate: appointment.date } },
  );

  return { linkedRecordId, linkedInvoiceId };
}
