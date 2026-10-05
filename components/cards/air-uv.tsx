"use client";

import { getDistrict } from "@/data/districts";
import { useI18n } from "@/lib/i18n/client";
import type { AirQualityReading, UvReading } from "@/lib/sources/types";
import { formatNumber } from "@/lib/time/format";

import { EmptyState } from "../status/section";
import { SeverityBadge } from "../status/severity";

/** Na página do risco: só as capitais com qualidade do ar moderada ou pior. */
export function AirQualitySummary({ readings }: { readings: AirQualityReading[] }) {
  const { t } = useI18n();
  const concerning = readings.filter((r) => r.severity !== "none").sort((a, b) => b.eaqi - a.eaqi);
  if (readings.length === 0) return <EmptyState>{t.empty.airNone}</EmptyState>;
  if (concerning.length === 0)
    return <EmptyState>{t.empty.airAllGood(readings.length)}</EmptyState>;
  return (
    <ul className="flex flex-col border-t border-line">
      {concerning.map((r) => {
        const district = getDistrict(r.district);
        return (
          <li
            key={r.district}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line py-3"
          >
            <SeverityBadge level={r.severity} label={t.term(r.label)} />
            <span className="text-lg font-bold">{district ? t.capitalName(district) : null}</span>
            <span className="text-ink-2">{t.lists.airIndex(r.eaqi, r.pollutant)}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Na página do distrito: qualidade do ar e UV da capital. */
export function AirAndUv({ air, uv }: { air?: AirQualityReading; uv?: UvReading[] }) {
  const { t, locale } = useI18n();
  const today = uv?.[0];
  return (
    <dl className="grid gap-y-5">
      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <dt className="text-base text-ink-2">{t.lists.airNow}</dt>
        <dd className="flex flex-wrap items-center gap-3">
          {air ? (
            <>
              <SeverityBadge level={air.severity} label={t.term(air.label)} />
              <span>{t.lists.airEuropean(air.eaqi, air.pollutant)}</span>
            </>
          ) : (
            t.lists.noReading
          )}
        </dd>
      </div>
      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <dt className="text-base text-ink-2">{t.lists.uvToday}</dt>
        <dd className="text-lg">
          {today ? (
            <>
              <span className="text-2xl font-extrabold">
                {formatNumber(today.index, 1, locale)}
              </span>{" "}
              {t.term(today.label).toLowerCase()}
              {today.index >= 6 ? t.lists.uvAdvice : "."}
            </>
          ) : (
            t.lists.noForecast
          )}
        </dd>
      </div>
    </dl>
  );
}
