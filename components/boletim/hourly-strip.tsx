"use client";

import type { Region } from "@/data/districts";
import { useI18n } from "@/lib/i18n/client";
import type { ForecastHour } from "@/lib/sources/ipma-forecast";
import { formatTime } from "@/lib/time/format";

import { weatherIcon } from "./forecast-strip";

/** Próximas 24 h, de 3 em 3 horas: 8 colunas, como a faixa dos dias. */
const STEP_HOURS = 3;
const CELLS = 8;

/** As próximas horas da previsão de um concelho (a hora certa mais próxima de agora primeiro). */
export function HourlyStrip({
  hours,
  now,
  region,
}: {
  hours: ForecastHour[];
  now: Date;
  region: Region;
}) {
  const { t } = useI18n();
  // A partir da hora em curso; depois, de 3 em 3 horas.
  const from = now.getTime() - 60 * 60_000;
  const upcoming = hours.filter((h) => Date.parse(h.time) > from);
  const first = upcoming[0];
  if (!first) return null;
  const start = Date.parse(first.time);
  const step = STEP_HOURS * 3_600_000;
  const shown = upcoming
    .filter((h) => (Date.parse(h.time) - start) % step === 0)
    .slice(0, CELLS)
    .map((h) => {
      // O IPMA só dá a probabilidade de chuva em algumas horas: a coluna leva a maior das suas 3.
      const from = Date.parse(h.time);
      const chances = upcoming
        .filter((x) => Date.parse(x.time) >= from && Date.parse(x.time) < from + step)
        .flatMap((x) => (x.rainChance === null ? [] : [x.rainChance]));
      return { ...h, rainChance: chances.length > 0 ? Math.max(...chances) : null };
    });
  if (shown.length < 2) return null;

  return (
    <section aria-labelledby="horas-titulo" className="flex flex-col gap-3">
      <h2 id="horas-titulo" className="font-display text-2xl font-bold">
        {t.concelho.hoursTitle}
      </h2>
      <ol className="grid grid-cols-4 overflow-hidden rounded-2xl glass sm:grid-cols-8">
        {shown.map((h, i) => {
          const Icon = weatherIcon(h.weatherId);
          return (
            <li
              key={h.time}
              className={
                "flex min-w-0 flex-col items-center gap-1 px-0.5 py-3 text-center" +
                (i % 4 > 0 ? " border-l border-stage-line" : "") +
                (i >= 4 ? " border-t border-stage-line sm:border-t-0" : "") +
                (i === 4 ? " sm:border-l" : "")
              }
            >
              <span className="font-display text-sm font-semibold">
                {formatTime(h.time, region)}
              </span>
              <Icon aria-hidden className="size-7 text-stage-accent" strokeWidth={1.8} />
              <span className="sr-only">{t.term(h.weather)}.</span>
              <span className="font-display text-xl leading-none font-bold">{h.temp}°</span>
              <span className="text-sm text-stage-ink-2">
                <span className="sr-only">{t.stage.rainChance}</span>
                {h.rainChance === null ? "—" : `${h.rainChance}%`}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="text-sm text-stage-ink-2">{t.concelho.hoursNote}</p>
    </section>
  );
}
