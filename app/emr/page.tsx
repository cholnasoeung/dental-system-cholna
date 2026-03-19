"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import { AdminShell } from "@/components/admin-shell";
import {
  billableTreatmentIdsByCondition,
  initialDentalRecordForm,
  odontogramToothNumbers,
  treatmentCatalog,
  treatmentStatusOptions,
  toothConditionOptions,
  type ClinicalAttachment,
  type DentalRecord,
  type DentalRecordFormState,
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

function getConditionBadge(condition: ToothCondition) {
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

function getToothTreatmentBadge(status: TreatmentStatus) {
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
    billableTreatmentId: tooth.billableTreatmentId ?? "",
    billableUnitPrice: tooth.billableUnitPrice ?? null,
  };
}

function allowedTreatmentsForCondition(condition: ToothCondition) {
  const allowedIds = billableTreatmentIdsByCondition[condition] ?? [];
  return treatmentCatalog.filter((item) => allowedIds.includes(item.id));
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
  const toneClass = isSelected
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

  const toothShape =
    toothType === "molar"
      ? "M13 25C13 15 18 9 23 9c4 0 6 2 7 5 1-3 3-5 7-5 5 0 10 6 10 16 0 11-2 20-5 27-3 7-5 14-6 28H24c-1-14-3-21-6-28-3-7-5-16-5-27Z"
      : toothType === "premolar"
        ? "M18 21c1-8 5-13 12-13s11 5 12 13c1 10-1 20-4 27-3 7-5 15-6 29h-4c-1-14-3-22-6-29-3-7-5-17-4-27Z"
        : toothType === "canine"
          ? "M24 15c2-6 4-9 6-9s4 3 6 9c3 9 3 18 1 26-2 8-4 18-5 35h-4c-1-17-3-27-5-35-2-8-2-17 1-26Z"
          : "M21 15c2-5 5-7 9-7s7 2 9 7c2 8 2 17 0 24-2 10-4 21-5 37h-8c-1-16-3-27-5-37-2-7-2-16 0-24Z";

  return (
    <div className="relative flex h-16 items-center justify-center md:h-20">
      <svg
        viewBox="0 0 60 104"
        className={`h-14 w-8 drop-shadow-[0_3px_6px_rgba(148,163,184,0.18)] md:h-[4.4rem] md:w-11 ${toneClass} ${isLower ? "rotate-180" : ""}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`tooth-fill-${toothNumber}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="52%" stopColor="#f8fbff" />
            <stop offset="100%" stopColor="#e5eef9" />
          </linearGradient>
          <linearGradient id={`tooth-shade-${toothNumber}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.92)" />
            <stop offset="100%" stopColor="rgba(203,213,225,0.38)" />
          </linearGradient>
        </defs>

        <path d={toothShape} fill={`url(#tooth-fill-${toothNumber})`} />
        <path d={toothShape} className="opacity-95" />
        <path
          d={toothShape}
          fill={`url(#tooth-shade-${toothNumber})`}
          stroke="none"
          className="opacity-50"
        />
        <path d="M24 18c2 4 4 6 6 6s4-2 6-6" className="opacity-35" />
        <path d="M30 24v48" className="opacity-22" />

        {condition === "filling" ? (
          <>
            <path d="M21 33h18" className="text-sky-500" strokeWidth="2.2" />
            <path d="M22 38h16" className="text-sky-400" strokeWidth="2.2" />
          </>
        ) : null}
        {condition === "crown" ? (
          <path
            d="M18 24c4 3 8 5 12 5s8-2 12-5"
            className="text-amber-500"
            strokeWidth="2.2"
          />
        ) : null}
        {condition === "root-canal" ? (
          <>
            <path d="M30 28v43" className="text-violet-500" strokeWidth="2.2" />
            <path d="M25 50h10" className="text-violet-400" strokeWidth="1.8" />
          </>
        ) : null}
        {condition === "caries" ? (
          <>
            <circle cx="30" cy="35" r="5.5" className="fill-rose-500/90 stroke-rose-500" />
            <circle cx="28.5" cy="33.8" r="1.4" className="fill-rose-200 stroke-none" />
          </>
        ) : null}
      </svg>

      {condition === "missing" ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="h-14 w-8 text-rose-600 md:h-[4.4rem] md:w-11">
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
          <svg viewBox="0 0 100 100" className="h-14 w-8 text-emerald-500 md:h-[4.4rem] md:w-11">
            <path d="M50 18v50" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            <path d="M40 33h20M40 43h20M40 53h20" stroke="currentColor" strokeWidth="2.8" />
            <path d="M37 72c6-4 20-4 26 0" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
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
        <div className="h-px flex-1 bg-slate-200 ml-4" />
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
              className={`rounded-[20px] border px-1 py-2 transition md:rounded-[24px] md:px-1.5 md:py-2.5 ${
                isSelected
                  ? "border-sky-300 bg-[linear-gradient(180deg,#eff9ff_0%,#dff2ff_100%)] shadow-[0_16px_34px_rgba(14,165,233,0.16)]"
                  : "border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] hover:border-slate-300 hover:bg-slate-50 hover:shadow-[0_12px_24px_rgba(148,163,184,0.10)]"
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
      treatmentProcess: "",
      treatmentStatus: "planned",
      billableTreatmentId: "",
      billableUnitPrice: null,
    })),
  );
  const [selectedToothNumber, setSelectedToothNumber] = useState("11");
  const [showClinicalDetails, setShowClinicalDetails] = useState(false);
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
    field:
      | "condition"
      | "notes"
      | "treatmentProcess"
      | "treatmentStatus"
      | "billableTreatmentId"
      | "billableUnitPrice",
    value: string,
  ) {
    setOdontogram((current) =>
      current.map((tooth) =>
        tooth.toothNumber === toothNumber
          ? {
              ...tooth,
              [field]:
                field === "billableUnitPrice"
                  ? value === ""
                    ? null
                    : Number(value)
                  : value,
            }
          : tooth,
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
          treatmentProcess: "",
          treatmentStatus: "planned",
          billableTreatmentId: "",
          billableUnitPrice: null,
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
  const toothLookup = new Map(
    odontogram.map((tooth) => [tooth.toothNumber, tooth] as const),
  );
  const selectedTooth = normalizeTooth(
    toothLookup.get(selectedToothNumber) ?? toothLookup.get("11") ?? odontogram[0],
  );
  const allowedBillableTreatments = allowedTreatmentsForCondition(selectedTooth.condition);

  return (
    <AdminShell>
      <div className="w-full space-y-6">
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
                This is the clinical section of your flow: dentist opens the record,
                reviews history, performs examination and diagnosis, creates the
                treatment plan, updates the tooth chart and notes, and saves the visit.
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

        <div className="space-y-6">
          <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <div>
              <h3 className="text-xl font-semibold text-slate-950">Create EMR Entry</h3>
              <p className="mt-1 text-sm text-slate-500">
                Use this form for review history, diagnosis, treatment planning, tooth chart updates, and save-to-system.
              </p>
            </div>

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

              <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                <button
                  type="button"
                  onClick={() => setShowClinicalDetails((current) => !current)}
                  className="flex w-full items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3 text-left shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Clinical Notes & Treatment Details
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {showClinicalDetails
                        ? "Hide consultation notes, diagnosis, treatment plan, and procedure history."
                        : "Click to add consultation notes, diagnosis, treatment plan, and procedure history."}
                    </p>
                  </div>
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                    {showClinicalDetails ? "Hide" : "Show"}
                  </span>
                </button>

                {showClinicalDetails ? (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-sm font-medium text-slate-700">
                        Consultation Notes
                      </span>
                      <textarea
                        name="consultationNotes"
                        value={recordForm.consultationNotes}
                        onChange={handleFieldChange}
                        placeholder="Clinical findings and observations"
                        className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-sm font-medium text-slate-700">
                        Diagnoses
                      </span>
                      <textarea
                        name="diagnoses"
                        value={recordForm.diagnoses}
                        onChange={handleFieldChange}
                        placeholder="Pulpitis, caries, gingivitis"
                        className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400"
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
                        className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-sm font-medium text-slate-700">
                        Current Treatment Step
                      </span>
                      <input
                        name="treatmentStep"
                        value={recordForm.treatmentStep}
                        onChange={handleFieldChange}
                        placeholder="Step 1: X-ray and diagnosis"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-sm font-medium text-slate-700">
                        Treatment Status
                      </span>
                      <select
                        name="treatmentStatus"
                        value={recordForm.treatmentStatus}
                        onChange={handleFieldChange}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400"
                      >
                        {treatmentStatusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
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
                        className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400"
                      />
                    </label>
                  </div>
                ) : null}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-semibold text-slate-950">
                    Tooth Chart / Odontogram
                  </h4>
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
                    Standard permanent chart
                  </span>
                </div>
                <div className="mt-3 rounded-[30px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 shadow-inner shadow-sky-50/60 md:p-5">
                  <div className="space-y-5">
                    <div className="space-y-5 rounded-[26px] border border-slate-200/80 bg-white/80 p-4 md:p-5">
                      <OdontogramRow
                        title="Upper Arch"
                        teeth={upperArchTeeth}
                        selectedToothNumber={selectedToothNumber}
                        toothLookup={toothLookup}
                        onSelectTooth={setSelectedToothNumber}
                      />
                      <div className="h-px bg-slate-200" />
                      <OdontogramRow
                        title="Lower Arch"
                        teeth={lowerArchTeeth}
                        isLower
                        selectedToothNumber={selectedToothNumber}
                        toothLookup={toothLookup}
                        onSelectTooth={setSelectedToothNumber}
                      />
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[200px_minmax(0,1fr)]">
                      <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_18px_34px_rgba(15,23,42,0.06)]">
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                          Selected Tooth
                        </p>
                        <div className="mt-3 flex items-start justify-between gap-3 xl:block">
                          <div>
                            <h5 className="text-3xl font-semibold text-slate-950">
                              {selectedTooth.toothNumber}
                            </h5>
                            <p className="mt-1 text-sm text-slate-500">
                              Update findings for the active tooth.
                            </p>
                          </div>
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getConditionBadge(
                              selectedTooth.condition,
                            )}`}
                          >
                            {selectedTooth.condition.replace("-", " ")}
                          </span>
                          <span
                            className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getToothTreatmentBadge(
                              selectedTooth.treatmentStatus,
                            )}`}
                          >
                            {(selectedTooth.treatmentStatus ?? "planned").replace("-", " ")}
                          </span>
                          <p className="mt-2 text-xs font-medium uppercase tracking-[0.22em] text-slate-500">
                            Billing:{" "}
                            {treatmentCatalog.find(
                              (item) => item.id === selectedTooth.billableTreatmentId,
                            )?.name ?? "Not billable"}
                          </p>
                        </div>

                        <div className="mt-4 rounded-3xl bg-slate-50 p-4">
                          <ToothIllustration
                            toothNumber={selectedTooth.toothNumber}
                            condition={selectedTooth.condition}
                            isSelected
                            isLower={
                              lowerLeftTeeth.includes(selectedTooth.toothNumber) ||
                              lowerRightTeeth.includes(selectedTooth.toothNumber)
                            }
                          />
                        </div>
                      </div>

                      <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_18px_34px_rgba(15,23,42,0.06)]">
                        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                          <label className="space-y-1">
                            <span className="text-sm font-medium text-slate-700">
                              Condition
                            </span>
                            <select
                              value={selectedTooth.condition}
                              onChange={(event) => {
                                const nextCondition = event.target.value as ToothCondition;
                                const nextAllowedTreatments =
                                  allowedTreatmentsForCondition(nextCondition);
                                const canKeepCurrentTreatment = nextAllowedTreatments.some(
                                  (item) => item.id === selectedTooth.billableTreatmentId,
                                );

                                handleToothChange(
                                  selectedTooth.toothNumber,
                                  "condition",
                                  nextCondition,
                                );

                                if (!canKeepCurrentTreatment) {
                                  handleToothChange(
                                    selectedTooth.toothNumber,
                                    "billableTreatmentId",
                                    "",
                                  );
                                  handleToothChange(
                                    selectedTooth.toothNumber,
                                    "billableUnitPrice",
                                    "",
                                  );
                                }
                              }}
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
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
                              Clinical Note
                            </span>
                            <textarea
                              value={selectedTooth.notes}
                              onChange={(event) =>
                                handleToothChange(
                                  selectedTooth.toothNumber,
                                  "notes",
                                  event.target.value,
                                )
                              }
                              placeholder="Mobility, percussion pain, fracture line, restoration margin..."
                              className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                            />
                          </label>
                        </div>

                        <div className="mt-4 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                          <label className="space-y-1">
                            <span className="text-sm font-medium text-slate-700">
                              Billable Treatment
                            </span>
                            <select
                              value={selectedTooth.billableTreatmentId}
                              onChange={(event) =>
                                {
                                  const nextTreatmentId = event.target.value;
                                  const catalogItem = treatmentCatalog.find(
                                    (item) => item.id === nextTreatmentId,
                                  );
                                  handleToothChange(
                                    selectedTooth.toothNumber,
                                    "billableTreatmentId",
                                    nextTreatmentId,
                                  );
                                  handleToothChange(
                                    selectedTooth.toothNumber,
                                    "billableUnitPrice",
                                    nextTreatmentId
                                      ? String(catalogItem?.defaultPrice ?? "")
                                      : "",
                                  );
                                }
                              }
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                            >
                              <option value="">Not billable</option>
                              {allowedBillableTreatments.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name} - ${item.defaultPrice} / {item.pricingModel}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="space-y-1">
                            <span className="text-sm font-medium text-slate-700">
                              Tooth Price
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={selectedTooth.billableUnitPrice ?? ""}
                              onChange={(event) =>
                                handleToothChange(
                                  selectedTooth.toothNumber,
                                  "billableUnitPrice",
                                  event.target.value,
                                )
                              }
                              placeholder={
                                selectedTooth.billableTreatmentId
                                  ? String(
                                      treatmentCatalog.find(
                                        (item) => item.id === selectedTooth.billableTreatmentId,
                                      )?.defaultPrice ?? "",
                                    )
                                  : "No price"
                              }
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                            />
                          </label>
                        </div>

                        <div className="mt-4 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                          <label className="space-y-1">
                            <span className="text-sm font-medium text-slate-700">
                              Tooth Treatment Status
                            </span>
                            <select
                              value={selectedTooth.treatmentStatus ?? "planned"}
                              onChange={(event) =>
                                handleToothChange(
                                  selectedTooth.toothNumber,
                                  "treatmentStatus",
                                  event.target.value,
                                )
                              }
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
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
                                handleToothChange(
                                  selectedTooth.toothNumber,
                                  "treatmentProcess",
                                  event.target.value,
                                )
                              }
                              placeholder="Etching done, temporary filling placed, next visit for crown fitting..."
                              className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                            />
                          </label>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                            Healthy
                          </span>
                          <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
                            Caries / Missing
                          </span>
                          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                            Filling
                          </span>
                          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                            Crown
                          </span>
                          <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                            Root canal
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
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

          <div className="space-y-6">
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
          </div>
        </div>
      </div>
    </AdminShell>
  );
}


