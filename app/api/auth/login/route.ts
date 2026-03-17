import { NextResponse } from "next/server";

import type { StaffMember } from "@/lib/clinic-types";
import { getDatabase } from "@/lib/mongodb";
import { verifyPassword } from "@/lib/password";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

export const runtime = "nodejs";

type StaffAuthDocument = Omit<StaffMember, "id"> & {
  passwordHash?: string;
  _id?: string;
};

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const { email, password } = (await request.json()) as {
      email: string;
      password: string;
    };

    if (!email || !password) {
      return errorResponse("Email and password are required.");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = await getDatabase();
    const staffMember = await db.collection<StaffAuthDocument>("staff").findOne({
      email: normalizedEmail,
    });

    if (!staffMember?.passwordHash || !verifyPassword(password, staffMember.passwordHash)) {
      return errorResponse("Invalid email or password.", 401);
    }

    const token = await createSessionToken({
      userId: String(staffMember._id),
      email: staffMember.email,
      fullName: staffMember.fullName,
      role: staffMember.role,
      permissions: staffMember.permissions ?? [],
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("POST /api/auth/login failed", error);
    return errorResponse("Login failed.", 500);
  }
}
