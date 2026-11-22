import "server-only";

import type { z } from "zod";

import { env } from "@/lib/env";
import { fetchJsonIfChanged, SourceError, type Validators } from "@/lib/http/fetch-json";

import { FOGOS_ACTIVE_URL, fogosSchema, normalizeFires } from "./fogos";
import {
  ipmaForecastSchema,
  ipmaForecastUrl,
  ipmaLocalForecastSchema,
  ipmaLocalForecastUrl,
  normalizeForecast,
  normalizeLocalForecast,
  type ForecastDay,
  type LocalForecast,
} from "./ipma-forecast";
import {
  IPMA_OBSERVATIONS_URL,
  ipmaObservationsSchema,
  normalizeObservations,
  normalizeStations,
  type StationObservation,
} from "./ipma-observations";
import { IPMA_RCM_URLS, ipmaRcmSchema, normalizeFireRisk } from "./ipma-rcm";
import {
  IPMA_SEA_LOCATIONS_URL,
  IPMA_SEA_URLS,
  ipmaSeaDaySchema,
  ipmaSeaLocationsSchema,
  normalizeSea,
  type SeaSpot,
} from "./ipma-sea";
import {
  dropOldEarthquakes,
  IPMA_SEISMIC_URLS,
  ipmaSeismicSchema,
  normalizeSeismic,
} from "./ipma-seismic";
import { IPMA_UV_URL, ipmaUvSchema, normalizeUv } from "./ipma-uv";
import {
  dropEndedWarnings,
  IPMA_WARNINGS_URL,
  ipmaWarningsSchema,
  normalizeWarnings,
} from "./ipma-warnings";
import { normalizeAirQuality, openMeteoAqSchema, openMeteoAqUrl } from "./openmeteo-aq";
import type {
  AirQualityReading,
  EarthquakeEvent,
  FireEvent,
  FireRisk,
  SourceId,
  UvReading,
  WarningEvent,
} from "./types";

/*
 * As fontes e o ritmo a que cada uma é verificada.
 *
 * Cada fonte diz de quanto em quanto tempo vale a pena perguntar-lhe se
 * mudou (`every`), medido em novembro de 2026:
 * - Fogos.pt: a ANEPC atualiza de ~2 em 2 min e a CDN deles guarda 3 min;
 * - avisos e sismos: mudam quando o IPMA emite; 2 min põem um aviso novo
 *   no ecrã (e nas notificações) em ~3 min no pior caso;
 * - observações: de hora a hora (~:31); mar e previsões: ~2 vezes por dia;
 * - risco de incêndio: à meia-noite e de manhã; UV: poucas vezes por dia;
 * - qualidade do ar (Open-Meteo): valores horários.
 * O IPMA responde 304 (sem corpo, ~70 ms) quando o ficheiro não mudou, por
 * isso verificar mais vezes do que muda custa quase nada a ambos.
 *
 * `staleAfterMinutes`: a partir daí, os dados guardados já não servem sem
 * perguntar primeiro à fonte (o pedido espera por ela). Coincide com o
 * limite que a monitorização usa (lib/state/health.ts).
 */

export type Fetched<T> =
  { notModified: true } | { notModified: false; data: T; validators: Record<string, Validators> };

export interface SourceDef<T> {
  id: SourceId;
  /** Chave no armazém (lib/cache/source-store.ts). */
  key: string;
  /** Segundos entre verificações da fonte. */
  every: number;
  staleAfterMinutes: number;
  /** Pergunta à fonte, com os validadores da última resposta quando os há. */
  fetch(validators: Record<string, Validators> | undefined): Promise<Fetched<T>>;
  /** Filtros que dependem da hora, aplicados de novo a cada leitura. */
  prune?(data: T, now: Date): T;
}

interface Request<T> {
  url: string;
  schema: z.ZodType<T>;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

type Raws<R extends readonly Request<unknown>[]> = {
  -readonly [K in keyof R]: R[K] extends Request<infer T> ? T : never;
};

/**
 * Pede vários ficheiros de uma fonte com os validadores anteriores. Se
 * nenhum mudou, `notModified`; se algum mudou, volta a pedir sem
 * validadores os que vieram 304 (é preciso o conteúdo de todos para
 * normalizar). Acontece poucas vezes por dia.
 */
async function fetchGroup<const R extends readonly Request<unknown>[]>(
  requests: R,
  previous: Record<string, Validators> | undefined,
): Promise<
  | { notModified: true }
  | { notModified: false; raws: Raws<R>; validators: Record<string, Validators> }
> {
  const first = await Promise.all(
    requests.map((r) => fetchJsonIfChanged(r.url, { ...r, validators: previous?.[r.url] })),
  );
  if (first.every((f) => f.notModified)) return { notModified: true };
  const full = await Promise.all(
    first.map((f, i) => (f.notModified ? fetchJsonIfChanged(requests[i]!.url, requests[i]!) : f)),
  );
  const validators: Record<string, Validators> = {};
  const raws = full.map((f, i) => {
    const url = requests[i]!.url;
    if (f.notModified) throw new SourceError(`304 inesperado: ${url}`, "http", 304);
    validators[url] = f.validators;
    return f.data;
  });
  return { notModified: false, raws: raws as Raws<R>, validators };
}

/** Uma fonte feita de um grupo de ficheiros e de uma normalização. */
function source<T, const R extends readonly Request<unknown>[]>(def: {
  id: SourceId;
  key?: string;
  every: number;
  staleAfterMinutes: number;
  requests: () => R;
  normalize: (raws: Raws<R>) => T;
  prune?: (data: T, now: Date) => T;
}): SourceDef<T> {
  return {
    id: def.id,
    key: def.key ?? def.id,
    every: def.every,
    staleAfterMinutes: def.staleAfterMinutes,
    prune: def.prune,
    async fetch(validators) {
      const result = await fetchGroup(def.requests(), validators);
      if (result.notModified) return result;
      return {
        notModified: false,
        data: def.normalize(result.raws),
        validators: result.validators,
      };
    },
  };
}

export const warningsSource: SourceDef<WarningEvent[]> = source({
  id: "ipma-warnings",
  every: 120,
  staleAfterMinutes: 20,
  requests: () => [{ url: IPMA_WARNINGS_URL, schema: ipmaWarningsSchema }] as const,
  normalize: ([raw]) => normalizeWarnings(raw, new Date()),
  prune: dropEndedWarnings,
});

export const earthquakesSource: SourceDef<EarthquakeEvent[]> = source({
  id: "ipma-seismic",
  every: 120,
  staleAfterMinutes: 20,
  requests: () => IPMA_SEISMIC_URLS.map((url) => ({ url, schema: ipmaSeismicSchema })),
  normalize: (raws) => normalizeSeismic(raws, new Date()),
  prune: dropOldEarthquakes,
});

export const firesSource: SourceDef<FireEvent[]> = source({
  id: "fogos",
  every: 120,
  staleAfterMinutes: 15,
  requests: () => {
    const key = env().FOGOS_API_KEY;
    if (!key) throw new Error("FOGOS_API_KEY em falta");
    return [{ url: FOGOS_ACTIVE_URL, schema: fogosSchema, headers: { "X-API-Key": key } }] as const;
  },
  normalize: ([raw]) => normalizeFires(raw),
});

export const fireRiskSource: SourceDef<FireRisk> = source({
  id: "ipma-rcm",
  // Muda à meia-noite e de manhã; de 15 em 15 min, o "hoje" troca pouco depois das 00:05.
  every: 900,
  staleAfterMinutes: 180,
  requests: () =>
    [
      { url: IPMA_RCM_URLS.today, schema: ipmaRcmSchema },
      { url: IPMA_RCM_URLS.tomorrow, schema: ipmaRcmSchema },
    ] as const,
  normalize: ([today, tomorrow]) => normalizeFireRisk(today, tomorrow),
});

export const uvSource: SourceDef<UvReading[]> = source({
  id: "ipma-uv",
  every: 1800,
  staleAfterMinutes: 180,
  requests: () => [{ url: IPMA_UV_URL, schema: ipmaUvSchema }] as const,
  normalize: ([raw]) => normalizeUv(raw),
});

export const airQualitySource: SourceDef<AirQualityReading[]> = source({
  id: "openmeteo-aq",
  // Sem ETag nem Last-Modified: cada verificação descarrega tudo, por isso só de 30 em 30 min.
  every: 1800,
  staleAfterMinutes: 45,
  requests: () => [{ url: openMeteoAqUrl(), schema: openMeteoAqSchema, timeoutMs: 5000 }] as const,
  normalize: ([raw]) => normalizeAirQuality(raw),
});

export interface ObservationsData {
  /** Estação de referência de cada distrito. */
  byDistrict: Record<string, StationObservation>;
  /** Todas as estações (o concelho escolhe a mais próxima). */
  stations: StationObservation[];
}

/** Observações das estações: um só ficheiro (450 KB) para os distritos e para as estações. */
export const observationsSource: SourceDef<ObservationsData> = source({
  id: "ipma-observations",
  every: 600,
  staleAfterMinutes: 120,
  requests: () =>
    [{ url: IPMA_OBSERVATIONS_URL, schema: ipmaObservationsSchema, timeoutMs: 6000 }] as const,
  normalize: ([raw]) => ({
    byDistrict: normalizeObservations(raw),
    stations: normalizeStations(raw),
  }),
});

/** Estado do mar: hoje e os 2 dias seguintes, em 12 pontos da costa. */
export const seaSource: SourceDef<Record<string, SeaSpot[]>> = source({
  id: "ipma-sea",
  every: 3600,
  staleAfterMinutes: 240,
  requests: () =>
    [
      { url: IPMA_SEA_LOCATIONS_URL, schema: ipmaSeaLocationsSchema },
      ...IPMA_SEA_URLS.map((url) => ({ url, schema: ipmaSeaDaySchema })),
    ] as const,
  normalize: ([locations, ...days]) => normalizeSea(days, locations),
});

const forecastSources = new Map<number, SourceDef<ForecastDay[]>>();

/** Previsão a 5 dias de um local; só se verifica quando alguém a pede. */
export function forecastSource(globalIdLocal: number): SourceDef<ForecastDay[]> {
  let def = forecastSources.get(globalIdLocal);
  if (!def) {
    def = source({
      id: "ipma-forecast",
      key: `ipma-forecast-${globalIdLocal}`,
      every: 3600,
      staleAfterMinutes: 360,
      requests: () =>
        [{ url: ipmaForecastUrl(globalIdLocal), schema: ipmaForecastSchema }] as const,
      normalize: ([raw]) => normalizeForecast(raw),
    });
    forecastSources.set(globalIdLocal, def);
  }
  return def;
}

const localForecastSources = new Map<number, SourceDef<LocalForecast>>();

/**
 * Previsão a 5 dias do local de previsão de um concelho (data/forecast-locations.ts).
 * Chave própria: o globalIdLocal de uma capital é o mesmo do seu concelho, mas
 * o ficheiro (e o ETag) é outro.
 */
export function localForecastSource(globalIdLocal: number): SourceDef<LocalForecast> {
  let def = localForecastSources.get(globalIdLocal);
  if (!def) {
    def = source({
      id: "ipma-forecast",
      // v2: dias e horas (a v1 eram só os dias).
      key: `ipma-forecast-local-v2-${globalIdLocal}`,
      every: 3600,
      staleAfterMinutes: 360,
      requests: () =>
        [{ url: ipmaLocalForecastUrl(globalIdLocal), schema: ipmaLocalForecastSchema }] as const,
      normalize: ([raw]) => normalizeLocalForecast(raw),
    });
    localForecastSources.set(globalIdLocal, def);
  }
  return def;
}
