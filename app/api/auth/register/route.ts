import { NextResponse } from "next/server";

import { staffPermissionOptions, type StaffMember } from "@/lib/clinic-types";
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

export async function POST(request: Request) {
  try {
    const { fullName, email, password } = (await request.json()) as {
      fullName: string;
      email: string;
      password: string;
    };

    if (!fullName || !email || !password) {
      return errorResponse("Full name, email, and password are required.");
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
    const role: StaffMember["role"] = isFirstUser ? "admin" : "receptionist";
    const permissions = isFirstUser
      ? [...staffPermissionOptions]
      : ["patient-read", "appointment-manage"];

    const payload: Omit<StaffAuthDocument, "_id"> = {
      fullName,
      role,
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
      role,
      permissions,
    });

    const response = NextResponse.json({
      ok: true,
      role,
      permissions,
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("POST /api/auth/register failed", error);
    return errorResponse("Registration failed.", 500);
  }
}
