"use client";

import { Droplets, Thermometer, Umbrella, Wind } from "lucide-react";

import type { District } from "@/data/districts";
import { useI18n } from "@/lib/i18n/client";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { StationObservation } from "@/lib/sources/ipma-observations";
import type { SeaSpot } from "@/lib/sources/ipma-sea";
import type { SourceResult } from "@/lib/sources/types";
import { formatNumber, formatTime, formatWeekday, localDate } from "@/lib/time/format";

import { SourceLine } from "../status/source-line";

/*
 * Depois da previsão, o que se vê agora: a estação do IPMA mais próxima da
 * capital do distrito e, nos distritos com costa, o estado do mar para hoje
 * e os 2 dias seguintes. Cada cartão só aparece quando há dados.
 */

function windText(kmh: number | null, dir: string | undefined, t: Dictionary): string | null {
  if (kmh === null) return null;
  if (kmh === 0) return t.observed.calm;
  return dir ? t.observed.windFrom(String(kmh), dir) : `${kmh} km/h`;
}

function ObservationCard({
  observation,
  result,
  district,
}: {
  observation: StationObservation;
  result: SourceResult<unknown>;
  district: District;
}) {
  const { t, locale } = useI18n();
  const region = district.region === "acores" ? "acores" : undefined;
  const dir = observation.windDir ? t.compass[observation.windDir] : undefined;
  const rows = [
    {
      icon: Thermometer,
      label: t.observed.temperature,
      value: `${formatNumber(observation.temperature, 1, locale)}\u00a0°C`,
    },
    {
      icon: Wind,
      label: t.observed.wind,
      value: windText(observation.windKmh, dir, t),
    },
    {
      icon: Droplets,
      label: t.observed.humidity,
      value: observation.humidity === null ? null : `${Math.round(observation.humidity)}\u00a0%`,
    },
    {
      icon: Umbrella,
      label: t.observed.rain,
      value:
        observation.rainMm === null
          ? null
          : `${formatNumber(observation.rainMm, 1, locale)}\u00a0mm`,
    },
  ].filter((r) => r.value !== null);

  return (
    <section aria-labelledby="agora-titulo" className="flex flex-col gap-4 rounded-2xl p-6 glass">
      <div className="flex flex-col gap-1">
        <h2 id="agora-titulo" className="font-display text-2xl font-bold">
          {t.observed.heading}
        </h2>
        <p className="text-sm text-stage-ink-2">
          {t.observed.station(observation.station, formatTime(observation.time, region))}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex flex-col gap-1">
            <dt className="flex items-center gap-1.5 text-sm text-stage-ink-2">
              <Icon aria-hidden className="size-4" />
              {label}
            </dt>
            <dd className="font-display text-xl font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <SourceLine result={result} />
    </section>
  );
}

function SeaCard({
  spots,
  result,
  reference,
}: {
  spots: SeaSpot[];
  result: SourceResult<unknown>;
  reference: Date;
}) {
  const { t, locale } = useI18n();
  const today = localDate(reference.toISOString());
  const tomorrow = localDate(new Date(reference.getTime() + 86_400_000).toISOString());
  const dayName = (date: string) =>
    date === today
      ? t.stage.today
      : date === tomorrow
        ? t.stage.tomorrow
        : formatWeekday(date, locale);
  // Mínimo e máximo iguais depois de arredondar mostram-se uma vez ("7 s", não "7–7 s").
  const range = (min: number | null, max: number | null, digits: number) => {
    const values = [min, max].filter((v): v is number => v !== null);
    if (values.length === 0) return "—";
    const [a, b] = [...new Set(values.map((v) => formatNumber(v, digits, locale)))];
    return b ? `${a}–${b}` : a!;
  };

  // A temperatura da água quase não muda em 3 dias: vai uma vez, junto ao nome do local.
  const waterOf = (spot: SeaSpot) => {
    const values = spot.days.flatMap((d) => (d.waterMax === null ? [] : [Math.round(d.waterMax)]));
    if (values.length === 0) return null;
    const [min, max] = [Math.min(...values), Math.max(...values)];
    return min === max ? `${min}\u00a0°C` : `${min}–${max}\u00a0°C`;
  };

  return (
    <section aria-labelledby="mar-titulo" className="flex flex-col gap-4 rounded-2xl p-6 glass">
      <h2 id="mar-titulo" className="font-display text-2xl font-bold">
        {t.sea.heading}
      </h2>
      {spots.map((spot) => (
        <table key={spot.name} className="w-full text-left text-sm sm:text-base">
          <caption className="pb-2 text-left">
            <span className="font-display text-lg font-semibold">{spot.name}</span>
            {waterOf(spot) ? (
              <span className="text-stage-ink-2"> · {t.sea.water(waterOf(spot)!)}</span>
            ) : null}
          </caption>
          <thead className="text-sm text-stage-ink-2">
            <tr>
              <th scope="col" className="pr-2 pb-1 font-normal sm:pr-3">
                {t.sea.day}
              </th>
              <th scope="col" className="pr-2 pb-1 font-normal sm:pr-3">
                {t.sea.waves}
              </th>
              <th scope="col" className="pb-1 font-normal">
                {t.sea.swell}
              </th>
            </tr>
          </thead>
          <tbody>
            {spot.days.map((d) => (
              <tr key={d.date} className="border-t border-stage-line">
                <th scope="row" className="py-2 pr-2 font-semibold sm:pr-3">
                  {dayName(d.date)}
                </th>
                <td className="py-2 pr-2 whitespace-nowrap tabular-nums sm:pr-3">
                  {`${range(d.seaMin, d.seaMax, 1)}\u00a0m`}
                </td>
                <td className="py-2">
                  {d.swellDir && t.compass[d.swellDir] ? (
                    <span className="block">{t.sea.swellFrom(t.compass[d.swellDir]!)}</span>
                  ) : null}
                  <span className="whitespace-nowrap tabular-nums">
                    {`${range(d.periodMin, d.periodMax, 0)}\u00a0s`}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}
      <p className="text-sm text-stage-ink-2">{t.sea.note}</p>
      <SourceLine result={result} />
    </section>
  );
}

export function NowAndSea({
  district,
  observations,
  sea,
  reference,
}: {
  district: District;
  observations: SourceResult<Record<string, StationObservation>>;
  sea: SourceResult<Record<string, SeaSpot[]>>;
  reference: Date;
}) {
  const observation = observations.data?.[district.slug];
  const spots = sea.data?.[district.slug];
  if (!observation && !spots?.length) return null;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-2">
      {observation ? (
        <ObservationCard observation={observation} result={observations} district={district} />
      ) : null}
      {spots?.length ? <SeaCard spots={spots} result={sea} reference={reference} /> : null}
    </div>
  );
}
