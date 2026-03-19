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

const topicCards = [
  {
    title: "Caring support",
    description: "Reach the clinic team for dental questions, post-visit concerns, and general help.",
  },
  {
    title: "Billing help",
    description: "Ask about invoices, payment arrangements, and insurance-related questions.",
  },
  {
    title: "Appointment requests",
    description: "Send changes, confirmations, or scheduling requests directly to the support inbox.",
  },
];

export function HomeSupportLanding() {
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
        "Your support request has been sent. The clinic team can now reply in your support thread.",
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
    <main className="min-h-screen bg-[#f4f1ea] text-slate-900">
      <header className="border-b border-[#d9d2c3] bg-white/96">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-5 md:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-18 w-18 items-center justify-center rounded-full bg-[#eef7f6] text-[#4b8792] shadow-[inset_0_0_0_1px_rgba(75,135,146,0.12)]">
              <div className="text-center">
                <p className="text-3xl leading-none">DC</p>
              </div>
            </div>
            <div>
              <p className="font-serif text-4xl leading-none text-[#33454c]">DentalCare</p>
              <p className="mt-2 text-sm uppercase tracking-[0.32em] text-[#93a3a7]">
                Healthy Smiles For Life
              </p>
            </div>
          </div>

          <div className="grid gap-4 text-center md:grid-cols-2 lg:text-left">
            <div>
              <p className="font-serif text-2xl text-[#2f3538]">12011 Lee Jackson Memorial Hwy</p>
              <p className="mt-1 text-lg text-[#4f5b61]">Ste. #502, Fairfax, VA 22033</p>
            </div>
            <div className="flex items-center justify-center gap-4 lg:justify-start">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#4b8792] text-3xl text-white">
                ☎
              </div>
              <div>
                <p className="text-lg text-[#4f5b61]">Make an Appointment</p>
                <p className="font-serif text-4xl font-semibold text-[#1d2930]">703-260-9732</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(59,79,69,0.82)_0%,rgba(86,95,84,0.56)_34%,rgba(74,62,58,0.54)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_28%,rgba(255,255,255,0.18),transparent_18%),radial-gradient(circle_at_72%_30%,rgba(255,255,255,0.12),transparent_16%),radial-gradient(circle_at_52%_82%,rgba(255,244,230,0.12),transparent_22%)]" />
        <div className="relative mx-auto grid min-h-[calc(100vh-108px)] max-w-7xl gap-10 px-4 py-10 md:px-8 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-center">
          <div className="max-w-3xl text-white">
            <p className="text-sm uppercase tracking-[0.35em] text-[#d8ebe8]">
              Fairfax Dental Support
            </p>
            <h1 className="mt-8 font-serif text-5xl leading-[1.05] md:text-7xl">
              Dentist support for caring, quality treatment
            </h1>
            <p className="mt-8 max-w-2xl text-2xl leading-relaxed text-[#f4f0e8] md:text-3xl">
              Reach the clinic about appointments, billing, or general dental
              questions. Send your message here and our support team will respond as
              soon as possible.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/portal"
                className="rounded-full border border-white/30 bg-white/12 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white/18"
              >
                Patient Portal
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-white/30 bg-white/12 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white/18"
              >
                Staff Login
              </Link>
            </div>
          </div>

          <div className="rounded-[2px] bg-[#3f7b86]/94 p-6 text-white shadow-[0_22px_60px_rgba(15,23,42,0.34)] ring-1 ring-white/12 backdrop-blur-sm md:p-7">
            <h2 className="text-center font-serif text-5xl leading-none">Request Support</h2>
            <p className="mt-4 text-center text-lg leading-7 text-[#e3f0ef]">
              We&apos;ll reach out to you as soon as possible to discuss your dental needs.
            </p>

            {errorMessage ? (
              <div className="mt-5 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </div>
            ) : null}

            {successMessage ? (
              <div className="mt-5 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </div>
            ) : null}

            <form className="mt-6 space-y-3" onSubmit={handleSubmit}>
              <label className="block space-y-1">
                <span className="text-sm font-semibold text-white">Patient ID, Phone, or Email</span>
                <input
                  required
                  value={patientId}
                  onChange={(event) => setPatientId(event.target.value)}
                  placeholder="PATIENT ID OR CONTACT"
                  className="w-full border border-[#b6d4d8] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#224d56]"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-semibold text-white">Date of Birth</span>
                <input
                  required
                  type="date"
                  value={portalDob}
                  onChange={(event) => setPortalDob(event.target.value)}
                  className="w-full border border-[#b6d4d8] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#224d56]"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-semibold text-white">Subject</span>
                <input
                  required
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="SUBJECT"
                  className="w-full border border-[#b6d4d8] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#224d56]"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-semibold text-white">Category</span>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value as SupportCategory)}
                  className="w-full border border-[#b6d4d8] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#224d56]"
                >
                  {supportCategoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {categoryLabel(option)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-semibold text-white">Message</span>
                <textarea
                  required
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="MESSAGE"
                  className="min-h-36 w-full border border-[#b6d4d8] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#224d56]"
                />
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-4 w-full rounded-full border border-[#d7edf0] bg-[#eefcfd] px-6 py-4 text-2xl font-light uppercase tracking-[0.08em] text-[#6b7d82] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Sending..." : "Request"}
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {topicCards.map((card) => (
            <article
              key={card.title}
              className="rounded-[28px] border border-[#ddd5c6] bg-white px-6 py-7 shadow-[0_16px_35px_rgba(48,63,70,0.08)]"
            >
              <p className="font-serif text-3xl text-[#304046]">{card.title}</p>
              <p className="mt-3 text-base leading-7 text-[#5c676b]">{card.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
