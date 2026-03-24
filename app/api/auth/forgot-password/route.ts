import { NextResponse } from "next/server";

import type { StaffMember } from "@/lib/clinic-types";
import { getDatabase } from "@/lib/mongodb";
import {
  createPasswordResetToken,
  getPasswordResetExpiryDate,
  getPasswordResetUrl,
  shouldExposePasswordResetPreview,
} from "@/lib/password-reset";

export const runtime = "nodejs";

type StaffAuthDocument = Omit<StaffMember, "id"> & {
  passwordHash?: string;
  passwordResetTokenHash?: string;
  passwordResetTokenExpiresAt?: Date;
  _id?: string;
};

const successMessage =
  "If an account with that email exists, a password reset link has been generated.";

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function getForgotPasswordErrorMessage(error: unknown) {
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

  return "Unable to process the password reset request.";
}

export async function POST(request: Request) {
  try {
    const { email } = (await request.json()) as { email: string };

    if (!email) {
      return errorResponse("Email is required.");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = await getDatabase();
    const staffCollection = db.collection<StaffAuthDocument>("staff");
    const staffMember = await staffCollection.findOne({
      email: normalizedEmail,
    });

    if (!staffMember?._id || !staffMember.passwordHash) {
      return NextResponse.json({ ok: true, message: successMessage });
    }

    const { token, tokenHash } = createPasswordResetToken();
    const expiresAt = getPasswordResetExpiryDate();

    await staffCollection.updateOne(
      { _id: staffMember._id },
      {
        $set: {
          passwordResetTokenHash: tokenHash,
          passwordResetTokenExpiresAt: expiresAt,
        },
      },
    );

    const resetUrl = getPasswordResetUrl(token, request.url);

    if (shouldExposePasswordResetPreview()) {
      console.info(`Password reset preview for ${normalizedEmail}: ${resetUrl}`);

      return NextResponse.json({
        ok: true,
        message: successMessage,
        previewUrl: resetUrl,
      });
    }

    return NextResponse.json({ ok: true, message: successMessage });
  } catch (error) {
    console.error("POST /api/auth/forgot-password failed", error);
    return errorResponse(getForgotPasswordErrorMessage(error), 500);
  }
}
