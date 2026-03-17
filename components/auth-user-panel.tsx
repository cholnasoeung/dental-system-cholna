"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  permissions: string[];
};

function formatRole(role?: string) {
  if (!role) {
    return "Staff Member";
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function AuthUserPanel() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { user: SessionUser };
        setUser(data.user);
      } catch (error) {
        console.error(error);
      }
    }

    loadSession();
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const initials = user?.fullName
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="mt-8 rounded-3xl bg-white/8 p-4 ring-1 ring-white/10">
      <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">
        Signed In
      </p>
      <div className="mt-3 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-300 text-sm font-bold text-slate-950">
          {initials || "AU"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-white">
            {user?.fullName || "Authenticated User"}
          </p>
          <p className="text-sm text-slate-300">{formatRole(user?.role)}</p>
          <p className="text-xs text-cyan-200/70">
            {user?.permissions?.length ?? 0} permissions
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="mt-4 w-full rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
      >
        Sign Out
      </button>
    </div>
  );
}
