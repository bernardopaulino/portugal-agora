"use client";

import Link from "next/link";
import { useState, type PointerEvent } from "react";
import useSWR from "swr";

import { getDistrict } from "@/data/districts";
import { levelAt, levelSpans, type HistoryLevel, type HistoryPoint } from "@/lib/history/points";
import { useNow, useResolvedTheme } from "@/lib/hooks/external";
import { useI18n } from "@/lib/i18n/client";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locales";
import { capitalize, formatTime, localDate } from "@/lib/time/format";

import { Chip } from "../status/chip";
import { mapColors } from "../status/severity";

/*
 * Histórico dos avisos: uma faixa por distrito, com o nível ao longo das
 * últimas 24 h ou 7 dias (de 10 em 10 min, ver lib/history). "Sem aviso"
 * fica na cor das linhas, para só os avisos se destacarem; ao lado de
 * cada faixa, o tempo em cada nível por extenso (a cor nunca é a única
 * pista). Passar o rato ou o dedo mostra o nível e a hora.
 */

const HOUR = 3_600_000;
export const RANGES = { day: 24 * HOUR, week: 7 * 24 * HOUR } as const;
export type HistoryRange = keyof typeof RANGES;

interface HistoryResponse {
  order: string[];
  points: HistoryPoint[];
}

const fetcher = async (url: string): Promise<HistoryResponse> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

/** Pontos do histórico, renovados de 10 em 10 min. */
export function useHistory() {
  const { data } = useSWR("/api/history", fetcher, { refreshInterval: 10 * 60_000 });
  return data?.points ?? null;
}

export function formatDuration(ms: number, t: Dictionary): string {
  const minutes = Math.round(ms / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0)
    return hours > 0 ? `${t.history.days(days)} ${t.history.hours(hours)}` : t.history.days(days);
  if (hours > 0) return t.history.hours(hours);
  return t.history.minutes(Math.max(minutes, 10));
}

const SHORT_DAYS: Record<Locale, string[]> = {
  pt: ["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

/** "seg. 2" (ou "Mon 2"), na hora de Lisboa. */
export function formatShortDay(ms: number, locale: Locale): string {
  const date = new Date(`${localDate(new Date(ms).toISOString())}T12:00:00Z`);
  return `${SHORT_DAYS[locale][date.getUTCDay()]} ${date.getUTCDate()}`;
}

/** "dom. 8, 14:20" (ou "Sun 8, 14:20"). */
export function formatStamp(ms: number, locale: Locale): string {
  return `${formatShortDay(ms, locale)}, ${formatTime(new Date(ms).toISOString())}`;
}

function clipSpans(points: HistoryPoint[], slug: string, start: number, end: number) {
  return levelSpans(points, slug, new Date(end).toISOString())
    .map((s) => ({
      ...s,
      a: Math.max(start, Date.parse(s.from)),
      b: Math.min(end, Date.parse(s.to)),
    }))
    .filter((s) => s.b > s.a);
}

/** "laranja durante 9 h · amarelo durante 1 d 3 h", ou "sem aviso". */
function summary(spans: ReturnType<typeof clipSpans>, t: Dictionary): string {
  const total: Partial<Record<HistoryLevel, number>> = {};
  for (const s of spans) total[s.level] = (total[s.level] ?? 0) + s.b - s.a;
  const order: HistoryLevel[] = ["red", "orange", "yellow"];
  const parts = order
    .filter((l) => total[l])
    .map((l) => t.history.during(t.levelAdjective[l as "red"], formatDuration(total[l]!, t)));
  if (parts.length > 0) return capitalize(parts.join(" · "));
  return capitalize(
    spans.length > 0 && spans.every((s) => s.level === "unknown")
      ? t.history.noData
      : t.history.calm,
  );
}

function Ticks({
  start,
  end,
  range,
  locale,
}: {
  start: number;
  end: number;
  range: HistoryRange;
  locale: Locale;
}) {
  // Meia-noite de cada dia (7 dias) ou de 6 em 6 horas (24 h), na hora de Lisboa.
  const step = range === "week" ? 24 * HOUR : 6 * HOUR;
  const ticks: number[] = [];
  const offset = (ms: number) => {
    const local = new Date(new Date(ms).toLocaleString("en-US", { timeZone: "Europe/Lisbon" }));
    const utc = new Date(new Date(ms).toLocaleString("en-US", { timeZone: "UTC" }));
    return local.getTime() - utc.getTime();
  };
  let tick = Math.ceil((start + offset(start)) / step) * step - offset(start);
  for (; tick < end; tick += step) ticks.push(tick);
  return (
    <div aria-hidden className="relative h-5 text-xs text-ink-2">
      {ticks.map((tick) => {
        const iso = new Date(tick).toISOString();
        const label = range === "week" ? formatShortDay(tick, locale) : formatTime(iso);
        return (
          <span
            key={tick}
            className="absolute top-0 -translate-x-1/2 whitespace-nowrap tabular-nums"
            style={{ left: `${((tick - start) / (end - start)) * 100}%` }}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}

function Strip({
  spans,
  start,
  end,
  label,
  onHover,
}: {
  spans: ReturnType<typeof clipSpans>;
  start: number;
  end: number;
  label: string;
  onHover: (ms: number | null) => void;
}) {
  const theme = useResolvedTheme();
  const colors = mapColors[theme];
  const width = end - start;
  const move = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    onHover(start + ((e.clientX - box.left) / box.width) * width);
  };
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 1000 16"
      preserveAspectRatio="none"
      className="h-4 w-full touch-pan-y"
      onPointerMove={move}
      onPointerDown={move}
      onPointerLeave={() => onHover(null)}
    >
      <rect
        x="0"
        y="0"
        width="1000"
        height="16"
        rx="2"
        className="fill-[var(--line)]"
        opacity="0.5"
      />
      {spans
        .filter((s) => s.level !== "none")
        .map((s) => (
          <rect
            key={s.a}
            x={((s.a - start) / width) * 1000}
            y="0"
            width={Math.max(((s.b - s.a) / width) * 1000, 1.5)}
            height="16"
            fill={s.level === "unknown" ? colors.unknown : colors[s.level]}
            opacity={s.level === "unknown" ? 0.35 : 1}
          />
        ))}
    </svg>
  );
}

/** Faixas do histórico para os distritos indicados (todos, na página nacional). */
export function LevelHistory({
  slugs,
  range,
  onRange,
  linkDistricts = false,
}: {
  slugs: string[];
  range: HistoryRange;
  onRange: (r: HistoryRange) => void;
  linkDistricts?: boolean;
}) {
  const { t, locale, path } = useI18n();
  const points = useHistory();
  const now = useNow();
  const [hover, setHover] = useState<{ slug: string; ms: number } | null>(null);
  if (!points || now === null) return null;
  if (points.length < 2) return <p className="text-base text-ink-2">{t.history.starting}</p>;

  const end = Math.max(now, Date.parse(points[points.length - 1]!.t));
  const start = end - RANGES[range];
  const firstMs = Date.parse(points[0]!.t);

  const hoverPoint = hover
    ? [...points].reverse().find((p) => Date.parse(p.t) <= hover.ms)
    : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-label={t.history.range} className="flex flex-wrap gap-2">
        {(Object.keys(RANGES) as HistoryRange[]).map((r) => (
          <Chip key={r} role="radio" pressed={range === r} onClick={() => onRange(r)}>
            {t.history.ranges[r]}
          </Chip>
        ))}
      </div>
      <ul className="flex flex-col gap-3">
        {slugs.map((slug) => {
          const district = getDistrict(slug);
          if (!district) return null;
          const spans = clipSpans(points, slug, start, end);
          const text = summary(spans, t);
          const name = t.districtName(district);
          const isHover = hover?.slug === slug && hoverPoint;
          return (
            <li
              key={slug}
              className="grid grid-cols-1 gap-1 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-x-4"
            >
              <span className="text-base font-bold">
                {linkDistricts ? <Link href={path(`/${slug}/avisos`)}>{name}</Link> : name}
              </span>
              <div className="relative flex flex-col gap-1">
                <Strip
                  spans={spans}
                  start={start}
                  end={end}
                  label={`${name}: ${text}`}
                  onHover={(ms) => setHover(ms === null ? null : { slug, ms })}
                />
                <span className="text-sm text-ink-2">{text}</span>
                {isHover ? (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -top-9 z-10 -translate-x-1/2 rounded-md bg-ink px-2 py-1 text-xs whitespace-nowrap text-bg"
                    style={{
                      left: `${Math.min(92, Math.max(8, ((hover.ms - start) / (end - start)) * 100))}%`,
                    }}
                  >
                    {formatStamp(Date.parse(hoverPoint.t), locale)} ·{" "}
                    {(() => {
                      const level = levelAt(hoverPoint, slug);
                      return level === "unknown"
                        ? t.history.noData
                        : level === "none"
                          ? t.history.calm
                          : t.levels[level];
                    })()}
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="sm:ml-[10rem]">
        <Ticks start={start} end={end} range={range} locale={locale} />
      </div>
      {firstMs > start ? (
        <p className="text-sm text-ink-2">{t.history.since(formatStamp(firstMs, locale))}</p>
      ) : null}
    </div>
  );
}
