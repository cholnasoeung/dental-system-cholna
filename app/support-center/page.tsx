"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { supportCategoryOptions, type SupportCategory } from "@/lib/clinic-types";

function categoryLabel(category: SupportCategory) {
  switch (category) {
    case "general":
      return "General help";
    case "billing":
      return "Billing question";
    case "appointment":
      return "Appointment help";
  }
}

const supportHighlights = [
  "Start a support conversation in under a minute",
  "Route messages directly to the clinic admin support inbox",
  "Continue the thread later from the patient portal",
];

export default function SupportCenterPage() {
  const [patientId, setPatientId] = useState("");
  const [portalDob, setPortalDob] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<SupportCategory>("general");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch("/api/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId,
          portalDob,
          subject,
          category,
          message,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Support request failed.");
      }

      setSubject("");
      setCategory("general");
      setMessage("");
      setSuccessMessage(
        "Your support message was sent to the clinic team. You can continue the conversation in the patient portal.",
      );
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Support request failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(145deg,#f7fbff_0%,#edf7ff_38%,#fff8ef_100%)] px-4 py-8 md:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="relative overflow-hidden rounded-[36px] border border-white/80 bg-[linear-gradient(135deg,rgba(12,74,110,0.95)_0%,rgba(15,23,42,0.97)_45%,rgba(154,52,18,0.90)_100%)] px-6 py-8 text-white shadow-[0_28px_80px_rgba(15,23,42,0.22)] md:px-10 md:py-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.24),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(253,186,116,0.22),transparent_20%),radial-gradient(circle_at_bottom_right,rgba(191,219,254,0.18),transparent_24%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_380px]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-200/85">
                DentalFlow Support
              </p>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
                Send a message to customer support without waiting in the clinic.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200">
                Start your support chat for appointment changes, billing questions,
                or general help. The clinic team receives it in the admin support inbox.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/portal"
                  className="rounded-full bg-sky-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-200"
                >
                  Open Patient Portal
                </Link>
                <Link
                  href="/login"
                  className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  Staff Login
                </Link>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/12 bg-white/10 p-6 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/80">
                Why use this page
              </p>
              <div className="mt-4 space-y-3">
                {supportHighlights.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm text-slate-100"
                  >
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl bg-white/95 p-4 text-slate-900">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                  What you need
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Use your patient ID, phone number, or email together with your date
                  of birth so we can match your support message to the right patient file.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <form
            onSubmit={handleSubmit}
            className="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] md:p-8"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-700">
                  Start Support
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                  Send your first message
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                  This creates a support ticket for the clinic team. Replies will be
                  available in the patient portal support thread.
                </p>
              </div>
              <div className="rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-800 ring-1 ring-sky-100">
                In-app support only
              </div>
            </div>

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

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">
                  Patient ID, phone, or email
                </span>
                <input
                  required
                  value={patientId}
                  onChange={(event) => setPatientId(event.target.value)}
                  placeholder="Patient ID, phone number, or email"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">Date of Birth</span>
                <input
                  required
                  type="date"
                  value={portalDob}
                  onChange={(event) => setPortalDob(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Subject</span>
                <input
                  required
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Need help with my upcoming treatment"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Category</span>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value as SupportCategory)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                >
                  {supportCategoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {categoryLabel(option)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Message</span>
                <textarea
                  required
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Tell the clinic team what happened and what help you need."
                  className="min-h-36 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSubmitting ? "Sending message..." : "Send to Customer Support"}
              </button>
              <p className="text-sm text-slate-500">
                Need to follow up later? Continue in the{" "}
                <Link href="/portal" className="font-semibold text-sky-700">
                  patient portal
                </Link>
                .
              </p>
            </div>
          </form>

          <aside className="space-y-6">
            <section className="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-700">
                Support Flow
              </p>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-slate-950 px-4 py-4 text-white">
                  <p className="text-sm font-semibold">1. Send message</p>
                  <p className="mt-2 text-sm text-slate-300">
                    Submit your patient ID, date of birth, and issue details.
                  </p>
                </div>
                <div className="rounded-2xl bg-sky-50 px-4 py-4 ring-1 ring-sky-100">
                  <p className="text-sm font-semibold text-slate-950">2. Admin receives ticket</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Staff can read, reply, and update support status in the admin inbox.
                  </p>
                </div>
                <div className="rounded-2xl bg-amber-50 px-4 py-4 ring-1 ring-amber-100">
                  <p className="text-sm font-semibold text-slate-950">3. Continue the thread</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Open the patient portal anytime to read replies and send follow-ups.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-[linear-gradient(180deg,#fffdf8_0%,#fff6e7_100%)] p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
              <h3 className="text-xl font-semibold text-slate-950">Need your patient ID?</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                If you do not know your patient ID, contact the clinic reception first.
                Once you have it, this page can send your support request directly into
                the customer support inbox.
              </p>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
