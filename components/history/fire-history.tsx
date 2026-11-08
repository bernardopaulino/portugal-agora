"use client";

import { useState, type PointerEvent } from "react";

import type { HistoryPoint } from "@/lib/history/points";
import { useNow } from "@/lib/hooks/external";
import { useI18n } from "@/lib/i18n/client";

import { Chip } from "../status/chip";
import { formatStamp, RANGES, useHistory, type HistoryRange } from "./level-history";

/*
 * Incêndios ativos no país ao longo do período: uma linha de 2 px, eixo
 * a partir de zero, o valor atual e o máximo por extenso. Falhas do
 * Fogos.pt ficam como intervalos na linha (nunca como zero).
 */

const W = 1000;
const H = 160;

function segments(points: HistoryPoint[], x: (ms: number) => number, y: (v: number) => number) {
  const paths: string[] = [];
  let current = "";
  for (const p of points) {
    if (p.f === null) {
      if (current) paths.push(current);
      current = "";
      continue;
    }
    current += `${current ? "L" : "M"}${x(Date.parse(p.t)).toFixed(1)},${y(p.f).toFixed(1)}`;
  }
  if (current) paths.push(current);
  return paths;
}

export function FireHistory() {
  const { t, locale } = useI18n();
  const points = useHistory();
  const now = useNow();
  const [range, setRange] = useState<HistoryRange>("week");
  const [hover, setHover] = useState<number | null>(null);
  if (!points || now === null) return null;
  if (points.length < 2) return <p className="text-base text-ink-2">{t.history.starting}</p>;

  const end = Math.max(now, Date.parse(points[points.length - 1]!.t));
  const start = end - RANGES[range];
  const shown = points.filter((p) => Date.parse(p.t) >= start);
  const known = shown.filter((p): p is HistoryPoint & { f: number } => p.f !== null);
  if (known.length === 0) return null;

  const peak = known.reduce((a, b) => (b.f > a.f ? b : a));
  const latest = known[known.length - 1]!;
  const top = Math.max(4, Math.ceil(peak.f * 1.15));
  const x = (ms: number) => ((ms - start) / (end - start)) * W;
  const y = (v: number) => H - (v / top) * (H - 8);

  const move = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const ms = start + ((e.clientX - box.left) / box.width) * (end - start);
    const nearest = known.reduce((a, b) =>
      Math.abs(Date.parse(b.t) - ms) < Math.abs(Date.parse(a.t) - ms) ? b : a,
    );
    setHover(known.indexOf(nearest));
  };
  const hovered = hover === null ? null : known[hover];

  return (
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-label={t.history.range} className="flex flex-wrap gap-2">
        {(Object.keys(RANGES) as HistoryRange[]).map((r) => (
          <Chip key={r} role="radio" pressed={range === r} onClick={() => setRange(r)}>
            {t.history.ranges[r]}
          </Chip>
        ))}
      </div>
      <p className="text-base">
        {t.history.firesSummary(latest.f, peak.f, formatStamp(Date.parse(peak.t), locale))}
      </p>
      <div className="relative">
        <svg
          role="img"
          aria-label={`${t.history.firesHeading}: ${t.history.firesSummary(latest.f, peak.f, formatStamp(Date.parse(peak.t), locale))}`}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-40 w-full touch-pan-y overflow-visible"
          onPointerMove={move}
          onPointerDown={move}
          onPointerLeave={() => setHover(null)}
        >
          <line
            x1="0"
            x2={W}
            y1={H}
            y2={H}
            className="stroke-[var(--line)]"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1="0"
            x2={W}
            y1={y(peak.f)}
            y2={y(peak.f)}
            className="stroke-[var(--line)]"
            strokeDasharray="4 4"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          {segments(shown, x, y).map((d) => (
            <path
              key={d}
              d={d}
              fill="none"
              className="stroke-accent"
              strokeWidth="2"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {hovered ? (
            <line
              x1={x(Date.parse(hovered.t))}
              x2={x(Date.parse(hovered.t))}
              y1="0"
              y2={H}
              className="stroke-ink-2"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
        </svg>
        <span
          aria-hidden
          className="absolute top-0 left-0 text-xs text-ink-2 tabular-nums"
          style={{ top: `${(y(peak.f) / H) * 100}%`, transform: "translateY(-120%)" }}
        >
          {peak.f}
        </span>
        {hovered ? (
          <span
            aria-hidden
            className="pointer-events-none absolute -top-8 z-10 -translate-x-1/2 rounded-md bg-ink px-2 py-1 text-xs whitespace-nowrap text-bg"
            style={{ left: `${Math.min(90, Math.max(10, (x(Date.parse(hovered.t)) / W) * 100))}%` }}
          >
            {formatStamp(Date.parse(hovered.t), locale)} · {t.history.firesAria(hovered.f)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
