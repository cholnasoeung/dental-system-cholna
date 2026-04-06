"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const features = [
  {
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <circle cx="8" cy="6" r="3"/><path d="M2 18c0-3.3 2.7-6 6-6h4"/><circle cx="15" cy="9" r="2.5"/><path d="M11 18c0-2.2 1.8-4 4-4s4 1.8 4 4"/>
      </svg>
    ),
    label: "Patient Management",
    desc: "Full lifecycle — intake, history, insurance & alerts.",
    color: "from-violet-500/20 to-purple-500/10 text-violet-300 ring-violet-500/25",
  },
  {
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect x="2" y="3" width="16" height="15" rx="2"/><path d="M6 2v2M14 2v2M2 8h16"/>
      </svg>
    ),
    label: "Smart Scheduling",
    desc: "Bookings, walk-ins, waitlist & conflict detection.",
    color: "from-sky-500/20 to-blue-500/10 text-sky-300 ring-sky-500/25",
  },
  {
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect x="2" y="4" width="16" height="12" rx="2"/><path d="M2 9h16M10 13a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/>
      </svg>
    ),
    label: "Billing & Invoicing",
    desc: "Auto-generate invoices from EMR, track payments.",
    color: "from-emerald-500/20 to-teal-500/10 text-emerald-300 ring-emerald-500/25",
  },
  {
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M3 17V9M8 17V5M13 17v-6M18 17v-3"/>
      </svg>
    ),
    label: "Live Analytics",
    desc: "Revenue, patient intake & appointment trends.",
    color: "from-amber-500/20 to-orange-500/10 text-amber-300 ring-amber-500/25",
  },
];

const stats = [
  { value: "10K+", label: "Patients managed", icon: "👥" },
  { value: "99.9%", label: "Uptime SLA", icon: "⚡" },
  { value: "< 2s", label: "Avg. response", icon: "🚀" },
];

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const redirectUrl = callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: { preventDefault(): void }) {
    event.preventDefault();
    try {
      setIsSubmitting(true);
      setErrorMessage("");
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Login failed.");
      }
      router.push(redirectUrl);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen overflow-hidden">
      {/* ── Left panel — branding ───────────────────────────────── */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[linear-gradient(145deg,#05101f_0%,#081c34_40%,#0a2540_70%,#0d2e4d_100%)] p-10 lg:flex lg:w-[52%] xl:w-[55%]">

        {/* Ambient glows */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-24 h-[480px] w-[480px] rounded-full bg-cyan-500/10 blur-[120px]" />
          <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-sky-600/8 blur-[100px]" />
          <div className="absolute left-1/2 top-1/2 h-[300px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/5 blur-[80px]" />
          {/* Dot grid */}
          <div className="absolute inset-0 bg-[radial-gradient(rgba(6,182,212,0.06)_1px,transparent_1px)] bg-[size:28px_28px]" />
          {/* Top shimmer line */}
          <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-sky-600 shadow-lg shadow-cyan-500/30 ring-1 ring-white/15">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-white">
              <path d="M12 2C9.8 2 7 3.5 7 7c0 2 .5 3.5 1 5 .5 1.3.5 3 .5 5s1 4 3.5 4 3.5-2.5 3.5-4 0-3.7.5-5c.5-1.5 1-3 1-5 0-3.5-2.8-5-5-5z"/>
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.45em] text-cyan-400/70">Dental Management</p>
            <span className="text-xl font-bold tracking-tight text-white">DentalFlow</span>
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3.5 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow shadow-emerald-400/60" />
            <span className="text-xs font-semibold text-cyan-300">All systems operational</span>
          </div>

          <h2 className="text-4xl font-bold leading-[1.12] tracking-tight text-white xl:text-5xl">
            Your clinic,<br />
            <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 bg-clip-text text-transparent">
              fully in control.
            </span>
          </h2>
          <p className="mt-4 max-w-md text-base leading-7 text-slate-400">
            One platform for patients, appointments, EMR, billing, and your entire support workflow — built for modern dental practices.
          </p>

          {/* Stats */}
          <div className="mt-8 flex flex-wrap gap-8">
            {stats.map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-lg ring-1 ring-white/8">
                  {s.icon}
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{s.value}</p>
                  <p className="text-[11px] text-slate-500">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Feature grid */}
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {features.map((feat) => (
              <div
                key={feat.label}
                className="group flex gap-3.5 rounded-2xl border border-white/6 bg-white/4 p-4 transition-all duration-200 hover:border-white/12 hover:bg-white/7"
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ${feat.color}`}>
                  {feat.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{feat.label}</p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative flex items-center gap-2 text-[11px] text-slate-600">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-slate-700">
            <path d="M8 1L2 3v4c0 3.3 2.5 6.2 6 7 3.5-.8 6-3.7 6-7V3L8 1z"/>
          </svg>
          HMAC-signed sessions · Role-based access · Staff only
        </div>
      </div>

      {/* ── Right panel — form ──────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-[#f7f9fc] px-5 py-12 lg:px-10">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-sky-600 shadow shadow-cyan-500/30">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-white">
              <path d="M12 2C9.8 2 7 3.5 7 7c0 2 .5 3.5 1 5 .5 1.3.5 3 .5 5s1 4 3.5 4 3.5-2.5 3.5-4 0-3.7.5-5c.5-1.5 1-3 1-5 0-3.5-2.8-5-5-5z"/>
            </svg>
          </div>
          <span className="text-lg font-bold text-slate-900">DentalFlow</span>
        </div>

        <div className="w-full max-w-[400px]">
          {/* Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">

            {/* Header */}
            <div className="mb-6">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-cyan-600">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                Staff Sign In
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Sign in with your staff credentials to continue.
              </p>
            </div>

            {/* Error */}
            {errorMessage ? (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-700">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mt-0.5 h-4 w-4 shrink-0">
                  <circle cx="8" cy="8" r="7"/><path d="M8 5v3M8 11h.01"/>
                </svg>
                <span>{errorMessage}</span>
              </div>
            ) : null}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="email" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                  Email address
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <path d="M2 5l8 5 8-5M2 5v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z"/>
                    </svg>
                  </span>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="staff@clinic.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-3 focus:ring-cyan-100"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="password" className="block text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                    Password
                  </label>
                  <Link href="/forgot-password" className="text-[11px] font-semibold text-cyan-600 hover:text-cyan-500 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition focus-within:border-cyan-400 focus-within:bg-white focus-within:ring-3 focus-within:ring-cyan-100">
                  <span className="pointer-events-none flex items-center pl-3.5 text-slate-400">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <rect x="4" y="9" width="12" height="9" rx="2"/><path d="M7 9V6a3 3 0 1 1 6 0v3"/>
                    </svg>
                  </span>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="flex-1 bg-transparent px-3 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="mr-1 flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    {showPassword ? (
                      <>
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="h-3.5 w-3.5">
                          <path d="M2 8s2-4 6-4 6 4 6 4-2 4-6 4-6-4-6-4z"/><circle cx="8" cy="8" r="1.5"/><path d="M3 3l10 10"/>
                        </svg>
                        Hide
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="h-3.5 w-3.5">
                          <path d="M2 8s2-4 6-4 6 4 6 4-2 4-6 4-6-4-6-4z"/><circle cx="8" cy="8" r="1.5"/>
                        </svg>
                        Show
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-500/25 transition hover:from-cyan-400 hover:to-sky-500 hover:shadow-cyan-500/35 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="8" cy="8" r="6" strokeOpacity=".3"/><path d="M14 8a6 6 0 0 0-6-6" strokeLinecap="round"/>
                    </svg>
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <path d="M3 8h10M9 4l4 4-4 4"/>
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-[11px] text-slate-400">New to DentalFlow?</span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>

            <div className="space-y-2.5">
              <Link
                href="/register"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white hover:text-slate-900"
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <circle cx="8" cy="5" r="3"/><path d="M2 14c0-3 2.7-5 6-5s6 2 6 5"/><path d="M11 7h4M13 5v4"/>
                </svg>
                Create staff account
              </Link>
              <Link
                href="/support-center"
                className="flex w-full items-center justify-center gap-1.5 rounded-xl px-5 py-2 text-xs text-slate-400 transition hover:text-cyan-600"
              >
                Patient support portal
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                  <path d="M3 8h10M9 4l4 4-4 4"/>
                </svg>
              </Link>
            </div>
          </div>

          {/* Below card */}
          <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-slate-400">
              <path d="M8 1L2 3v4c0 3.3 2.5 6.2 6 7 3.5-.8 6-3.7 6-7V3L8 1z"/><path d="M5.5 8l1.5 1.5 3.5-3.5"/>
            </svg>
            Secured · HIPAA-compliant · Staff only
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#f7f9fc]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <p className="text-sm text-slate-500">Loading DentalFlow…</p>
        </div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}
