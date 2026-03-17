"use client";

import { useEffect, useState } from "react";

type AiInsight = {
  headline: string;
  summary: string;
  recommendation: string;
};

export function AiInsightPanel() {
  const [insight, setInsight] = useState<AiInsight | null>(null);

  useEffect(() => {
    async function loadInsight() {
      try {
        const response = await fetch("/api/ai/insights", { cache: "no-store" });

        if (!response.ok) {
          return;
        }

        setInsight((await response.json()) as AiInsight);
      } catch (error) {
        console.error(error);
      }
    }

    loadInsight();
  }, []);

  return (
    <div className="rounded-[32px] border border-white/80 bg-[linear-gradient(180deg,#fffdf7_0%,#fff6e9_100%)] p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-700">
        AI Insight
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-950">
        Intelligent clinic guidance, built into the workflow
      </h2>
      <div className="mt-6 rounded-3xl bg-white/80 p-5 ring-1 ring-amber-100">
        <p className="text-sm font-semibold text-slate-950">
          {insight?.headline || "Preparing daily operational summary..."}
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {insight?.summary ||
            "AI-ready insight cards can surface bottlenecks, chair utilization risks, and patient follow-up priorities."}
        </p>
        <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {insight?.recommendation || "Generating recommendation..."}
        </div>
      </div>
    </div>
  );
}
