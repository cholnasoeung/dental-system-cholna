import { NextResponse } from "next/server";

import { staffRoleOptions, staffPermissionOptions, type StaffMember } from "@/lib/clinic-types";
import { getDatabase } from "@/lib/mongodb";
import { hashPassword } from "@/lib/password";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

export const runtime = "nodejs";

type StaffAuthDocument = Omit<StaffMember, "id"> & {
  passwordHash: string;
  _id?: string;
};

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function getRegistrationErrorMessage(error: unknown) {
  if (
    error instanceof Error &&
    (
      error.message.includes("MongoDB") ||
      error.message.includes("MONGODB_URI") ||
      error.message.includes("DATABASE_URL")
    )
  ) {
    return "Unable to reach the database. Please check the database connection and try again.";
  }

  return "Registration failed.";
}

function getDefaultPermissionsForRole(role: StaffMember["role"]) {
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

export async function POST(request: Request) {
  try {
    const { fullName, email, password, role } = (await request.json()) as {
      fullName: string;
      email: string;
      password: string;
      role?: string;
    };

    if (!fullName || !email || !password) {
      return errorResponse("Full name, email, and password are required.");
    }

    if (role && !staffRoleOptions.includes(role as StaffMember["role"])) {
      return errorResponse("Selected role is invalid.");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = await getDatabase();
    const staffCollection = db.collection<StaffAuthDocument>("staff");
    const existingUser = await staffCollection.findOne({ email: normalizedEmail });

    if (existingUser) {
      return errorResponse("An account with this email already exists.", 409);
    }

    const staffCount = await staffCollection.countDocuments();
    const isFirstUser = staffCount === 0;
    const selectedRole = (role as StaffMember["role"] | undefined) ?? "receptionist";
    const assignedRole: StaffMember["role"] = isFirstUser ? "admin" : selectedRole;
    const permissions = isFirstUser
      ? [...staffPermissionOptions]
      : getDefaultPermissionsForRole(assignedRole);

    const payload: Omit<StaffAuthDocument, "_id"> = {
      fullName,
      role: assignedRole,
      email: normalizedEmail,
      phone: "",
      permissions,
      schedule: [],
      availabilityStatus: "available",
      passwordHash: hashPassword(password),
    };

    const result = await staffCollection.insertOne(payload);
    const token = await createSessionToken({
      userId: String(result.insertedId),
      email: normalizedEmail,
      fullName,
      role: assignedRole,
      permissions,
    });

    const response = NextResponse.json({
      ok: true,
      role: assignedRole,
      permissions,
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("POST /api/auth/register failed", error);
    return errorResponse(getRegistrationErrorMessage(error), 500);
  }
}
