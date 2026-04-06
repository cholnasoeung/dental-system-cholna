"use client";

import Link from "next/link";
import React, { ChangeEvent, useEffect, useMemo, useState } from "react";

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

// ─── Shared styles ─────────────────────────────────────────────────
const input = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100";
const label = "mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-500";

function mapFiles(files: FileList | null, category: NonNullable<UploadedFile["category"]>) {
  if (!files) return [];
  return Array.from(files).map((f) => ({ name: f.name, size: f.size, type: f.type, category }));
}
function parseLines(value: string) {
  return value.split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean).filter((s, i, a) => a.indexOf(s) === i);
}
function fmtDate(v: string) {
  if (!v) return "Not set";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(v));
}
function usd(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}
function calcAge(dob: string) {
  if (!dob) return null;
  const b = new Date(dob);
  if (isNaN(b.getTime())) return null;
  const t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) age--;
  return age;
}
function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className={label}>{children}</label>;
}
function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
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
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/patients", { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        setPatients((await res.json()) as PatientProfile[]);
      } catch (e) {
        setErrorMessage(e instanceof Error ? e.message : "Unable to load patients.");
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, []);

  function resetForm() {
    setPatientForm(initialPatientForm);
    setDocuments([]); setXrays([]); setInsuranceCards([]); setConsentForms([]);
    setEditingPatientId("");
    setShowForm(false);
  }

  function handleFieldChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setPatientForm((cur) => {
      const next = { ...cur, [name]: value };
      if (name === "province" || name === "city" || name === "address") {
        next.fullAddress = [next.address, next.city, next.province].filter(Boolean).join(", ");
      }
      return next;
    });
  }

  function updateNested(
    section: "oralHealthHistory" | "medicalConditions" | "allergyProfile" | "communicationPreferences" | "settings" | "alertFlags",
    field: string, value: string | boolean,
  ) {
    setPatientForm((cur) => ({ ...cur, [section]: { ...cur[section], [field]: value } }));
  }

  function handleFiles(e: ChangeEvent<HTMLInputElement>, type: "documents" | "xrays" | "insuranceCards" | "consentForms") {
    const cat = type === "documents" ? "document" : type === "xrays" ? "xray" : type === "insuranceCards" ? "insurance-card" : "consent-form";
    const files = mapFiles(e.target.files, cat as NonNullable<UploadedFile["category"]>);
    if (type === "documents") setDocuments(files);
    else if (type === "xrays") setXrays(files);
    else if (type === "insuranceCards") setInsuranceCards(files);
    else setConsentForms(files);
  }

  function handleEdit(patient: PatientProfile) {
    setPatientForm({
      nationalId: patient.nationalId, passportNumber: patient.passportNumber,
      fullName: patient.fullName, dateOfBirth: patient.dateOfBirth, gender: patient.gender,
      phone: patient.phone, phoneNumbers: patient.phoneNumbers,
      phoneNumbersText: patient.phoneNumbers.join("\n"), email: patient.email,
      province: patient.province, city: patient.city, address: patient.address,
      fullAddress: patient.fullAddress, profilePhoto: patient.profilePhoto,
      status: patient.status, registrationDate: patient.registrationDate,
      patientType: patient.patientType, occupation: patient.occupation,
      emergencyContactName: patient.emergencyContactName, emergencyContactRelation: patient.emergencyContactRelation,
      emergencyContactPhone: patient.emergencyContactPhone, secondaryContactName: patient.secondaryContactName,
      secondaryContactRelation: patient.secondaryContactRelation, secondaryContactPhone: patient.secondaryContactPhone,
      familyMemberIds: patient.familyMemberIds, familyMemberIdsText: patient.familyMemberIds.join("\n"),
      medicalHistory: patient.medicalHistory, oralHealthHistory: patient.oralHealthHistory,
      medicalConditions: patient.medicalConditions, allergies: patient.allergies,
      allergyProfile: patient.allergyProfile, riskLevel: patient.riskLevel,
      insuranceProvider: patient.insuranceProvider, policyNumber: patient.policyNumber,
      coverageLimit: patient.coverageLimit, insuranceExpiry: patient.insuranceExpiry,
      billingPreference: patient.billingPreference, creditBalance: patient.creditBalance,
      communicationPreferences: patient.communicationPreferences, settings: patient.settings,
      alertFlags: patient.alertFlags,
    });
    setDocuments(patient.documents); setXrays(patient.xrays);
    setInsuranceCards(patient.insuranceCards); setConsentForms(patient.consentForms);
    setEditingPatientId(patient.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    try {
      setIsSaving(true); setErrorMessage("");
      const payload = {
        ...patientForm,
        phoneNumbers: patientForm.phoneNumbersText ? parseLines(patientForm.phoneNumbersText) : [patientForm.phone],
        familyMemberIds: parseLines(patientForm.familyMemberIdsText),
        documents, xrays, insuranceCards, consentForms,
      };
      const res = await fetch(editingPatientId ? `/api/patients/${editingPatientId}` : "/api/patients", {
        method: editingPatientId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved = (await res.json()) as PatientProfile;
      setPatients((cur) => editingPatientId ? cur.map((p) => p.id === editingPatientId ? saved : p) : [saved, ...cur]);
      resetForm();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Unable to save patient.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(patientId: string) {
    if (!window.confirm("Delete this patient record? This cannot be undone.")) return;
    try {
      setDeletingPatientId(patientId);
      const res = await fetch(`/api/patients/${patientId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setPatients((cur) => cur.filter((p) => p.id !== patientId));
      if (editingPatientId === patientId) resetForm();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Unable to delete patient.");
    } finally {
      setDeletingPatientId("");
    }
  }

  async function handleMerge(sourceId: string, targetId: string) {
    if (!window.confirm("Merge this patient into the candidate? The source record will be removed.")) return;
    try {
      setMergingPatientId(sourceId);
      const res = await fetch("/api/patients/merge", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourcePatientId: sourceId, targetPatientId: targetId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const refreshed = await fetch("/api/patients", { cache: "no-store" });
      if (!refreshed.ok) throw new Error(await refreshed.text());
      setPatients((await refreshed.json()) as PatientProfile[]);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Unable to merge patient.");
    } finally {
      setMergingPatientId("");
    }
  }

  const filteredPatients = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) =>
      [p.patientId, p.nationalId, p.passportNumber, p.fullName, p.phone, ...p.phoneNumbers, p.email]
        .join(" ").toLowerCase().includes(q),
    );
  }, [patients, searchTerm]);

  const activeCount = patients.filter((p) => p.status === "active").length;
  const vipCount = patients.filter((p) => p.alertFlags.vip).length;
  const dupCount = patients.filter((p) => (p.duplicateCandidates?.length ?? 0) > 0).length;

  return (
    <AdminShell>
      <div className="mx-auto max-w-[1400px] space-y-6">

        {/* ── Page Header ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-sky-600">Module A</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">Patient Management</h1>
            <p className="mt-1 text-sm text-slate-500">Search, create, and manage patient profiles, history, and insurance.</p>
          </div>
          <button
            type="button"
            onClick={() => { setShowForm((v) => !v); if (editingPatientId) resetForm(); }}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5">
              <path d="M8 2v12M2 8h12"/>
            </svg>
            {showForm ? "Hide Form" : "New Patient"}
          </button>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total", value: patients.length, color: "bg-slate-900 text-white", sub: "text-slate-400" },
            { label: "Active", value: activeCount, color: "bg-white", sub: "text-slate-400" },
            { label: "VIP", value: vipCount, color: "bg-white", sub: "text-slate-400" },
            { label: "Duplicates", value: dupCount, color: dupCount > 0 ? "bg-amber-50" : "bg-white", sub: "text-slate-400" },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-2xl border border-slate-200 px-4 py-3 shadow-sm ${stat.color}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-widest ${stat.color.includes("slate-900") ? "text-slate-400" : "text-slate-400"}`}>{stat.label}</p>
              <p className={`mt-1.5 text-2xl font-bold ${stat.color.includes("slate-900") ? "text-white" : "text-slate-900"}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Status banners */}
        {isLoading && (
          <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
            <svg className="h-4 w-4 animate-spin shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="8" cy="8" r="6" strokeOpacity=".25"/><path d="M14 8a6 6 0 0 0-6-6" strokeLinecap="round"/>
            </svg>
            Loading patient data…
          </div>
        )}
        {errorMessage && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mt-0.5 h-4 w-4 shrink-0">
              <circle cx="8" cy="8" r="7"/><path d="M8 5v3M8 11h.01"/>
            </svg>
            {errorMessage}
          </div>
        )}

        {/* ── Create / Edit Form ───────────────────────────────────── */}
        {showForm && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">{editingPatientId ? "Edit Patient Profile" : "New Patient Profile"}</h2>
                <p className="mt-0.5 text-xs text-slate-500">Fill in the patient details below, then save.</p>
              </div>
              <button type="button" onClick={resetForm} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
                Cancel
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              {/* Core info */}
              <FormSection title="Personal Information">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="xl:col-span-2">
                    <FieldLabel>Full Name *</FieldLabel>
                    <input required name="fullName" value={patientForm.fullName} onChange={handleFieldChange} placeholder="Sophea Chan" className={input} />
                  </div>
                  <div>
                    <FieldLabel>National ID</FieldLabel>
                    <input name="nationalId" value={patientForm.nationalId} onChange={handleFieldChange} placeholder="ID number" className={input} />
                  </div>
                  <div>
                    <FieldLabel>Passport</FieldLabel>
                    <input name="passportNumber" value={patientForm.passportNumber} onChange={handleFieldChange} placeholder="Passport no." className={input} />
                  </div>
                  <div>
                    <FieldLabel>Date of Birth *</FieldLabel>
                    <input required type="date" name="dateOfBirth" value={patientForm.dateOfBirth} onChange={handleFieldChange} className={input} />
                    {patientForm.dateOfBirth && (
                      <p className="mt-1 text-[11px] text-slate-400">Age: {calcAge(patientForm.dateOfBirth)} years</p>
                    )}
                  </div>
                  <div>
                    <FieldLabel>Gender</FieldLabel>
                    <select name="gender" value={patientForm.gender} onChange={handleFieldChange} className={input}>
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Status</FieldLabel>
                    <select name="status" value={patientForm.status} onChange={handleFieldChange} className={input}>
                      {patientStatusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Patient Type</FieldLabel>
                    <select name="patientType" value={patientForm.patientType} onChange={handleFieldChange} className={input}>
                      {patientTypeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Primary Phone *</FieldLabel>
                    <input required name="phone" value={patientForm.phone} onChange={handleFieldChange} placeholder="+855 12 345 678" className={input} />
                  </div>
                  <div className="xl:col-span-2">
                    <FieldLabel>Email</FieldLabel>
                    <input type="email" name="email" value={patientForm.email} onChange={handleFieldChange} placeholder="patient@email.com" className={input} />
                  </div>
                  <div>
                    <FieldLabel>Province</FieldLabel>
                    <input name="province" value={patientForm.province} onChange={handleFieldChange} placeholder="Phnom Penh" className={input} />
                  </div>
                  <div>
                    <FieldLabel>City</FieldLabel>
                    <input name="city" value={patientForm.city} onChange={handleFieldChange} placeholder="Chamkarmon" className={input} />
                  </div>
                  <div className="xl:col-span-2">
                    <FieldLabel>Address</FieldLabel>
                    <input name="address" value={patientForm.address} onChange={handleFieldChange} placeholder="Street address" className={input} />
                  </div>
                </div>
              </FormSection>

              {/* Medical + Insurance */}
              <div className="grid gap-4 lg:grid-cols-2">
                <FormSection title="Medical & Dental History">
                  <div>
                    <FieldLabel>Risk Level</FieldLabel>
                    <select name="riskLevel" value={patientForm.riskLevel} onChange={handleFieldChange} className={input}>
                      {riskLevelOptions.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Pregnancy Status</FieldLabel>
                    <select value={patientForm.medicalConditions.pregnancyStatus} onChange={(e) => updateNested("medicalConditions", "pregnancyStatus", e.target.value)} className={input}>
                      {pregnancyStatusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Medical History</FieldLabel>
                    <textarea name="medicalHistory" value={patientForm.medicalHistory} onChange={handleFieldChange} placeholder="Known conditions, medications…" rows={3} className={`${input} resize-none`} />
                  </div>
                  <div>
                    <FieldLabel>Allergies</FieldLabel>
                    <textarea name="allergies" value={patientForm.allergies} onChange={handleFieldChange} placeholder="Drug allergies, latex, etc." rows={2} className={`${input} resize-none`} />
                  </div>
                  <div>
                    <FieldLabel>Gum Disease History</FieldLabel>
                    <input value={patientForm.oralHealthHistory.gumDiseaseHistory} onChange={(e) => updateNested("oralHealthHistory", "gumDiseaseHistory", e.target.value)} placeholder="Notes" className={input} />
                  </div>
                  <div>
                    <FieldLabel>Cavities History</FieldLabel>
                    <input value={patientForm.oralHealthHistory.cavitiesHistory} onChange={(e) => updateNested("oralHealthHistory", "cavitiesHistory", e.target.value)} placeholder="Notes" className={input} />
                  </div>
                </FormSection>

                <div className="space-y-4">
                  <FormSection title="Insurance & Billing">
                    <div>
                      <FieldLabel>Insurance Provider</FieldLabel>
                      <input name="insuranceProvider" value={patientForm.insuranceProvider} onChange={handleFieldChange} placeholder="Provider name" className={input} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <FieldLabel>Policy Number</FieldLabel>
                        <input name="policyNumber" value={patientForm.policyNumber} onChange={handleFieldChange} placeholder="Policy no." className={input} />
                      </div>
                      <div>
                        <FieldLabel>Coverage Limit</FieldLabel>
                        <input type="number" name="coverageLimit" value={patientForm.coverageLimit ?? ""} onChange={handleFieldChange} placeholder="0.00" className={input} />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <FieldLabel>Insurance Expiry</FieldLabel>
                        <input type="date" name="insuranceExpiry" value={patientForm.insuranceExpiry} onChange={handleFieldChange} className={input} />
                      </div>
                      <div>
                        <FieldLabel>Billing Preference</FieldLabel>
                        <select name="billingPreference" value={patientForm.billingPreference} onChange={handleFieldChange} className={input}>
                          {billingPreferenceOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>
                  </FormSection>

                  <FormSection title="Emergency Contacts">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <FieldLabel>Name</FieldLabel>
                        <input name="emergencyContactName" value={patientForm.emergencyContactName} onChange={handleFieldChange} placeholder="Contact name" className={input} />
                      </div>
                      <div>
                        <FieldLabel>Relationship</FieldLabel>
                        <input name="emergencyContactRelation" value={patientForm.emergencyContactRelation} onChange={handleFieldChange} placeholder="e.g. Spouse" className={input} />
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Emergency Phone</FieldLabel>
                      <input name="emergencyContactPhone" value={patientForm.emergencyContactPhone} onChange={handleFieldChange} placeholder="+855 …" className={input} />
                    </div>
                    <div>
                      <FieldLabel>Preferred Contact Method</FieldLabel>
                      <select value={patientForm.communicationPreferences.preferredContactMethod} onChange={(e) => updateNested("communicationPreferences", "preferredContactMethod", e.target.value)} className={input}>
                        {preferredContactMethodOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <FieldLabel>Privacy Level</FieldLabel>
                      <select value={patientForm.settings.privacyLevel} onChange={(e) => updateNested("settings", "privacyLevel", e.target.value)} className={input}>
                        {privacyLevelOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  </FormSection>
                </div>
              </div>

              {/* File uploads */}
              <FormSection title="Attachments">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    { label: "Documents", type: "documents" as const, accept: ".pdf,.doc,.docx,.jpg,.jpeg,.png" },
                    { label: "Insurance Cards", type: "insuranceCards" as const, accept: ".pdf,.jpg,.jpeg,.png" },
                    { label: "Consent Forms", type: "consentForms" as const, accept: ".pdf,.doc,.docx,.jpg,.jpeg,.png" },
                    { label: "X-Rays", type: "xrays" as const, accept: ".jpg,.jpeg,.png,.dcm" },
                  ].map((f) => (
                    <label key={f.type} className="cursor-pointer rounded-xl border border-dashed border-slate-300 bg-white p-3 transition hover:border-sky-400 hover:bg-sky-50">
                      <p className="text-xs font-semibold text-slate-700">{f.label}</p>
                      <input type="file" multiple accept={f.accept} onChange={(e) => handleFiles(e, f.type)} className="mt-2 w-full text-xs text-slate-500 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-semibold" />
                    </label>
                  ))}
                </div>
              </FormSection>

              {/* Submit */}
              <div className="flex items-center gap-3 pt-2">
                <button type="submit" disabled={isSaving} className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
                  {isSaving ? (
                    <><svg className="h-4 w-4 animate-spin" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="8" r="6" strokeOpacity=".3"/><path d="M14 8a6 6 0 0 0-6-6" strokeLinecap="round"/></svg>{editingPatientId ? "Updating…" : "Saving…"}</>
                  ) : (editingPatientId ? "Update Patient" : "Save Patient")}
                </button>
                <button type="button" onClick={resetForm} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Search + Patient List ─────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Patient Directory</h2>
              <p className="mt-0.5 text-xs text-slate-500">{filteredPatients.length} of {patients.length} records shown</p>
            </div>
            <div className="relative w-full sm:w-72">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400">
                <circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/>
              </svg>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name, phone, patient ID…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3.5 text-sm outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
              />
            </div>
          </div>

          {filteredPatients.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-slate-400">
                  <circle cx="8" cy="6" r="3"/><path d="M2 18c0-3.3 2.7-6 6-6h4"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-500">{searchTerm ? "No patients match your search" : "No patients added yet"}</p>
              <button type="button" onClick={() => setShowForm(true)} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800">
                Add First Patient
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filteredPatients.map((patient) => (
                <div key={patient.id} className="flex flex-col gap-4 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-start">
                  {/* Avatar + info */}
                  <div className="flex flex-1 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-sm font-bold text-white shadow-sm">
                      {initials(patient.fullName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/patients/${patient.id}`} className="text-sm font-bold text-slate-900 hover:text-sky-600 hover:underline">
                          {patient.fullName}
                        </Link>
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">{patient.patientId}</span>
                        {patient.alertFlags.vip && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">VIP</span>}
                        {patient.alertFlags.highRiskMedical && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">High Risk</span>}
                        {patient.alertFlags.unpaidBills && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">Unpaid</span>}
                        {patient.alertFlags.frequentNoShow && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">No-show</span>}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{patient.phone}{patient.email ? ` · ${patient.email}` : ""}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400 capitalize">{patient.status} · {patient.patientType} · Registered {fmtDate(patient.registrationDate)}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-center">
                      <p className="font-bold text-slate-900">{patient.analytics?.totalVisits ?? 0}</p>
                      <p className="text-slate-400">Visits</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-slate-900">{usd(patient.analytics?.totalRevenue ?? 0)}</p>
                      <p className="text-slate-400">Revenue</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-2">
                    <button type="button" onClick={() => handleEdit(patient)} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:border-slate-300">
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(patient.id)}
                      disabled={deletingPatientId === patient.id}
                      className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50"
                    >
                      {deletingPatientId === patient.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
              ))}

              {/* Duplicate warnings */}
              {filteredPatients.filter((p) => (p.duplicateCandidates?.length ?? 0) > 0).map((patient) => (
                <div key={`dup-${patient.id}`} className="border-l-4 border-amber-400 bg-amber-50 px-5 py-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-700">Possible Duplicate — {patient.fullName}</p>
                  {patient.duplicateCandidates!.slice(0, 2).map((c) => (
                    <div key={`${patient.id}-${c.patientId}`} className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{c.fullName}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{c.reason}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleMerge(patient.id, c.patientId)}
                        disabled={mergingPatientId === patient.id}
                        className="shrink-0 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-500 disabled:opacity-50"
                      >
                        {mergingPatientId === patient.id ? "Merging…" : "Merge"}
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </AdminShell>
  );
}
