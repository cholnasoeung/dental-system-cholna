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
  procedureHistory: string;
  clinicalAttachments: ClinicalAttachment[];
  odontogram: OdontogramTooth[];
};

export type DentalRecordFormState = Omit<
  DentalRecord,
  "id" | "patientName" | "clinicalAttachments" | "odontogram"
>;

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
  procedureHistory: "",
};
