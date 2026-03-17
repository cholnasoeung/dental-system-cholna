import type { StaffMember } from "@/lib/clinic-types";

type AccessUser = {
  role?: StaffMember["role"];
  permissions?: string[];
};

export function hasPermission(user: AccessUser | null | undefined, permission: string) {
  return Boolean(user?.permissions?.includes(permission));
}

export function canAccessPath(
  pathname: string,
  method: string,
  user: AccessUser | null | undefined,
) {
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/unauthorized") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/portal")
  ) {
    return true;
  }

  if (!user) {
    return false;
  }

  const needsPatientWrite =
    pathname === "/patients/new" ||
    pathname.includes("/edit") ||
    (pathname.startsWith("/api/patients") && method !== "GET");

  if (needsPatientWrite) {
    return hasPermission(user, "patient-write");
  }

  if (pathname.startsWith("/patients") || pathname.startsWith("/api/patients")) {
    return hasPermission(user, "patient-read") || hasPermission(user, "patient-write");
  }

  if (pathname.startsWith("/appointments") || pathname.startsWith("/api/appointments")) {
    return hasPermission(user, "appointment-manage");
  }

  if (
    pathname.startsWith("/emr") ||
    pathname.startsWith("/prescriptions") ||
    pathname.startsWith("/api/emr") ||
    pathname.startsWith("/api/prescriptions")
  ) {
    return hasPermission(user, "emr-manage");
  }

  if (pathname.startsWith("/billing") || pathname.startsWith("/api/billing")) {
    return hasPermission(user, "billing-manage");
  }

  if (pathname.startsWith("/notifications") || pathname.startsWith("/api/notifications")) {
    return hasPermission(user, "appointment-manage");
  }

  if (pathname.startsWith("/reports")) {
    return hasPermission(user, "report-view");
  }

  if (pathname.startsWith("/staff") || pathname.startsWith("/api/staff")) {
    return hasPermission(user, "staff-manage") || user.role === "admin" || user.role === "manager";
  }

  return true;
}
