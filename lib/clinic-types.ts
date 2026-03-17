export type UploadedFile = {
  name: string;
  size: number;
};

export type PatientProfile = {
  id: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  occupation: string;
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
  medicalHistory: string;
  allergies: string;
  insuranceProvider: string;
  policyNumber: string;
  insuranceExpiry: string;
  documents: UploadedFile[];
  xrays: UploadedFile[];
};

export type PatientFormState = Omit<PatientProfile, "id" | "documents" | "xrays">;

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
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

export type OdontogramTooth = {
  toothNumber: string;
  condition: ToothCondition;
  notes: string;
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
  treatment: string;
  quantity: number;
  unitPrice: number;
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
  lineItems: InvoiceLine[];
  payments: PaymentRecord[];
  notes: string;
};

export type InvoiceFormState = {
  patientId: string;
  invoiceNumber: string;
  issueDate: string;
  notes: string;
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
  | "follow-up-reminder";

export type NotificationChannel = "sms" | "email";

export type NotificationStatus = "queued" | "sent";

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

export type StaffRole = "dentist" | "receptionist" | "nurse" | "admin" | "manager";

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

export const dentists = ["Dr. Lina", "Dr. Sreypov", "Dr. Dara", "Dr. Michael"];

export const statusOptions: AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "completed",
  "canceled",
  "no-show",
];

export const statusStyles: Record<AppointmentStatus, string> = {
  scheduled: "bg-amber-100 text-amber-800",
  confirmed: "bg-sky-100 text-sky-800",
  completed: "bg-emerald-100 text-emerald-800",
  canceled: "bg-rose-100 text-rose-800",
  "no-show": "bg-slate-200 text-slate-700",
};

export const initialPatientForm: PatientFormState = {
  fullName: "",
  dateOfBirth: "",
  gender: "",
  phone: "",
  email: "",
  address: "",
  occupation: "",
  emergencyContactName: "",
  emergencyContactRelation: "",
  emergencyContactPhone: "",
  medicalHistory: "",
  allergies: "",
  insuranceProvider: "",
  policyNumber: "",
  insuranceExpiry: "",
};

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
};

export const initialInvoiceLineForm: InvoiceLineFormState = {
  treatment: "",
  quantity: 1,
  unitPrice: 0,
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
];

export const staffPermissionOptions = [
  "patient-read",
  "patient-write",
  "appointment-manage",
  "billing-manage",
  "emr-manage",
  "report-view",
];

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
