import { ObjectId, type Db } from "mongodb";

import type {
  Appointment,
  DentalRecord,
  Invoice,
  PatientAnalytics,
  PatientDuplicateCandidate,
  PatientFamilyMember,
  PatientProfile,
  PatientTimelineNote,
  PregnancyStatus,
  UploadedFile,
} from "@/lib/clinic-types";

export type PatientStorageRecord = Omit<
  PatientProfile,
  "id" | "notesTimeline" | "analytics" | "duplicateCandidates" | "familyMembers"
>;

export type PatientDocument = PatientStorageRecord & {
  _id?: ObjectId;
};

export type PatientNoteDocument = Omit<PatientTimelineNote, "id"> & {
  _id?: ObjectId;
};

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

function normalizeNumber(value: unknown, fallback: number | null = 0) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePregnancyStatus(value: unknown): PregnancyStatus {
  const nextValue = normalizeString(value);
  if (
    nextValue === "pregnant" ||
    nextValue === "not-pregnant" ||
    nextValue === "not-applicable" ||
    nextValue === "unknown"
  ) {
    return nextValue;
  }

  return "unknown";
}

export function createUploadedFile(
  input: Partial<UploadedFile>,
  category: NonNullable<UploadedFile["category"]>,
) {
  return {
    id: normalizeString(input.id) || new ObjectId().toString(),
    name: normalizeString(input.name) || "File",
    size: normalizeNumber(input.size, 0) ?? 0,
    type: normalizeString(input.type),
    category: input.category ?? category,
    url: normalizeString(input.url),
    uploadedAt: normalizeString(input.uploadedAt) || new Date().toISOString(),
  } satisfies UploadedFile;
}

export function calculatePatientAge(dateOfBirth: string) {
  if (!dateOfBirth) {
    return null;
  }

  const birth = new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDifference = today.getMonth() - birth.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birth.getDate())
  ) {
    age -= 1;
  }

  return age;
}

function buildAddress(province: string, city: string, fullAddress: string, fallbackAddress: string) {
  const nextFullAddress = fullAddress || fallbackAddress;
  return {
    address: fallbackAddress || nextFullAddress,
    fullAddress: nextFullAddress || [province, city].filter(Boolean).join(", "),
  };
}

function inferRiskLevel(patient: Partial<PatientStorageRecord>) {
  const hasHighRiskCondition =
    patient.medicalConditions?.heartDisease ||
    patient.medicalConditions?.bleedingDisorders ||
    patient.medicalConditions?.pregnancyStatus === "pregnant" ||
    normalizeString(patient.allergyProfile?.anesthesiaAllergy) !== "";

  if (hasHighRiskCondition) {
    return "high" as const;
  }

  const hasMediumRiskCondition =
    patient.medicalConditions?.diabetes ||
    patient.medicalConditions?.highBloodPressure ||
    normalizeString(patient.allergyProfile?.drugAllergies) !== "" ||
    normalizeString(patient.allergyProfile?.materialAllergy) !== "";

  if (hasMediumRiskCondition) {
    return "medium" as const;
  }

  return "low" as const;
}

function invoiceTotal(invoice: Invoice) {
  return invoice.lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

function invoiceOutstanding(invoice: Invoice) {
  const paid = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
  return Math.max(invoiceTotal(invoice) - paid, 0);
}

export function buildPatientAnalytics(
  patientId: string,
  appointments: Appointment[],
  invoices: Invoice[],
  records: DentalRecord[],
): PatientAnalytics {
  const patientAppointments = appointments.filter((appointment) => appointment.patientId === patientId);
  const patientInvoices = invoices.filter((invoice) => invoice.patientId === patientId);
  const patientRecords = records.filter((record) => record.patientId === patientId);
  const treatmentCounts = patientInvoices
    .flatMap((invoice) => invoice.lineItems.map((item) => item.treatment))
    .reduce<Record<string, number>>((acc, treatment) => {
      acc[treatment] = (acc[treatment] ?? 0) + 1;
      return acc;
    }, {});

  const mostCommonTreatment =
    Object.entries(treatmentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

  const lastVisit =
    [...patientAppointments.map((item) => item.date), ...patientRecords.map((item) => item.visitDate)]
      .filter(Boolean)
      .sort()
      .at(-1) ?? "";

  return {
    totalVisits: patientRecords.length,
    totalRevenue: patientInvoices.reduce((sum, invoice) => sum + invoiceTotal(invoice), 0),
    lastVisit,
    mostCommonTreatment,
    doctorsVisited: patientAppointments
      .map((appointment) => appointment.dentist)
      .filter(Boolean)
      .filter((dentist, index, list) => list.indexOf(dentist) === index),
    treatmentsDone: Object.keys(treatmentCounts),
    totalAppointments: patientAppointments.length,
    completedAppointments: patientAppointments.filter((item) => item.status === "completed").length,
  };
}

export function buildPatientDuplicateCandidates(
  currentPatient: PatientStorageRecord & { id: string },
  patients: Array<PatientStorageRecord & { id: string }>,
): PatientDuplicateCandidate[] {
  return patients
    .filter((candidate) => candidate.id !== currentPatient.id)
    .map((candidate) => {
      const reasons: string[] = [];
      let score = 0;

      if (
        currentPatient.nationalId &&
        candidate.nationalId &&
        currentPatient.nationalId === candidate.nationalId
      ) {
        reasons.push("same national ID");
        score += 100;
      }

      if (
        currentPatient.passportNumber &&
        candidate.passportNumber &&
        currentPatient.passportNumber === candidate.passportNumber
      ) {
        reasons.push("same passport");
        score += 90;
      }

      const sharedPhone = currentPatient.phoneNumbers.find((phone) =>
        candidate.phoneNumbers.includes(phone),
      );
      if (sharedPhone) {
        reasons.push(`shared phone ${sharedPhone}`);
        score += 70;
      }

      if (
        currentPatient.email &&
        candidate.email &&
        currentPatient.email.toLowerCase() === candidate.email.toLowerCase()
      ) {
        reasons.push("same email");
        score += 60;
      }

      if (
        currentPatient.fullName &&
        currentPatient.dateOfBirth &&
        currentPatient.fullName.toLowerCase() === candidate.fullName.toLowerCase() &&
        currentPatient.dateOfBirth === candidate.dateOfBirth
      ) {
        reasons.push("same full name and DOB");
        score += 50;
      }

      if (reasons.length === 0) {
        return null;
      }

      return {
        patientId: candidate.id,
        fullName: candidate.fullName,
        reason: reasons.join(", "),
        score,
      } satisfies PatientDuplicateCandidate;
    })
    .filter((candidate): candidate is PatientDuplicateCandidate => Boolean(candidate))
    .sort((a, b) => b.score - a.score);
}

export function buildPatientFamilyMembers(
  currentPatient: PatientStorageRecord & { id: string },
  patients: Array<PatientStorageRecord & { id: string }>,
): PatientFamilyMember[] {
  return normalizeStringArray(currentPatient.familyMemberIds)
    .map((familyMemberId) => patients.find((candidate) => candidate.id === familyMemberId))
    .filter((candidate): candidate is PatientStorageRecord & { id: string } => Boolean(candidate))
    .map((candidate) => ({
      id: candidate.id,
      patientId: candidate.patientId,
      fullName: candidate.fullName,
      relationshipHint:
        candidate.address && currentPatient.address && candidate.address === currentPatient.address
          ? "Same household"
          : "Linked family record",
    }));
}

export function normalizePatientForStorage(
  payload: Partial<PatientStorageRecord>,
  existing?: Partial<PatientStorageRecord>,
): PatientStorageRecord {
  const merged = {
    ...existing,
    ...payload,
  } as Partial<PatientStorageRecord>;
  const phoneNumbers = normalizeStringArray(merged.phoneNumbers);
  const primaryPhone = normalizeString(merged.phone) || phoneNumbers[0] || "";
  const nextPhoneNumbers = normalizeStringArray([primaryPhone, ...phoneNumbers]);
  const province = normalizeString(merged.province);
  const city = normalizeString(merged.city);
  const { address, fullAddress } = buildAddress(
    province,
    city,
    normalizeString(merged.fullAddress),
    normalizeString(merged.address),
  );
  const riskLevel =
    merged.riskLevel === "low" || merged.riskLevel === "medium" || merged.riskLevel === "high"
      ? merged.riskLevel
      : inferRiskLevel(merged);

  return {
    patientId: normalizeString(merged.patientId),
    nationalId: normalizeString(merged.nationalId),
    passportNumber: normalizeString(merged.passportNumber),
    fullName: normalizeString(merged.fullName),
    dateOfBirth: normalizeString(merged.dateOfBirth),
    gender: normalizeString(merged.gender),
    phone: primaryPhone,
    phoneNumbers: nextPhoneNumbers,
    email: normalizeString(merged.email),
    province,
    city,
    address,
    fullAddress,
    profilePhoto: normalizeString(merged.profilePhoto),
    status:
      merged.status === "inactive" ||
      merged.status === "blocked" ||
      merged.status === "deceased"
        ? merged.status
        : "active",
    registrationDate: normalizeString(merged.registrationDate) || new Date().toISOString(),
    lastVisitDate: normalizeString(merged.lastVisitDate),
    patientType:
      merged.patientType === "returning" || merged.patientType === "VIP"
        ? merged.patientType
        : "new",
    occupation: normalizeString(merged.occupation),
    emergencyContactName: normalizeString(merged.emergencyContactName),
    emergencyContactRelation: normalizeString(merged.emergencyContactRelation),
    emergencyContactPhone: normalizeString(merged.emergencyContactPhone),
    secondaryContactName: normalizeString(merged.secondaryContactName),
    secondaryContactRelation: normalizeString(merged.secondaryContactRelation),
    secondaryContactPhone: normalizeString(merged.secondaryContactPhone),
    familyMemberIds: normalizeStringArray(merged.familyMemberIds),
    medicalHistory: normalizeString(merged.medicalHistory),
    oralHealthHistory: {
      gumDiseaseHistory: normalizeString(merged.oralHealthHistory?.gumDiseaseHistory),
      cavitiesHistory: normalizeString(merged.oralHealthHistory?.cavitiesHistory),
      orthodonticHistory: normalizeString(merged.oralHealthHistory?.orthodonticHistory),
      implantsCrownsBridges: normalizeString(
        merged.oralHealthHistory?.implantsCrownsBridges,
      ),
      missingTeethRecord: normalizeString(merged.oralHealthHistory?.missingTeethRecord),
    },
    medicalConditions: {
      diabetes: normalizeBoolean(merged.medicalConditions?.diabetes),
      heartDisease: normalizeBoolean(merged.medicalConditions?.heartDisease),
      highBloodPressure: normalizeBoolean(merged.medicalConditions?.highBloodPressure),
      pregnancyStatus: normalizePregnancyStatus(merged.medicalConditions?.pregnancyStatus),
      bleedingDisorders: normalizeBoolean(merged.medicalConditions?.bleedingDisorders),
      notes: normalizeString(merged.medicalConditions?.notes),
    },
    allergies: normalizeString(merged.allergies),
    allergyProfile: {
      drugAllergies: normalizeString(merged.allergyProfile?.drugAllergies),
      anesthesiaAllergy: normalizeString(merged.allergyProfile?.anesthesiaAllergy),
      materialAllergy: normalizeString(merged.allergyProfile?.materialAllergy),
    },
    riskLevel,
    insuranceProvider: normalizeString(merged.insuranceProvider),
    policyNumber: normalizeString(merged.policyNumber),
    coverageLimit: normalizeNumber(merged.coverageLimit, null),
    insuranceExpiry: normalizeString(merged.insuranceExpiry),
    billingPreference:
      merged.billingPreference === "insurance" || merged.billingPreference === "mixed"
        ? merged.billingPreference
        : "cash",
    creditBalance: normalizeNumber(merged.creditBalance, 0) ?? 0,
    documents: Array.isArray(merged.documents)
      ? merged.documents.map((file) => createUploadedFile(file, "document"))
      : [],
    xrays: Array.isArray(merged.xrays)
      ? merged.xrays.map((file) => createUploadedFile(file, "xray"))
      : [],
    insuranceCards: Array.isArray(merged.insuranceCards)
      ? merged.insuranceCards.map((file) => createUploadedFile(file, "insurance-card"))
      : [],
    consentForms: Array.isArray(merged.consentForms)
      ? merged.consentForms.map((file) => createUploadedFile(file, "consent-form"))
      : [],
    communicationPreferences: {
      preferredContactMethod:
        merged.communicationPreferences?.preferredContactMethod === "sms" ||
        merged.communicationPreferences?.preferredContactMethod === "email"
          ? merged.communicationPreferences.preferredContactMethod
          : "phone",
      appointmentReminders: normalizeBoolean(
        merged.communicationPreferences?.appointmentReminders,
        true,
      ),
      followUpReminders: normalizeBoolean(
        merged.communicationPreferences?.followUpReminders,
        true,
      ),
    },
    settings: {
      allowNotifications: normalizeBoolean(merged.settings?.allowNotifications, true),
      privacyLevel:
        merged.settings?.privacyLevel === "restricted" ||
        merged.settings?.privacyLevel === "strict"
          ? merged.settings.privacyLevel
          : "standard",
      marketingConsent: normalizeBoolean(merged.settings?.marketingConsent, false),
    },
    alertFlags: {
      unpaidBills: normalizeBoolean(merged.alertFlags?.unpaidBills),
      highRiskMedical: normalizeBoolean(merged.alertFlags?.highRiskMedical),
      frequentNoShow: normalizeBoolean(merged.alertFlags?.frequentNoShow),
      vip:
        normalizeBoolean(merged.alertFlags?.vip) ||
        merged.patientType === "VIP",
    },
  };
}

export function serializePatient(
  patient: Partial<PatientStorageRecord> & { _id?: unknown },
  extras?: {
    analytics?: PatientAnalytics;
    notesTimeline?: PatientTimelineNote[];
    duplicateCandidates?: PatientDuplicateCandidate[];
    familyMembers?: PatientFamilyMember[];
    appointments?: Appointment[];
    invoices?: Invoice[];
  },
): PatientProfile {
  const normalized = normalizePatientForStorage(patient);
  const noShowCount =
    extras?.appointments?.filter((appointment) => appointment.status === "no-show").length ?? 0;
  const unpaidBills =
    extras?.invoices?.some((invoice) => invoiceOutstanding(invoice) > 0) ?? false;
  const highRiskMedical =
    normalized.riskLevel === "high" ||
    normalized.medicalConditions.heartDisease ||
    normalized.medicalConditions.bleedingDisorders;

  return {
    id: String(patient._id ?? ""),
    ...normalized,
    alertFlags: {
      unpaidBills: unpaidBills || normalized.alertFlags.unpaidBills,
      highRiskMedical: highRiskMedical || normalized.alertFlags.highRiskMedical,
      frequentNoShow: noShowCount >= 2 || normalized.alertFlags.frequentNoShow,
      vip: normalized.patientType === "VIP" || normalized.alertFlags.vip,
    },
    notesTimeline: extras?.notesTimeline ?? [],
    analytics: extras?.analytics,
    duplicateCandidates: extras?.duplicateCandidates ?? [],
    familyMembers: extras?.familyMembers ?? [],
  };
}

export function createPatientNote(
  patientId: string,
  staffUser: string,
  noteType: PatientTimelineNote["noteType"],
  content: string,
): PatientTimelineNote {
  return {
    id: new ObjectId().toString(),
    patientId,
    createdAt: new Date().toISOString(),
    staffUser: normalizeString(staffUser) || "Clinic staff",
    noteType,
    content: normalizeString(content),
  };
}

export async function generatePatientId(db: Db) {
  const prefix = `PT-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`;
  let seed = (await db.collection("patients").countDocuments({})) + 1;

  while (true) {
    const candidate = `${prefix}-${String(seed).padStart(4, "0")}`;
    const existing = await db.collection("patients").findOne({ patientId: candidate });

    if (!existing) {
      return candidate;
    }

    seed += 1;
  }
}

export async function mergePatientRecords(
  db: Db,
  sourcePatientId: string,
  targetPatientId: string,
) {
  const patients = db.collection<PatientDocument>("patients");
  const notes = db.collection<PatientNoteDocument>("patientNotes");
  const [source, target] = await Promise.all([
    patients.findOne({ _id: new ObjectId(sourcePatientId) }),
    patients.findOne({ _id: new ObjectId(targetPatientId) }),
  ]);

  if (!source || !target) {
    throw new Error("Source or target patient was not found.");
  }

  const normalizedSource = normalizePatientForStorage(source);
  const normalizedTarget = normalizePatientForStorage(target);
  const mergedTarget = normalizePatientForStorage({
    ...normalizedTarget,
    phoneNumbers: [...normalizedTarget.phoneNumbers, ...normalizedSource.phoneNumbers],
    familyMemberIds: [
      ...normalizedTarget.familyMemberIds,
      ...normalizedSource.familyMemberIds,
    ].filter((id) => id !== sourcePatientId && id !== targetPatientId),
    documents: [...normalizedTarget.documents, ...normalizedSource.documents],
    xrays: [...normalizedTarget.xrays, ...normalizedSource.xrays],
    insuranceCards: [...normalizedTarget.insuranceCards, ...normalizedSource.insuranceCards],
    consentForms: [...normalizedTarget.consentForms, ...normalizedSource.consentForms],
    alertFlags: {
      unpaidBills:
        normalizedTarget.alertFlags.unpaidBills || normalizedSource.alertFlags.unpaidBills,
      highRiskMedical:
        normalizedTarget.alertFlags.highRiskMedical ||
        normalizedSource.alertFlags.highRiskMedical,
      frequentNoShow:
        normalizedTarget.alertFlags.frequentNoShow ||
        normalizedSource.alertFlags.frequentNoShow,
      vip: normalizedTarget.alertFlags.vip || normalizedSource.alertFlags.vip,
    },
  });

  await patients.updateOne({ _id: new ObjectId(targetPatientId) }, { $set: mergedTarget });

  const collectionsToUpdate = [
    "appointments",
    "emr_records",
    "billing_invoices",
    "prescriptions",
    "notifications",
    "supportTickets",
  ];

  await Promise.all(
    collectionsToUpdate.map((name) =>
      db.collection(name).updateMany(
        { patientId: sourcePatientId },
        {
          $set: {
            patientId: targetPatientId,
            patientName: mergedTarget.fullName,
          },
        },
      ),
    ),
  );

  await notes.updateMany({ patientId: sourcePatientId }, { $set: { patientId: targetPatientId } });
  await patients.deleteOne({ _id: new ObjectId(sourcePatientId) });
}
