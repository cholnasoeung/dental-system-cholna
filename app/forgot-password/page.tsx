"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");
      setPreviewUrl("");

      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = (await response.json()) as {
        error?: string;
        message?: string;
        previewUrl?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Unable to start password reset.");
      }

      setSuccessMessage(
        data.message || "If your email exists, a reset link has been generated.",
      );
      setPreviewUrl(data.previewUrl || "");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to start password reset.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#f8fafc_0%,#ecfeff_50%,#eff6ff_100%)] p-6">
      <div className="w-full max-w-md rounded-[32px] border border-white/80 bg-white/90 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.10)]">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-700">
          DentalFlow Access
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Forgot password
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Enter your staff email and we&apos;ll generate a secure reset link.
        </p>

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <p>{successMessage}</p>
            {previewUrl ? (
              <p className="mt-3 break-all">
                Dev preview:{" "}
                <Link href={previewUrl} className="font-semibold underline">
                  Open reset link
                </Link>
              </p>
            ) : null}
          </div>
        ) : null}

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Staff email"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? "Generating Link..." : "Send Reset Link"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-600">
          Remembered your password?{" "}
          <Link href="/login" className="font-semibold text-sky-700">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
