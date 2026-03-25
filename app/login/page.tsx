"use client";

import Link from "next/link";
import { Suspense, FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const redirectUrl =
    callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Login failed.");
      }

      router.push(redirectUrl);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#ecfeff_0%,#eef6ff_46%,#fff7ed_100%)] px-4 py-8 md:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-6 lg:grid-cols-[1.05fr_460px]">
        <section className="relative overflow-hidden rounded-[36px] border border-white/80 bg-[linear-gradient(135deg,rgba(8,47,73,0.96)_0%,rgba(15,23,42,0.98)_42%,rgba(180,83,9,0.90)_100%)] px-6 py-8 text-white shadow-[0_28px_80px_rgba(15,23,42,0.22)] md:px-10 md:py-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.22),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(253,186,116,0.18),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(191,219,254,0.18),transparent_24%)]" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-200/85">
              DentalFlow Access
            </p>
            <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
              Welcome back to your clinic workspace.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200">
              Sign in to manage patients, appointments, billing, and the upgraded support inbox from one secure dashboard.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <article className="rounded-[28px] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                  Support
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-100">
                  Track tickets, assignments, replies, and SLA alerts in one inbox.
                </p>
              </article>
              <article className="rounded-[28px] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                  Security
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-100">
                  Staff sessions stay protected with secure authentication and role-based access.
                </p>
              </article>
              <article className="rounded-[28px] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                  Workflow
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-100">
                  Move from front desk operations to clinical records without leaving the app.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/80 bg-white/92 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.10)]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-700">
            Staff Sign In
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Login
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Use your staff email and password to continue to the dashboard.
          </p>

          {errorMessage ? (
            <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                placeholder="staff@clinic.com"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Password</span>
              <div className="flex rounded-2xl border border-slate-200 bg-slate-50 transition focus-within:border-sky-400 focus-within:bg-white">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="w-full rounded-l-2xl bg-transparent px-4 py-3 outline-none"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="rounded-r-2xl px-4 text-sm font-medium text-slate-500 transition hover:text-slate-900"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <div className="flex items-center justify-between text-sm">
              <p className="text-slate-500">Secure access for clinic staff only</p>
              <Link href="/forgot-password" className="font-semibold text-sky-700">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSubmitting ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-600">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold text-sky-700">
              Create one
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
