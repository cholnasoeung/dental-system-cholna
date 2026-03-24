import "server-only";

import { createHash, randomBytes } from "crypto";

const PASSWORD_RESET_TOKEN_BYTES = 32;
const PASSWORD_RESET_TTL_MS = 1000 * 60 * 60;

export function createPasswordResetToken() {
  const token = randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString("hex");

  return {
    token,
    tokenHash: hashPasswordResetToken(token),
  };
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getPasswordResetExpiryDate() {
  return new Date(Date.now() + PASSWORD_RESET_TTL_MS);
}

export function getPasswordResetUrl(token: string, requestUrl: string) {
  const configuredBaseUrl = process.env.APP_BASE_URL?.trim().replace(/\/$/, "");
  const origin = configuredBaseUrl || new URL(requestUrl).origin;

  return `${origin}/reset-password?token=${encodeURIComponent(token)}`;
}

export function shouldExposePasswordResetPreview() {
  return process.env.NODE_ENV !== "production";
}
