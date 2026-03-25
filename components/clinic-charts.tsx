import { formatPercent } from "@/lib/clinic-insights";

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
  items: Array<{
    label: string;
    value: number;
    color: string;
  }>;
  centerLabel: string;
  centerValue: string;
};

type RankedBarsProps = {
  items: Array<{
    label: string;
    value: number;
    detail?: string;
  }>;
  color: string;
  formatValue?: (value: number) => string;
};

function buildLinePath(points: Array<{ x: number; y: number }>) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function buildAreaPath(points: Array<{ x: number; y: number }>, bottom: number) {
  if (points.length === 0) {
    return "";
  }

  const first = points[0];
  const last = points[points.length - 1];
  return `${buildLinePath(points)} L ${last.x} ${bottom} L ${first.x} ${bottom} Z`;
}

function lastValue(values: number[]) {
  return values.length > 0 ? values[values.length - 1] : 0;
}

export function TrendChart({
  labels,
  series,
  className = "",
  height = 240,
}: TrendChartProps) {
  const width = 640;
  const padding = { top: 16, right: 14, bottom: 28, left: 14 };
  const usableWidth = width - padding.left - padding.right;
  const usableHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(1, ...series.flatMap((item) => item.values), 1);
  const tickValues = Array.from({ length: 4 }, (_, index) =>
    Math.round((maxValue * (3 - index)) / 3),
  );
  const labelIndexes = [...new Set([0, Math.floor((labels.length - 1) / 2), labels.length - 1])];

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-3">
        {series.map((item) => (
          <div
            key={item.label}
            className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs text-slate-600"
          >
            <span
              className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
              style={{ backgroundColor: item.color }}
            />
            <span className="font-semibold text-slate-900">{item.label}</span>
            <span className="ml-2">
              {(item.formatValue ?? formatNumber)(lastValue(item.values))}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-[28px] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-3 ring-1 ring-slate-200">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[240px] w-full">
          {tickValues.map((tick) => {
            const y = padding.top + ((maxValue - tick) / maxValue) * usableHeight;
            return (
              <g key={tick}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  stroke="#dbe4f0"
                  strokeDasharray="4 6"
                />
                <text
                  x={width - padding.right}
                  y={Math.max(12, y - 4)}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="11"
                >
                  {formatNumber(tick)}
                </text>
              </g>
            );
          })}

          {series.map((item) => {
            const points = item.values.map((value, index) => ({
              x:
                padding.left +
                (labels.length <= 1 ? 0 : (index / (labels.length - 1)) * usableWidth),
              y: padding.top + ((maxValue - value) / maxValue) * usableHeight,
            }));

            return (
              <g key={item.label}>
                {item.fillColor ? (
                  <path
                    d={buildAreaPath(points, padding.top + usableHeight)}
                    fill={item.fillColor}
                    opacity="0.9"
                  />
                ) : null}
                <path
                  d={buildLinePath(points)}
                  fill="none"
                  stroke={item.color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {points.map((point, index) => (
                  <circle
                    key={`${item.label}-${labels[index]}`}
                    cx={point.x}
                    cy={point.y}
                    r="3"
                    fill={item.color}
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                ))}
              </g>
            );
          })}

          {labelIndexes.map((index) =>
            index >= 0 && index < labels.length ? (
              <text
                key={labels[index]}
                x={
                  padding.left +
                  (labels.length <= 1 ? 0 : (index / (labels.length - 1)) * usableWidth)
                }
                y={height - 6}
                textAnchor={index === 0 ? "start" : index === labels.length - 1 ? "end" : "middle"}
                fill="#64748b"
                fontSize="11"
              >
                {labels[index]}
              </text>
            ) : null,
          )}
        </svg>
      </div>
    </div>
  );
}

export function DonutChart({ items, centerLabel, centerValue }: DonutChartProps) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const arcs = items.map((item) => {
    const value = total > 0 ? (item.value / total) * circumference : 0;
    return {
      ...item,
      segmentLength: value,
    };
  });
  const arcOffsets = arcs.map((_, index) =>
    arcs.slice(0, index).reduce((sum, item) => sum + item.segmentLength, 0),
  );

  return (
    <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
      <div className="mx-auto">
        <svg viewBox="0 0 160 160" className="h-40 w-40">
          <circle cx="80" cy="80" r={radius} stroke="#e2e8f0" strokeWidth="18" fill="none" />
          {arcs.map((item, index) => {
            return (
              <circle
                key={item.label}
                cx="80"
                cy="80"
                r={radius}
                stroke={item.color}
                strokeWidth="18"
                fill="none"
                strokeDasharray={`${item.segmentLength} ${circumference - item.segmentLength}`}
                strokeDashoffset={-arcOffsets[index]}
                strokeLinecap="round"
                transform="rotate(-90 80 80)"
              />
            );
          })}
          <text x="80" y="72" textAnchor="middle" fill="#64748b" fontSize="12">
            {centerLabel}
          </text>
          <text
            x="80"
            y="92"
            textAnchor="middle"
            fill="#0f172a"
            fontSize="18"
            fontWeight="600"
          >
            {centerValue}
          </text>
        </svg>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const share = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div
              key={item.label}
              className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-medium text-slate-900">{item.label}</span>
                </div>
                <span className="text-sm text-slate-500">{formatPercent(share)}</span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{formatNumber(item.value)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RankedBars({
  items,
  color,
  formatValue = formatNumber,
}: RankedBarsProps) {
  const maxValue = Math.max(1, ...items.map((item) => item.value), 1);

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-slate-900">{item.label}</p>
              {item.detail ? <p className="text-sm text-slate-500">{item.detail}</p> : null}
            </div>
            <p className="text-sm font-semibold text-slate-900">{formatValue(item.value)}</p>
          </div>
          <div className="mt-3 h-2 rounded-full bg-slate-200">
            <div
              className="h-2 rounded-full"
              style={{
                width: `${Math.max(10, (item.value / maxValue) * 100)}%`,
                backgroundColor: color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function formatNumber(value: number) {
  if (Math.abs(value) >= 1000) {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}
