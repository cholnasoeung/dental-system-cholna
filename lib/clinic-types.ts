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
