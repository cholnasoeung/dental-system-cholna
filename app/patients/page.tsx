"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import { AdminShell } from "@/components/admin-shell";
import {
  initialPatientForm,
  type PatientFormState,
  type PatientProfile,
  type UploadedFile,
} from "@/lib/clinic-types";

function mapFiles(files: FileList | null) {
  if (!files) {
    return [];
  }

  return Array.from(files).map((file) => ({
    name: file.name,
    size: file.size,
  }));
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PatientsPage() {
  const [patientForm, setPatientForm] =
    useState<PatientFormState>(initialPatientForm);
  const [patientDocuments, setPatientDocuments] = useState<UploadedFile[]>([]);
  const [patientXrays, setPatientXrays] = useState<UploadedFile[]>([]);
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPatient, setIsSavingPatient] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState("");
  const [deletingPatientId, setDeletingPatientId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadPatients() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const response = await fetch("/api/patients", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data = (await response.json()) as PatientProfile[];
        setPatients(data);
      } catch (error) {
        console.error(error);
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load patients.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadPatients();
  }, []);

  function handlePatientFieldChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target;
    setPatientForm((current) => ({ ...current, [name]: value }));
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
    type: "documents" | "xrays",
  ) {
    const files = mapFiles(event.target.files);

    if (type === "documents") {
      setPatientDocuments(files);
      return;
    }

    setPatientXrays(files);
  }

  function resetPatientForm() {
    setPatientForm(initialPatientForm);
    setPatientDocuments([]);
    setPatientXrays([]);
    setEditingPatientId("");
  }

  function handleEditPatient(patient: PatientProfile) {
    setPatientForm({
      fullName: patient.fullName,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      phone: patient.phone,
      email: patient.email,
      address: patient.address,
      occupation: patient.occupation,
      emergencyContactName: patient.emergencyContactName,
      emergencyContactRelation: patient.emergencyContactRelation,
      emergencyContactPhone: patient.emergencyContactPhone,
      medicalHistory: patient.medicalHistory,
      allergies: patient.allergies,
      insuranceProvider: patient.insuranceProvider,
      policyNumber: patient.policyNumber,
      insuranceExpiry: patient.insuranceExpiry,
    });
    setPatientDocuments(patient.documents);
    setPatientXrays(patient.xrays);
    setEditingPatientId(patient.id);
    setErrorMessage("");
  }

  async function handleDeletePatient(patientId: string) {
    const patient = patients.find((item) => item.id === patientId);

    if (
      !window.confirm(
        `Delete patient${patient?.fullName ? ` ${patient.fullName}` : ""}?`,
      )
    ) {
      return;
    }

    try {
      setDeletingPatientId(patientId);
      setErrorMessage("");

      const response = await fetch(`/api/patients/${patientId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setPatients((current) => current.filter((patient) => patient.id !== patientId));

      if (editingPatientId === patientId) {
        resetPatientForm();
      }
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to delete patient.",
      );
    } finally {
      setDeletingPatientId("");
    }
  }

  async function handlePatientSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!patientForm.fullName || !patientForm.phone || !patientForm.dateOfBirth) {
      return;
    }

    try {
      setIsSavingPatient(true);
      setErrorMessage("");

      const response = await fetch(
        editingPatientId ? `/api/patients/${editingPatientId}` : "/api/patients",
        {
          method: editingPatientId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...patientForm,
            documents: patientDocuments,
            xrays: patientXrays,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      if (editingPatientId) {
        setPatients((current) =>
          current.map((patient) =>
            patient.id === editingPatientId
              ? {
                  ...patient,
                  ...patientForm,
                  documents: patientDocuments,
                  xrays: patientXrays,
                }
              : patient,
          ),
        );
      } else {
        const nextPatient = (await response.json()) as PatientProfile;
        setPatients((current) => [nextPatient, ...current]);
      }

      resetPatientForm();
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : editingPatientId
            ? "Patient profile could not be updated."
            : "Patient profile could not be saved to MongoDB.",
      );
    } finally {
      setIsSavingPatient(false);
    }
  }

  const totalDocuments = patients.reduce((sum, patient) => sum + patient.documents.length, 0);
  const totalXrays = patients.reduce((sum, patient) => sum + patient.xrays.length, 0);

  return (
    <AdminShell>
      <div className="w-full space-y-6">
        <header className="rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-700">
            Module A
          </p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                Patient Management
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                This module covers the first flow-chart stage: patient arrives or
                registers, then the team creates or finds the patient record before
                moving on to appointment booking.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">
                  Patients
                </p>
                <p className="mt-2 text-2xl font-semibold">{patients.length}</p>
              </div>
              <div className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  Documents
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {totalDocuments}
                </p>
              </div>
              <div className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  X-Rays
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{totalXrays}</p>
              </div>
            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="rounded-[24px] border border-sky-100 bg-sky-50 px-5 py-4 text-sm text-sky-800">
            Loading patient data from MongoDB...
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-[24px] border border-rose-100 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="space-y-6">
          <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-semibold text-slate-950">
                {editingPatientId ? "Edit Patient Profile" : "Create Patient Profile"}
              </h3>
              {editingPatientId ? (
                <button
                  type="button"
                  onClick={resetPatientForm}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Cancel Edit
                </button>
              ) : null}
            </div>

            <form className="mt-6 space-y-6" onSubmit={handlePatientSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Full Name</span>
                  <input required name="fullName" value={patientForm.fullName} onChange={handlePatientFieldChange} placeholder="John Doe" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Date of Birth</span>
                  <input required type="date" name="dateOfBirth" value={patientForm.dateOfBirth} onChange={handlePatientFieldChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Gender</span>
                  <select name="gender" value={patientForm.gender} onChange={handlePatientFieldChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white">
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Occupation</span>
                  <input name="occupation" value={patientForm.occupation} onChange={handlePatientFieldChange} placeholder="Teacher, student, engineer" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Phone</span>
                  <input required name="phone" value={patientForm.phone} onChange={handlePatientFieldChange} placeholder="+855 12 345 678" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Email</span>
                  <input type="email" name="email" value={patientForm.email} onChange={handlePatientFieldChange} placeholder="patient@email.com" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" />
                </label>
                <label className="space-y-1 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Address</span>
                  <input name="address" value={patientForm.address} onChange={handlePatientFieldChange} placeholder="Street, city, province" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" />
                </label>
              </div>

              <div>
                <h4 className="text-base font-semibold text-slate-950">Emergency Contact</h4>
                <div className="mt-3 grid gap-4 md:grid-cols-3">
                  <input name="emergencyContactName" value={patientForm.emergencyContactName} onChange={handlePatientFieldChange} placeholder="Contact name" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" />
                  <input name="emergencyContactRelation" value={patientForm.emergencyContactRelation} onChange={handlePatientFieldChange} placeholder="Relation" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" />
                  <input name="emergencyContactPhone" value={patientForm.emergencyContactPhone} onChange={handlePatientFieldChange} placeholder="Emergency phone" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Medical History</span>
                  <textarea name="medicalHistory" value={patientForm.medicalHistory} onChange={handlePatientFieldChange} placeholder="Hypertension, diabetes, surgeries" className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Allergies</span>
                  <textarea name="allergies" value={patientForm.allergies} onChange={handlePatientFieldChange} placeholder="Penicillin, latex, anesthesia reactions" className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" />
                </label>
              </div>

              <div>
                <h4 className="text-base font-semibold text-slate-950">Insurance Details</h4>
                <div className="mt-3 grid gap-4 md:grid-cols-3">
                  <input name="insuranceProvider" value={patientForm.insuranceProvider} onChange={handlePatientFieldChange} placeholder="Insurance provider" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" />
                  <input name="policyNumber" value={patientForm.policyNumber} onChange={handlePatientFieldChange} placeholder="Policy number" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" />
                  <input type="date" name="insuranceExpiry" value={patientForm.insuranceExpiry} onChange={handlePatientFieldChange} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" />
                </div>
              </div>

              <div>
                <h4 className="text-base font-semibold text-slate-950">Upload Files</h4>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4">
                    <span className="text-sm font-medium text-slate-700">Patient Documents</span>
                    <input type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(event) => handleFileChange(event, "documents")} className="w-full text-sm text-slate-500" />
                  </label>
                  <label className="space-y-2 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4">
                    <span className="text-sm font-medium text-slate-700">X-Rays</span>
                    <input type="file" multiple accept=".jpg,.jpeg,.png,.dcm" onChange={(event) => handleFileChange(event, "xrays")} className="w-full text-sm text-slate-500" />
                  </label>
                </div>
              </div>

              <button type="submit" disabled={isSavingPatient} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">
                {isSavingPatient
                  ? editingPatientId
                    ? "Updating Patient..."
                    : "Saving Patient..."
                  : editingPatientId
                    ? "Update Patient Profile"
                    : "Save Patient Profile"}
              </button>
            </form>

            <div className="mt-6 rounded-3xl border border-sky-100 bg-sky-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                Next Step
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                After the patient record is ready, continue to appointment booking,
                dentist availability, confirmation, and check-in.
              </p>
              <Link
                href="/appointments"
                className="mt-4 inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Continue To Appointment Flow
              </Link>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <h3 className="text-xl font-semibold text-slate-950">Upload Summary</h3>
              <div className="mt-4 grid gap-4">
                <div className="rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-100">
                  <p className="text-sm font-medium text-slate-700">Documents</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{patientDocuments.length}</p>
                  <div className="mt-3 space-y-2">
                    {patientDocuments.length === 0 ? (
                      <p className="text-xs text-slate-500">No documents selected.</p>
                    ) : (
                      patientDocuments.map((file) => (
                        <div key={`${file.name}-${file.size}`} className="rounded-xl bg-white px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
                          {file.name} - {formatFileSize(file.size)}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-100">
                  <p className="text-sm font-medium text-slate-700">X-Rays</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{patientXrays.length}</p>
                  <div className="mt-3 space-y-2">
                    {patientXrays.length === 0 ? (
                      <p className="text-xs text-slate-500">No X-rays selected.</p>
                    ) : (
                      patientXrays.map((file) => (
                        <div key={`${file.name}-${file.size}`} className="rounded-xl bg-white px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
                          {file.name} - {formatFileSize(file.size)}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-white/80 bg-slate-950 p-6 text-white shadow-[0_20px_50px_rgba(15,23,42,0.16)]">
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/75">
                Patient Profiles
              </p>
              <h3 className="mt-2 text-xl font-semibold">Recent Registrations</h3>
              <div className="mt-4 space-y-3">
                {patients.length === 0 ? (
                  <p className="rounded-2xl bg-white/10 p-4 text-sm text-slate-300">
                    No patient profiles yet.
                  </p>
                ) : (
                  patients.map((patient) => (
                    <article
                      key={patient.id}
                      className="rounded-3xl border border-white/10 bg-white/6 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          href={`/patients/${patient.id}`}
                          className="block min-w-0 flex-1 transition hover:opacity-90"
                        >
                          <p className="font-semibold text-white">{patient.fullName}</p>
                          <p className="mt-1 text-sm text-slate-300">
                            {patient.phone}
                            {patient.email ? ` | ${patient.email}` : ""}
                          </p>
                          <p className="mt-3 text-xs uppercase tracking-[0.24em] text-cyan-200/70">
                            Click to view patient record
                          </p>
                        </Link>
                        <span className="rounded-full bg-cyan-300 px-3 py-1 text-xs font-semibold text-slate-950">
                          {patient.id}
                        </span>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditPatient(patient)}
                          className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePatient(patient.id)}
                          disabled={deletingPatientId === patient.id}
                          className="rounded-2xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:bg-rose-300"
                        >
                          {deletingPatientId === patient.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AdminShell>
  );
}


