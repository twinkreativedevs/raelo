"use client";

import { useState } from "react";

import { formatMoney } from "@/lib/format";

export interface RevenuePoint {
  /** e.g. "2026-09" */
  month: string;
  amount: number;
  orders: number;
}

const HEIGHT = 220;
const PAD = { top: 24, right: 8, bottom: 28, left: 64 };
const BAR_MAX = 24;
const INK_MUTED = "rgba(17,24,39,0.5)";
const GRID = "rgba(17,24,39,0.08)";
const BAR = "#ed1c24";
const BAR_HOVER = "#f2555b";

function monthLabel(month: string, withYear = false) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
}

function compact(value: number) {
  if (value >= 1_000_000) return `₦${(value / 1_000_000).toFixed(value % 1_000_000 ? 1 : 0)}M`;
  if (value >= 1_000) return `₦${Math.round(value / 1_000)}K`;
  return `₦${value}`;
}

/** Rounds the axis max up to a clean 1/2/5 × 10^n step. */
function niceTicks(max: number, count = 4) {
  if (max <= 0) return [0, 1];
  const rough = max / count;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= rough)!;
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: top / step + 1 }, (_, i) => i * step);
}

/** Top-rounded column: 4px radius at the data end, square at the baseline. */
function columnPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const width = 720;
  const plotW = width - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const ticks = niceTicks(Math.max(...data.map((d) => d.amount), 0));
  const top = ticks[ticks.length - 1];
  const band = plotW / data.length;
  const barW = Math.min(BAR_MAX, band - 2);
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH;
  const last = data.length - 1;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Revenue per month, ${monthLabel(data[0].month, true)} to ${monthLabel(data[last].month, true)}`}
        onPointerLeave={() => setActive(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
            <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={INK_MUTED} style={{ fontVariantNumeric: "tabular-nums" }}>
              {compact(t)}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const cx = PAD.left + band * i + band / 2;
          const h = Math.max(0, PAD.top + plotH - y(d.amount));
          return (
            <g key={d.month}>
              {h > 0 && (
                <path d={columnPath(cx - barW / 2, y(d.amount), barW, h)} fill={active === i ? BAR_HOVER : BAR} />
              )}
              {/* Hit target: the whole band, bigger than the mark. */}
              <rect
                x={PAD.left + band * i}
                y={PAD.top}
                width={band}
                height={plotH}
                fill="transparent"
                tabIndex={0}
                aria-label={`${monthLabel(d.month, true)}: ${formatMoney(d.amount, "NGN")} from ${d.orders} orders`}
                onPointerMove={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                style={{ outline: "none" }}
              />
              <text x={cx} y={HEIGHT - 8} textAnchor="middle" fontSize={11} fill={INK_MUTED}>
                {monthLabel(d.month)}
              </text>
              {i === last && d.amount > 0 && active !== last && (
                <text x={cx} y={y(d.amount) - 6} textAnchor="middle" fontSize={11} fontWeight={600} fill="#111827">
                  {compact(d.amount)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {active !== null && (
        <div
          className="pointer-events-none absolute top-0 rounded-lg bg-[#111827] px-3 py-2 text-xs text-white shadow-lg"
          style={{
            left: `${((PAD.left + band * active + band / 2) / width) * 100}%`,
            transform: `translateX(${active > data.length / 2 ? "-100%" : "0"})`,
          }}
        >
          <p className="text-sm font-bold">{formatMoney(data[active].amount, "NGN")}</p>
          <p className="text-white/70">
            {monthLabel(data[active].month, true)} · {data[active].orders} order{data[active].orders === 1 ? "" : "s"}
          </p>
        </div>
      )}

      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-xs font-semibold text-black/50">View as table</summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr className="text-xs text-black/40">
              <th className="py-1">Month</th>
              <th className="py-1 text-right">Orders</th>
              <th className="py-1 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody style={{ fontVariantNumeric: "tabular-nums" }}>
            {data.map((d) => (
              <tr key={d.month} className="border-t border-black/5">
                <td className="py-1">{monthLabel(d.month, true)}</td>
                <td className="py-1 text-right">{d.orders}</td>
                <td className="py-1 text-right">{formatMoney(d.amount, "NGN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
