"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

import { AdminShell } from "@/components/admin-shell";
import {
  billingPreferenceOptions,
  initialPatientForm,
  patientStatusOptions,
  patientTypeOptions,
  preferredContactMethodOptions,
  pregnancyStatusOptions,
  privacyLevelOptions,
  riskLevelOptions,
  type PatientFormState,
  type PatientProfile,
  type UploadedFile,
} from "@/lib/clinic-types";

function mapFiles(files: FileList | null, category: NonNullable<UploadedFile["category"]>) {
  if (!files) return [];
  return Array.from(files).map((file) => ({
    name: file.name,
    size: file.size,
    type: file.type,
    category,
  }));
}

function parseLines(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index);
}

function formatDateLabel(value: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function currency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function calculatePatientAge(dateOfBirth: string) {
  if (!dateOfBirth) return null;
  const birth = new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDifference = today.getMonth() - birth.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

export default function PatientsPage() {
  const [patientForm, setPatientForm] = useState<PatientFormState>(initialPatientForm);
  const [documents, setDocuments] = useState<UploadedFile[]>([]);
  const [xrays, setXrays] = useState<UploadedFile[]>([]);
  const [insuranceCards, setInsuranceCards] = useState<UploadedFile[]>([]);
  const [consentForms, setConsentForms] = useState<UploadedFile[]>([]);
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingPatientId, setEditingPatientId] = useState("");
  const [deletingPatientId, setDeletingPatientId] = useState("");
  const [mergingPatientId, setMergingPatientId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadPatients() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/patients", { cache: "no-store" });
        if (!response.ok) throw new Error(await response.text());
        setPatients((await response.json()) as PatientProfile[]);
      } catch (error) {
        console.error(error);
        setErrorMessage(error instanceof Error ? error.message : "Unable to load patients.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadPatients();
  }, []);

  function resetForm() {
    setPatientForm(initialPatientForm);
    setDocuments([]);
    setXrays([]);
    setInsuranceCards([]);
    setConsentForms([]);
    setEditingPatientId("");
  }

  function handleFieldChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target;
    setPatientForm((current) => {
      const next = { ...current, [name]: value };
      if (name === "province" || name === "city" || name === "address") {
        next.fullAddress = [next.address, next.city, next.province].filter(Boolean).join(", ");
      }
      return next;
    });
  }

  function updateNested(
    section: "oralHealthHistory" | "medicalConditions" | "allergyProfile" | "communicationPreferences" | "settings" | "alertFlags",
    field: string,
    value: string | boolean,
  ) {
    setPatientForm((current) => ({
      ...current,
      [section]: { ...current[section], [field]: value },
    }));
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>, type: "documents" | "xrays" | "insuranceCards" | "consentForms") {
    const files =
      type === "documents"
        ? mapFiles(event.target.files, "document")
        : type === "xrays"
          ? mapFiles(event.target.files, "xray")
          : type === "insuranceCards"
            ? mapFiles(event.target.files, "insurance-card")
            : mapFiles(event.target.files, "consent-form");
    if (type === "documents") setDocuments(files);
    if (type === "xrays") setXrays(files);
    if (type === "insuranceCards") setInsuranceCards(files);
    if (type === "consentForms") setConsentForms(files);
  }

  function handleEditPatient(patient: PatientProfile) {
    setPatientForm({
      nationalId: patient.nationalId,
      passportNumber: patient.passportNumber,
      fullName: patient.fullName,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      phone: patient.phone,
      phoneNumbers: patient.phoneNumbers,
      phoneNumbersText: patient.phoneNumbers.join("\n"),
      email: patient.email,
      province: patient.province,
      city: patient.city,
      address: patient.address,
      fullAddress: patient.fullAddress,
      profilePhoto: patient.profilePhoto,
      status: patient.status,
      registrationDate: patient.registrationDate,
      patientType: patient.patientType,
      occupation: patient.occupation,
      emergencyContactName: patient.emergencyContactName,
      emergencyContactRelation: patient.emergencyContactRelation,
      emergencyContactPhone: patient.emergencyContactPhone,
      secondaryContactName: patient.secondaryContactName,
      secondaryContactRelation: patient.secondaryContactRelation,
      secondaryContactPhone: patient.secondaryContactPhone,
      familyMemberIds: patient.familyMemberIds,
      familyMemberIdsText: patient.familyMemberIds.join("\n"),
      medicalHistory: patient.medicalHistory,
      oralHealthHistory: patient.oralHealthHistory,
      medicalConditions: patient.medicalConditions,
      allergies: patient.allergies,
      allergyProfile: patient.allergyProfile,
      riskLevel: patient.riskLevel,
      insuranceProvider: patient.insuranceProvider,
      policyNumber: patient.policyNumber,
      coverageLimit: patient.coverageLimit,
      insuranceExpiry: patient.insuranceExpiry,
      billingPreference: patient.billingPreference,
      creditBalance: patient.creditBalance,
      communicationPreferences: patient.communicationPreferences,
      settings: patient.settings,
      alertFlags: patient.alertFlags,
    });
    setDocuments(patient.documents);
    setXrays(patient.xrays);
    setInsuranceCards(patient.insuranceCards);
    setConsentForms(patient.consentForms);
    setEditingPatientId(patient.id);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setIsSaving(true);
      setErrorMessage("");
      const payload = {
        ...patientForm,
        phoneNumbers: patientForm.phoneNumbersText ? parseLines(patientForm.phoneNumbersText) : [patientForm.phone],
        familyMemberIds: parseLines(patientForm.familyMemberIdsText),
        documents,
        xrays,
        insuranceCards,
        consentForms,
      };
      const response = await fetch(editingPatientId ? `/api/patients/${editingPatientId}` : "/api/patients", {
        method: editingPatientId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await response.text());
      const savedPatient = (await response.json()) as PatientProfile;
      setPatients((current) => editingPatientId ? current.map((patient) => patient.id === editingPatientId ? savedPatient : patient) : [savedPatient, ...current]);
      resetForm();
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "Unable to save patient.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeletePatient(patientId: string) {
    if (!window.confirm("Delete this patient record?")) return;
    try {
      setDeletingPatientId(patientId);
      const response = await fetch(`/api/patients/${patientId}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await response.text());
      setPatients((current) => current.filter((patient) => patient.id !== patientId));
      if (editingPatientId === patientId) resetForm();
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "Unable to delete patient.");
    } finally {
      setDeletingPatientId("");
    }
  }

  async function handleMergePatient(sourcePatientId: string, targetPatientId: string) {
    if (!window.confirm("Merge this patient into the selected duplicate candidate?")) return;
    try {
      setMergingPatientId(sourcePatientId);
      const response = await fetch("/api/patients/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourcePatientId, targetPatientId }),
      });
      if (!response.ok) throw new Error(await response.text());
      const refreshed = await fetch("/api/patients", { cache: "no-store" });
      if (!refreshed.ok) throw new Error(await refreshed.text());
      setPatients((await refreshed.json()) as PatientProfile[]);
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "Unable to merge patient.");
    } finally {
      setMergingPatientId("");
    }
  }

  const filteredPatients = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return patients;
    return patients.filter((patient) =>
      [patient.patientId, patient.nationalId, patient.passportNumber, patient.fullName, patient.phone, ...patient.phoneNumbers, patient.email]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [patients, searchTerm]);

  return (
    <AdminShell>
      <div className="w-full space-y-6">
        <header className="rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-700">Module A</p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Patient Management</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Search quickly by patient ID, phone, or identity document, then manage lifecycle, risk, insurance, contacts, communication, files, and duplicates from one intake workspace.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white"><p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Patients</p><p className="mt-2 text-2xl font-semibold">{patients.length}</p></div>
              <div className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100"><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Active</p><p className="mt-2 text-2xl font-semibold text-slate-900">{patients.filter((patient) => patient.status === "active").length}</p></div>
              <div className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100"><p className="text-xs uppercase tracking-[0.22em] text-slate-500">VIP</p><p className="mt-2 text-2xl font-semibold text-slate-900">{patients.filter((patient) => patient.alertFlags.vip).length}</p></div>
              <div className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100"><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Duplicates</p><p className="mt-2 text-2xl font-semibold text-slate-900">{patients.filter((patient) => (patient.duplicateCandidates?.length ?? 0) > 0).length}</p></div>
            </div>
          </div>
        </header>

        {isLoading ? <div className="rounded-[24px] border border-sky-100 bg-sky-50 px-5 py-4 text-sm text-sky-800">Loading patient data from MongoDB...</div> : null}
        {errorMessage ? <div className="rounded-[24px] border border-rose-100 bg-rose-50 px-5 py-4 text-sm text-rose-700">{errorMessage}</div> : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_420px]">
          <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-slate-950">{editingPatientId ? "Edit Patient Profile" : "Create Patient Profile"}</h3>
                <p className="mt-1 text-sm text-slate-500">Core intake plus medical, insurance, communication, and alert settings.</p>
              </div>
              {editingPatientId ? <button type="button" onClick={resetForm} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">Cancel Edit</button> : null}
            </div>
            <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <input required name="fullName" value={patientForm.fullName} onChange={handleFieldChange} placeholder="Full name" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white xl:col-span-2" />
                <input name="nationalId" value={patientForm.nationalId} onChange={handleFieldChange} placeholder="National ID" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" />
                <input name="passportNumber" value={patientForm.passportNumber} onChange={handleFieldChange} placeholder="Passport number" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" />
                <input required type="date" name="dateOfBirth" value={patientForm.dateOfBirth} onChange={handleFieldChange} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" />
                <select name="gender" value={patientForm.gender} onChange={handleFieldChange} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"><option value="">Gender</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select>
                <select name="status" value={patientForm.status} onChange={handleFieldChange} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white">{patientStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select>
                <select name="patientType" value={patientForm.patientType} onChange={handleFieldChange} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white">{patientTypeOptions.map((type) => <option key={type} value={type}>{type}</option>)}</select>
                <input required name="phone" value={patientForm.phone} onChange={handleFieldChange} placeholder="Primary phone" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" />
                <input type="email" name="email" value={patientForm.email} onChange={handleFieldChange} placeholder="Email" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white xl:col-span-2" />
                <input name="province" value={patientForm.province} onChange={handleFieldChange} placeholder="Province" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" />
                <input name="city" value={patientForm.city} onChange={handleFieldChange} placeholder="City" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" />
                <input name="address" value={patientForm.address} onChange={handleFieldChange} placeholder="Address" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white xl:col-span-2" />
                <textarea name="phoneNumbersText" value={patientForm.phoneNumbersText} onChange={handleFieldChange} placeholder="Other phone numbers, one per line" className="min-h-24 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white xl:col-span-2" />
                <textarea name="familyMemberIdsText" value={patientForm.familyMemberIdsText} onChange={handleFieldChange} placeholder="Linked family patient IDs, one per line" className="min-h-24 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white xl:col-span-2" />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <h4 className="text-base font-semibold text-slate-950">Risk & Dental Profile</h4>
                  <div className="mt-4 grid gap-3">
                    <select name="riskLevel" value={patientForm.riskLevel} onChange={handleFieldChange} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400">{riskLevelOptions.map((level) => <option key={level} value={level}>{level}</option>)}</select>
                    <select value={patientForm.medicalConditions.pregnancyStatus} onChange={(event) => updateNested("medicalConditions", "pregnancyStatus", event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400">{pregnancyStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select>
                    <textarea name="medicalHistory" value={patientForm.medicalHistory} onChange={handleFieldChange} placeholder="Medical history" className="min-h-20 rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400" />
                    <textarea name="allergies" value={patientForm.allergies} onChange={handleFieldChange} placeholder="Allergies summary" className="min-h-20 rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400" />
                    <input value={patientForm.oralHealthHistory.gumDiseaseHistory} onChange={(event) => updateNested("oralHealthHistory", "gumDiseaseHistory", event.target.value)} placeholder="Gum disease history" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400" />
                    <input value={patientForm.oralHealthHistory.cavitiesHistory} onChange={(event) => updateNested("oralHealthHistory", "cavitiesHistory", event.target.value)} placeholder="Cavities history" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400" />
                    <input value={patientForm.oralHealthHistory.orthodonticHistory} onChange={(event) => updateNested("oralHealthHistory", "orthodonticHistory", event.target.value)} placeholder="Orthodontic history" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400" />
                    <input value={patientForm.oralHealthHistory.implantsCrownsBridges} onChange={(event) => updateNested("oralHealthHistory", "implantsCrownsBridges", event.target.value)} placeholder="Implants / crowns / bridges" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400" />
                    <input value={patientForm.oralHealthHistory.missingTeethRecord} onChange={(event) => updateNested("oralHealthHistory", "missingTeethRecord", event.target.value)} placeholder="Missing teeth record" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <h4 className="text-base font-semibold text-slate-950">Insurance & Payment</h4>
                    <div className="mt-4 grid gap-3">
                      <input name="insuranceProvider" value={patientForm.insuranceProvider} onChange={handleFieldChange} placeholder="Insurance provider" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400" />
                      <input name="policyNumber" value={patientForm.policyNumber} onChange={handleFieldChange} placeholder="Policy number" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400" />
                      <input type="number" name="coverageLimit" value={patientForm.coverageLimit ?? ""} onChange={handleFieldChange} placeholder="Coverage limit" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400" />
                      <input type="date" name="insuranceExpiry" value={patientForm.insuranceExpiry} onChange={handleFieldChange} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400" />
                      <select name="billingPreference" value={patientForm.billingPreference} onChange={handleFieldChange} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400">{billingPreferenceOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                      <input type="number" name="creditBalance" value={patientForm.creditBalance} onChange={handleFieldChange} placeholder="Credit balance" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400" />
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <h4 className="text-base font-semibold text-slate-950">Contacts & Preferences</h4>
                    <div className="mt-4 grid gap-3">
                      <input name="emergencyContactName" value={patientForm.emergencyContactName} onChange={handleFieldChange} placeholder="Emergency contact name" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400" />
                      <input name="emergencyContactRelation" value={patientForm.emergencyContactRelation} onChange={handleFieldChange} placeholder="Relationship" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400" />
                      <input name="emergencyContactPhone" value={patientForm.emergencyContactPhone} onChange={handleFieldChange} placeholder="Emergency phone" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400" />
                      <input name="secondaryContactName" value={patientForm.secondaryContactName} onChange={handleFieldChange} placeholder="Secondary contact name" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400" />
                      <input name="secondaryContactPhone" value={patientForm.secondaryContactPhone} onChange={handleFieldChange} placeholder="Secondary phone" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400" />
                      <select value={patientForm.communicationPreferences.preferredContactMethod} onChange={(event) => updateNested("communicationPreferences", "preferredContactMethod", event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400">{preferredContactMethodOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                      <select value={patientForm.settings.privacyLevel} onChange={(event) => updateNested("settings", "privacyLevel", event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400">{privacyLevelOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4"><span className="text-sm font-medium text-slate-700">Documents</span><input type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(event) => handleFiles(event, "documents")} className="mt-2 w-full text-sm text-slate-500" /></label>
                <label className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4"><span className="text-sm font-medium text-slate-700">Insurance Cards</span><input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => handleFiles(event, "insuranceCards")} className="mt-2 w-full text-sm text-slate-500" /></label>
                <label className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4"><span className="text-sm font-medium text-slate-700">Consent Forms</span><input type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(event) => handleFiles(event, "consentForms")} className="mt-2 w-full text-sm text-slate-500" /></label>
                <label className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4"><span className="text-sm font-medium text-slate-700">X-Rays</span><input type="file" multiple accept=".jpg,.jpeg,.png,.dcm" onChange={(event) => handleFiles(event, "xrays")} className="mt-2 w-full text-sm text-slate-500" /></label>
              </div>
              <button type="submit" disabled={isSaving} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">{isSaving ? (editingPatientId ? "Updating Patient..." : "Saving Patient...") : (editingPatientId ? "Update Patient Profile" : "Save Patient Profile")}</button>
            </form>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <h3 className="text-xl font-semibold text-slate-950">Quick Search</h3>
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Name, phone, patient ID, national ID" className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" />
              <p className="mt-3 text-sm text-slate-500">Matches: {filteredPatients.length}</p>
              <p className="mt-1 text-sm text-slate-500">Current intake age: {calculatePatientAge(patientForm.dateOfBirth) ?? "Not set"}</p>
            </section>

            <section className="rounded-[28px] border border-white/80 bg-slate-950 p-6 text-white shadow-[0_20px_50px_rgba(15,23,42,0.16)]">
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/75">Patient Profiles</p>
              <h3 className="mt-2 text-xl font-semibold">Search Results</h3>
              <div className="mt-4 space-y-3">
                {filteredPatients.length === 0 ? <p className="rounded-2xl bg-white/10 p-4 text-sm text-slate-300">No patient profiles match your search.</p> : filteredPatients.map((patient) => (
                  <article key={patient.id} className="rounded-3xl border border-white/10 bg-white/6 p-4">
                    <Link href={`/patients/${patient.id}`} className="block min-w-0 transition hover:opacity-90">
                      <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-white">{patient.fullName}</p><span className="rounded-full bg-cyan-300 px-3 py-1 text-[11px] font-semibold text-slate-950">{patient.patientId}</span></div>
                      <p className="mt-1 text-sm text-slate-300">{patient.phone}{patient.email ? ` | ${patient.email}` : ""}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.24em] text-cyan-200/70">{patient.status} | {patient.patientType} | Registered {formatDateLabel(patient.registrationDate)}</p>
                    </Link>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {patient.alertFlags.unpaidBills ? <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">Unpaid bills</span> : null}
                      {patient.alertFlags.highRiskMedical ? <span className="rounded-full bg-rose-100 px-3 py-1 font-semibold text-rose-800">High risk</span> : null}
                      {patient.alertFlags.frequentNoShow ? <span className="rounded-full bg-violet-100 px-3 py-1 font-semibold text-violet-800">No-show</span> : null}
                      {patient.alertFlags.vip ? <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-800">VIP</span> : null}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-300">
                      <div className="rounded-2xl bg-white/8 p-3"><p>Total Visits</p><p className="mt-1 text-base font-semibold text-white">{patient.analytics?.totalVisits ?? 0}</p></div>
                      <div className="rounded-2xl bg-white/8 p-3"><p>Total Revenue</p><p className="mt-1 text-base font-semibold text-white">{currency(patient.analytics?.totalRevenue ?? 0)}</p></div>
                    </div>
                    {patient.duplicateCandidates && patient.duplicateCandidates.length > 0 ? <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-slate-900 ring-1 ring-amber-100"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Duplicate Candidates</p>{patient.duplicateCandidates.slice(0, 2).map((candidate) => <div key={`${patient.id}-${candidate.patientId}`} className="mt-3 rounded-2xl bg-white px-3 py-3 ring-1 ring-amber-100"><p className="text-sm font-semibold text-slate-900">{candidate.fullName}</p><p className="mt-1 text-xs text-slate-600">{candidate.reason}</p><button type="button" onClick={() => handleMergePatient(patient.id, candidate.patientId)} disabled={mergingPatientId === patient.id} className="mt-3 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">{mergingPatientId === patient.id ? "Merging..." : "Merge Into Candidate"}</button></div>)}</div> : null}
                    <div className="mt-4 flex gap-2">
                      <button type="button" onClick={() => handleEditPatient(patient)} className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100">Edit</button>
                      <button type="button" onClick={() => handleDeletePatient(patient.id)} disabled={deletingPatientId === patient.id} className="rounded-2xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:bg-rose-300">{deletingPatientId === patient.id ? "Deleting..." : "Delete"}</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AdminShell>
  );
}
