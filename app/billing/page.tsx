"use client";

import { ChangeEvent, useEffect, useState } from "react";

import { AdminShell } from "@/components/admin-shell";
import {
  initialPaymentForm,
  paymentMethodOptions,
  type Invoice,
  type PatientProfile,
  type PaymentFormState,
} from "@/lib/clinic-types";

const input = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100";
const lbl = "mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-500";

function usd(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}
function fmtDate(d: string) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(d));
}
function invoiceTotal(inv: Invoice) {
  return inv.lineItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
}
function invoicePaid(inv: Invoice) {
  return inv.payments.reduce((s, p) => s + p.amount, 0);
}

export default function BillingPage() {
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>(initialPaymentForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const [pRes, iRes] = await Promise.all([
          fetch("/api/patients", { cache: "no-store" }),
          fetch("/api/billing", { cache: "no-store" }),
        ]);
        if (!pRes.ok || !iRes.ok) throw new Error("Unable to load billing data.");
        const [p, inv] = await Promise.all([pRes.json() as Promise<PatientProfile[]>, iRes.json() as Promise<Invoice[]>]);
        setPatients(p);
        setInvoices(inv);
        setSelectedInvoiceId(inv[0]?.id ?? "");
      } catch (e) {
        setErrorMessage(e instanceof Error ? e.message : "Unable to load billing data.");
      } finally { setIsLoading(false); }
    }
    void load();
  }, []);

  function handlePaymentChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setPaymentForm((c) => ({ ...c, [name]: name === "amount" ? Number(value) : value }));
  }

  const visibleInvoices = invoices.filter((inv) => selectedPatientId ? inv.patientId === selectedPatientId : true);
  const selectedInvoice = visibleInvoices.find((inv) => inv.id === selectedInvoiceId) ?? visibleInvoices[0] ?? null;
  const selTotal = selectedInvoice ? invoiceTotal(selectedInvoice) : 0;
  const selPaid  = selectedInvoice ? invoicePaid(selectedInvoice) : 0;
  const selOuts  = Math.max(selTotal - selPaid, 0);

  const totalRevenue     = invoices.reduce((s, inv) => s + invoicePaid(inv), 0);
  const totalOutstanding = invoices.reduce((s, inv) => s + Math.max(invoiceTotal(inv) - invoicePaid(inv), 0), 0);

  async function handlePaymentSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!selectedInvoice || paymentForm.amount <= 0 || !paymentForm.paidAt) return;
    try {
      setIsSaving(true); setErrorMessage("");
      const res = await fetch(`/api/billing/${selectedInvoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appendPayment: paymentForm }),
      });
      if (!res.ok) throw new Error(await res.text());
      setInvoices((cur) => cur.map((inv) =>
        inv.id === selectedInvoice.id ? { ...inv, payments: [...inv.payments, paymentForm] } : inv,
      ));
      setPaymentForm(initialPaymentForm);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Payment could not be recorded.");
    } finally { setIsSaving(false); }
  }

  return (
    <AdminShell>
      <div className="mx-auto max-w-[1400px] space-y-6 print:space-y-0">

        {/* ── Print layout ─────────────────────────────────────────── */}
        <div className="hidden print:block">
          <div className="border-b border-slate-200 pb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-600">Payment Receipt</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Smile Care Center</h1>
            <p className="mt-0.5 text-sm text-slate-500">Generated {new Date().toLocaleString()}</p>
          </div>
          {selectedInvoice && (
            <div className="space-y-5 pt-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[["Patient", selectedInvoice.patientName], ["Invoice #", selectedInvoice.invoiceNumber], ["Visit Date", fmtDate(selectedInvoice.issueDate)], ["Linked EMR", selectedInvoice.linkedRecordId || "Not linked"]].map(([k, v]) => (
                  <div key={k}><p className="text-xs uppercase tracking-wider text-slate-500">{k}</p><p className="mt-0.5 font-semibold">{v}</p></div>
                ))}
              </div>
              <table className="w-full border-collapse text-sm">
                <thead><tr className="border-b border-slate-200 bg-slate-50 text-left">
                  {["Treatment","Teeth","Qty","Unit Price","Amount"].map((h) => <th key={h} className="px-3 py-2 text-xs font-semibold">{h}</th>)}
                </tr></thead>
                <tbody>
                  {selectedInvoice.lineItems.map((item, i) => (
                    <tr key={`${item.treatmentId}-${i}`} className="border-b border-slate-100">
                      <td className="px-3 py-2">{item.treatment}</td>
                      <td className="px-3 py-2">{item.toothNumbers.join(", ") || "—"}</td>
                      <td className="px-3 py-2">{item.quantity}</td>
                      <td className="px-3 py-2">{usd(item.unitPrice)}</td>
                      <td className="px-3 py-2 font-semibold">{usd(item.quantity * item.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="ml-auto w-64 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Total</span><span className="font-semibold">{usd(selTotal)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Paid</span><span className="font-semibold text-emerald-700">{usd(selPaid)}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-1"><span className="font-bold">Outstanding</span><span className="font-bold">{usd(selOuts)}</span></div>
              </div>
            </div>
          )}
        </div>

        {/* ── Page Header ─────────────────────────────────────── print:hidden */}
        <div className="flex flex-col gap-4 print:hidden sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-sky-600">Module D</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">Billing & Payments</h1>
            <p className="mt-1 text-sm text-slate-500">Auto-generated invoices from EMR — review charges and record payments.</p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!selectedInvoice}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 print:hidden"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-3.5 w-3.5">
              <path d="M4 6V2h8v4M4 12H2V7h12v5h-2M4 9h8M4 12v3h8v-3"/>
            </svg>
            Print PDF
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3 print:hidden">
          {[
            { label: "Total Invoices", value: invoices.length, dark: true },
            { label: "Revenue Collected", value: usd(totalRevenue), dark: false },
            { label: "Outstanding", value: usd(totalOutstanding), dark: false, warn: totalOutstanding > 0 },
          ].map((k) => (
            <div key={k.label} className={`rounded-2xl border border-slate-200 px-4 py-3 shadow-sm ${k.dark ? "bg-slate-900" : k.warn ? "bg-amber-50" : "bg-white"}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-widest ${k.dark ? "text-slate-400" : "text-slate-400"}`}>{k.label}</p>
              <p className={`mt-1.5 text-xl font-bold ${k.dark ? "text-white" : k.warn ? "text-amber-700" : "text-slate-900"}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Banners */}
        {isLoading && (
          <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700 print:hidden">
            <svg className="h-4 w-4 animate-spin shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="8" r="6" strokeOpacity=".25"/><path d="M14 8a6 6 0 0 0-6-6" strokeLinecap="round"/></svg>
            Loading billing data…
          </div>
        )}
        {errorMessage && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 print:hidden">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mt-0.5 h-4 w-4 shrink-0"><circle cx="8" cy="8" r="7"/><path d="M8 5v3M8 11h.01"/></svg>
            {errorMessage}
          </div>
        )}

        {/* ── Main grid ──────────────────────────────────────────────── */}
        <div className="grid gap-5 print:hidden xl:grid-cols-[340px_1fr]">

          {/* Invoice list */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-bold text-slate-900">Invoices</h2>
              <div className="mt-3">
                <label className={lbl}>Filter by Patient</label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => { setSelectedPatientId(e.target.value); setSelectedInvoiceId(""); }}
                  className={input}
                >
                  <option value="">All patients</option>
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                </select>
              </div>
            </div>

            <div className="divide-y divide-slate-50 overflow-y-auto" style={{ maxHeight: "560px" }}>
              {visibleInvoices.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-sm text-slate-400">No invoices found.</p>
                  <p className="mt-1 text-xs text-slate-400">Save a billable EMR record first.</p>
                </div>
              ) : (
                visibleInvoices.map((inv) => {
                  const total = invoiceTotal(inv);
                  const paid  = invoicePaid(inv);
                  const outs  = Math.max(total - paid, 0);
                  const isActive = inv.id === (selectedInvoice?.id ?? "");

                  return (
                    <button
                      key={inv.id}
                      type="button"
                      onClick={() => setSelectedInvoiceId(inv.id)}
                      className={`w-full px-5 py-4 text-left transition ${isActive ? "bg-sky-50" : "hover:bg-slate-50"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900">{inv.invoiceNumber}</p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">{inv.patientName}</p>
                          <p className="text-xs text-slate-400">{fmtDate(inv.issueDate)}</p>
                        </div>
                        <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold ${outs === 0 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                          {outs === 0 ? "Paid" : "Outstanding"}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-lg bg-slate-100 px-2 py-1.5">
                          <p className="text-slate-500">Total</p>
                          <p className="mt-0.5 font-bold text-slate-900">{usd(total)}</p>
                        </div>
                        <div className="rounded-lg bg-emerald-50 px-2 py-1.5">
                          <p className="text-slate-500">Paid</p>
                          <p className="mt-0.5 font-bold text-emerald-700">{usd(paid)}</p>
                        </div>
                        <div className="rounded-lg bg-rose-50 px-2 py-1.5">
                          <p className="text-slate-500">Balance</p>
                          <p className="mt-0.5 font-bold text-rose-700">{usd(outs)}</p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-5">

            {/* Invoice detail */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-base font-bold text-slate-900">Invoice Detail</h2>
                <p className="mt-0.5 text-xs text-slate-500">Charges from EMR treatment catalog.</p>
              </div>

              {!selectedInvoice ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-sm text-slate-400">Select an invoice to view charges.</p>
                </div>
              ) : (
                <div className="p-5 space-y-5">
                  {/* Meta */}
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      ["Patient", selectedInvoice.patientName],
                      ["Visit Date", fmtDate(selectedInvoice.issueDate)],
                      ["Linked EMR", selectedInvoice.linkedRecordId || "Not linked"],
                      ["Type", selectedInvoice.autoGenerated ? "Auto-generated" : "Manual"],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{k}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{v}</p>
                      </div>
                    ))}
                  </div>

                  {/* Line items table */}
                  <div>
                    <p className={lbl}>Treatment Charges</p>
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-slate-50 text-left">
                            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">Treatment</th>
                            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">Teeth</th>
                            <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-500">Qty</th>
                            <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-500">Unit</th>
                            <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-500">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedInvoice.lineItems.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-400">No billable treatments yet.</td></tr>
                          ) : (
                            selectedInvoice.lineItems.map((item, i) => (
                              <tr key={`${item.treatmentId}-${i}`} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-medium text-slate-900">{item.treatment}</td>
                                <td className="px-4 py-3 text-slate-500">{item.toothNumbers.length > 0 ? item.toothNumbers.join(", ") : "Case level"}</td>
                                <td className="px-4 py-3 text-right text-slate-600">{item.quantity}</td>
                                <td className="px-4 py-3 text-right text-slate-600">{usd(item.unitPrice)}</td>
                                <td className="px-4 py-3 text-right font-semibold text-slate-900">{usd(item.quantity * item.unitPrice)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="ml-auto grid w-full max-w-xs gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Invoice Total</span><span className="font-semibold text-slate-900">{usd(selTotal)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Paid</span><span className="font-semibold text-emerald-700">{usd(selPaid)}</span></div>
                    <div className="flex justify-between border-t border-slate-200 pt-2">
                      <span className="font-bold text-slate-900">Outstanding</span>
                      <span className={`font-bold ${selOuts > 0 ? "text-rose-700" : "text-emerald-700"}`}>{usd(selOuts)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Record Payment */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-base font-bold text-slate-900">Record Payment</h2>
                <p className="mt-0.5 text-xs text-slate-500">Payments are always entered manually.</p>
              </div>

              {!selectedInvoice ? (
                <p className="px-5 py-8 text-center text-sm text-slate-400">Select an invoice first.</p>
              ) : selOuts === 0 ? (
                <div className="flex items-center gap-3 px-5 py-5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4 text-emerald-600"><path d="M3 8l3 3 7-7"/></svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-700">Fully paid</p>
                    <p className="text-xs text-slate-400">No outstanding balance on this invoice.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handlePaymentSubmit} className="p-5 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <label className={lbl}>Amount</label>
                      <input type="number" min="0" step="0.01" name="amount" value={paymentForm.amount || ""} onChange={handlePaymentChange} placeholder={selOuts.toFixed(2)} className={input} />
                    </div>
                    <div>
                      <label className={lbl}>Method</label>
                      <select name="method" value={paymentForm.method} onChange={handlePaymentChange} className={input}>
                        {paymentMethodOptions.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={lbl}>Date Paid</label>
                      <input type="date" name="paidAt" value={paymentForm.paidAt} onChange={handlePaymentChange} className={input} />
                    </div>
                    <div>
                      <label className={lbl}>Reference</label>
                      <input name="reference" value={paymentForm.reference} onChange={handlePaymentChange} placeholder="Txn / receipt ref" className={input} />
                    </div>
                  </div>
                  <button type="submit" disabled={isSaving || !paymentForm.amount || !paymentForm.paidAt}
                    className="flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50">
                    {isSaving ? (
                      <><svg className="h-4 w-4 animate-spin" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="8" r="6" strokeOpacity=".3"/><path d="M14 8a6 6 0 0 0-6-6" strokeLinecap="round"/></svg>Recording…</>
                    ) : "Record Payment"}
                  </button>
                </form>
              )}
            </div>

            {/* Payment history */}
            {selectedInvoice && selectedInvoice.payments.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h2 className="text-base font-bold text-slate-900">Payment History</h2>
                </div>
                <div className="overflow-hidden rounded-b-2xl">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left">
                        <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">Date</th>
                        <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">Method</th>
                        <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">Reference</th>
                        <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-500">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedInvoice.payments.map((p, i) => (
                        <tr key={`${p.method}-${p.paidAt}-${i}`} className="hover:bg-slate-50">
                          <td className="px-5 py-3 text-slate-700">{fmtDate(p.paidAt)}</td>
                          <td className="px-5 py-3 capitalize text-slate-700">{p.method}</td>
                          <td className="px-5 py-3 text-slate-500">{p.reference || "—"}</td>
                          <td className="px-5 py-3 text-right font-semibold text-emerald-700">{usd(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </AdminShell>
  );
}
