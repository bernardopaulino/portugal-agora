"use client";

import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudHail,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Snowflake,
  Sun,
  type LucideIcon,
} from "lucide-react";

import type { ForecastDay } from "@/lib/sources/ipma-forecast";
import { useI18n } from "@/lib/i18n/client";
import { formatWeekday, localDate } from "@/lib/time/format";

/** Tipos de tempo do IPMA → pictograma do boletim. */
function weatherIcon(id: number): LucideIcon {
  if (id === 1) return Sun;
  if ([2, 3, 25].includes(id)) return CloudSun;
  if ([7, 10, 13, 15].includes(id)) return CloudDrizzle;
  if ([6, 8, 9, 11, 12, 14].includes(id)) return CloudRain;
  if ([19, 20, 23].includes(id)) return CloudLightning;
  if (id === 21) return CloudHail;
  if ([16, 17, 26].includes(id)) return CloudFog;
  if ([18, 22, 28].includes(id)) return Snowflake;
  if ([29, 30].includes(id)) return CloudSnow;
  return Cloud;
}

/** A faixa de previsão a 5 dias, como no fim do boletim da televisão. */
export function ForecastStrip({
  days,
  reference,
  capital,
}: {
  days: ForecastDay[];
  reference: Date;
  capital: string;
}) {
  const { t, locale } = useI18n();
  const today = localDate(reference.toISOString());
  const tomorrow = localDate(new Date(reference.getTime() + 86_400_000).toISOString());
  const name = (date: string) =>
    date === today
      ? t.stage.today
      : date === tomorrow
        ? t.stage.tomorrow
        : formatWeekday(date, locale);

  return (
    <section aria-labelledby="previsao-titulo" className="flex flex-col gap-3">
      <h2 id="previsao-titulo" className="font-display text-2xl font-bold">
        {t.stage.forecastFor(capital)}
      </h2>
      <ol className="lower-third-in grid grid-cols-5 overflow-hidden rounded-sm bg-stage-2">
        {days.slice(0, 5).map((d, i) => {
          const Icon = weatherIcon(d.weatherId);
          return (
            <li
              key={d.date}
              className={
                "flex min-w-0 flex-col items-center gap-1.5 px-0.5 py-3 text-center sm:px-3 sm:py-4" +
                (i > 0 ? " border-l border-stage-line" : "")
              }
            >
              <span className="font-display text-sm font-semibold sm:text-lg">{name(d.date)}</span>
              <Icon aria-hidden className="size-8 text-stage-accent sm:size-10" strokeWidth={1.8} />
              <span className="sr-only">{t.term(d.weather)}.</span>
              <span className="font-display text-2xl leading-none font-bold sm:text-3xl">
                {d.max}°
                <span className="text-lg font-semibold text-stage-ink-2 sm:text-xl"> {d.min}°</span>
              </span>
              <span className="text-sm text-stage-ink-2">
                <span className="sr-only">{t.stage.rainChance}</span>
                {d.rainChance}%
              </span>
              <span className="hidden text-sm text-stage-ink-2 lg:block">{t.term(d.weather)}</span>
            </li>
          );
        })}
      </ol>
      <p className="text-sm text-stage-ink-2">{t.stage.forecastNote}</p>
    </section>
  );
}
