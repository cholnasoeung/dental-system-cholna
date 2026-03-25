"use client";

import { useEffect, useState } from "react";

import type {
  Appointment,
  DentalRecord,
  Invoice,
  PatientProfile,
  StaffMember,
} from "@/lib/clinic-types";

type ClinicOverviewState = {
  patients: PatientProfile[];
  appointments: Appointment[];
  invoices: Invoice[];
  records: DentalRecord[];
  staffMembers: StaffMember[];
};

const initialState: ClinicOverviewState = {
  patients: [],
  appointments: [],
  invoices: [],
  records: [],
  staffMembers: [],
};

export function useClinicOverviewData() {
  const [data, setData] = useState<ClinicOverviewState>(initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setErrorMessage("");
        const response = await fetch("/api/overview", { cache: "no-store" });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const payload = (await response.json()) as ClinicOverviewState;

        setData({
          patients: payload.patients ?? [],
          appointments: payload.appointments ?? [],
          invoices: payload.invoices ?? [],
          records: payload.records ?? [],
          staffMembers: payload.staffMembers ?? [],
        });
      } catch (error) {
        console.error(error);
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load clinic data.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, [refreshKey]);

  return {
    ...data,
    isLoading,
    errorMessage,
    reload: () => setRefreshKey((current) => current + 1),
  };
}
