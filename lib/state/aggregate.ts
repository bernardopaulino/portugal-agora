import { districts } from "@/data/districts";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { formatNumber } from "@/lib/time/format";
import { maxSeverity, severityRank } from "@/lib/sources/types";
import type {
  AirQualityReading,
  EarthquakeEvent,
  FireEvent,
  FireRisk,
  Severity,
  SourceResult,
  UvReading,
  WarningEvent,
} from "@/lib/sources/types";

import { countryHeadline, placesPhrase as phrase } from "./bulletin";

const pt = getDictionary("pt");

export interface DistrictStatus {
  slug: string;
  level: Severity;
  warnings: number;
  activeFires: number;
}

export interface CountryState {
  generatedAt: string;
  /** Nível mais alto de aviso do IPMA em vigor ou previsto. */
  level: Severity;
  /** false quando não foi possível obter os avisos (o semáforo fica cinzento). */
  levelKnown: boolean;
  headline: string;
  summary: string[];
  districts: Record<string, DistrictStatus>;
  warnings: SourceResult<WarningEvent[]>;
  earthquakes: SourceResult<EarthquakeEvent[]>;
  fires: SourceResult<FireEvent[]>;
  fireRisk: SourceResult<FireRisk>;
  uv: SourceResult<UvReading[]>;
  airQuality: SourceResult<AirQualityReading[]>;
}

export interface StateInputs {
  warnings: SourceResult<WarningEvent[]>;
  earthquakes: SourceResult<EarthquakeEvent[]>;
  fires: SourceResult<FireEvent[]>;
  fireRisk: SourceResult<FireRisk>;
  uv: SourceResult<UvReading[]>;
  airQuality: SourceResult<AirQualityReading[]>;
}

/** Sismos que entram na lista: magnitude ≥ 2 ou sentidos. */
export const MIN_LISTED_MAGNITUDE = 2;

/** "no Porto e em Viana do Castelo", "em 9 distritos e nos Açores". */
export function placesPhrase(slugs: string[]): string {
  return phrase(slugs, pt);
}

export function districtStatuses(
  warnings: WarningEvent[],
  fires: FireEvent[],
): Record<string, DistrictStatus> {
  return Object.fromEntries(
    districts.map((d) => {
      const own = warnings.filter((w) => w.place.district === d.slug);
      return [
        d.slug,
        {
          slug: d.slug,
          level: maxSeverity(own.map((w) => w.severity)),
          warnings: own.length,
          activeFires: fires.filter((f) => f.active && f.place.district === d.slug).length,
        },
      ];
    }),
  );
}

export function buildHeadline(
  warnings: SourceResult<WarningEvent[]>,
  statuses: Record<string, DistrictStatus>,
): { level: Severity; levelKnown: boolean; headline: string } {
  const levelKnown = Boolean(warnings.data);
  const level = levelKnown ? maxSeverity(Object.values(statuses).map((s) => s.level)) : "none";
  // O texto em português (API, imagens de partilha); as páginas usam o do idioma.
  return { level, levelKnown, headline: countryHeadline(levelKnown, statuses, pt) };
}

export function buildSummary(inputs: StateInputs, now: Date): string[] {
  const lines: string[] = [];

  const fires = inputs.fires.data;
  if (fires) {
    const active = fires.filter((f) => f.active).length;
    lines.push(
      active === 0
        ? "Nenhum incêndio em curso."
        : active === 1
          ? "1 incêndio em curso."
          : `${active} incêndios em curso.`,
    );
  } else {
    lines.push("Informação sobre incêndios indisponível.");
  }

  const quakes = inputs.earthquakes.data;
  if (quakes) {
    const since = now.getTime() - 86_400_000;
    const felt = quakes.filter((q) => q.felt && new Date(q.occurredAt).getTime() >= since);
    if (felt.length === 0) lines.push("Nenhum sismo sentido nas últimas 24 horas.");
    else {
      const strongest = felt.reduce((a, b) => (b.magnitude > a.magnitude ? b : a));
      lines.push(
        felt.length === 1
          ? `1 sismo sentido nas últimas 24 horas: magnitude ${formatNumber(strongest.magnitude)}, ${strongest.place.label}.`
          : `${felt.length} sismos sentidos nas últimas 24 horas; o maior com magnitude ${formatNumber(strongest.magnitude)}.`,
      );
    }
  }

  const risk = inputs.fireRisk.data?.today.byDico;
  if (risk) {
    const values = Object.values(risk);
    const maxCount = values.filter((v) => v === 5).length;
    const veryHigh = values.filter((v) => v === 4).length;
    if (maxCount > 0)
      lines.push(
        `Risco de incêndio máximo em ${maxCount} ${maxCount === 1 ? "concelho" : "concelhos"} hoje.`,
      );
    else if (veryHigh > 0)
      lines.push(
        `Risco de incêndio muito elevado em ${veryHigh} ${veryHigh === 1 ? "concelho" : "concelhos"} hoje.`,
      );
  }

  return lines;
}

export function aggregate(inputs: StateInputs, now: Date): CountryState {
  const warnings = inputs.warnings.data ?? [];
  const fires = inputs.fires.data ?? [];
  const statuses = districtStatuses(warnings, fires);
  const { level, levelKnown, headline } = buildHeadline(inputs.warnings, statuses);

  const earthquakes: SourceResult<EarthquakeEvent[]> = inputs.earthquakes.data
    ? {
        ...inputs.earthquakes,
        data: inputs.earthquakes.data.filter((q) => q.felt || q.magnitude >= MIN_LISTED_MAGNITUDE),
      }
    : inputs.earthquakes;

  return {
    generatedAt: now.toISOString(),
    level,
    levelKnown,
    headline,
    summary: buildSummary(inputs, now),
    districts: statuses,
    ...inputs,
    earthquakes,
  };
}

/** Ordena por severidade decrescente, mantendo a ordem original entre iguais. */
export function bySeverity<T extends { severity: Severity }>(items: T[]): T[] {
  return [...items].sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);
}
