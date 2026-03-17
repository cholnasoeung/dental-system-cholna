import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#fff7ed_0%,#f8fafc_50%,#fef2f2_100%)] p-6">
      <div className="w-full max-w-lg rounded-[32px] border border-white/80 bg-white/90 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.10)]">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-700">
          Access Restricted
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          You do not have permission for this page
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Your account is signed in, but your role or permissions do not allow access here.
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            href="/"
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Back To Dashboard
          </Link>
          <Link
            href="/login"
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Switch Account
          </Link>
        </div>
      </div>
    </div>
  );
}
