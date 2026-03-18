"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";

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

function formatDateLabel(date: string) {
  if (!date) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export default function PrescriptionsPage() {
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [records, setRecords] = useState<DentalRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [prescriptionForm, setPrescriptionForm] =
    useState<PrescriptionFormState>(initialPrescriptionForm);
  const [medicationForm, setMedicationForm] =
    useState<MedicationItemFormState>(initialMedicationItemForm);
  const [medications, setMedications] = useState<Prescription["medications"]>([]);
  const [selectedPrescription, setSelectedPrescription] =
    useState<Prescription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadPrescriptionData() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const [patientsResponse, recordsResponse, prescriptionsResponse] =
          await Promise.all([
            fetch("/api/patients", { cache: "no-store" }),
            fetch("/api/emr", { cache: "no-store" }),
            fetch("/api/prescriptions", { cache: "no-store" }),
          ]);

        if (
          !patientsResponse.ok ||
          !recordsResponse.ok ||
          !prescriptionsResponse.ok
        ) {
          throw new Error(
            `${patientsResponse.ok ? "" : await patientsResponse.text()} ${
              recordsResponse.ok ? "" : await recordsResponse.text()
            } ${prescriptionsResponse.ok ? "" : await prescriptionsResponse.text()}`.trim(),
          );
        }

        const [patientsData, recordsData, prescriptionsData] = await Promise.all([
          (await patientsResponse.json()) as PatientProfile[],
          (await recordsResponse.json()) as DentalRecord[],
          (await prescriptionsResponse.json()) as Prescription[],
        ]);

        setPatients(patientsData);
        setRecords(recordsData);
        setPrescriptions(prescriptionsData);
      } catch (error) {
        console.error(error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load prescription data.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadPrescriptionData();
  }, []);

  function handlePrescriptionFieldChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target;
    setPrescriptionForm((current) => ({ ...current, [name]: value }));

    if (name === "linkedRecordId") {
      const linkedRecord = records.find((record) => record.id === value);
      setPrescriptionForm((current) => ({
        ...current,
        linkedRecordId: value,
        linkedVisitDate: linkedRecord?.visitDate ?? "",
        linkedTreatment:
          linkedRecord?.procedureHistory || linkedRecord?.treatmentPlan || "",
      }));
    }
  }

  function handleMedicationFieldChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;
    setMedicationForm((current) => ({ ...current, [name]: value }));
  }

  function addMedication() {
    if (!medicationForm.name || !medicationForm.dosage) {
      return;
    }

    setMedications((current) => [...current, medicationForm]);
    setMedicationForm(initialMedicationItemForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const selectedPatient = patients.find(
      (patient) => patient.id === prescriptionForm.patientId,
    );

    if (!selectedPatient || !prescriptionForm.prescribedDate) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");

      const response = await fetch("/api/prescriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...prescriptionForm,
          patientName: selectedPatient.fullName,
          medications,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const nextPrescription = (await response.json()) as Prescription;
      setPrescriptions((current) => [nextPrescription, ...current]);
      setSelectedPrescription(nextPrescription);
      setPrescriptionForm(initialPrescriptionForm);
      setMedicationForm(initialMedicationItemForm);
      setMedications([]);
      form.reset();
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Prescription could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const filteredRecords = prescriptionForm.patientId
    ? records.filter((record) => record.patientId === prescriptionForm.patientId)
    : [];

  const medicationHistory = prescriptions.flatMap((prescription) =>
    prescription.medications.map((medication) => ({
      ...medication,
      id: prescription.id,
      patientName: prescription.patientName,
      prescribedDate: prescription.prescribedDate,
    })),
  );

  return (
    <AdminShell>
      <div className="w-full space-y-6">
        <header className="rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-700">
            Module E
          </p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                Prescription Management
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                This step comes after examination and treatment planning when the
                dentist needs to issue medication linked to the visit.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">
                  Prescriptions
                </p>
                <p className="mt-2 text-2xl font-semibold">{prescriptions.length}</p>
              </div>
              <div className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  EMR Links
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {prescriptions.filter((item) => item.linkedRecordId).length}
                </p>
              </div>
              <div className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  Medications
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {medicationHistory.length}
                </p>
              </div>
            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="rounded-[24px] border border-sky-100 bg-sky-50 px-5 py-4 text-sm text-sky-800">
            Loading prescription data from MongoDB...
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-[24px] border border-rose-100 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="space-y-6">
          <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <h3 className="text-xl font-semibold text-slate-950">
              Create Prescription
            </h3>

            <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Patient</span>
                  <select
                    required
                    name="patientId"
                    value={prescriptionForm.patientId}
                    onChange={handlePrescriptionFieldChange}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  >
                    <option value="">Select patient</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.fullName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">
                    Linked Visit / Treatment
                  </span>
                  <select
                    name="linkedRecordId"
                    value={prescriptionForm.linkedRecordId}
                    onChange={handlePrescriptionFieldChange}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  >
                    <option value="">Select EMR record</option>
                    {filteredRecords.map((record) => (
                      <option key={record.id} value={record.id}>
                        {formatDateLabel(record.visitDate)} |{" "}
                        {record.procedureHistory || record.treatmentPlan || "Visit note"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">
                    Prescribed Date
                  </span>
                  <input
                    required
                    type="date"
                    name="prescribedDate"
                    value={prescriptionForm.prescribedDate}
                    onChange={handlePrescriptionFieldChange}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">
                    Linked Visit Date
                  </span>
                  <input
                    name="linkedVisitDate"
                    value={prescriptionForm.linkedVisitDate}
                    onChange={handlePrescriptionFieldChange}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  />
                </label>
                <label className="space-y-1 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">
                    Linked Treatment
                  </span>
                  <input
                    name="linkedTreatment"
                    value={prescriptionForm.linkedTreatment}
                    onChange={handlePrescriptionFieldChange}
                    placeholder="Extraction, root canal, post-op care"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  />
                </label>
              </div>

              <div className="rounded-3xl bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-semibold text-slate-950">
                    Medications
                  </h4>
                  <button
                    type="button"
                    onClick={addMedication}
                    className="rounded-full bg-slate-950 px-4 py-2 text-xs font-medium text-white"
                  >
                    Add Medication
                  </button>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <input
                    name="name"
                    value={medicationForm.name}
                    onChange={handleMedicationFieldChange}
                    placeholder="Amoxicillin"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400"
                  />
                  <input
                    name="dosage"
                    value={medicationForm.dosage}
                    onChange={handleMedicationFieldChange}
                    placeholder="500 mg"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400"
                  />
                  <input
                    name="frequency"
                    value={medicationForm.frequency}
                    onChange={handleMedicationFieldChange}
                    placeholder="3 times daily"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400"
                  />
                  <input
                    name="duration"
                    value={medicationForm.duration}
                    onChange={handleMedicationFieldChange}
                    placeholder="5 days"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400"
                  />
                  <textarea
                    name="instructions"
                    value={medicationForm.instructions}
                    onChange={handleMedicationFieldChange}
                    placeholder="Take after meals"
                    className="min-h-24 rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400 md:col-span-2"
                  />
                </div>
                <div className="mt-4 space-y-2">
                  {medications.length === 0 ? (
                    <p className="text-sm text-slate-500">No medications added yet.</p>
                  ) : (
                    medications.map((medication, index) => (
                      <div
                        key={`${medication.name}-${index}`}
                        className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900">
                              {medication.name} - {medication.dosage}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {medication.frequency} | {medication.duration}
                            </p>
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          {medication.instructions || "No extra instructions"}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">Notes</span>
                <textarea
                  name="notes"
                  value={prescriptionForm.notes}
                  onChange={handlePrescriptionFieldChange}
                  placeholder="Medication caution, review date, allergy note"
                  className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                />
              </label>

              <button
                type="submit"
                disabled={isSaving}
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSaving ? "Saving Prescription..." : "Save Prescription"}
              </button>
            </form>
          </section>

          <div className="space-y-6">
            <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-slate-950">
                  Printable Prescription
                </h3>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-full bg-slate-950 px-4 py-2 text-xs font-medium text-white"
                >
                  Print / Download
                </button>
              </div>
              <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-6 print:shadow-none">
                {selectedPrescription ? (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-700">
                          Prescription
                        </p>
                        <h4 className="mt-2 text-2xl font-semibold text-slate-950">
                          {selectedPrescription.patientName}
                        </h4>
                        <p className="mt-1 text-sm text-slate-500">
                          Date: {formatDateLabel(selectedPrescription.prescribedDate)}
                        </p>
                      </div>
                      <div className="text-right text-sm text-slate-500">
                        <p>Smile Care Center</p>
                        <p>Dental Prescription Sheet</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        Linked Treatment
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {selectedPrescription.linkedTreatment || "Not linked"}
                      </p>
                    </div>
                    <div className="space-y-3">
                      {selectedPrescription.medications.map((medication, index) => (
                        <div
                          key={`${medication.name}-${index}`}
                          className="rounded-2xl bg-slate-50 p-4"
                        >
                          <p className="font-medium text-slate-900">
                            {medication.name} - {medication.dosage}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {medication.frequency} for {medication.duration}
                          </p>
                          <p className="mt-2 text-sm text-slate-600">
                            {medication.instructions || "No extra instructions"}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">Notes</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {selectedPrescription.notes || "No additional notes"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    Save a prescription or select one from history to preview and print.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <h3 className="text-xl font-semibold text-slate-950">
                Prescription History
              </h3>
              <div className="mt-4 space-y-3">
                {prescriptions.length === 0 ? (
                  <p className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
                    No prescriptions yet.
                  </p>
                ) : (
                  prescriptions.map((prescription) => (
                    <button
                      key={prescription.id}
                      type="button"
                      onClick={() => setSelectedPrescription(prescription)}
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:bg-white"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {prescription.patientName}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {formatDateLabel(prescription.prescribedDate)}
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                          {prescription.medications.length} meds
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-slate-600">
                        {prescription.linkedTreatment || "No linked treatment"}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-white/80 bg-slate-950 p-6 text-white shadow-[0_20px_50px_rgba(15,23,42,0.16)]">
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/75">
                Medication History
              </p>
              <h3 className="mt-2 text-xl font-semibold">Recent Medications</h3>
              <div className="mt-4 space-y-3">
                {medicationHistory.length === 0 ? (
                  <p className="rounded-2xl bg-white/10 p-4 text-sm text-slate-300">
                    No medications recorded yet.
                  </p>
                ) : (
                  medicationHistory.map((item, index) => (
                    <article
                      key={`${item.id}-${item.name}-${index}`}
                      className="rounded-2xl border border-white/10 bg-white/6 p-4"
                    >
                      <p className="font-medium text-white">
                        {item.name} - {item.dosage}
                      </p>
                      <p className="mt-1 text-sm text-slate-300">
                        {item.patientName} | {formatDateLabel(item.prescribedDate)}
                      </p>
                      <p className="mt-2 text-sm text-slate-300">
                        {item.frequency} for {item.duration}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}


