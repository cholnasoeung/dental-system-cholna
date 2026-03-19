import { staffPermissionOptions, type StaffMember } from "@/lib/clinic-types";

export function getDefaultPermissionsForRole(role: StaffMember["role"]) {
  switch (role) {
    case "admin":
      return [...staffPermissionOptions];
    case "manager":
      return [
        "patient-read",
        "patient-write",
        "appointment-manage",
        "billing-manage",
        "emr-manage",
        "report-view",
        "support-manage",
      ];
    case "dentist":
      return ["patient-read", "appointment-manage", "emr-manage"];
    case "nurse":
      return ["patient-read", "appointment-manage", "emr-manage"];
    case "receptionist":
      return [
        "patient-read",
        "appointment-manage",
        "billing-manage",
        "support-manage",
      ];
  }
}
