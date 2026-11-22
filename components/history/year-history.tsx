"use client";

import Link from "next/link";
import useSWR from "swr";

import { getDistrict } from "@/data/districts";
import { dayLevel, levelDays, type DayPoint } from "@/lib/history/days";
import { useResolvedTheme } from "@/lib/hooks/external";
import { useI18n } from "@/lib/i18n/client";
import { formatLongDate } from "@/lib/time/format";

import { Section } from "../status/section";
import { mapColors } from "../status/severity";

/*
 * O histórico longo dos avisos: um quadrado por dia (o nível mais alto do
 * distrito nesse dia) e quantos dias houve de cada nível. Os dados começam
 * quando o resumo diário começou a ser guardado (ver lib/history/days.ts).
 */

/** Um ano de quadrados, como um calendário: 7 linhas (dias da semana), uma coluna por semana. */
const SHOWN_DAYS = 365;

interface DaysResponse {
  order: string[];
  days: DayPoint[];
}

const fetcher = async (url: string): Promise<DaysResponse> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

function useDays() {
  const { data } = useSWR("/api/history/days", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 60 * 60_000,
  });
  return data?.days ?? null;
}

/** Na página dos avisos de um distrito: o calendário e as contas. */
export function DistrictYearSection({ slug }: { slug: string }) {
  const { t, locale } = useI18n();
  const theme = useResolvedTheme();
  const days = useDays();
  if (!days || days.length === 0) return null;
  const shown = days.slice(-SHOWN_DAYS);
  const count = levelDays(shown, slug);
  const colors = mapColors[theme];
  const first = shown[0]!;
  // Os quadrados começam no dia da semana certo (domingo na primeira linha).
  const offset = new Date(`${first.d}T12:00:00Z`).getUTCDay();

  return (
    <Section id="ano" title={t.history.yearHeading}>
      <p className="text-base">{t.history.yearCounts(count.yellow, count.orange, count.red)}</p>
      <div className="overflow-x-auto pb-2">
        <ol
          role="img"
          aria-label={t.history.yearAria(count.yellow, count.orange, count.red, count.known)}
          className="grid w-max grid-flow-col grid-rows-7 gap-[3px]"
        >
          {Array.from({ length: offset }, (_, i) => (
            <li key={`vazio-${i}`} aria-hidden className="size-3" />
          ))}
          {shown.map((day) => {
            const level = dayLevel(day, slug);
            return (
              <li
                key={day.d}
                title={`${formatLongDate(day.d, locale)}: ${t.levels[level]}`}
                className="size-3 rounded-[3px]"
                style={{ background: colors[level], opacity: level === "unknown" ? 0.35 : 1 }}
              />
            );
          })}
        </ol>
      </div>
      <p className="text-sm text-ink-2">
        {t.history.yearNote(formatLongDate(first.d, locale), count.known)}
      </p>
    </Section>
  );
}

/** Na página nacional dos avisos: uma linha por distrito, com os dias de cada nível. */
export function NationalYearSection({ slugs }: { slugs: string[] }) {
  const { t, locale, path } = useI18n();
  const days = useDays();
  if (!days || days.length === 0) return null;
  const shown = days.slice(-SHOWN_DAYS);
  const rows = slugs
    .map((slug) => ({ slug, district: getDistrict(slug), count: levelDays(shown, slug) }))
    .filter((r) => r.district);
  return (
    <Section id="ano" title={t.history.yearHeading}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-base">
          <caption className="sr-only">{t.history.yearHeading}</caption>
          <thead className="text-sm text-ink-2">
            <tr>
              <th scope="col" className="py-2 pr-4 font-normal">
                {t.history.yearDistrict}
              </th>
              {(["yellow", "orange", "red"] as const).map((level) => (
                <th key={level} scope="col" className="px-2 py-2 text-right font-normal">
                  {t.levels[level]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ slug, district, count }) => (
              <tr key={slug} className="border-t border-line">
                <th scope="row" className="py-2 pr-4 font-semibold">
                  <Link href={path(`/${slug}/avisos`)}>{t.districtName(district!)}</Link>
                </th>
                <td className="px-2 py-2 text-right tabular-nums">{count.yellow}</td>
                <td className="px-2 py-2 text-right tabular-nums">{count.orange}</td>
                <td className="px-2 py-2 text-right tabular-nums">{count.red}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-ink-2">
        {t.history.yearNote(formatLongDate(shown[0]!.d, locale), shown.length)}
      </p>
    </Section>
  );
}
