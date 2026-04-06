import { formatPercent } from "@/lib/clinic-insights";

// ─── Types ──────────────────────────────────────────────────────────
type TrendSeries = {
  label: string;
  values: number[];
  color: string;
  fillColor?: string;
  formatValue?: (value: number) => string;
};

type TrendChartProps = {
  labels: string[];
  series: TrendSeries[];
  className?: string;
  height?: number;
};

type DonutChartProps = {
  items: Array<{ label: string; value: number; color: string }>;
  centerLabel: string;
  centerValue: string;
};

type RankedBarsProps = {
  items: Array<{ label: string; value: number; detail?: string }>;
  color: string;
  formatValue?: (value: number) => string;
};

// ─── Helpers ────────────────────────────────────────────────────────
function formatNumber(value: number) {
  if (Math.abs(value) >= 1_000_000) {
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
  }
  if (Math.abs(value) >= 1_000) {
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
  }
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: value % 1 === 0 ? 0 : 1 }).format(value);
}

function lastValue(values: number[]) {
  return values.length > 0 ? values[values.length - 1] : 0;
}

/** Build a smooth cubic bezier path through points */
function buildSmoothPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpX = (prev.x + curr.x) / 2;
    d += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

function buildSmoothArea(points: Array<{ x: number; y: number }>, bottom: number) {
  if (points.length === 0) return "";
  const linePath = buildSmoothPath(points);
  const last = points[points.length - 1];
  const first = points[0];
  return `${linePath} L ${last.x} ${bottom} L ${first.x} ${bottom} Z`;
}

// ─── TrendChart ────────────────────────────────────────────────────
export function TrendChart({ labels, series, className = "", height = 220 }: TrendChartProps) {
  const width = 640;
  const padding = { top: 20, right: 20, bottom: 32, left: 16 };
  const usableW = width - padding.left - padding.right;
  const usableH = height - padding.top - padding.bottom;

  const allValues = series.flatMap((s) => s.values);
  const maxValue = Math.max(1, ...allValues);
  const tickCount = 4;
  const tickValues = Array.from({ length: tickCount }, (_, i) =>
    Math.round((maxValue * (tickCount - 1 - i)) / (tickCount - 1)),
  );
  const labelIndexes = labels.length <= 1
    ? [0]
    : [...new Set([0, Math.floor((labels.length - 1) / 2), labels.length - 1])];

  const uniqueId = series.map((s) => s.label).join("-").replace(/\s+/g, "");

  return (
    <div className={className}>
      {/* Legend */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {series.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs"
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full shadow-sm"
              style={{ backgroundColor: item.color }}
            />
            <span className="font-semibold text-slate-700">{item.label}</span>
            <span className="text-slate-400">
              {(item.formatValue ?? formatNumber)(lastValue(item.values))}
            </span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/60">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
          <defs>
            {series.map((item) =>
              item.fillColor ? (
                <linearGradient
                  key={`grad-${item.label}`}
                  id={`grad-${uniqueId}-${item.label}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={item.color} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={item.color} stopOpacity="0.02" />
                </linearGradient>
              ) : null,
            )}
          </defs>

          {/* Grid lines */}
          {tickValues.map((tick, tickIdx) => {
            const y = padding.top + ((maxValue - tick) / maxValue) * usableH;
            return (
              <g key={`tick-${tickIdx}`}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  strokeDasharray="4 5"
                />
                <text x={width - padding.right} y={Math.max(14, y - 5)} textAnchor="end" fill="#94a3b8" fontSize="10" fontWeight="500">
                  {(series[0]?.formatValue ?? formatNumber)(tick)}
                </text>
              </g>
            );
          })}

          {/* Series */}
          {series.map((item) => {
            const points = item.values.map((v, i) => ({
              x: padding.left + (labels.length <= 1 ? usableW / 2 : (i / (labels.length - 1)) * usableW),
              y: padding.top + ((maxValue - v) / maxValue) * usableH,
            }));

            return (
              <g key={item.label}>
                {/* Area fill */}
                {item.fillColor ? (
                  <path
                    d={buildSmoothArea(points, padding.top + usableH)}
                    fill={`url(#grad-${uniqueId}-${item.label})`}
                  />
                ) : null}

                {/* Smooth line */}
                <path
                  d={buildSmoothPath(points)}
                  fill="none"
                  stroke={item.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data points */}
                {points.map((pt, i) => (
                  <g key={`${item.label}-${labels[i] ?? i}`}>
                    <circle cx={pt.x} cy={pt.y} r="5" fill="white" stroke={item.color} strokeWidth="2" />
                    <circle cx={pt.x} cy={pt.y} r="2.5" fill={item.color} />
                  </g>
                ))}
              </g>
            );
          })}

          {/* X-axis labels */}
          {labelIndexes.map((i) =>
            i >= 0 && i < labels.length ? (
              <text
                key={`xlabel-${i}`}
                x={padding.left + (labels.length <= 1 ? usableW / 2 : (i / (labels.length - 1)) * usableW)}
                y={height - 8}
                textAnchor={i === 0 ? "start" : i === labels.length - 1 ? "end" : "middle"}
                fill="#94a3b8"
                fontSize="10"
                fontWeight="500"
              >
                {labels[i]}
              </text>
            ) : null,
          )}
        </svg>
      </div>
    </div>
  );
}

// ─── DonutChart ────────────────────────────────────────────────────
export function DonutChart({ items, centerLabel, centerValue }: DonutChartProps) {
  const radius = 52;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;
  const total = items.reduce((sum, item) => sum + item.value, 0);

  const arcs = items.map((item) => ({
    ...item,
    segLen: total > 0 ? (item.value / total) * circumference : 0,
  }));

  const offsets = arcs.map((_, i) =>
    arcs.slice(0, i).reduce((sum, a) => sum + a.segLen, 0),
  );

  return (
    <div className="grid gap-4 md:grid-cols-[160px_1fr] md:items-center">
      {/* Donut */}
      <div className="mx-auto">
        <svg viewBox="0 0 160 160" className="h-40 w-40 drop-shadow-sm">
          {/* Track */}
          <circle cx="80" cy="80" r={radius} stroke="#f1f5f9" strokeWidth={strokeWidth} fill="none" />
          {/* Segments */}
          {arcs.map((item, i) => (
            <circle
              key={item.label}
              cx="80"
              cy="80"
              r={radius}
              stroke={item.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${item.segLen} ${circumference - item.segLen}`}
              strokeDashoffset={-offsets[i]}
              strokeLinecap="butt"
              transform="rotate(-90 80 80)"
              opacity={item.segLen > 0 ? 1 : 0}
            />
          ))}
          {/* Center text */}
          <text x="80" y="75" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600" letterSpacing="0.5">
            {centerLabel.toUpperCase()}
          </text>
          <text x="80" y="95" textAnchor="middle" fill="#0f172a" fontSize="18" fontWeight="700">
            {centerValue}
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="space-y-2">
        {items.map((item) => {
          const share = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-medium text-slate-800">{item.label}</span>
                </div>
                <span className="text-xs font-semibold text-slate-500">{formatPercent(share)}</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(4, share)}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── RankedBars ────────────────────────────────────────────────────
export function RankedBars({ items, color, formatValue = formatNumber }: RankedBarsProps) {
  const maxValue = Math.max(1, ...items.map((item) => item.value));

  return (
    <div className="space-y-2.5">
      {items.map((item, i) => {
        const pct = Math.max(6, (item.value / maxValue) * 100);
        return (
          <div key={item.label} className="group rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-slate-200 hover:bg-white">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{item.label}</p>
                  {item.detail ? (
                    <p className="mt-0.5 truncate text-xs text-slate-400">{item.detail}</p>
                  ) : null}
                </div>
              </div>
              <p className="shrink-0 text-sm font-bold text-slate-900">{formatValue(item.value)}</p>
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
