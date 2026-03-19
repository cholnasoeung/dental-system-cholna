import type { Metadata } from "next";
import Link from "next/link";

const supportHighlights = [
  "Start a support conversation in under a minute",
  "Route messages directly to the clinic admin support inbox",
  "Continue the thread later from the patient portal",
];

const quickTopics = [
  {
    title: "Appointment Changes",
    description: "Ask for rescheduling help, confirmation, or follow-up timing.",
  },
  {
    title: "Billing Questions",
    description: "Get help with balances, invoices, and payment clarifications.",
  },
  {
    title: "General Support",
    description: "Send questions about your visit, records, or clinic communication.",
  },
];

export const metadata: Metadata = {
  title: "Customer Support",
  description:
    "Public support landing page for patients to contact DentalFlow customer support and continue the conversation in the portal.",
  openGraph: {
    title: "DentalFlow Customer Support",
    description:
      "Send a support message to the clinic team about appointments, billing, and general questions.",
  },
};

export default function HomePage() {
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
                Customer support for your dental appointments, billing, and follow-up questions.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200">
                Use this landing page to start a support conversation with the clinic
                team. Once your ticket is created, staff can reply from the admin inbox
                and you can continue the thread inside the patient portal.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/support-center"
                  className="rounded-full bg-sky-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-200"
                >
                  Send Support Message
                </Link>
                <Link
                  href="/portal"
                  className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
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
                Why this page
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
                  Keep your patient ID and date of birth ready before opening the
                  support form so the clinic can match your message to the right record.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-700">
              Support Topics
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              What patients can send here
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              This landing page is the front door for the customer support workflow.
              Patients submit the first message here, then the full conversation is
              tracked in the support ticket system.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {quickTopics.map((topic) => (
                <article
                  key={topic.title}
                  className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f9fbff_100%)] p-5 shadow-[0_14px_36px_rgba(15,23,42,0.05)]"
                >
                  <h3 className="text-xl font-semibold text-slate-950">{topic.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {topic.description}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <aside className="space-y-6">
            <section className="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-700">
                Support Flow
              </p>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-slate-950 px-4 py-4 text-white">
                  <p className="text-sm font-semibold">1. Start on the support form</p>
                  <p className="mt-2 text-sm text-slate-300">
                    Open the support page and submit your first message.
                  </p>
                </div>
                <div className="rounded-2xl bg-sky-50 px-4 py-4 ring-1 ring-sky-100">
                  <p className="text-sm font-semibold text-slate-950">2. Staff receives the ticket</p>
                  <p className="mt-2 text-sm text-slate-600">
                    The admin support inbox receives the case for review and reply.
                  </p>
                </div>
                <div className="rounded-2xl bg-amber-50 px-4 py-4 ring-1 ring-amber-100">
                  <p className="text-sm font-semibold text-slate-950">3. Continue in portal</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Patients can keep the conversation going later from the portal.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-[linear-gradient(180deg,#fffdf8_0%,#fff6e7_100%)] p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
              <h3 className="text-xl font-semibold text-slate-950">Quick links</h3>
              <div className="mt-4 flex flex-col gap-3">
                <Link
                  href="/support-center"
                  className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Open support form
                </Link>
                <Link
                  href="/portal"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                >
                  Patient portal
                </Link>
                <Link
                  href="/login"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                >
                  Staff login
                </Link>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
