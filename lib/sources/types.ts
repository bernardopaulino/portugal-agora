import type { Region } from "@/data/districts";

/**
 * Escala de severidade comum. Para avisos meteorológicos corresponde
 * exatamente aos níveis do IPMA; para as outras fontes é uma
 * classificação nossa, documentada em /fontes.
 */
export type Severity = "none" | "yellow" | "orange" | "red";

export const severityRank: Record<Severity, number> = { none: 0, yellow: 1, orange: 2, red: 3 };

export function maxSeverity(levels: Iterable<Severity>): Severity {
  let max: Severity = "none";
  for (const level of levels) if (severityRank[level] > severityRank[max]) max = level;
  return max;
}

export type SourceId =
  | "ipma-warnings"
  | "ipma-seismic"
  | "ipma-rcm"
  | "ipma-uv"
  | "ipma-forecast"
  | "fogos"
  | "openmeteo-aq";

export interface Place {
  /** Slug do distrito/região, quando conhecido. */
  district?: string;
  region: Region;
  /** Texto legível: "Porto", "Açores, Grupo Central", "SE Torre de Moncorvo". */
  label: string;
}

interface BaseEvent {
  id: string;
  severity: Severity;
  title: string;
  place: Place;
  coordinates?: [number, number];
}

export interface WarningEvent extends BaseEvent {
  kind: "warning";
  type: string;
  description?: string;
  area: string;
  startsAt: string;
  endsAt: string;
}

export interface EarthquakeEvent extends BaseEvent {
  kind: "earthquake";
  magnitude: number;
  depthKm: number;
  felt: boolean;
  intensity?: string;
  occurredAt: string;
}

export interface FireEvent extends BaseEvent {
  kind: "fire";
  status: string;
  statusCode: number;
  active: boolean;
  startedAt: string;
  operatives: number;
  groundUnits: number;
  aerialUnits: number;
  nature: string;
  concelho?: string;
}

export type Event = WarningEvent | EarthquakeEvent | FireEvent;

export interface AirQualityReading {
  district: string;
  eaqi: number;
  label: string;
  severity: Severity;
  pollutant: string;
  observedAt: string;
}

export interface UvReading {
  district: string;
  date: string;
  index: number;
  label: string;
}

/** Risco de incêndio por concelho (1 a 5), para hoje e amanhã. */
export interface FireRisk {
  today: { date: string; byDico: Record<string, number> };
  tomorrow: { date: string; byDico: Record<string, number> };
}

export interface Loaded<T> {
  data: T;
  fetchedAt: string;
}

export type SourceStatus = "ok" | "stale" | "unavailable" | "disabled";

export interface SourceResult<T> {
  id: SourceId;
  status: SourceStatus;
  data: T | null;
  /** Hora a que os dados mostrados foram obtidos. */
  fetchedAt?: string;
  /** Mensagem legível para o utilizador quando status ≠ ok. */
  message?: string;
}
