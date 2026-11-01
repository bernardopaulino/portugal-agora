import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { saveSnapshot } from "@/lib/cache/snapshot";
import { env } from "@/lib/env";
import { fetchJson } from "@/lib/http/fetch-json";

import { FOGOS_ACTIVE_URL, fogosSchema, normalizeFires } from "./fogos";
import {
  ipmaForecastSchema,
  ipmaForecastUrl,
  normalizeForecast,
  type ForecastDay,
} from "./ipma-forecast";
import { IPMA_RCM_URLS, ipmaRcmSchema, normalizeFireRisk } from "./ipma-rcm";
import { IPMA_SEISMIC_URLS, ipmaSeismicSchema, normalizeSeismic } from "./ipma-seismic";
import { IPMA_UV_URL, ipmaUvSchema, normalizeUv } from "./ipma-uv";
import { IPMA_WARNINGS_URL, ipmaWarningsSchema, normalizeWarnings } from "./ipma-warnings";
import { normalizeAirQuality, openMeteoAqSchema, openMeteoAqUrl } from "./openmeteo-aq";
import type {
  AirQualityReading,
  EarthquakeEvent,
  FireEvent,
  FireRisk,
  Loaded,
  UvReading,
  WarningEvent,
} from "./types";

/**
 * Carregadores com cache. Cada um corre apenas quando a sua cache
 * expira; nesse momento vai à fonte, valida, normaliza e guarda o
 * resultado como snapshot (o "último resultado bom").
 *
 * Uma falha nunca sai de dentro de uma função "use cache": o Next 16
 * trata um erro lançado ali durante o build como erro de pré-geração e
 * aborta o build inteiro (bastava o IPMA não responder no CI). Por isso
 * a parte em cache devolve um resultado { ok: false } guardado só
 * 1 minuto, e é a função exportada (fora da cache) que lança o erro,
 * para o registo (registry.ts) mostrar o snapshot como até aqui.
 *
 * Durações escolhidas em função da frequência de atualização de cada
 * fonte e do respeito pelos seus limites de utilização.
 */

type Outcome<T> = { ok: true; value: Loaded<T> } | { ok: false; message: string };

/** Vida curta para falhas: tenta-se de novo ao fim de 1 minuto. */
const FAILURE_LIFE = { stale: 30, revalidate: 60, expire: 300 } as const;

function stamp<T>(data: T): Loaded<T> {
  return { data, fetchedAt: new Date().toISOString() };
}

async function attempt<T>(load: () => Promise<Loaded<T>>): Promise<Outcome<T>> {
  try {
    return { ok: true, value: await load() };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

function unwrap<T>(outcome: Outcome<T>): Loaded<T> {
  if (!outcome.ok) throw new Error(outcome.message);
  return outcome.value;
}

async function cachedWarnings(): Promise<Outcome<WarningEvent[]>> {
  "use cache";
  cacheTag("ipma-warnings");
  const outcome = await attempt(async () => {
    const raw = await fetchJson(IPMA_WARNINGS_URL, { schema: ipmaWarningsSchema });
    const result = stamp(normalizeWarnings(raw, new Date()));
    await saveSnapshot("ipma-warnings", result);
    return result;
  });
  cacheLife(outcome.ok ? { stale: 60, revalidate: 300, expire: 3600 } : FAILURE_LIFE);
  return outcome;
}
export const loadWarnings = async () => unwrap(await cachedWarnings());

async function cachedEarthquakes(): Promise<Outcome<EarthquakeEvent[]>> {
  "use cache";
  cacheTag("ipma-seismic");
  const outcome = await attempt(async () => {
    const raws = await Promise.all(
      IPMA_SEISMIC_URLS.map((url) => fetchJson(url, { schema: ipmaSeismicSchema })),
    );
    const result = stamp(normalizeSeismic(raws, new Date()));
    await saveSnapshot("ipma-seismic", result);
    return result;
  });
  cacheLife(outcome.ok ? { stale: 60, revalidate: 300, expire: 3600 } : FAILURE_LIFE);
  return outcome;
}
export const loadEarthquakes = async () => unwrap(await cachedEarthquakes());

async function cachedFireRisk(): Promise<Outcome<FireRisk>> {
  "use cache";
  cacheTag("ipma-rcm");
  const outcome = await attempt(async () => {
    const [today, tomorrow] = await Promise.all([
      fetchJson(IPMA_RCM_URLS.today, { schema: ipmaRcmSchema }),
      fetchJson(IPMA_RCM_URLS.tomorrow, { schema: ipmaRcmSchema }),
    ]);
    const result = stamp(normalizeFireRisk(today, tomorrow));
    await saveSnapshot("ipma-rcm", result);
    return result;
  });
  cacheLife(outcome.ok ? { stale: 300, revalidate: 3600, expire: 86400 } : FAILURE_LIFE);
  return outcome;
}
export const loadFireRisk = async () => unwrap(await cachedFireRisk());

async function cachedUv(): Promise<Outcome<UvReading[]>> {
  "use cache";
  cacheTag("ipma-uv");
  const outcome = await attempt(async () => {
    const raw = await fetchJson(IPMA_UV_URL, { schema: ipmaUvSchema });
    const result = stamp(normalizeUv(raw));
    await saveSnapshot("ipma-uv", result);
    return result;
  });
  cacheLife(outcome.ok ? { stale: 300, revalidate: 3600, expire: 86400 } : FAILURE_LIFE);
  return outcome;
}
export const loadUv = async () => unwrap(await cachedUv());

async function cachedFires(): Promise<Outcome<FireEvent[]>> {
  "use cache";
  cacheTag("fogos");
  const outcome = await attempt(async () => {
    const key = env().FOGOS_API_KEY;
    if (!key) throw new Error("FOGOS_API_KEY em falta");
    const raw = await fetchJson(FOGOS_ACTIVE_URL, {
      schema: fogosSchema,
      headers: { "X-API-Key": key },
    });
    const result = stamp(normalizeFires(raw));
    await saveSnapshot("fogos", result);
    return result;
  });
  cacheLife(outcome.ok ? { stale: 60, revalidate: 120, expire: 3600 } : FAILURE_LIFE);
  return outcome;
}
export const loadFires = async () => unwrap(await cachedFires());

async function cachedAirQuality(): Promise<Outcome<AirQualityReading[]>> {
  "use cache";
  cacheTag("openmeteo-aq");
  const outcome = await attempt(async () => {
    const raw = await fetchJson(openMeteoAqUrl(), { schema: openMeteoAqSchema, timeoutMs: 5000 });
    const result = stamp(normalizeAirQuality(raw));
    await saveSnapshot("openmeteo-aq", result);
    return result;
  });
  cacheLife(outcome.ok ? { stale: 300, revalidate: 600, expire: 7200 } : FAILURE_LIFE);
  return outcome;
}
export const loadAirQuality = async () => unwrap(await cachedAirQuality());

async function cachedForecast(globalIdLocal: number): Promise<Outcome<ForecastDay[]>> {
  "use cache";
  cacheTag(`ipma-forecast-${globalIdLocal}`);
  const outcome = await attempt(async () => {
    const raw = await fetchJson(ipmaForecastUrl(globalIdLocal), { schema: ipmaForecastSchema });
    const result = stamp(normalizeForecast(raw));
    await saveSnapshot(`ipma-forecast-${globalIdLocal}`, result);
    return result;
  });
  cacheLife(outcome.ok ? { stale: 300, revalidate: 3600, expire: 86400 } : FAILURE_LIFE);
  return outcome;
}
export const loadForecast = async (globalIdLocal: number) =>
  unwrap(await cachedForecast(globalIdLocal));
