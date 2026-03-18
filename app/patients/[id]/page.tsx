"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AdminShell } from "@/components/admin-shell";
import {
  toothConditionOptions,
  treatmentStatusOptions,
  type DentalRecord,
  type OdontogramTooth,
  type PatientProfile,
  type ToothCondition,
  type TreatmentStatus,
} from "@/lib/clinic-types";

const upperLeftTeeth = ["18", "17", "16", "15", "14", "13", "12", "11"];
const upperRightTeeth = ["21", "22", "23", "24", "25", "26", "27", "28"];
const lowerLeftTeeth = ["48", "47", "46", "45", "44", "43", "42", "41"];
const lowerRightTeeth = ["31", "32", "33", "34", "35", "36", "37", "38"];
const upperArchTeeth = [...upperLeftTeeth, ...upperRightTeeth];
const lowerArchTeeth = [...lowerLeftTeeth, ...lowerRightTeeth];

function getToothType(toothNumber: string) {
  const position = Number(toothNumber.slice(1));

  if (position === 1 || position === 2) {
    return "incisor";
  }

  if (position === 3) {
    return "canine";
  }

  if (position === 4 || position === 5) {
    return "premolar";
  }

  return "molar";
}

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

function calculateAge(dateOfBirth: string) {
  if (!dateOfBirth) {
    return "Not set";
  }

  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDifference = today.getMonth() - birth.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birth.getDate())
  ) {
    age -= 1;
  }

  return `${age} yrs`;
}

function getToothConditionClass(condition: string) {
  switch (condition) {
    case "healthy":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "caries":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "filling":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "crown":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "missing":
      return "border-slate-300 bg-slate-100 text-slate-700";
    case "implant":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "root-canal":
      return "border-violet-200 bg-violet-50 text-violet-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function getTreatmentStatusClass(status: TreatmentStatus) {
  switch (status) {
    case "planned":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
    case "in-progress":
      return "bg-sky-50 text-sky-700 ring-1 ring-sky-200";
    case "completed":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  }
}

function getToothTreatmentStatusClass(status: TreatmentStatus) {
  switch (status) {
    case "planned":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "in-progress":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function normalizeTooth(tooth: OdontogramTooth): OdontogramTooth {
  return {
    ...tooth,
    notes: tooth.notes ?? "",
    treatmentProcess: tooth.treatmentProcess ?? "",
    treatmentStatus: tooth.treatmentStatus ?? "planned",
  };
}

function ToothIllustration({
  toothNumber,
  condition,
  isSelected,
  isLower,
}: {
  toothNumber: string;
  condition: ToothCondition;
  isSelected: boolean;
  isLower: boolean;
}) {
  const toothType = getToothType(toothNumber);
  const outlineClass = isSelected
    ? "text-sky-600"
    : condition === "healthy"
      ? "text-slate-500"
      : condition === "caries"
        ? "text-rose-500"
        : condition === "filling"
          ? "text-sky-500"
          : condition === "crown"
            ? "text-amber-500"
            : condition === "implant"
              ? "text-emerald-500"
              : condition === "root-canal"
                ? "text-violet-500"
                : "text-slate-400";

  return (
    <div className="relative flex h-16 items-center justify-center md:h-20">
      <svg
        viewBox="0 0 60 104"
        className={`h-14 w-8 md:h-16 md:w-10 ${outlineClass} ${isLower ? "rotate-180" : ""}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {toothType === "molar" ? (
          <path d="M12 23C14 12 19 8 24 8c3 0 5 2 6 5 1-3 3-5 6-5 5 0 10 4 12 15 3 18 1 31-4 39-4 7-5 15-6 29H24c-1-14-2-22-6-29-5-8-7-21-6-39Z" />
        ) : null}
        {toothType === "premolar" ? (
          <path d="M18 18c2-8 6-12 12-12s10 4 12 12c4 17 3 32-2 41-5 9-7 18-8 32h-4c-1-14-3-23-8-32-5-9-6-24-2-41Z" />
        ) : null}
        {toothType === "canine" ? (
          <path d="M24 11c2-5 4-7 6-7s4 2 6 7c5 16 5 35 1 47-4 13-6 22-7 33h-2c-1-11-3-20-7-33-4-12-4-31 1-47Z" />
        ) : null}
        {toothType === "incisor" ? (
          <path d="M21 10c2-4 5-6 9-6s7 2 9 6c3 10 4 27 1 43-3 14-5 24-6 38h-8c-1-14-3-24-6-38-3-16-2-33 1-43Z" />
        ) : null}

        {condition === "filling" ? (
          <path d="M21 29h18M20 36h20" className="text-sky-500" />
        ) : null}
        {condition === "crown" ? (
          <path d="M17 20c4 4 8 6 13 6s9-2 13-6" className="text-amber-500" />
        ) : null}
        {condition === "root-canal" ? (
          <path d="M30 28v44" className="text-violet-500" />
        ) : null}
        {condition === "caries" ? (
          <circle cx="30" cy="35" r="5" className="fill-rose-500 stroke-rose-500" />
        ) : null}
      </svg>

      {condition === "missing" ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="h-14 w-8 text-rose-600 md:h-16 md:w-10">
            <path
              d="M18 14 82 86M82 14 18 86"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>
      ) : null}

      {condition === "implant" ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="h-14 w-8 text-emerald-500 md:h-16 md:w-10">
            <path
              d="M28 16 72 84M72 16 28 84"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      ) : null}
    </div>
  );
}

function OdontogramRow({
  title,
  teeth,
  isLower = false,
  selectedToothNumber,
  toothLookup,
  onSelectTooth,
}: {
  title: string;
  teeth: string[];
  isLower?: boolean;
  selectedToothNumber: string;
  toothLookup: Map<string, OdontogramTooth>;
  onSelectTooth: (toothNumber: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
          {title}
        </p>
        <div className="ml-4 h-px flex-1 bg-slate-200" />
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8 xl:grid-cols-[repeat(16,minmax(0,1fr))] xl:gap-2">
        {teeth.map((toothNumber) => {
          const tooth = toothLookup.get(toothNumber);

          if (!tooth) {
            return null;
          }

          const isSelected = toothNumber === selectedToothNumber;

          return (
            <button
              key={toothNumber}
              type="button"
              onClick={() => onSelectTooth(toothNumber)}
              className={`rounded-[18px] border px-1 py-1.5 transition md:rounded-[22px] md:px-1.5 md:py-2 ${
                isSelected
                  ? "border-sky-300 bg-sky-50 shadow-[0_14px_30px_rgba(14,165,233,0.14)]"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <ToothIllustration
                toothNumber={toothNumber}
                condition={tooth.condition}
                isSelected={isSelected}
                isLower={isLower}
              />
              <p className="mt-1 text-center text-xs font-semibold text-slate-900 md:text-sm">
                {toothNumber}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const patientId = typeof params.id === "string" ? params.id : "";

  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [records, setRecords] = useState<DentalRecord[]>([]);
  const [openRecordId, setOpenRecordId] = useState("");
  const [selectedToothNumbers, setSelectedToothNumbers] = useState<
    Record<string, string>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingRecordId, setSavingRecordId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadPatientRecord() {
      if (!patientId) {
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage("");

        const [patientResponse, recordsResponse] = await Promise.all([
          fetch(`/api/patients/${patientId}`, { cache: "no-store" }),
          fetch(`/api/emr?patientId=${patientId}`, { cache: "no-store" }),
        ]);

        if (!patientResponse.ok || !recordsResponse.ok) {
          throw new Error(
            `${patientResponse.ok ? "" : await patientResponse.text()} ${
              recordsResponse.ok ? "" : await recordsResponse.text()
            }`.trim(),
          );
        }

        const [patientData, recordsData] = await Promise.all([
          (await patientResponse.json()) as PatientProfile,
          (await recordsResponse.json()) as DentalRecord[],
        ]);

        const normalizedRecords = recordsData.map((record) => ({
          ...record,
          treatmentStep: record.treatmentStep ?? "",
          treatmentStatus: record.treatmentStatus ?? "planned",
          odontogram: record.odontogram.map((tooth) => normalizeTooth(tooth)),
        }));

        setPatient(patientData);
        setRecords(normalizedRecords);
        setSelectedToothNumbers(
          normalizedRecords.reduce<Record<string, string>>((acc, record) => {
            acc[record.id] = record.odontogram[0]?.toothNumber ?? "11";
            return acc;
          }, {}),
        );
        setOpenRecordId(normalizedRecords[0]?.id ?? "");
      } catch (error) {
        console.error(error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load patient dental records.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadPatientRecord();
  }, [patientId]);

  function updateRecordField<K extends keyof DentalRecord>(
    recordId: string,
    field: K,
    value: DentalRecord[K],
  ) {
    setRecords((current) =>
      current.map((record) =>
        record.id === recordId ? { ...record, [field]: value } : record,
      ),
    );
  }

  function updateToothField(
    recordId: string,
    toothNumber: string,
    field: "condition" | "notes" | "treatmentProcess" | "treatmentStatus",
    value: string,
  ) {
    setRecords((current) =>
      current.map((record) =>
        record.id === recordId
          ? {
              ...record,
              odontogram: record.odontogram.map((tooth) =>
                tooth.toothNumber === toothNumber
                  ? {
                      ...tooth,
                      [field]:
                        field === "condition" ? (value as ToothCondition) : value,
                    }
                  : tooth,
              ),
            }
          : record,
      ),
    );
  }

  async function saveRecord(record: DentalRecord) {
    try {
      setSavingRecordId(record.id);
      setErrorMessage("");

      const response = await fetch(`/api/emr/${record.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId: record.patientId,
          patientName: record.patientName,
          visitDate: record.visitDate,
          chiefComplaint: record.chiefComplaint,
          consultationNotes: record.consultationNotes,
          diagnoses: record.diagnoses,
          treatmentPlan: record.treatmentPlan,
          treatmentStep: record.treatmentStep,
          treatmentStatus: record.treatmentStatus,
          procedureHistory: record.procedureHistory,
          clinicalAttachments: record.clinicalAttachments,
          odontogram: record.odontogram,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to update the EMR visit.",
      );
    } finally {
      setSavingRecordId("");
    }
  }

  const affectedTeethCount = useMemo(
    () =>
      records.reduce(
        (count, record) =>
          count +
          record.odontogram.filter((tooth) => tooth.condition !== "healthy").length,
        0,
      ),
    [records],
  );

  return (
    <AdminShell>
      <div className="w-full space-y-6">
        <header className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link
                href="/patients"
                className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-700"
              >
                Back To Patients
              </Link>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                {patient?.fullName || "Patient Record"}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Review profile details, update tooth conditions, and track each
                treatment step through completion for this patient.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">
                  Visits
                </p>
                <p className="mt-2 text-2xl font-semibold">{records.length}</p>
              </div>
              <div className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  Affected Teeth
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {affectedTeethCount}
                </p>
              </div>
              <div className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  X-Rays
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {patient?.xrays.length ?? 0}
                </p>
              </div>
            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="rounded-[24px] border border-sky-100 bg-sky-50 px-5 py-4 text-sm text-sky-800">
            Loading patient record from MongoDB...
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-[24px] border border-rose-100 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        {patient ? (
          <>
            <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                    Phone
                  </p>
                  <p className="mt-2 font-semibold text-slate-950">{patient.phone}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                    Date Of Birth
                  </p>
                  <p className="mt-2 font-semibold text-slate-950">
                    {formatDateLabel(patient.dateOfBirth)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Age {calculateAge(patient.dateOfBirth)}
                  </p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                    Allergies
                  </p>
                  <p className="mt-2 font-semibold text-slate-950">
                    {patient.allergies || "None recorded"}
                  </p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                    Insurance
                  </p>
                  <p className="mt-2 font-semibold text-slate-950">
                    {patient.insuranceProvider || "No insurance"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {patient.policyNumber || "No policy number"}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                    Medical History
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {patient.medicalHistory || "No medical history recorded."}
                  </p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                    Emergency Contact
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {patient.emergencyContactName || "Not set"}
                  </p>
                  <p className="text-sm leading-6 text-slate-500">
                    {patient.emergencyContactRelation || "Relation not set"}
                    {patient.emergencyContactPhone
                      ? ` • ${patient.emergencyContactPhone}`
                      : ""}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-700">
                    EMR History
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-950">
                    Dental Visits & Tooth Records
                  </h3>
                </div>
                <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                  Open a visit to edit teeth and treatment progress
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {records.length === 0 ? (
                  <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200">
                    <p className="text-sm text-slate-600">
                      No EMR visit records found for this patient yet.
                    </p>
                  </div>
                ) : (
                  records.map((record) => {
                    const isOpen = openRecordId === record.id;
                    const affectedTeeth = record.odontogram.filter(
                      (tooth) => tooth.condition !== "healthy",
                    );
                    const toothLookup = new Map(
                      record.odontogram.map((tooth) => [tooth.toothNumber, tooth] as const),
                    );
                    const selectedToothNumber =
                      selectedToothNumbers[record.id] ?? record.odontogram[0]?.toothNumber ?? "11";
                    const selectedToothSource =
                      toothLookup.get(selectedToothNumber) ?? record.odontogram[0];
                    const selectedTooth = selectedToothSource
                      ? normalizeTooth(selectedToothSource)
                      : null;

                    return (
                      <article
                        key={record.id}
                        className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setOpenRecordId((current) =>
                              current === record.id ? "" : record.id,
                            )
                          }
                          className="flex w-full items-start justify-between gap-4 px-5 py-5 text-left transition hover:bg-slate-50"
                        >
                          <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
                              Visit {formatDateLabel(record.visitDate)}
                            </p>
                            <h4 className="mt-2 text-lg font-semibold text-slate-950">
                              {record.chiefComplaint || "General dental visit"}
                            </h4>
                            <p className="mt-2 text-sm text-slate-600">
                              Diagnosis: {record.diagnoses || "Not recorded"}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="flex flex-col items-end gap-2">
                              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                                {affectedTeeth.length} affected
                              </span>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getTreatmentStatusClass(
                                  record.treatmentStatus,
                                )}`}
                              >
                                {record.treatmentStatus.replace("-", " ")}
                              </span>
                            </div>
                            <p className="mt-3 text-sm font-medium text-slate-500">
                              {isOpen ? "Hide detail" : "Show detail"}
                            </p>
                          </div>
                        </button>

                        {isOpen ? (
                          <div className="border-t border-slate-200 bg-slate-50/60 px-5 py-5">
                            <div className="grid gap-4 lg:grid-cols-3">
                              <label className="rounded-3xl bg-white p-4 ring-1 ring-slate-200">
                                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                                  Consultation Notes
                                </p>
                                <textarea
                                  value={record.consultationNotes}
                                  onChange={(event) =>
                                    updateRecordField(
                                      record.id,
                                      "consultationNotes",
                                      event.target.value,
                                    )
                                  }
                                  className="mt-2 min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
                                />
                              </label>
                              <label className="rounded-3xl bg-white p-4 ring-1 ring-slate-200">
                                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                                  Treatment Plan
                                </p>
                                <textarea
                                  value={record.treatmentPlan}
                                  onChange={(event) =>
                                    updateRecordField(
                                      record.id,
                                      "treatmentPlan",
                                      event.target.value,
                                    )
                                  }
                                  className="mt-2 min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
                                />
                              </label>
                              <label className="rounded-3xl bg-white p-4 ring-1 ring-slate-200">
                                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                                  Procedure History
                                </p>
                                <textarea
                                  value={record.procedureHistory}
                                  onChange={(event) =>
                                    updateRecordField(
                                      record.id,
                                      "procedureHistory",
                                      event.target.value,
                                    )
                                  }
                                  className="mt-2 min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
                                />
                              </label>
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                              <label className="rounded-3xl bg-white p-4 ring-1 ring-slate-200">
                                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                                  Current Treatment Step
                                </p>
                                <input
                                  value={record.treatmentStep}
                                  onChange={(event) =>
                                    updateRecordField(
                                      record.id,
                                      "treatmentStep",
                                      event.target.value,
                                    )
                                  }
                                  placeholder="Step 2: Caries removal and temporary filling"
                                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
                                />
                              </label>
                              <label className="rounded-3xl bg-white p-4 ring-1 ring-slate-200">
                                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                                  Treatment Status
                                </p>
                                <select
                                  value={record.treatmentStatus}
                                  onChange={(event) =>
                                    updateRecordField(
                                      record.id,
                                      "treatmentStatus",
                                      event.target.value as TreatmentStatus,
                                    )
                                  }
                                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
                                >
                                  {treatmentStatusOptions.map((status) => (
                                    <option key={status} value={status}>
                                      {status}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="rounded-3xl bg-white p-4 ring-1 ring-slate-200">
                                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                                  Diagnosis
                                </p>
                                <input
                                  value={record.diagnoses}
                                  onChange={(event) =>
                                    updateRecordField(record.id, "diagnoses", event.target.value)
                                  }
                                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
                                />
                              </label>
                            </div>

                            <div className="mt-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
                              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                                    Saved Odontogram
                                  </p>
                                  <h5 className="mt-2 text-xl font-semibold text-slate-950">
                                    Teeth Record Detail
                                  </h5>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {affectedTeeth.length === 0 ? (
                                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                      All teeth marked healthy
                                    </span>
                                  ) : (
                                    affectedTeeth.map((tooth) => (
                                      <span
                                        key={`${record.id}-${tooth.toothNumber}`}
                                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${getToothConditionClass(
                                          tooth.condition,
                                        )}`}
                                      >
                                        {tooth.toothNumber} {tooth.condition.replace("-", " ")}
                                      </span>
                                    ))
                                  )}
                                </div>
                              </div>

                              <div className="mt-5 space-y-5 rounded-[26px] border border-slate-200/80 bg-white/80 p-4 md:p-5">
                                <OdontogramRow
                                  title="Upper Arch"
                                  teeth={upperArchTeeth}
                                  selectedToothNumber={selectedToothNumber}
                                  toothLookup={toothLookup}
                                  onSelectTooth={(toothNumber) =>
                                    setSelectedToothNumbers((current) => ({
                                      ...current,
                                      [record.id]: toothNumber,
                                    }))
                                  }
                                />
                                <div className="h-px bg-slate-200" />
                                <OdontogramRow
                                  title="Lower Arch"
                                  teeth={lowerArchTeeth}
                                  isLower
                                  selectedToothNumber={selectedToothNumber}
                                  toothLookup={toothLookup}
                                  onSelectTooth={(toothNumber) =>
                                    setSelectedToothNumbers((current) => ({
                                      ...current,
                                      [record.id]: toothNumber,
                                    }))
                                  }
                                />
                              </div>
                            </div>

                            {selectedTooth ? (
                              <div className="mt-4 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                                <div className="rounded-3xl bg-white p-4 ring-1 ring-slate-200">
                                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                                    Tooth To Edit
                                  </p>
                                  <select
                                    value={selectedToothNumber}
                                    onChange={(event) =>
                                      setSelectedToothNumbers((current) => ({
                                        ...current,
                                        [record.id]: event.target.value,
                                      }))
                                    }
                                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
                                  >
                                    {record.odontogram.map((tooth) => (
                                      <option key={tooth.toothNumber} value={tooth.toothNumber}>
                                        Tooth {tooth.toothNumber}
                                      </option>
                                    ))}
                                  </select>
                                  <span
                                    className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getToothConditionClass(
                                      selectedTooth.condition,
                                    )}`}
                                  >
                                    {selectedTooth.condition.replace("-", " ")}
                                  </span>
                                  <span
                                    className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getToothTreatmentStatusClass(
                                      selectedTooth.treatmentStatus,
                                    )}`}
                                  >
                                    {(selectedTooth.treatmentStatus ?? "planned").replace("-", " ")}
                                  </span>
                                </div>
                                <div className="rounded-3xl bg-white p-4 ring-1 ring-slate-200">
                                  <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                                    <label className="space-y-1">
                                      <span className="text-sm font-medium text-slate-700">
                                        Tooth Condition
                                      </span>
                                      <select
                                        value={selectedTooth.condition}
                                        onChange={(event) =>
                                          updateToothField(
                                            record.id,
                                            selectedTooth.toothNumber,
                                            "condition",
                                            event.target.value,
                                          )
                                        }
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
                                      >
                                        {toothConditionOptions.map((condition) => (
                                          <option key={condition} value={condition}>
                                            {condition.replace("-", " ")}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                    <label className="space-y-1">
                                      <span className="text-sm font-medium text-slate-700">
                                        Tooth Note
                                      </span>
                                      <textarea
                                        value={selectedTooth.notes}
                                        onChange={(event) =>
                                          updateToothField(
                                            record.id,
                                            selectedTooth.toothNumber,
                                            "notes",
                                            event.target.value,
                                          )
                                        }
                                        placeholder="Sensitivity, temporary crown, next review step..."
                                        className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
                                      />
                                    </label>
                                  </div>

                                  <div className="mt-4 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                                    <label className="space-y-1">
                                      <span className="text-sm font-medium text-slate-700">
                                        Tooth Treatment Status
                                      </span>
                                      <select
                                        value={selectedTooth.treatmentStatus ?? "planned"}
                                        onChange={(event) =>
                                          updateToothField(
                                            record.id,
                                            selectedTooth.toothNumber,
                                            "treatmentStatus",
                                            event.target.value,
                                          )
                                        }
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
                                      >
                                        {treatmentStatusOptions.map((status) => (
                                          <option key={status} value={status}>
                                            {status.replace("-", " ")}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                    <label className="space-y-1">
                                      <span className="text-sm font-medium text-slate-700">
                                        Tooth Treatment Process
                                      </span>
                                      <textarea
                                        value={selectedTooth.treatmentProcess ?? ""}
                                        onChange={(event) =>
                                          updateToothField(
                                            record.id,
                                            selectedTooth.toothNumber,
                                            "treatmentProcess",
                                            event.target.value,
                                          )
                                        }
                                        placeholder="Decay removed, medicament placed, review after one week..."
                                        className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
                                      />
                                    </label>
                                  </div>
                                </div>
                              </div>
                            ) : null}

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                              <div className="rounded-3xl bg-white p-4 ring-1 ring-slate-200">
                                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                                  Attachments
                                </p>
                                <div className="mt-2 space-y-2">
                                  {record.clinicalAttachments.length === 0 ? (
                                    <p className="text-sm text-slate-600">
                                      No clinical attachments saved.
                                    </p>
                                  ) : (
                                    record.clinicalAttachments.map((attachment) => (
                                      <div
                                        key={`${record.id}-${attachment.name}-${attachment.size}`}
                                        className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-700"
                                      >
                                        {attachment.name} • {attachment.category}
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                              <div className="rounded-3xl bg-white p-4 ring-1 ring-slate-200">
                                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                                  Visit Summary
                                </p>
                                <p className="mt-2 text-sm leading-6 text-slate-700">
                                  Complaint: {record.chiefComplaint || "Not recorded"}
                                </p>
                                <p className="mt-2 text-sm leading-6 text-slate-700">
                                  Step: {record.treatmentStep || "No active treatment step"}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 flex justify-end">
                              <button
                                type="button"
                                onClick={() => saveRecord(record)}
                                disabled={savingRecordId === record.id}
                                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                              >
                                {savingRecordId === record.id
                                  ? "Saving Changes..."
                                  : "Save Teeth & Treatment"}
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </AdminShell>
  );
}

