"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import { AdminShell } from "@/components/admin-shell";
import {
  initialInvoiceForm,
  initialInvoiceLineForm,
  initialPaymentForm,
  paymentMethodOptions,
  type Invoice,
  type InvoiceFormState,
  type InvoiceLineFormState,
  type PatientProfile,
  type PaymentFormState,
} from "@/lib/clinic-types";

function currency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDateLabel(date: string) {
  if (!date) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function invoiceTotal(invoice: Invoice) {
  return invoice.lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
}

function invoicePaid(invoice: Invoice) {
  return invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
}

export default function BillingPage() {
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceForm, setInvoiceForm] = useState<InvoiceFormState>(initialInvoiceForm);
  const [lineItemForm, setLineItemForm] =
    useState<InvoiceLineFormState>(initialInvoiceLineForm);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>(initialPaymentForm);
  const [lineItems, setLineItems] = useState<Invoice["lineItems"]>([]);
  const [payments, setPayments] = useState<Invoice["payments"]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadBillingData() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const [patientsResponse, invoicesResponse] = await Promise.all([
          fetch("/api/patients", { cache: "no-store" }),
          fetch("/api/billing", { cache: "no-store" }),
        ]);

        if (!patientsResponse.ok || !invoicesResponse.ok) {
          throw new Error(
            `${patientsResponse.ok ? "" : await patientsResponse.text()} ${
              invoicesResponse.ok ? "" : await invoicesResponse.text()
            }`.trim(),
          );
        }

        const [patientsData, invoicesData] = await Promise.all([
          (await patientsResponse.json()) as PatientProfile[],
          (await invoicesResponse.json()) as Invoice[],
        ]);

        setPatients(patientsData);
        setInvoices(invoicesData);
      } catch (error) {
        console.error(error);
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load billing data.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadBillingData();
  }, []);

  function handleInvoiceFieldChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target;
    setInvoiceForm((current) => ({ ...current, [name]: value }));
  }

  function handleLineItemFieldChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setLineItemForm((current) => ({
      ...current,
      [name]: name === "quantity" || name === "unitPrice" ? Number(value) : value,
    }));
  }

  function handlePaymentFieldChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target;
    setPaymentForm((current) => ({
      ...current,
      [name]: name === "amount" ? Number(value) : value,
    }));
  }

  function addTreatmentCharge() {
    if (!lineItemForm.treatment || lineItemForm.quantity <= 0) {
      return;
    }

    setLineItems((current) => [...current, lineItemForm]);
    setLineItemForm(initialInvoiceLineForm);
  }

  function addPayment() {
    if (paymentForm.amount <= 0 || !paymentForm.paidAt) {
      return;
    }

    setPayments((current) => [...current, paymentForm]);
    setPaymentForm(initialPaymentForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const selectedPatient = patients.find(
      (patient) => patient.id === invoiceForm.patientId,
    );

    if (!selectedPatient || !invoiceForm.invoiceNumber || !invoiceForm.issueDate) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");

      const response = await fetch("/api/billing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...invoiceForm,
          patientName: selectedPatient.fullName,
          lineItems,
          payments,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const nextInvoice = (await response.json()) as Invoice;
      setInvoices((current) => [nextInvoice, ...current]);
      setInvoiceForm(initialInvoiceForm);
      setLineItemForm(initialInvoiceLineForm);
      setPaymentForm(initialPaymentForm);
      setLineItems([]);
      setPayments([]);
      form.reset();
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Invoice could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const draftTotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const draftPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const draftOutstanding = Math.max(draftTotal - draftPaid, 0);
  const totalRevenue = invoices.reduce((sum, invoice) => sum + invoicePaid(invoice), 0);
  const totalOutstanding = invoices.reduce(
    (sum, invoice) => sum + Math.max(invoiceTotal(invoice) - invoicePaid(invoice), 0),
    0,
  );

  return (
    <AdminShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-700">
            Module D
          </p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                Billing & Payments
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Generate invoices, add treatment charges, accept partial or full
                payments, monitor outstanding balances, and review billing history.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">
                  Invoices
                </p>
                <p className="mt-2 text-2xl font-semibold">{invoices.length}</p>
              </div>
              <div className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  Revenue
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {currency(totalRevenue)}
                </p>
              </div>
              <div className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  Outstanding
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {currency(totalOutstanding)}
                </p>
              </div>
            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="rounded-[24px] border border-sky-100 bg-sky-50 px-5 py-4 text-sm text-sky-800">
            Loading billing data from MongoDB...
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-[24px] border border-rose-100 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <h3 className="text-xl font-semibold text-slate-950">Generate Invoice</h3>

            <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Patient</span>
                  <select
                    required
                    name="patientId"
                    value={invoiceForm.patientId}
                    onChange={handleInvoiceFieldChange}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  >
                    <option value="">Select patient</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.fullName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">
                    Invoice Number
                  </span>
                  <input
                    required
                    name="invoiceNumber"
                    value={invoiceForm.invoiceNumber}
                    onChange={handleInvoiceFieldChange}
                    placeholder="INV-1001"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Issue Date</span>
                  <input
                    required
                    type="date"
                    name="issueDate"
                    value={invoiceForm.issueDate}
                    onChange={handleInvoiceFieldChange}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  />
                </label>
                <label className="space-y-1 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Notes</span>
                  <textarea
                    name="notes"
                    value={invoiceForm.notes}
                    onChange={handleInvoiceFieldChange}
                    placeholder="Insurance note, payment terms, billing comments"
                    className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  />
                </label>
              </div>

              <div className="rounded-3xl bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-semibold text-slate-950">
                    Treatment Charges
                  </h4>
                  <button
                    type="button"
                    onClick={addTreatmentCharge}
                    className="rounded-full bg-slate-950 px-4 py-2 text-xs font-medium text-white"
                  >
                    Add Charge
                  </button>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-[1.4fr_0.6fr_0.8fr]">
                  <input
                    name="treatment"
                    value={lineItemForm.treatment}
                    onChange={handleLineItemFieldChange}
                    placeholder="Scaling, filling, crown"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400"
                  />
                  <input
                    type="number"
                    min="1"
                    name="quantity"
                    value={lineItemForm.quantity}
                    onChange={handleLineItemFieldChange}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400"
                  />
                  <input
                    type="number"
                    min="0"
                    name="unitPrice"
                    value={lineItemForm.unitPrice}
                    onChange={handleLineItemFieldChange}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400"
                  />
                </div>
                <div className="mt-4 space-y-2">
                  {lineItems.length === 0 ? (
                    <p className="text-sm text-slate-500">No treatment charges added yet.</p>
                  ) : (
                    lineItems.map((item, index) => (
                      <div
                        key={`${item.treatment}-${index}`}
                        className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200"
                      >
                        <div>
                          <p className="font-medium text-slate-900">{item.treatment}</p>
                          <p className="text-sm text-slate-500">
                            {item.quantity} x {currency(item.unitPrice)}
                          </p>
                        </div>
                        <span className="font-semibold text-slate-900">
                          {currency(item.quantity * item.unitPrice)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-3xl bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-semibold text-slate-950">Payments</h4>
                  <button
                    type="button"
                    onClick={addPayment}
                    className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white"
                  >
                    Add Payment
                  </button>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <input
                    type="number"
                    min="0"
                    name="amount"
                    value={paymentForm.amount}
                    onChange={handlePaymentFieldChange}
                    placeholder="Amount"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400"
                  />
                  <select
                    name="method"
                    value={paymentForm.method}
                    onChange={handlePaymentFieldChange}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400"
                  >
                    {paymentMethodOptions.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    name="paidAt"
                    value={paymentForm.paidAt}
                    onChange={handlePaymentFieldChange}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400"
                  />
                  <input
                    name="reference"
                    value={paymentForm.reference}
                    onChange={handlePaymentFieldChange}
                    placeholder="Receipt / txn ref"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400"
                  />
                </div>
                <div className="mt-4 space-y-2">
                  {payments.length === 0 ? (
                    <p className="text-sm text-slate-500">No payments added yet.</p>
                  ) : (
                    payments.map((payment, index) => (
                      <div
                        key={`${payment.method}-${payment.paidAt}-${index}`}
                        className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200"
                      >
                        <div>
                          <p className="font-medium text-slate-900">
                            {currency(payment.amount)}
                          </p>
                          <p className="text-sm text-slate-500">
                            {payment.method} | {formatDateLabel(payment.paidAt)}
                          </p>
                        </div>
                        <span className="text-sm text-slate-500">
                          {payment.reference || "No reference"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSaving ? "Saving Invoice..." : "Save Invoice"}
              </button>
            </form>
          </section>

          <div className="space-y-6">
            <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <h3 className="text-xl font-semibold text-slate-950">Draft Summary</h3>
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                  <p className="text-sm text-slate-500">Invoice Total</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">
                    {currency(draftTotal)}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                  <p className="text-sm text-slate-500">Paid</p>
                  <p className="mt-1 text-2xl font-semibold text-emerald-700">
                    {currency(draftPaid)}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-950 p-4 text-white">
                  <p className="text-sm text-slate-300">Outstanding Balance</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {currency(draftOutstanding)}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <h3 className="text-xl font-semibold text-slate-950">Billing History</h3>
              <div className="mt-4 space-y-3">
                {invoices.length === 0 ? (
                  <p className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
                    No invoices yet.
                  </p>
                ) : (
                  invoices.map((invoice) => {
                    const total = invoiceTotal(invoice);
                    const paid = invoicePaid(invoice);
                    const outstanding = Math.max(total - paid, 0);

                    return (
                      <article
                        key={invoice.id}
                        className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {invoice.invoiceNumber}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {invoice.patientName} | {formatDateLabel(invoice.issueDate)}
                            </p>
                          </div>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                            {outstanding === 0 ? "Paid" : "Outstanding"}
                          </span>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                          <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                            <p className="text-slate-500">Total</p>
                            <p className="mt-1 font-semibold text-slate-900">
                              {currency(total)}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                            <p className="text-slate-500">Paid</p>
                            <p className="mt-1 font-semibold text-emerald-700">
                              {currency(paid)}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                            <p className="text-slate-500">Balance</p>
                            <p className="mt-1 font-semibold text-rose-700">
                              {currency(outstanding)}
                            </p>
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
