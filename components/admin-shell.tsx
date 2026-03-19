"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

import { AuthUserPanel } from "@/components/auth-user-panel";

const menuSections = [
  {
    title: "Workflow",
    items: [
      { label: "Dashboard Overview", href: "/" },
      { label: "1. Patient Registration", href: "/patients" },
      { label: "2. Appointment Flow", href: "/appointments" },
      { label: "3. Dentist Availability", href: "/staff" },
      { label: "4. EMR & Treatment", href: "/emr" },
      { label: "5. Prescriptions", href: "/prescriptions" },
      { label: "6. Billing & Payments", href: "/billing" },
      { label: "7. Reports & Dashboard", href: "/reports" },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Notifications", href: "/notifications" },
      { label: "Support", href: "/support" },
      { label: "Patient Portal", href: "/portal" },
    ],
  },
  {
    title: "Access",
    items: [
      { label: "Settings", href: "#" },
      { label: "Audit Trail", href: "#" },
    ],
  },
];

type AdminShellProps = {
  children: ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();

  return (
    <div className="h-screen overflow-hidden bg-[linear-gradient(135deg,#f3fafc_0%,#e7f2ff_45%,#f9fbff_100%)] p-0">
      <main className="flex h-screen w-full overflow-hidden border-y border-white/70 bg-white/75 shadow-[0_30px_80px_rgba(15,23,42,0.10)] backdrop-blur">
        <aside className="sticky top-0 hidden h-screen w-[290px] shrink-0 flex-col justify-between overflow-y-auto bg-[linear-gradient(180deg,#0f172a_0%,#102033_45%,#16324a_100%)] p-6 text-white lg:flex xl:w-[310px] xl:p-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/20 text-lg font-bold text-cyan-200 ring-1 ring-white/10">
                DM
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/80">
                  Admin Panel
                </p>
                <h1 className="text-2xl font-semibold tracking-tight">DentalFlow</h1>
              </div>
            </div>

            <div className="mt-8 rounded-3xl bg-white/8 p-4 ring-1 ring-white/10">
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">
                Clinic
              </p>
              <p className="mt-2 text-lg font-semibold">Smile Care Center</p>
              <p className="mt-1 text-sm text-slate-300">
                Centralized navigation for all clinic operations.
              </p>
            </div>

            <nav className="mt-8 space-y-6">
              {menuSections.map((section) => (
                <div key={section.title}>
                  <p className="mb-3 text-xs uppercase tracking-[0.3em] text-slate-400">
                    {section.title}
                  </p>
                  <div className="space-y-2">
                    {section.items.map((item) => {
                      const isActive =
                        item.href !== "#" &&
                        (pathname === item.href ||
                          (item.href !== "/" && pathname.startsWith(item.href)));

                      const className = `flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                        isActive
                          ? "bg-cyan-300 text-slate-950 shadow-[0_10px_30px_rgba(34,211,238,0.25)]"
                          : item.href === "#"
                            ? "cursor-not-allowed bg-white/0 text-slate-500"
                            : "bg-white/0 text-slate-200 hover:bg-white/8 hover:text-white"
                      }`;

                      return item.href === "#" ? (
                        <div key={item.label} className={className}>
                          <span>{item.label}</span>
                        </div>
                      ) : (
                        <Link key={item.label} href={item.href} className={className}>
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>

          <AuthUserPanel />
        </aside>

        <section className="h-screen flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_22%),linear-gradient(180deg,#f9fdff_0%,#eef6ff_100%)] p-4 md:p-6 xl:p-8">
          {children}
        </section>
      </main>
    </div>
  );
}
