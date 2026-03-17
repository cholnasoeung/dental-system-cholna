"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function AppAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const url = `${pathname}${searchParams.toString() ? `?${searchParams}` : ""}`;
    const payload = JSON.stringify({
      event: "page_view",
      path: url,
      referrer: document.referrer,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      userAgent: navigator.userAgent,
      occurredAt: new Date().toISOString(),
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics", payload);
      return;
    }

    void fetch("/api/analytics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: payload,
      keepalive: true,
    });
  }, [pathname, searchParams]);

  return null;
}
