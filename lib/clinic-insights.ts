import type {
  Appointment,
  DentalRecord,
  Invoice,
  PatientProfile,
  StaffMember,
} from "@/lib/clinic-types";

export type InsightPeriod = "7d" | "30d" | "90d";

export type InsightTimePoint = {
  date: string;
  label: string;
  appointments: number;
  completed: number;
  revenue: number;
  newPatients: number;
};

export type InsightBreakdownItem = {
  label: string;
  value: number;
};

export type InsightDentistItem = {
  label: string;
  appointments: number;
  completed: number;
  minutes: number;
};

export type InsightInvoiceItem = {
  invoice: Invoice;
  total: number;
  paid: number;
  outstanding: number;
};

export type InsightAlertItem = {
  title: string;
  detail: string;
  tone: "sky" | "amber" | "rose";
};

export type ClinicInsights = {
  period: InsightPeriod;
  periodDays: number;
  startDate: string;
  endDate: string;
  totalPatients: number;
  activePatients: number;
  vipPatients: number;
  totalAppointments: number;
  periodAppointments: number;
  todayAppointments: Appointment[];
  upcomingAppointments: Appointment[];
  completionRate: number;
  noShowRate: number;
  checkedInRate: number;
  collectedRevenue: number;
  outstandingRevenue: number;
  avgCollectedPerVisit: number;
  collectionRate: number;
  completedRecords: number;
  totalDentists: number;
  availableDentists: number;
  outstandingInvoiceCount: number;
  urgentUpcomingCount: number;
  timeSeries: InsightTimePoint[];
  statusBreakdown: InsightBreakdownItem[];
  patientGrowth: InsightBreakdownItem[];
  treatmentMix: InsightBreakdownItem[];
  paymentMix: InsightBreakdownItem[];
  dentistLoad: InsightDentistItem[];
  outstandingInvoices: InsightInvoiceItem[];
  alerts: InsightAlertItem[];
};

const knownTreatments = [
  { key: "Scaling", tokens: ["scaling", "cleaning"] },
  { key: "Filling", tokens: ["filling", "composite"] },
  { key: "Crown", tokens: ["crown"] },
  { key: "Extraction", tokens: ["extraction"] },
  { key: "Root Canal", tokens: ["root canal", "root-canal", "endodontic"] },
  { key: "Implant", tokens: ["implant"] },
  { key: "X-Ray", tokens: ["x-ray", "xray"] },
  { key: "Consultation", tokens: ["consultation", "exam"] },
];

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount >= 1000 ? 0 : 2,
  }).format(amount);
}

export function formatCompactCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: Math.abs(amount) >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(amount);
}

export function formatPercent(value: number) {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

export function formatDateLabel(date: string) {
  if (!date) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export function formatShortDateLabel(date: string) {
  if (!date) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export function formatMonthLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export function invoiceTotal(invoice: Invoice) {
  return invoice.lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
}

export function invoicePaid(invoice: Invoice) {
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

function safeDateKey(value: string) {
  if (!value) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDate(date: string, offset: number) {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + offset);
  const year = next.getFullYear();
  const month = String(next.getMonth() + 1).padStart(2, "0");
  const day = String(next.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfMonth(date: string) {
  const value = new Date(`${date}T00:00:00`);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

function periodDays(period: InsightPeriod) {
  switch (period) {
    case "7d":
      return 7;
    case "90d":
      return 90;
    default:
      return 30;
  }
}

function patientCreatedDate(patient: PatientProfile) {
  if (patient.registrationDate) {
    return safeDateKey(patient.registrationDate);
  }

  const fromId = objectIdDate(patient.id);
  return fromId ? safeDateKey(fromId.toISOString()) : "";
}

function buildTimeBuckets(endDate: string, days: number) {
  return Array.from({ length: days }, (_, index) => {
    const date = shiftDate(endDate, index - (days - 1));
    return {
      date,
      label: formatShortDateLabel(date),
    };
  });
}

function aggregateTreatments(appointments: Appointment[], records: DentalRecord[]) {
  const treatmentMap = new Map<string, number>();

  appointments.forEach((appointment) => {
    appointment.procedures.forEach((procedure) => {
      treatmentMap.set(procedure.name, (treatmentMap.get(procedure.name) ?? 0) + 1);
    });
  });

  records.forEach((record) => {
    const text = `${record.procedureHistory} ${record.treatmentPlan}`.toLowerCase();

    knownTreatments.forEach((item) => {
      if (item.tokens.some((token) => text.includes(token))) {
        treatmentMap.set(item.key, (treatmentMap.get(item.key) ?? 0) + 1);
      }
    });
  });

  return [...treatmentMap.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 6);
}

export function buildClinicInsights(input: {
  patients: PatientProfile[];
  appointments: Appointment[];
  invoices: Invoice[];
  records: DentalRecord[];
  staffMembers?: StaffMember[];
  period: InsightPeriod;
  today?: string;
}) {
  const { patients, appointments, invoices, records, staffMembers = [], period } = input;
  const today = input.today ?? safeDateKey(new Date().toISOString());
  const days = periodDays(period);
  const startDate = shiftDate(today, -(days - 1));

  const timeSeries = buildTimeBuckets(today, days).map((bucket) => ({
    ...bucket,
    appointments: 0,
    completed: 0,
    revenue: 0,
    newPatients: 0,
  }));

  const timeIndex = new Map(timeSeries.map((point, index) => [point.date, index]));

  const periodAppointments = appointments.filter(
    (appointment) => appointment.date >= startDate && appointment.date <= today,
  );
  const periodRecords = records.filter(
    (record) => record.visitDate >= startDate && record.visitDate <= today,
  );

  periodAppointments.forEach((appointment) => {
    const index = timeIndex.get(appointment.date);
    if (index === undefined) {
      return;
    }

    timeSeries[index].appointments += 1;
    if (appointment.status === "completed") {
      timeSeries[index].completed += 1;
    }
  });

  invoices.forEach((invoice) => {
    invoice.payments.forEach((payment) => {
      const paymentDate = safeDateKey(payment.paidAt);
      const index = timeIndex.get(paymentDate);
      if (index === undefined) {
        return;
      }

      timeSeries[index].revenue += payment.amount;
    });
  });

  patients.forEach((patient) => {
    const createdAt = patientCreatedDate(patient);
    const index = timeIndex.get(createdAt);
    if (index === undefined) {
      return;
    }

    timeSeries[index].newPatients += 1;
  });

  const totalCollectedRevenue = invoices.reduce(
    (sum, invoice) => sum + invoicePaid(invoice),
    0,
  );
  const totalOutstandingRevenue = invoices.reduce(
    (sum, invoice) => sum + Math.max(invoiceTotal(invoice) - invoicePaid(invoice), 0),
    0,
  );

  const todayAppointments = appointments
    .filter((appointment) => appointment.date === today)
    .sort((left, right) => left.startTime.localeCompare(right.startTime));

  const upcomingAppointments = appointments
    .filter(
      (appointment) =>
        appointment.date >= today &&
        appointment.status !== "completed" &&
        appointment.status !== "canceled" &&
        appointment.status !== "no-show",
    )
    .sort((left, right) =>
      `${left.date}T${left.startTime}`.localeCompare(`${right.date}T${right.startTime}`),
    )
    .slice(0, 8);

  const completedAppointments = periodAppointments.filter(
    (appointment) => appointment.status === "completed",
  ).length;
  const checkedInAppointments = periodAppointments.filter(
    (appointment) =>
      appointment.status === "checked-in" || appointment.status === "in-progress",
  ).length;
  const noShowAppointments = periodAppointments.filter(
    (appointment) => appointment.status === "no-show",
  ).length;

  const statusBreakdown = [
    { label: "Completed", value: completedAppointments },
    {
      label: "In Clinic",
      value: checkedInAppointments,
    },
    {
      label: "Confirmed",
      value: periodAppointments.filter((appointment) => appointment.status === "confirmed").length,
    },
    {
      label: "Scheduled",
      value: periodAppointments.filter((appointment) => appointment.status === "scheduled").length,
    },
    {
      label: "Canceled",
      value: periodAppointments.filter((appointment) => appointment.status === "canceled").length,
    },
    { label: "No-show", value: noShowAppointments },
  ].filter((item) => item.value > 0);

  const paymentMixMap = new Map<string, number>();
  invoices.forEach((invoice) => {
    invoice.payments.forEach((payment) => {
      const paidAt = safeDateKey(payment.paidAt);
      if (paidAt < startDate || paidAt > today) {
        return;
      }

      const label = payment.method.charAt(0).toUpperCase() + payment.method.slice(1);
      paymentMixMap.set(label, (paymentMixMap.get(label) ?? 0) + payment.amount);
    });
  });

  const paymentMix = [...paymentMixMap.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value);

  const dentistLoadMap = new Map<string, InsightDentistItem>();
  periodAppointments.forEach((appointment) => {
    const key = appointment.dentistId || appointment.dentist || "unassigned";
    const label = appointment.dentist || "Unassigned";
    const current = dentistLoadMap.get(key) ?? {
      label,
      appointments: 0,
      completed: 0,
      minutes: 0,
    };

    current.appointments += 1;
    current.minutes += appointment.durationMinutes;
    if (appointment.status === "completed") {
      current.completed += 1;
    }

    dentistLoadMap.set(key, current);
  });

  const dentistLoad = [...dentistLoadMap.values()]
    .sort((left, right) => right.appointments - left.appointments || right.minutes - left.minutes)
    .slice(0, 6);

  const endMonth = startOfMonth(today);
  const patientGrowth = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(`${endMonth}T00:00:00`);
    date.setMonth(date.getMonth() + index - 5);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const key = `${year}-${month}-01`;
    const value = patients.filter((patient) => {
      const createdAt = patientCreatedDate(patient);
      return createdAt.startsWith(`${year}-${month}`);
    }).length;

    return {
      label: formatMonthLabel(key),
      value,
    };
  });

  const outstandingInvoices = invoices
    .map((invoice) => {
      const total = invoiceTotal(invoice);
      const paid = invoicePaid(invoice);
      return {
        invoice,
        total,
        paid,
        outstanding: Math.max(total - paid, 0),
      };
    })
    .filter((item) => item.outstanding > 0)
    .sort((left, right) => right.outstanding - left.outstanding)
    .slice(0, 6);

  const urgentUpcomingCount = upcomingAppointments.filter(
    (appointment) => appointment.priority === "urgent",
  ).length;

  const alerts: InsightAlertItem[] = [];

  if (outstandingInvoices.length > 0) {
    alerts.push({
      title: "Outstanding balances need follow-up",
      detail: `${outstandingInvoices.length} invoice${outstandingInvoices.length === 1 ? "" : "s"} still carry unpaid balances.`,
      tone: "rose",
    });
  }

  if (noShowAppointments > 0) {
    alerts.push({
      title: "No-show trend detected",
      detail: `${noShowAppointments} missed appointment${noShowAppointments === 1 ? "" : "s"} during the selected period.`,
      tone: "amber",
    });
  }

  if (urgentUpcomingCount > 0) {
    alerts.push({
      title: "Urgent visits are coming up",
      detail: `${urgentUpcomingCount} urgent appointment${urgentUpcomingCount === 1 ? "" : "s"} are already in the queue.`,
      tone: "sky",
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      title: "Clinic flow looks stable",
      detail: "No urgent financial or scheduling issues were detected in the selected window.",
      tone: "sky",
    });
  }

  const totalDentists = staffMembers.filter((member) => member.role === "dentist").length;
  const availableDentists = staffMembers.filter(
    (member) => member.role === "dentist" && member.availabilityStatus === "available",
  ).length;

  return {
    period,
    periodDays: days,
    startDate,
    endDate: today,
    totalPatients: patients.length,
    activePatients: patients.filter((patient) => patient.status === "active").length,
    vipPatients: patients.filter((patient) => patient.patientType === "VIP").length,
    totalAppointments: appointments.length,
    periodAppointments: periodAppointments.length,
    todayAppointments,
    upcomingAppointments,
    completionRate:
      periodAppointments.length > 0
        ? Number(((completedAppointments / periodAppointments.length) * 100).toFixed(1))
        : 0,
    noShowRate:
      periodAppointments.length > 0
        ? Number(((noShowAppointments / periodAppointments.length) * 100).toFixed(1))
        : 0,
    checkedInRate:
      periodAppointments.length > 0
        ? Number(((checkedInAppointments / periodAppointments.length) * 100).toFixed(1))
        : 0,
    collectedRevenue: totalCollectedRevenue,
    outstandingRevenue: totalOutstandingRevenue,
    avgCollectedPerVisit:
      completedAppointments > 0
        ? Number((timeSeries.reduce((sum, point) => sum + point.revenue, 0) / completedAppointments).toFixed(2))
        : 0,
    collectionRate:
      totalCollectedRevenue + totalOutstandingRevenue > 0
        ? Number(
            (
              (totalCollectedRevenue / (totalCollectedRevenue + totalOutstandingRevenue)) *
              100
            ).toFixed(1),
          )
        : 0,
    completedRecords: records.filter((record) => record.treatmentStatus === "completed").length,
    totalDentists,
    availableDentists,
    outstandingInvoiceCount: outstandingInvoices.length,
    urgentUpcomingCount,
    timeSeries,
    statusBreakdown,
    patientGrowth,
    treatmentMix: aggregateTreatments(periodAppointments, periodRecords),
    paymentMix,
    dentistLoad,
    outstandingInvoices,
    alerts,
  } satisfies ClinicInsights;
}
