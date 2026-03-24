"use client";

import Link from "next/link";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() || "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setErrorMessage("This password reset link is missing its token.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Unable to reset the password.");
      }

      setSuccessMessage("Your password has been updated. Redirecting to login...");
      setPassword("");
      setConfirmPassword("");

      window.setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 1200);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to reset the password.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#f8fafc_0%,#eff6ff_45%,#ecfeff_100%)] p-6">
      <div className="w-full max-w-md rounded-[32px] border border-white/80 bg-white/90 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.10)]">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-700">
          DentalFlow Access
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Reset password
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Choose a new password for your staff account.
        </p>

        {!token ? (
          <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            This reset link is incomplete. Request a new one from the forgot-password page.
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="New password"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
          />
          <input
            type="password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirm new password"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
          />
          <button
            type="submit"
            disabled={isSubmitting || !token}
            className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? "Updating Password..." : "Update Password"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-600">
          Need a fresh link?{" "}
          <Link href="/forgot-password" className="font-semibold text-sky-700">
            Request another reset
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordPageContent />
    </Suspense>
  );
}
