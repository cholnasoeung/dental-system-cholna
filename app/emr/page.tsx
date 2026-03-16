"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import { AdminShell } from "@/components/admin-shell";
import {
  initialDentalRecordForm,
  odontogramToothNumbers,
  toothConditionOptions,
  type ClinicalAttachment,
  type DentalRecord,
  type DentalRecordFormState,
  type OdontogramTooth,
  type PatientProfile,
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

function mapAttachments(files: FileList | null): ClinicalAttachment[] {
  if (!files) {
    return [];
  }

  return Array.from(files).map((file) => ({
    name: file.name,
    size: file.size,
    category: file.name.match(/\.(jpg|jpeg|png|dcm)$/i) ? "xray" : "report",
  }));
}

export default function EmrPage() {
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [records, setRecords] = useState<DentalRecord[]>([]);
  const [recordForm, setRecordForm] =
    useState<DentalRecordFormState>(initialDentalRecordForm);
  const [attachments, setAttachments] = useState<ClinicalAttachment[]>([]);
  const [odontogram, setOdontogram] = useState<OdontogramTooth[]>(
    odontogramToothNumbers.map((toothNumber) => ({
      toothNumber,
      condition: "healthy",
      notes: "",
    })),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const [patientsResponse, recordsResponse] = await Promise.all([
          fetch("/api/patients", { cache: "no-store" }),
          fetch("/api/emr", { cache: "no-store" }),
        ]);

        if (!patientsResponse.ok || !recordsResponse.ok) {
          throw new Error(
            `${patientsResponse.ok ? "" : await patientsResponse.text()} ${
              recordsResponse.ok ? "" : await recordsResponse.text()
            }`.trim(),
          );
        }

        const [patientsData, recordsData] = await Promise.all([
          (await patientsResponse.json()) as PatientProfile[],
          (await recordsResponse.json()) as DentalRecord[],
        ]);

        setPatients(patientsData);
        setRecords(recordsData);
      } catch (error) {
        console.error(error);
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load EMR data.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  function handleFieldChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target;
    setRecordForm((current) => ({ ...current, [name]: value }));
  }

  function handleToothChange(
    toothNumber: string,
    field: "condition" | "notes",
    value: string,
  ) {
    setOdontogram((current) =>
      current.map((tooth) =>
        tooth.toothNumber === toothNumber ? { ...tooth, [field]: value } : tooth,
      ),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const selectedPatient = patients.find(
      (patient) => patient.id === recordForm.patientId,
    );

    if (!selectedPatient || !recordForm.visitDate) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");

      const response = await fetch("/api/emr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...recordForm,
          patientName: selectedPatient.fullName,
          clinicalAttachments: attachments,
          odontogram,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const nextRecord = (await response.json()) as DentalRecord;
      setRecords((current) => [nextRecord, ...current]);
      setRecordForm(initialDentalRecordForm);
      setAttachments([]);
      setOdontogram(
        odontogramToothNumbers.map((toothNumber) => ({
          toothNumber,
          condition: "healthy",
          notes: "",
        })),
      );
      form.reset();
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "EMR record could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const totalAttachments = records.reduce(
    (sum, record) => sum + record.clinicalAttachments.length,
    0,
  );
  const totalProcedures = records.filter((record) => record.procedureHistory).length;

  return (
    <AdminShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-700">
            Module C
          </p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                Dental Records / EMR
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Record odontogram findings, consultation notes, diagnoses,
                treatment plans, procedure history, and clinical attachments for
                each patient visit.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">
                  Records
                </p>
                <p className="mt-2 text-2xl font-semibold">{records.length}</p>
              </div>
              <div className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  Attachments
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {totalAttachments}
                </p>
              </div>
              <div className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  Procedures
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {totalProcedures}
                </p>
              </div>
            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="rounded-[24px] border border-sky-100 bg-sky-50 px-5 py-4 text-sm text-sky-800">
            Loading EMR data from MongoDB...
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-[24px] border border-rose-100 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <h3 className="text-xl font-semibold text-slate-950">Create EMR Entry</h3>

            <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Patient</span>
                  <select
                    required
                    name="patientId"
                    value={recordForm.patientId}
                    onChange={handleFieldChange}
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
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Visit Date</span>
                  <input
                    required
                    type="date"
                    name="visitDate"
                    value={recordForm.visitDate}
                    onChange={handleFieldChange}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">
                    Chief Complaint
                  </span>
                  <input
                    name="chiefComplaint"
                    value={recordForm.chiefComplaint}
                    onChange={handleFieldChange}
                    placeholder="Tooth pain, checkup, swelling"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">
                    Consultation Notes
                  </span>
                  <textarea
                    name="consultationNotes"
                    value={recordForm.consultationNotes}
                    onChange={handleFieldChange}
                    placeholder="Clinical findings and observations"
                    className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Diagnoses</span>
                  <textarea
                    name="diagnoses"
                    value={recordForm.diagnoses}
                    onChange={handleFieldChange}
                    placeholder="Pulpitis, caries, gingivitis"
                    className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">
                    Treatment Plan
                  </span>
                  <textarea
                    name="treatmentPlan"
                    value={recordForm.treatmentPlan}
                    onChange={handleFieldChange}
                    placeholder="Scaling, filling, crown, review after 2 weeks"
                    className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">
                    Procedure History
                  </span>
                  <textarea
                    name="procedureHistory"
                    value={recordForm.procedureHistory}
                    onChange={handleFieldChange}
                    placeholder="Completed procedures and visit summary"
                    className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  />
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-semibold text-slate-950">
                    Tooth Chart / Odontogram
                  </h4>
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
                    32 teeth
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-4 lg:grid-cols-8">
                  {odontogram.map((tooth) => (
                    <div
                      key={tooth.toothNumber}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <p className="text-sm font-semibold text-slate-900">
                        {tooth.toothNumber}
                      </p>
                      <select
                        value={tooth.condition}
                        onChange={(event) =>
                          handleToothChange(
                            tooth.toothNumber,
                            "condition",
                            event.target.value,
                          )
                        }
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs outline-none"
                      >
                        {toothConditionOptions.map((condition) => (
                          <option key={condition} value={condition}>
                            {condition}
                          </option>
                        ))}
                      </select>
                      <input
                        value={tooth.notes}
                        onChange={(event) =>
                          handleToothChange(
                            tooth.toothNumber,
                            "notes",
                            event.target.value,
                          )
                        }
                        placeholder="Note"
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-base font-semibold text-slate-950">
                  Clinical Attachments
                </h4>
                <label className="mt-3 block rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4">
                  <span className="text-sm font-medium text-slate-700">
                    X-rays, scans, reports
                  </span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.dcm"
                    onChange={(event) => setAttachments(mapAttachments(event.target.files))}
                    className="mt-2 w-full text-sm text-slate-500"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSaving ? "Saving EMR..." : "Save EMR Record"}
              </button>
            </form>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <h3 className="text-xl font-semibold text-slate-950">Attachment Queue</h3>
              <div className="mt-4 space-y-3">
                {attachments.length === 0 ? (
                  <p className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
                    No attachments selected.
                  </p>
                ) : (
                  attachments.map((attachment) => (
                    <article
                      key={`${attachment.name}-${attachment.size}`}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <p className="font-medium text-slate-900">{attachment.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                        {attachment.category}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-white/80 bg-slate-950 p-6 text-white shadow-[0_20px_50px_rgba(15,23,42,0.16)]">
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/75">
                EMR Timeline
              </p>
              <h3 className="mt-2 text-xl font-semibold">Recent Clinical Records</h3>
              <div className="mt-4 space-y-3">
                {records.length === 0 ? (
                  <p className="rounded-2xl bg-white/10 p-4 text-sm text-slate-300">
                    No dental records yet.
                  </p>
                ) : (
                  records.map((record) => (
                    <article
                      key={record.id}
                      className="rounded-3xl border border-white/10 bg-white/6 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{record.patientName}</p>
                          <p className="mt-1 text-sm text-slate-300">
                            {formatDateLabel(record.visitDate)}
                          </p>
                        </div>
                        <span className="rounded-full bg-cyan-300 px-3 py-1 text-xs font-semibold text-slate-950">
                          EMR
                        </span>
                      </div>
                      <div className="mt-4 grid gap-3 text-xs text-slate-300">
                        <div className="rounded-2xl bg-white/6 p-3">
                          <p className="text-slate-400">Diagnosis</p>
                          <p className="mt-1">{record.diagnoses || "Not set"}</p>
                        </div>
                        <div className="rounded-2xl bg-white/6 p-3">
                          <p className="text-slate-400">Treatment Plan</p>
                          <p className="mt-1">{record.treatmentPlan || "Not set"}</p>
                        </div>
                        <div className="rounded-2xl bg-white/6 p-3">
                          <p className="text-slate-400">Attachments</p>
                          <p className="mt-1">{record.clinicalAttachments.length}</p>
                        </div>
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
