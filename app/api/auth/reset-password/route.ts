import { NextResponse } from "next/server";

import type { StaffMember } from "@/lib/clinic-types";
import { getDatabase } from "@/lib/mongodb";
import { hashPassword, verifyPassword } from "@/lib/password";
import { hashPasswordResetToken } from "@/lib/password-reset";

export const runtime = "nodejs";

type StaffAuthDocument = Omit<StaffMember, "id"> & {
  passwordHash?: string;
  passwordResetTokenHash?: string;
  passwordResetTokenExpiresAt?: Date;
  _id?: string;
};

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function getResetPasswordErrorMessage(error: unknown) {
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

  return "Unable to reset the password.";
}

export async function POST(request: Request) {
  try {
    const { token, password } = (await request.json()) as {
      token: string;
      password: string;
    };

    if (!token || !password) {
      return errorResponse("Reset token and new password are required.");
    }

    if (password.length < 6) {
      return errorResponse("Password must be at least 6 characters long.");
    }

    const db = await getDatabase();
    const staffCollection = db.collection<StaffAuthDocument>("staff");
    const hashedToken = hashPasswordResetToken(token);
    const staffMember = await staffCollection.findOne({
      passwordResetTokenHash: hashedToken,
      passwordResetTokenExpiresAt: { $gt: new Date() },
    });

    if (!staffMember?._id) {
      return errorResponse("This password reset link is invalid or has expired.", 400);
    }

    if (staffMember.passwordHash && verifyPassword(password, staffMember.passwordHash)) {
      return errorResponse("Please choose a new password that is different from the current one.");
    }

    await staffCollection.updateOne(
      { _id: staffMember._id },
      {
        $set: {
          passwordHash: hashPassword(password),
        },
        $unset: {
          passwordResetTokenHash: "",
          passwordResetTokenExpiresAt: "",
        },
      },
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/auth/reset-password failed", error);
    return errorResponse(getResetPasswordErrorMessage(error), 500);
  }
}
