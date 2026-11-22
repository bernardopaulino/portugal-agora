"use client";

import useSWR from "swr";

import { useI18n } from "@/lib/i18n/client";
import type { Drought } from "@/lib/sources/ipma-climate";
import type { SourceResult } from "@/lib/sources/types";
import { formatLongDate, formatNumber } from "@/lib/time/format";

import { Section } from "../status/section";
import { SourceLine } from "../status/source-line";

/*
 * Chuva dos últimos 20 dias e índice de seca de um concelho do continente
 * (IPMA). Uma barra por dia, com o total e o dia mais chuvoso por extenso.
 */

interface ClimateResponse {
  rain: SourceResult<{ start: string; days: number[] }>;
  drought: SourceResult<Drought | null>;
}

const fetcher = async (url: string): Promise<ClimateResponse> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

const dayAfter = (start: string, n: number) =>
  new Date(Date.parse(`${start}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export function RainAndDrought({ dico }: { dico: string }) {
  const { t, locale } = useI18n();
  const { data } = useSWR(`/api/clima/${dico}`, fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 60 * 60_000,
  });
  const rain = data?.rain.data;
  const drought = data?.drought.data;
  if (!data || (!rain && !drought)) return null;

  const total = rain ? rain.days.reduce((s, mm) => s + mm, 0) : 0;
  const wettest = rain ? Math.max(...rain.days) : 0;
  const wettestDay = rain ? dayAfter(rain.start, rain.days.indexOf(wettest)) : "";
  const top = Math.max(wettest, 1);
  const month = drought
    ? new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "pt-PT", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${drought.month}-15T12:00:00Z`))
    : "";

  return (
    <Section id="chuva-seca" title={t.climate.title} size="md">
      {rain ? (
        <div className="flex flex-col gap-2">
          <p className="text-base">
            {t.climate.rainTotal(
              formatNumber(total, 0, locale),
              rain.days.length,
              wettest >= 1 ? formatNumber(wettest, 0, locale) : null,
              wettest >= 1 ? formatLongDate(wettestDay, locale) : null,
            )}
          </p>
          <svg
            aria-hidden
            viewBox={`0 0 ${rain.days.length * 10} 60`}
            preserveAspectRatio="none"
            className="h-16 w-full"
          >
            {rain.days.map((mm, i) => {
              const h = mm > 0 ? Math.max(2, (mm / top) * 58) : 0;
              return (
                <rect
                  key={i}
                  x={i * 10 + 1.5}
                  y={60 - h}
                  width={7}
                  height={h}
                  rx={1.5}
                  className="fill-[var(--accent)]"
                />
              );
            })}
            <line
              x1={0}
              x2={rain.days.length * 10}
              y1={59.5}
              y2={59.5}
              className="stroke-[var(--line)]"
            />
          </svg>
          <p className="flex justify-between text-sm text-ink-2">
            <span>{formatLongDate(rain.start, locale)}</span>
            <span>{formatLongDate(dayAfter(rain.start, rain.days.length - 1), locale)}</span>
          </p>
          <SourceLine result={data.rain} />
        </div>
      ) : null}
      {drought ? (
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <p className="text-base">
            {t.climate.drought(
              month,
              t.term(drought.label),
              formatNumber(drought.value, 1, locale),
            )}
          </p>
          <SourceLine result={data.drought} />
        </div>
      ) : null}
      <p className="text-sm text-ink-2">{t.climate.note}</p>
    </Section>
  );
}
