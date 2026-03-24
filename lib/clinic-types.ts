export type UploadedFile = {
  id?: string;
  name: string;
  size: number;
  type?: string;
  category?:
    | "document"
    | "insurance-card"
    | "consent-form"
    | "xray"
    | "image"
    | "profile-photo";
  url?: string;
  uploadedAt?: string;
};

export type PatientStatus = "active" | "inactive" | "blocked" | "deceased";

export type PatientType = "new" | "returning" | "VIP";

export type RiskLevel = "low" | "medium" | "high";

export type PreferredContactMethod = "phone" | "sms" | "email";

export type BillingPreference = "cash" | "insurance" | "mixed";

export type PrivacyLevel = "standard" | "restricted" | "strict";

export type PregnancyStatus = "not-applicable" | "pregnant" | "not-pregnant" | "unknown";

export type PatientNoteType = "clinical" | "admin" | "warning";

export type PatientTimelineNote = {
  id: string;
  patientId: string;
  createdAt: string;
  staffUser: string;
  noteType: PatientNoteType;
  content: string;
};

export type PatientAnalytics = {
  totalVisits: number;
  totalRevenue: number;
  lastVisit: string;
  mostCommonTreatment: string;
  doctorsVisited: string[];
  treatmentsDone: string[];
  totalAppointments: number;
  completedAppointments: number;
};

export type PatientDuplicateCandidate = {
  patientId: string;
  fullName: string;
  reason: string;
  score: number;
};

export type PatientFamilyMember = {
  id: string;
  patientId: string;
  fullName: string;
  relationshipHint: string;
};

export type PatientProfile = {
  id: string;
  patientId: string;
  nationalId: string;
  passportNumber: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  phoneNumbers: string[];
  email: string;
  province: string;
  city: string;
  address: string;
  fullAddress: string;
  profilePhoto: string;
  status: PatientStatus;
  registrationDate: string;
  lastVisitDate: string;
  patientType: PatientType;
  occupation: string;
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
  secondaryContactName: string;
  secondaryContactRelation: string;
  secondaryContactPhone: string;
  familyMemberIds: string[];
  medicalHistory: string;
  oralHealthHistory: {
    gumDiseaseHistory: string;
    cavitiesHistory: string;
    orthodonticHistory: string;
    implantsCrownsBridges: string;
    missingTeethRecord: string;
  };
  medicalConditions: {
    diabetes: boolean;
    heartDisease: boolean;
    highBloodPressure: boolean;
    pregnancyStatus: PregnancyStatus;
    bleedingDisorders: boolean;
    notes: string;
  };
  allergies: string;
  allergyProfile: {
    drugAllergies: string;
    anesthesiaAllergy: string;
    materialAllergy: string;
  };
  riskLevel: RiskLevel;
  insuranceProvider: string;
  policyNumber: string;
  coverageLimit: number | null;
  insuranceExpiry: string;
  billingPreference: BillingPreference;
  creditBalance: number;
  documents: UploadedFile[];
  xrays: UploadedFile[];
  insuranceCards: UploadedFile[];
  consentForms: UploadedFile[];
  communicationPreferences: {
    preferredContactMethod: PreferredContactMethod;
    appointmentReminders: boolean;
    followUpReminders: boolean;
  };
  settings: {
    allowNotifications: boolean;
    privacyLevel: PrivacyLevel;
    marketingConsent: boolean;
  };
  alertFlags: {
    unpaidBills: boolean;
    highRiskMedical: boolean;
    frequentNoShow: boolean;
    vip: boolean;
  };
  notesTimeline?: PatientTimelineNote[];
  analytics?: PatientAnalytics;
  duplicateCandidates?: PatientDuplicateCandidate[];
  familyMembers?: PatientFamilyMember[];
};

export type PatientFormState = Omit<
  PatientProfile,
  | "id"
  | "patientId"
  | "lastVisitDate"
  | "documents"
  | "xrays"
  | "insuranceCards"
  | "consentForms"
  | "notesTimeline"
  | "analytics"
  | "duplicateCandidates"
  | "familyMembers"
> & {
  phoneNumbersText: string;
  familyMemberIdsText: string;
};

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "checked-in"
  | "completed"
  | "canceled"
  | "no-show";

export type ReminderChannel = "sms" | "email" | "both";

export type Appointment = {
  id: string;
  patientId: string;
  patientName: string;
  dentist: string;
  date: string;
  time: string;
  reason: string;
  status: AppointmentStatus;
  reminderDate: string;
  reminderChannel: ReminderChannel;
  followUpDate: string;
  notes: string;
};

export type AppointmentFormState = {
  patientId: string;
  dentist: string;
  date: string;
  time: string;
  reason: string;
  status: AppointmentStatus;
  reminderDate: string;
  reminderChannel: ReminderChannel;
  followUpDate: string;
  notes: string;
};

export type ToothCondition =
  | "healthy"
  | "caries"
  | "filling"
  | "crown"
  | "missing"
  | "implant"
  | "root-canal";

export type TreatmentStatus = "planned" | "in-progress" | "completed";

export type TreatmentPricingModel = "per-tooth" | "per-case";

export type TreatmentCatalogItem = {
  id: string;
  name: string;
  defaultPrice: number;
  pricingModel: TreatmentPricingModel;
};

export type OdontogramTooth = {
  toothNumber: string;
  condition: ToothCondition;
  notes: string;
  treatmentProcess: string;
  treatmentStatus: TreatmentStatus;
  conditionPrice: number | null;
};

export type ToothConditionPricingItem = {
  condition: ToothCondition;
  label: string;
  treatmentId: string;
  treatment: string;
  defaultPrice: number | null;
  pricingModel: TreatmentPricingModel;
};

export type ClinicalAttachment = {
  name: string;
  size: number;
  category: "xray" | "scan" | "report";
};

export type DentalRecord = {
  id: string;
  patientId: string;
  patientName: string;
  visitDate: string;
  chiefComplaint: string;
  consultationNotes: string;
  diagnoses: string;
  treatmentPlan: string;
  treatmentStep: string;
  treatmentStatus: TreatmentStatus;
  procedureHistory: string;
  clinicalAttachments: ClinicalAttachment[];
  odontogram: OdontogramTooth[];
};

export type DentalRecordFormState = Omit<
  DentalRecord,
  "id" | "patientName" | "clinicalAttachments" | "odontogram"
>;

export type PaymentMethod = "cash" | "card" | "insurance" | "transfer";

export type InvoiceLine = {
  treatmentId: string;
  treatment: string;
  quantity: number;
  unitPrice: number;
  pricingModel: TreatmentPricingModel;
  linkedRecordId: string;
  toothNumbers: string[];
  autoGenerated: boolean;
};

export type PaymentRecord = {
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  reference: string;
};

export type Invoice = {
  id: string;
  patientId: string;
  patientName: string;
  invoiceNumber: string;
  issueDate: string;
  linkedRecordId: string;
  autoGenerated: boolean;
  lineItems: InvoiceLine[];
  payments: PaymentRecord[];
  notes: string;
};

export type InvoiceFormState = {
  patientId: string;
  invoiceNumber: string;
  issueDate: string;
  notes: string;
  linkedRecordId: string;
};

export type InvoiceLineFormState = InvoiceLine;

export type PaymentFormState = PaymentRecord;

export type MedicationItem = {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
};

export type Prescription = {
  id: string;
  patientId: string;
  patientName: string;
  linkedRecordId: string;
  linkedVisitDate: string;
  linkedTreatment: string;
  prescribedDate: string;
  medications: MedicationItem[];
  notes: string;
};

export type PrescriptionFormState = {
  patientId: string;
  linkedRecordId: string;
  linkedVisitDate: string;
  linkedTreatment: string;
  prescribedDate: string;
  notes: string;
};

export type MedicationItemFormState = MedicationItem;

export type NotificationCategory =
  | "appointment-reminder"
  | "appointment-confirmation"
  | "payment-reminder"
  | "follow-up-reminder"
  | "support-new-ticket"
  | "support-new-message"
  | "support-assignment"
  | "support-status"
  | "support-sla-warning"
  | "support-sla-breach";

export type NotificationChannel = "sms" | "email" | "in-app";

export type NotificationStatus = "queued" | "sent" | "read";

export type NotificationRecord = {
  id: string;
  patientId: string;
  patientName: string;
  category: NotificationCategory;
  channel: NotificationChannel;
  recipient: string;
  subject: string;
  message: string;
  scheduledFor: string;
  status: NotificationStatus;
  relatedAppointmentId: string;
  relatedInvoiceId: string;
};

export type NotificationFormState = Omit<NotificationRecord, "id" | "status">;

export type StaffRole =
  | "dentist"
  | "receptionist"
  | "nurse"
  | "admin"
  | "manager"
  | "support-agent";

export type StaffScheduleDay = {
  day: string;
  start: string;
  end: string;
  available: boolean;
};

export type StaffMember = {
  id: string;
  fullName: string;
  role: StaffRole;
  email: string;
  phone: string;
  permissions: string[];
  schedule: StaffScheduleDay[];
  availabilityStatus: "available" | "busy" | "off";
};

export type StaffFormState = Omit<StaffMember, "id" | "schedule" | "permissions"> & {
  permissionsText: string;
};

export type SupportCategory = string;

export type SupportPriority = "low" | "medium" | "high" | "urgent";

export type SupportStatus = "open" | "pending" | "in-progress" | "resolved" | "closed";

export type SupportSourceChannel =
  | "portal"
  | "support-center"
  | "future-email"
  | "future-chat";

export type SupportSlaState = "on-track" | "warning" | "breached" | "met";

export type SupportAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
 };

export type SupportMessage = {
  id: string;
  ticketId: string;
  senderType: "patient" | "staff" | "system";
  senderName: string;
  message: string;
  createdAt: string;
  attachments: SupportAttachment[];
  isInternal: boolean;
};

export type SupportTicket = {
  id: string;
  ticketNumber: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  subject: string;
  category: SupportCategory;
  priority: SupportPriority;
  status: SupportStatus;
  tags: string[];
  assignedAgentId: string;
  assignedAgentName: string;
  assignedTeam: string;
  sourceChannel: SupportSourceChannel;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  firstResponseAt: string;
  resolvedAt: string;
  closedAt: string;
  lastCustomerReplyAt: string;
  lastAgentReplyAt: string;
  unreadForCustomer: number;
  unreadForStaff: number;
  feedbackRating: number | null;
  feedbackComment: string;
  latestMessagePreview: string;
  messageCount: number;
  notesCount: number;
  sla: {
    firstResponseDueAt: string;
    resolutionDueAt: string;
    firstResponseState: SupportSlaState;
    resolutionState: SupportSlaState;
  };
  messages: SupportMessage[];
  internalNotes?: SupportNote[];
  auditTrail?: SupportAuditLog[];
};

export type SupportNote = {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  message: string;
  createdAt: string;
  attachments: SupportAttachment[];
};

export type SupportAuditLog = {
  id: string;
  ticketId: string;
  action:
    | "ticket-created"
    | "message-sent"
    | "note-added"
    | "assignment-changed"
    | "status-changed"
    | "priority-changed"
    | "tags-changed"
    | "feedback-submitted"
    | "ticket-deleted";
  actorId: string;
  actorName: string;
  actorType: "patient" | "staff" | "system";
  createdAt: string;
  details: string;
};

export type SupportTag = {
  id: string;
  name: string;
  color: string;
  createdAt: string;
};

export type SupportFaqArticle = {
  id: string;
  title: string;
  body: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type SupportSavedReply = {
  id: string;
  title: string;
  body: string;
  category: string;
  createdAt: string;
};

export type SupportSlaSettings = {
  firstResponseMinutesByPriority: Record<SupportPriority, number>;
  resolutionHoursByPriority: Record<SupportPriority, number>;
  warningMinutesBeforeBreach: number;
};

export type SupportTicketListResponse = {
  tickets: SupportTicket[];
  total: number;
  page: number;
  pageSize: number;
};

export type SupportMessageListResponse = {
  messages: SupportMessage[];
  total: number;
  page: number;
  pageSize: number;
};

export type SupportDashboardData = {
  totalTickets: number;
  openTickets: number;
  pendingTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  activeAgents: number;
  firstResponseAverageMinutes: number;
  resolutionAverageHours: number;
  slaWarningCount: number;
  slaBreachedCount: number;
  csatAverage: number;
  ticketsPerDay: Array<{ date: string; count: number }>;
  ticketsByCategory: Array<{ category: string; count: number }>;
  ticketsByTag: Array<{ tag: string; count: number }>;
  workloadByAgent: Array<{ agentId: string; agentName: string; count: number }>;
};

export type SupportTicketFormState = {
  subject: string;
  category: SupportCategory;
  message: string;
  attachments: SupportAttachment[];
};

export const dentists = ["Dr. Lina", "Dr. Sreypov", "Dr. Dara", "Dr. Michael"];

export const statusOptions: AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "checked-in",
  "completed",
  "canceled",
  "no-show",
];

export const statusStyles: Record<AppointmentStatus, string> = {
  scheduled: "bg-amber-100 text-amber-800",
  confirmed: "bg-sky-100 text-sky-800",
  "checked-in": "bg-violet-100 text-violet-800",
  completed: "bg-emerald-100 text-emerald-800",
  canceled: "bg-rose-100 text-rose-800",
  "no-show": "bg-slate-200 text-slate-700",
};

export const initialPatientForm: PatientFormState = {
  nationalId: "",
  passportNumber: "",
  fullName: "",
  dateOfBirth: "",
  gender: "",
  phone: "",
  phoneNumbers: [],
  phoneNumbersText: "",
  email: "",
  province: "",
  city: "",
  address: "",
  fullAddress: "",
  profilePhoto: "",
  status: "active",
  registrationDate: "",
  patientType: "new",
  occupation: "",
  emergencyContactName: "",
  emergencyContactRelation: "",
  emergencyContactPhone: "",
  secondaryContactName: "",
  secondaryContactRelation: "",
  secondaryContactPhone: "",
  familyMemberIds: [],
  familyMemberIdsText: "",
  medicalHistory: "",
  oralHealthHistory: {
    gumDiseaseHistory: "",
    cavitiesHistory: "",
    orthodonticHistory: "",
    implantsCrownsBridges: "",
    missingTeethRecord: "",
  },
  medicalConditions: {
    diabetes: false,
    heartDisease: false,
    highBloodPressure: false,
    pregnancyStatus: "unknown",
    bleedingDisorders: false,
    notes: "",
  },
  allergies: "",
  allergyProfile: {
    drugAllergies: "",
    anesthesiaAllergy: "",
    materialAllergy: "",
  },
  riskLevel: "low",
  insuranceProvider: "",
  policyNumber: "",
  coverageLimit: null,
  insuranceExpiry: "",
  billingPreference: "cash",
  creditBalance: 0,
  communicationPreferences: {
    preferredContactMethod: "phone",
    appointmentReminders: true,
    followUpReminders: true,
  },
  settings: {
    allowNotifications: true,
    privacyLevel: "standard",
    marketingConsent: false,
  },
  alertFlags: {
    unpaidBills: false,
    highRiskMedical: false,
    frequentNoShow: false,
    vip: false,
  },
};

export const patientStatusOptions: PatientStatus[] = [
  "active",
  "inactive",
  "blocked",
  "deceased",
];

export const patientTypeOptions: PatientType[] = ["new", "returning", "VIP"];

export const riskLevelOptions: RiskLevel[] = ["low", "medium", "high"];

export const pregnancyStatusOptions: PregnancyStatus[] = [
  "not-applicable",
  "pregnant",
  "not-pregnant",
  "unknown",
];

export const preferredContactMethodOptions: PreferredContactMethod[] = [
  "phone",
  "sms",
  "email",
];

export const billingPreferenceOptions: BillingPreference[] = [
  "cash",
  "insurance",
  "mixed",
];

export const privacyLevelOptions: PrivacyLevel[] = [
  "standard",
  "restricted",
  "strict",
];

export const patientNoteTypeOptions: PatientNoteType[] = [
  "clinical",
  "admin",
  "warning",
];

export const initialAppointmentForm: AppointmentFormState = {
  patientId: "",
  dentist: dentists[0],
  date: "",
  time: "",
  reason: "",
  status: "scheduled",
  reminderDate: "",
  reminderChannel: "sms",
  followUpDate: "",
  notes: "",
};

export const odontogramToothNumbers = [
  "18",
  "17",
  "16",
  "15",
  "14",
  "13",
  "12",
  "11",
  "21",
  "22",
  "23",
  "24",
  "25",
  "26",
  "27",
  "28",
  "48",
  "47",
  "46",
  "45",
  "44",
  "43",
  "42",
  "41",
  "31",
  "32",
  "33",
  "34",
  "35",
  "36",
  "37",
  "38",
];

export const toothConditionOptions: ToothCondition[] = [
  "healthy",
  "caries",
  "filling",
  "crown",
  "missing",
  "implant",
  "root-canal",
];

export const toothConditionPricing: Record<ToothCondition, ToothConditionPricingItem> = {
  healthy: {
    condition: "healthy",
    label: "Healthy",
    treatmentId: "healthy",
    treatment: "Healthy / Observation",
    defaultPrice: null,
    pricingModel: "per-tooth",
  },
  caries: {
    condition: "caries",
    label: "Caries",
    treatmentId: "caries",
    treatment: "Caries Treatment",
    defaultPrice: 45,
    pricingModel: "per-tooth",
  },
  filling: {
    condition: "filling",
    label: "Filling",
    treatmentId: "filling",
    treatment: "Composite Filling",
    defaultPrice: 45,
    pricingModel: "per-tooth",
  },
  crown: {
    condition: "crown",
    label: "Crown",
    treatmentId: "crown",
    treatment: "Dental Crown",
    defaultPrice: 250,
    pricingModel: "per-tooth",
  },
  missing: {
    condition: "missing",
    label: "Missing",
    treatmentId: "missing",
    treatment: "Missing Tooth Management",
    defaultPrice: 60,
    pricingModel: "per-tooth",
  },
  implant: {
    condition: "implant",
    label: "Implant",
    treatmentId: "implant",
    treatment: "Dental Implant",
    defaultPrice: 900,
    pricingModel: "per-tooth",
  },
  "root-canal": {
    condition: "root-canal",
    label: "Root Canal",
    treatmentId: "root-canal",
    treatment: "Root Canal Treatment",
    defaultPrice: 180,
    pricingModel: "per-tooth",
  },
};

export const treatmentCatalog: TreatmentCatalogItem[] = [
  {
    id: "exam-consultation",
    name: "Consultation / Examination",
    defaultPrice: 15,
    pricingModel: "per-case",
  },
  {
    id: "scaling",
    name: "Scaling",
    defaultPrice: 35,
    pricingModel: "per-case",
  },
  {
    id: "filling",
    name: "Composite Filling",
    defaultPrice: 45,
    pricingModel: "per-tooth",
  },
  {
    id: "root-canal",
    name: "Root Canal Treatment",
    defaultPrice: 180,
    pricingModel: "per-tooth",
  },
  {
    id: "crown",
    name: "Dental Crown",
    defaultPrice: 250,
    pricingModel: "per-tooth",
  },
  {
    id: "extraction",
    name: "Extraction",
    defaultPrice: 60,
    pricingModel: "per-tooth",
  },
  {
    id: "implant",
    name: "Implant",
    defaultPrice: 900,
    pricingModel: "per-tooth",
  },
  {
    id: "xray",
    name: "Dental X-Ray",
    defaultPrice: 20,
    pricingModel: "per-case",
  },
];

export const billableTreatmentIdsByCondition: Record<ToothCondition, string[]> = {
  healthy: ["exam-consultation", "scaling", "xray"],
  caries: ["exam-consultation", "xray", "filling", "root-canal", "extraction"],
  filling: ["exam-consultation", "xray", "crown"],
  crown: ["exam-consultation", "xray", "crown"],
  missing: ["exam-consultation", "xray", "implant"],
  implant: ["exam-consultation", "xray", "implant"],
  "root-canal": ["exam-consultation", "xray", "root-canal", "crown"],
};

export const initialDentalRecordForm: DentalRecordFormState = {
  patientId: "",
  visitDate: "",
  chiefComplaint: "",
  consultationNotes: "",
  diagnoses: "",
  treatmentPlan: "",
  treatmentStep: "",
  treatmentStatus: "planned",
  procedureHistory: "",
};

export const treatmentStatusOptions: TreatmentStatus[] = [
  "planned",
  "in-progress",
  "completed",
];

export const paymentMethodOptions: PaymentMethod[] = [
  "cash",
  "card",
  "insurance",
  "transfer",
];

export const initialInvoiceForm: InvoiceFormState = {
  patientId: "",
  invoiceNumber: "",
  issueDate: "",
  notes: "",
  linkedRecordId: "",
};

export const initialInvoiceLineForm: InvoiceLineFormState = {
  treatmentId: "",
  treatment: "",
  quantity: 1,
  unitPrice: 0,
  pricingModel: "per-tooth",
  linkedRecordId: "",
  toothNumbers: [],
  autoGenerated: false,
};

export const initialPaymentForm: PaymentFormState = {
  amount: 0,
  method: "cash",
  paidAt: "",
  reference: "",
};

export const initialPrescriptionForm: PrescriptionFormState = {
  patientId: "",
  linkedRecordId: "",
  linkedVisitDate: "",
  linkedTreatment: "",
  prescribedDate: "",
  notes: "",
};

export const initialMedicationItemForm: MedicationItemFormState = {
  name: "",
  dosage: "",
  frequency: "",
  duration: "",
  instructions: "",
};

export const notificationCategoryOptions: NotificationCategory[] = [
  "appointment-reminder",
  "appointment-confirmation",
  "payment-reminder",
  "follow-up-reminder",
];

export const notificationChannelOptions: NotificationChannel[] = ["sms", "email"];

export const initialNotificationForm: NotificationFormState = {
  patientId: "",
  patientName: "",
  category: "appointment-reminder",
  channel: "sms",
  recipient: "",
  subject: "",
  message: "",
  scheduledFor: "",
  relatedAppointmentId: "",
  relatedInvoiceId: "",
};

export const staffRoleOptions: StaffRole[] = [
  "dentist",
  "receptionist",
  "nurse",
  "admin",
  "manager",
  "support-agent",
];

export const staffPermissionOptions = [
  "patient-read",
  "patient-write",
  "appointment-manage",
  "billing-manage",
  "emr-manage",
  "report-view",
  "support-manage",
  "support-settings",
  "support-delete",
];

export const supportCategoryOptions: SupportCategory[] = [
  "general",
  "billing",
  "appointment",
  "payment",
  "bug",
  "login",
  "feature-request",
];

export const supportPriorityOptions: SupportPriority[] = ["low", "medium", "high", "urgent"];

export const supportStatusOptions: SupportStatus[] = [
  "open",
  "pending",
  "in-progress",
  "resolved",
  "closed",
];

export const initialSupportTicketForm: SupportTicketFormState = {
  subject: "",
  category: "general",
  message: "",
  attachments: [],
};

export const defaultWeeklySchedule: StaffScheduleDay[] = [
  { day: "Monday", start: "08:00", end: "17:00", available: true },
  { day: "Tuesday", start: "08:00", end: "17:00", available: true },
  { day: "Wednesday", start: "08:00", end: "17:00", available: true },
  { day: "Thursday", start: "08:00", end: "17:00", available: true },
  { day: "Friday", start: "08:00", end: "17:00", available: true },
  { day: "Saturday", start: "08:00", end: "12:00", available: false },
  { day: "Sunday", start: "08:00", end: "12:00", available: false },
];

export const initialStaffForm: StaffFormState = {
  fullName: "",
  role: "dentist",
  email: "",
  phone: "",
  permissionsText: "patient-read, appointment-manage",
  availabilityStatus: "available",
};
