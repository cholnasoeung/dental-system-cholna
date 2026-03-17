"use client";

import { useEffect, useState } from "react";

type LiveSnapshot = {
  timestamp: string;
  waitingPatients: number;
  activeChairs: number;
  alerts: number;
};

export function LiveOperationsPreview() {
  const [snapshot, setSnapshot] = useState<LiveSnapshot | null>(null);

  useEffect(() => {
    const source = new EventSource("/api/realtime/stream");

    source.onmessage = (event) => {
      const nextSnapshot = JSON.parse(event.data) as LiveSnapshot;
      setSnapshot(nextSnapshot);
    };

    return () => {
      source.close();
    };
  }, []);

  return (
    <div className="rounded-[30px] border border-white/12 bg-white/10 p-5 shadow-[0_20px_40px_rgba(2,8,23,0.25)] backdrop-blur-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/80">
        Live Operations
      </p>
      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-white px-4 py-4 text-slate-950">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Waiting</p>
          <p className="mt-2 text-3xl font-semibold">{snapshot?.waitingPatients ?? "--"}</p>
        </div>
        <div className="rounded-2xl bg-cyan-300 px-4 py-4 text-slate-950">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-700">Active Chairs</p>
          <p className="mt-2 text-3xl font-semibold">{snapshot?.activeChairs ?? "--"}</p>
        </div>
        <div className="rounded-2xl bg-amber-200 px-4 py-4 text-slate-950">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-700">Alerts</p>
          <p className="mt-2 text-3xl font-semibold">{snapshot?.alerts ?? "--"}</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-200">
        {snapshot
          ? `Updated ${new Date(snapshot.timestamp).toLocaleTimeString()}`
          : "Connecting to live clinic feed..."}
      </p>
    </div>
  );
}
