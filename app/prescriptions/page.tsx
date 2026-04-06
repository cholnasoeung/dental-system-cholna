"use client";

import { ChangeEvent, useEffect, useState } from "react";

import { AdminShell } from "@/components/admin-shell";
import {
  initialMedicationItemForm,
  initialPrescriptionForm,
  type DentalRecord,
  type MedicationItemFormState,
  type PatientProfile,
  type Prescription,
  type PrescriptionFormState,
} from "@/lib/clinic-types";

const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm focus:border-sky-400 focus:bg-white focus:outline-none transition";
const lbl = "mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-500";

function formatDateLabel(date: string) {
  if (!date) return "Not set";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(date));
}

export default function PrescriptionsPage() {
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [records, setRecords] = useState<DentalRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [prescriptionForm, setPrescriptionForm] = useState<PrescriptionFormState>(initialPrescriptionForm);
  const [medicationForm, setMedicationForm] = useState<MedicationItemFormState>(initialMedicationItemForm);
  const [medications, setMedications] = useState<Prescription["medications"]>([]);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        setErrorMessage("");
        const [pr, rr, psr] = await Promise.all([
          fetch("/api/patients", { cache: "no-store" }),
          fetch("/api/emr", { cache: "no-store" }),
          fetch("/api/prescriptions", { cache: "no-store" }),
        ]);
        if (!pr.ok || !rr.ok || !psr.ok) {
          throw new Error(`${pr.ok ? "" : await pr.text()} ${rr.ok ? "" : await rr.text()} ${psr.ok ? "" : await psr.text()}`.trim());
        }
        const [pd, rd, psd] = await Promise.all([
          pr.json() as Promise<PatientProfile[]>,
          rr.json() as Promise<DentalRecord[]>,
          psr.json() as Promise<Prescription[]>,
        ]);
        setPatients(pd);
        setRecords(rd);
        setPrescriptions(psd);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Unable to load prescription data.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  function handlePrescriptionFieldChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setPrescriptionForm((cur) => ({ ...cur, [name]: value }));
    if (name === "linkedRecordId") {
      const linked = records.find((r) => r.id === value);
      setPrescriptionForm((cur) => ({
        ...cur,
        linkedRecordId: value,
        linkedVisitDate: linked?.visitDate ?? "",
        linkedTreatment: linked?.procedureHistory || linked?.treatmentPlan || "",
      }));
    }
  }

  function handleMedicationFieldChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setMedicationForm((cur) => ({ ...cur, [name]: value }));
  }

  function addMedication() {
    if (!medicationForm.name || !medicationForm.dosage) return;
    setMedications((cur) => [...cur, medicationForm]);
    setMedicationForm(initialMedicationItemForm);
  }

  function removeMedication(idx: number) {
    setMedications((cur) => cur.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    const selectedPatient = patients.find((p) => p.id === prescriptionForm.patientId);
    if (!selectedPatient || !prescriptionForm.prescribedDate) return;

    try {
      setIsSaving(true);
      setErrorMessage("");
      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...prescriptionForm, patientName: selectedPatient.fullName, medications }),
      });
      if (!res.ok) throw new Error(await res.text());
      const next = (await res.json()) as Prescription;
      setPrescriptions((cur) => [next, ...cur]);
      setSelectedPrescription(next);
      setPrescriptionForm(initialPrescriptionForm);
      setMedicationForm(initialMedicationItemForm);
      setMedications([]);
      setShowForm(false);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Prescription could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  const filteredRecords = prescriptionForm.patientId
    ? records.filter((r) => r.patientId === prescriptionForm.patientId)
    : [];

  const medicationHistory = prescriptions.flatMap((rx) =>
    rx.medications.map((med) => ({ ...med, rxId: rx.id, patientName: rx.patientName, prescribedDate: rx.prescribedDate })),
  );

  return (
    <AdminShell>
      <div className="w-full space-y-6 animate-fade-in">

        {/* Page Header */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-600">Module E — Clinical</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Prescription Management</h1>
              <p className="mt-1 max-w-xl text-sm text-slate-500">
                Issue medication linked to a patient visit. Comes after examination and treatment planning.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex gap-3">
                <div className="rounded-xl bg-slate-900 px-4 py-3 text-white">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-300">Prescriptions</p>
                  <p className="mt-1.5 text-2xl font-bold">{prescriptions.length}</p>
                </div>
                <div className="rounded-xl border border-slate-200 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">EMR Links</p>
                  <p className="mt-1.5 text-2xl font-bold text-slate-900">
                    {prescriptions.filter((rx) => rx.linkedRecordId).length}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Medications</p>
                  <p className="mt-1.5 text-2xl font-bold text-slate-900">{medicationHistory.length}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowForm((v) => !v)}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition"
              >
                {showForm ? "Close Form" : "+ New Prescription"}
              </button>
            </div>
          </div>
        </div>

        {/* Status banners */}
        {isLoading && (
          <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-700">
            Loading prescription data from MongoDB...
          </div>
        )}
        {errorMessage && (
          <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

        {/* Create Form */}
        {showForm && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-fade-in-up">
            <div className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-600">New Prescription</p>
              <h2 className="mt-1 text-base font-bold text-slate-900">Patient & Visit Details</h2>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Patient & Visit */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={lbl}>Patient *</label>
                  <select required name="patientId" value={prescriptionForm.patientId} onChange={handlePrescriptionFieldChange} className={input}>
                    <option value="">Select patient</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>{p.fullName}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className={lbl}>Linked Visit / EMR Record</label>
                  <select name="linkedRecordId" value={prescriptionForm.linkedRecordId} onChange={handlePrescriptionFieldChange} className={input}>
                    <option value="">Select EMR record (optional)</option>
                    {filteredRecords.map((r) => (
                      <option key={r.id} value={r.id}>
                        {formatDateLabel(r.visitDate)} — {r.procedureHistory || r.treatmentPlan || "Visit note"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={lbl}>Prescribed Date *</label>
                  <input required type="date" name="prescribedDate" value={prescriptionForm.prescribedDate} onChange={handlePrescriptionFieldChange} className={input} />
                </div>

                <div>
                  <label className={lbl}>Linked Visit Date</label>
                  <input name="linkedVisitDate" value={prescriptionForm.linkedVisitDate} onChange={handlePrescriptionFieldChange} className={input} />
                </div>

                <div className="sm:col-span-2">
                  <label className={lbl}>Linked Treatment</label>
                  <input name="linkedTreatment" value={prescriptionForm.linkedTreatment} onChange={handlePrescriptionFieldChange} placeholder="Extraction, root canal, post-op care" className={input} />
                </div>
              </div>

              {/* Medications Builder */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Medications</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-800">
                      {medications.length === 0 ? "No medications added" : `${medications.length} medication${medications.length > 1 ? "s" : ""} added`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addMedication}
                    disabled={!medicationForm.name || !medicationForm.dosage}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition disabled:opacity-40"
                  >
                    + Add Medication
                  </button>
                </div>

                {/* Medication input row */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={lbl}>Drug Name</label>
                    <input name="name" value={medicationForm.name} onChange={handleMedicationFieldChange} placeholder="Amoxicillin" className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm focus:border-sky-400 focus:outline-none transition" />
                  </div>
                  <div>
                    <label className={lbl}>Dosage</label>
                    <input name="dosage" value={medicationForm.dosage} onChange={handleMedicationFieldChange} placeholder="500 mg" className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm focus:border-sky-400 focus:outline-none transition" />
                  </div>
                  <div>
                    <label className={lbl}>Frequency</label>
                    <input name="frequency" value={medicationForm.frequency} onChange={handleMedicationFieldChange} placeholder="3 times daily" className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm focus:border-sky-400 focus:outline-none transition" />
                  </div>
                  <div>
                    <label className={lbl}>Duration</label>
                    <input name="duration" value={medicationForm.duration} onChange={handleMedicationFieldChange} placeholder="5 days" className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm focus:border-sky-400 focus:outline-none transition" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={lbl}>Instructions</label>
                    <textarea
                      name="instructions"
                      value={medicationForm.instructions}
                      onChange={handleMedicationFieldChange}
                      placeholder="Take after meals, avoid alcohol"
                      rows={2}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm focus:border-sky-400 focus:outline-none transition"
                    />
                  </div>
                </div>

                {/* Added medications list */}
                {medications.length > 0 && (
                  <div className="mt-4 space-y-2.5">
                    {medications.map((med, idx) => (
                      <div key={`${med.name}-${idx}`} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-900">{med.name} <span className="font-normal text-slate-500">— {med.dosage}</span></p>
                          <p className="mt-0.5 text-xs text-slate-500">{med.frequency} · {med.duration}</p>
                          {med.instructions && <p className="mt-1 text-xs text-slate-400">{med.instructions}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMedication(idx)}
                          className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 transition"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className={lbl}>Clinical Notes</label>
                <textarea
                  name="notes"
                  value={prescriptionForm.notes}
                  onChange={handlePrescriptionFieldChange}
                  placeholder="Allergy note, review date, medication caution"
                  rows={3}
                  className={input}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isSaving || medications.length === 0}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? "Saving..." : "Save Prescription"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setPrescriptionForm(initialPrescriptionForm); setMedications([]); }}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Main content: History + Print side by side on large screens */}
        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">

          {/* Prescription History */}
          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-600">History</p>
                  <h2 className="mt-1 text-base font-bold text-slate-900">All Prescriptions</h2>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  {prescriptions.length} total
                </span>
              </div>

              {prescriptions.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-slate-400">No prescriptions yet. Click "+ New Prescription" to get started.</p>
                  {!showForm && (
                    <button
                      type="button"
                      onClick={() => setShowForm(true)}
                      className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 transition"
                    >
                      + New Prescription
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {prescriptions.map((rx) => (
                    <button
                      key={rx.id}
                      type="button"
                      onClick={() => setSelectedPrescription(rx)}
                      className={`flex w-full items-start gap-4 px-6 py-4 text-left transition hover:bg-slate-50 ${selectedPrescription?.id === rx.id ? "bg-sky-50 border-l-2 border-sky-500" : ""}`}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-xs font-bold text-violet-700">
                        Rx
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{rx.patientName}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{formatDateLabel(rx.prescribedDate)}</p>
                        {rx.linkedTreatment && (
                          <p className="mt-1 text-xs text-slate-400 truncate">{rx.linkedTreatment}</p>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                        {rx.medications.length} med{rx.medications.length !== 1 ? "s" : ""}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Medication History */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-6 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-600">Medication Log</p>
                <h2 className="mt-1 text-base font-bold text-slate-900">Recent Medications Prescribed</h2>
              </div>
              {medicationHistory.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-sm text-slate-400">No medications recorded yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {medicationHistory.slice(0, 20).map((item, idx) => (
                    <div key={`${item.rxId}-${item.name}-${idx}`} className="flex items-center gap-4 px-6 py-3.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-[10px] font-bold text-emerald-700 uppercase">
                        {item.name.slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{item.name} <span className="font-normal text-slate-500">— {item.dosage}</span></p>
                        <p className="mt-0.5 text-xs text-slate-500">{item.patientName} · {formatDateLabel(item.prescribedDate)}</p>
                      </div>
                      <p className="shrink-0 text-xs text-slate-400">{item.frequency}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Printable Prescription Panel */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden print:shadow-none">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-600">Print Preview</p>
                <h2 className="mt-1 text-sm font-bold text-slate-900">Prescription Sheet</h2>
              </div>
              {selectedPrescription && (
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition"
                >
                  Print / PDF
                </button>
              )}
            </div>

            <div className="p-5">
              {selectedPrescription ? (
                <div className="space-y-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-sky-600">Prescription</p>
                      <h3 className="mt-1.5 text-xl font-bold text-slate-900">{selectedPrescription.patientName}</h3>
                      <p className="mt-0.5 text-xs text-slate-500">Date: {formatDateLabel(selectedPrescription.prescribedDate)}</p>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <p className="font-semibold text-slate-600">Smile Care Center</p>
                      <p>Dental Prescription Sheet</p>
                    </div>
                  </div>

                  {/* Linked treatment */}
                  {selectedPrescription.linkedTreatment && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Linked Treatment</p>
                      <p className="mt-1 text-sm text-slate-700">{selectedPrescription.linkedTreatment}</p>
                    </div>
                  )}

                  {/* Medications */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Medications</p>
                    <div className="mt-2 space-y-2.5">
                      {selectedPrescription.medications.map((med, idx) => (
                        <div key={`${med.name}-${idx}`} className="rounded-xl bg-slate-50 p-4">
                          <p className="text-sm font-semibold text-slate-900">{med.name} <span className="font-normal">— {med.dosage}</span></p>
                          <p className="mt-0.5 text-xs text-slate-500">{med.frequency} · {med.duration}</p>
                          {med.instructions && <p className="mt-1.5 text-xs text-slate-500 leading-5">{med.instructions}</p>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedPrescription.notes && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Clinical Notes</p>
                      <p className="mt-1 text-sm text-slate-600 leading-5">{selectedPrescription.notes}</p>
                    </div>
                  )}

                  {/* Signature area */}
                  <div className="border-t border-slate-100 pt-4">
                    <div className="flex justify-between text-xs text-slate-400">
                      <div>
                        <div className="h-8 w-32 border-b border-slate-300" />
                        <p className="mt-1">Prescribing Dentist</p>
                      </div>
                      <div className="text-right">
                        <div className="h-8 w-24 border-b border-slate-300" />
                        <p className="mt-1">Date</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                  <p className="text-sm text-slate-400">
                    Select a prescription from the history list to preview and print.
                  </p>
                </div>
              )}
            </div>
          </section>

        </div>
      </div>
    </AdminShell>
  );
}
