"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";

import { AuthUserPanel } from "@/components/auth-user-panel";

// ─── Icons ─────────────────────────────────────────────────────────
function IcoDashboard() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px] shrink-0">
      <rect x="2" y="2" width="7" height="7" rx="1.5"/>
      <rect x="11" y="2" width="7" height="7" rx="1.5"/>
      <rect x="11" y="11" width="7" height="7" rx="1.5"/>
      <rect x="2" y="11" width="7" height="7" rx="1.5"/>
    </svg>
  );
}
function IcoUsers() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px] shrink-0">
      <circle cx="8" cy="6" r="3"/><path d="M2 18c0-3.3 2.7-6 6-6"/>
      <circle cx="15" cy="9" r="2.5"/><path d="M11 18c0-2.2 1.8-4 4-4s4 1.8 4 4"/>
    </svg>
  );
}
function IcoCalendar() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px] shrink-0">
      <rect x="2" y="3" width="16" height="15" rx="2"/>
      <path d="M6 2v2M14 2v2M2 8h16"/>
      <circle cx="7" cy="12" r="1" fill="currentColor" stroke="none"/>
      <circle cx="10" cy="12" r="1" fill="currentColor" stroke="none"/>
      <circle cx="13" cy="12" r="1" fill="currentColor" stroke="none"/>
    </svg>
  );
}
function IcoUserCheck() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px] shrink-0">
      <circle cx="8" cy="6" r="3"/><path d="M2 18c0-3.3 2.7-6 6-6h2"/><path d="M12 15l2 2 4-4"/>
    </svg>
  );
}
function IcoClipboard() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px] shrink-0">
      <path d="M7 3H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2"/>
      <rect x="7" y="1" width="6" height="4" rx="1"/>
      <path d="M7 10h6M7 14h4"/>
    </svg>
  );
}
function IcoPill() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px] shrink-0">
      <path d="M4.5 9.5 9.5 4.5a4.243 4.243 0 0 1 6 6L10.5 15.5a4.243 4.243 0 0 1-6-6z"/>
      <line x1="7" y1="10" x2="13" y2="10"/>
    </svg>
  );
}
function IcoBilling() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px] shrink-0">
      <rect x="2" y="4" width="16" height="12" rx="2"/>
      <path d="M2 9h16"/><path d="M6 13h2M10 13h4"/>
    </svg>
  );
}
function IcoBarChart() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px] shrink-0">
      <path d="M3 17V9M8 17V5M13 17v-6M18 17v-3"/>
    </svg>
  );
}
function IcoBell() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px] shrink-0">
      <path d="M10 2a6 6 0 0 1 6 6v3l1.5 2.5a.5.5 0 0 1-.4.8H2.9a.5.5 0 0 1-.4-.8L4 11V8a6 6 0 0 1 6-6z"/>
      <path d="M8.5 17a1.5 1.5 0 0 0 3 0"/>
    </svg>
  );
}
function IcoSupport() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px] shrink-0">
      <path d="M18 10c0 4.4-3.6 8-8 8a7.96 7.96 0 0 1-4.2-1.2L2 18l1.2-3.8A8 8 0 1 1 18 10z"/>
      <path d="M9 9a1 1 0 1 1 2 0c0 .7-.8 1.3-1 2M10 14h.01"/>
    </svg>
  );
}
function IcoGlobe() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px] shrink-0">
      <circle cx="10" cy="10" r="8"/>
      <path d="M2 10h16M10 2a12 12 0 0 1 0 16M10 2a12 12 0 0 0 0 16"/>
    </svg>
  );
}
function IcoSettings() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px] shrink-0">
      <circle cx="10" cy="10" r="3"/>
      <path d="M10 2v1.5M10 16.5V18M2 10h1.5M16.5 10H18M4.2 4.2l1 1M14.8 14.8l1 1M4.2 15.8l1-1M14.8 5.2l1-1"/>
    </svg>
  );
}
function IcoShield() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px] shrink-0">
      <path d="M10 2L3 5v5c0 4.4 3 7.8 7 9 4-1.2 7-4.6 7-9V5l-7-3z"/>
      <path d="M7 10l2 2 4-4"/>
    </svg>
  );
}

// ─── Menu Config ───────────────────────────────────────────────────
const menuSections = [
  {
    title: "Workflow",
    items: [
      { label: "Dashboard",       href: "/",              Icon: IcoDashboard },
      { label: "Patients",        href: "/patients",      Icon: IcoUsers },
      { label: "Appointments",    href: "/appointments",  Icon: IcoCalendar },
      { label: "Staff",           href: "/staff",         Icon: IcoUserCheck },
      { label: "EMR & Treatment", href: "/emr",           Icon: IcoClipboard },
      { label: "Prescriptions",   href: "/prescriptions", Icon: IcoPill },
      { label: "Billing",         href: "/billing",       Icon: IcoBilling },
      { label: "Reports",         href: "/reports",       Icon: IcoBarChart },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Notifications",   href: "/notifications", Icon: IcoBell,     badge: 0 },
      { label: "Support",         href: "/support",       Icon: IcoSupport },
      { label: "Patient Portal",  href: "/portal",        Icon: IcoGlobe },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Settings",    href: "#", Icon: IcoSettings, disabled: true },
      { label: "Audit Trail", href: "#", Icon: IcoShield,   disabled: true },
    ],
  },
];

type AdminShellProps = { children: ReactNode };

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebar = (
    <aside className="flex h-full w-full flex-col bg-[#0c1524] text-white">
      {/* Top section */}
      <div className="flex-1 overflow-y-auto">
        {/* Logo area */}
        <div className="border-b border-white/5 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-sky-600 shadow-lg shadow-cyan-500/25 ring-1 ring-white/15">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5 text-white">
                <path d="M12 2C9.8 2 7 3.5 7 7c0 2 .5 3.5 1 5 .5 1.3.5 3 .5 5s1 4 3.5 4 3.5-2.5 3.5-4 0-3.7.5-5c.5-1.5 1-3 1-5 0-3.5-2.8-5-5-5z"/>
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-[15px] font-bold leading-none tracking-tight text-white">DentalFlow</h1>
              <p className="mt-0.5 text-[10px] font-medium text-slate-500">Management Platform</p>
            </div>
          </div>

          {/* Clinic status pill */}
          <div className="mt-4 flex items-center justify-between rounded-xl border border-white/5 bg-white/4 px-3.5 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-slate-200">Smile Care Center</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow shadow-emerald-400/50" />
                <span className="text-[11px] text-emerald-400/80">System online</span>
              </div>
            </div>
            <div className="ml-2 shrink-0 rounded-lg bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 ring-1 ring-emerald-500/20">
              LIVE
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-4">
          {menuSections.map((section) => (
            <div key={section.title} className="mb-5 last:mb-0">
              <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.4em] text-slate-600">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isDisabled = "disabled" in item && item.disabled;
                  const isActive =
                    !isDisabled &&
                    item.href !== "#" &&
                    (pathname === item.href ||
                      (item.href !== "/" && pathname.startsWith(item.href)));

                  if (isDisabled) {
                    return (
                      <div
                        key={item.label}
                        className="flex cursor-not-allowed items-center gap-3 rounded-xl px-2.5 py-2 opacity-35"
                      >
                        <item.Icon />
                        <span className="text-[13px] font-medium text-slate-500">{item.label}</span>
                        <span className="ml-auto rounded-md bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-600">
                          Soon
                        </span>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`group relative flex items-center gap-3 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-all duration-150 ${
                        isActive
                          ? "bg-gradient-to-r from-cyan-500/15 to-transparent text-cyan-300"
                          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                      }`}
                    >
                      {/* Active left bar */}
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                      )}

                      <span className={isActive ? "text-cyan-400" : "text-slate-600 group-hover:text-slate-300"}>
                        <item.Icon />
                      </span>

                      <span className="flex-1 leading-none">{item.label}</span>

                      {"badge" in item && typeof item.badge === "number" && item.badge > 0 ? (
                        <span className="flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm shadow-rose-500/40">
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom — User Panel */}
      <div className="border-t border-white/5 px-3 py-3">
        <AuthUserPanel />
      </div>
    </aside>
  );

  return (
    <div className="h-screen overflow-hidden bg-[#0c1524]">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="flex h-screen w-full overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden w-[252px] shrink-0 lg:block xl:w-[268px]">
          {sidebar}
        </div>

        {/* Mobile Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-40 w-[260px] transition-transform duration-300 ease-in-out lg:hidden ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {sidebar}
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Mobile Top Bar */}
          <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 shadow-sm lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4">
                <path d="M3 5h14M3 10h14M3 15h14"/>
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-sky-600 shadow shadow-cyan-500/25">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-white">
                  <path d="M12 2C9.8 2 7 3.5 7 7c0 2 .5 3.5 1 5 .5 1.3.5 3 .5 5s1 4 3.5 4 3.5-2.5 3.5-4 0-3.7.5-5c.5-1.5 1-3 1-5 0-3.5-2.8-5-5-5z"/>
                </svg>
              </div>
              <span className="text-sm font-bold text-slate-900">DentalFlow</span>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto bg-[#f4f6f9] p-4 md:p-6 xl:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
