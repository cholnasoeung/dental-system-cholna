"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { staffRoleOptions, type StaffRole } from "@/lib/clinic-types";

function roleLabel(role: StaffRole) {
  return role
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const roleDescriptions: Record<StaffRole, string> = {
  dentist: "Clinical access for treatment history, EMR, and appointment workflows.",
  receptionist: "Front-desk access for patients, billing, appointments, and support.",
  nurse: "Clinical support access for patient care and EMR assistance.",
  admin: "Full platform control across operations, staff, reports, and support.",
  manager: "Operational oversight for support, reporting, billing, and staff management.",
  "support-agent": "Dedicated support access for ticket handling, replies, and queue management.",
};

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<StaffRole>("receptionist");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fullName, email, password, role }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Registration failed.");
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "Registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#ecfeff_0%,#eef6ff_46%,#fff7ed_100%)] p-6">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center gap-6 lg:grid-cols-[1.05fr_480px]">
        <section className="relative overflow-hidden rounded-[36px] border border-white/80 bg-[linear-gradient(135deg,rgba(15,23,42,0.98)_0%,rgba(8,47,73,0.96)_40%,rgba(14,116,144,0.88)_100%)] px-6 py-8 text-white shadow-[0_28px_80px_rgba(15,23,42,0.22)] md:px-10 md:py-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.18),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(103,232,249,0.16),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(191,219,254,0.18),transparent_24%)]" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200/85">
              DentalFlow Access
            </p>
            <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
              Create a staff account with the right access from day one.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200">
              Set up dentists, front-desk staff, managers, or dedicated support agents with role-based permissions that match their workflow.
            </p>

            <div className="mt-8 space-y-4">
              <article className="rounded-[28px] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                  First Account
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-100">
                  The first registered user is automatically promoted to admin for full setup access.
                </p>
              </article>
              <article className="rounded-[28px] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                  Selected Role
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-100">
                  {roleDescriptions[role]}
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/80 bg-white/92 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.10)]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-700">
            Staff Registration
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Register
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Create an account and choose the best role for the staff member you&apos;re adding.
          </p>

          {errorMessage ? (
            <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <input
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Full name"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
            />
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex rounded-2xl border border-slate-200 bg-slate-50 transition focus-within:border-sky-400 focus-within:bg-white">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  className="w-full rounded-l-2xl bg-transparent px-4 py-3 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="rounded-r-2xl px-4 text-sm font-medium text-slate-500 transition hover:text-slate-900"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm password"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
              />
            </div>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Role</span>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as StaffRole)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
              >
                {staffRoleOptions.map((option) => (
                  <option key={option} value={option}>
                    {roleLabel(option)}
                  </option>
                ))}
              </select>
              <p className="text-xs leading-5 text-slate-500">{roleDescriptions[role]}</p>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-600">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-sky-700">
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
