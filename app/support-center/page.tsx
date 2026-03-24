"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  supportCategoryOptions,
  type SupportAttachment,
  type SupportFaqArticle,
} from "@/lib/clinic-types";

async function uploadCustomerFiles(files: File[], patientId: string, portalDob: string) {
  const uploads: SupportAttachment[] = [];

  for (const file of files) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("patientId", patientId);
    formData.append("portalDob", portalDob);

    const response = await fetch("/api/support/uploads", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Attachment upload failed.");
    }

    uploads.push((await response.json()) as SupportAttachment);
  }

  return uploads;
}

function titleize(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function SupportCenterPage() {
  const [patientId, setPatientId] = useState("");
  const [portalDob, setPortalDob] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>(
    supportCategoryOptions.map((name) => ({ id: name, name })),
  );
  const [faqArticles, setFaqArticles] = useState<SupportFaqArticle[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function loadMeta() {
      const [categoriesResponse, faqResponse] = await Promise.all([
        fetch("/api/support/categories", { cache: "no-store" }),
        fetch("/api/support/faq", { cache: "no-store" }),
      ]);

      if (!categoriesResponse.ok || !faqResponse.ok) {
        return;
      }

      setCategories((await categoriesResponse.json()) as Array<{ id: string; name: string }>);
      setFaqArticles((await faqResponse.json()) as SupportFaqArticle[]);
    }

    void loadMeta();
  }, []);

  const filteredFaq = useMemo(() => {
    const query = `${subject} ${message}`.trim().toLowerCase();
    if (!query) {
      return faqArticles.slice(0, 4);
    }

    return faqArticles
      .filter((article) =>
        `${article.title} ${article.body} ${article.tags.join(" ")}`.toLowerCase().includes(query),
      )
      .slice(0, 4);
  }, [faqArticles, message, subject]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const attachments = files.length > 0
        ? await uploadCustomerFiles(files, patientId, portalDob)
        : [];

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
          sourceChannel: "support-center",
          attachments,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Support request failed.");
      }

      setSubject("");
      setCategory("general");
      setMessage("");
      setFiles([]);
      setSuccessMessage(
        "Your support ticket was created. You can continue the conversation in the patient portal.",
      );
    } catch (error) {
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
        <section className="rounded-[36px] border border-white/80 bg-[linear-gradient(135deg,rgba(12,74,110,0.95)_0%,rgba(15,23,42,0.97)_45%,rgba(154,52,18,0.90)_100%)] px-6 py-8 text-white shadow-[0_28px_80px_rgba(15,23,42,0.22)] md:px-10 md:py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-200/85">
            DentalFlow Support
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            Start a ticket or chat with the support team.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">
            Tickets are created directly in the support inbox, automatically categorized, tagged,
            and routed so the team can reply faster.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/portal" className="rounded-full bg-sky-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-200">
              Open Patient Portal
            </Link>
            <Link href="/login" className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15">
              Staff Login
            </Link>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <form onSubmit={handleSubmit} className="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] md:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-700">Create Ticket</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Send your issue to support</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Use your patient ID, email, or phone together with your date of birth so we can match your ticket to the right patient profile.
              </p>
            </div>

            {errorMessage ? <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div> : null}
            {successMessage ? <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div> : null}

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <input required value={patientId} onChange={(event) => setPatientId(event.target.value)} placeholder="Patient ID, phone, or email" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" />
              <input required type="date" value={portalDob} onChange={(event) => setPortalDob(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white" />
              <input required value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Brief issue summary" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white md:col-span-2" />
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white md:col-span-2">
                {categories.map((item) => (
                  <option key={item.id} value={item.name}>{titleize(item.name)}</option>
                ))}
              </select>
              <textarea required value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tell us what happened and what help you need." className="min-h-36 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white md:col-span-2" />
              <div className="md:col-span-2">
                <p className="mb-2 text-sm font-medium text-slate-700">File or image upload</p>
                <input type="file" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} className="block w-full text-sm text-slate-500" />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button type="submit" disabled={isSubmitting} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">
                {isSubmitting ? "Creating ticket..." : "Send to Customer Support"}
              </button>
              <p className="text-sm text-slate-500">
                Need to continue later? Use the{" "}
                <Link href="/portal" className="font-semibold text-sky-700">
                  patient portal
                </Link>
                .
              </p>
            </div>
          </form>

          <aside className="space-y-6">
            <section className="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-700">Suggested FAQ</p>
              <div className="mt-4 space-y-3">
                {filteredFaq.map((article) => (
                  <article key={article.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="font-semibold text-slate-950">{article.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">{titleize(article.category)}</p>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{article.body}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-[linear-gradient(180deg,#fffdf8_0%,#fff6e7_100%)] p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
              <h3 className="text-xl font-semibold text-slate-950">Support flow</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Your ticket is stored in the support system, auto-tagged, assigned to a support queue,
                and followed in the same thread until it is resolved or closed.
              </p>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
