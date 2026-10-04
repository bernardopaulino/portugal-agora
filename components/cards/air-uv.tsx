import { getDistrict } from "@/data/districts";
import type { AirQualityReading, UvReading } from "@/lib/sources/types";
import { formatNumber } from "@/lib/time/format";

import { EmptyState } from "../status/section";
import { SeverityBadge } from "../status/severity";

/** Na página inicial: só as capitais com qualidade do ar moderada ou pior. */
export function AirQualitySummary({ readings }: { readings: AirQualityReading[] }) {
  const concerning = readings.filter((r) => r.severity !== "none").sort((a, b) => b.eaqi - a.eaqi);
  if (readings.length === 0)
    return <EmptyState>Sem leituras de qualidade do ar de momento.</EmptyState>;
  if (concerning.length === 0) {
    return (
      <EmptyState>
        Qualidade do ar boa ou razoável em todas as {readings.length} capitais de distrito e
        regiões.
      </EmptyState>
    );
  }
  return (
    <ul className="flex flex-col border-t border-line">
      {concerning.map((r) => (
        <li
          key={r.district}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line py-3"
        >
          <SeverityBadge level={r.severity} label={r.label} />
          <span className="text-lg font-bold">{getDistrict(r.district)?.capital}</span>
          <span className="text-ink-2">
            Índice {r.eaqi}, sobretudo {r.pollutant}.
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Na página do distrito: qualidade do ar e UV da capital. */
export function AirAndUv({ air, uv }: { air?: AirQualityReading; uv?: UvReading[] }) {
  const today = uv?.[0];
  return (
    <dl className="grid gap-y-5">
      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <dt className="text-base text-ink-2">Qualidade do ar agora</dt>
        <dd className="flex flex-wrap items-center gap-3">
          {air ? (
            <>
              <SeverityBadge level={air.severity} label={air.label} />
              <span>
                Índice europeu {air.eaqi}
                {air.pollutant ? `, sobretudo ${air.pollutant}` : ""}.
              </span>
            </>
          ) : (
            "Sem leitura de momento."
          )}
        </dd>
      </div>
      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <dt className="text-base text-ink-2">Índice UV máximo hoje</dt>
        <dd className="text-lg">
          {today ? (
            <>
              <span className="text-2xl font-extrabold">{formatNumber(today.index)}</span>{" "}
              {today.label.toLowerCase()}
              {today.index >= 6 ? ". Use proteção solar entre as 11h e as 17h." : "."}
            </>
          ) : (
            "Sem previsão de momento."
          )}
        </dd>
      </div>
    </dl>
  );
}
