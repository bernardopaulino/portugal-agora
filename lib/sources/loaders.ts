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
 * resultado como snapshot (o "último resultado bom"). Se lançar um
 * erro, nada fica em cache e o registo (registry.ts) usa o snapshot.
 *
 * Durações escolhidas em função da frequência de atualização de cada
 * fonte e do respeito pelos seus limites de utilização.
 */

function stamp<T>(data: T): Loaded<T> {
  return { data, fetchedAt: new Date().toISOString() };
}

export async function loadWarnings(): Promise<Loaded<WarningEvent[]>> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  cacheTag("ipma-warnings");
  const raw = await fetchJson(IPMA_WARNINGS_URL, { schema: ipmaWarningsSchema });
  const result = stamp(normalizeWarnings(raw, new Date()));
  await saveSnapshot("ipma-warnings", result);
  return result;
}

export async function loadEarthquakes(): Promise<Loaded<EarthquakeEvent[]>> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  cacheTag("ipma-seismic");
  const raws = await Promise.all(
    IPMA_SEISMIC_URLS.map((url) => fetchJson(url, { schema: ipmaSeismicSchema })),
  );
  const result = stamp(normalizeSeismic(raws, new Date()));
  await saveSnapshot("ipma-seismic", result);
  return result;
}

export async function loadFireRisk(): Promise<Loaded<FireRisk>> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  cacheTag("ipma-rcm");
  const [today, tomorrow] = await Promise.all([
    fetchJson(IPMA_RCM_URLS.today, { schema: ipmaRcmSchema }),
    fetchJson(IPMA_RCM_URLS.tomorrow, { schema: ipmaRcmSchema }),
  ]);
  const result = stamp(normalizeFireRisk(today, tomorrow));
  await saveSnapshot("ipma-rcm", result);
  return result;
}

export async function loadUv(): Promise<Loaded<UvReading[]>> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  cacheTag("ipma-uv");
  const raw = await fetchJson(IPMA_UV_URL, { schema: ipmaUvSchema });
  const result = stamp(normalizeUv(raw));
  await saveSnapshot("ipma-uv", result);
  return result;
}

export async function loadFires(): Promise<Loaded<FireEvent[]>> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 120, expire: 3600 });
  cacheTag("fogos");
  const key = env().FOGOS_API_KEY;
  if (!key) throw new Error("FOGOS_API_KEY em falta");
  const raw = await fetchJson(FOGOS_ACTIVE_URL, {
    schema: fogosSchema,
    headers: { "X-API-Key": key },
  });
  const result = stamp(normalizeFires(raw));
  await saveSnapshot("fogos", result);
  return result;
}

export async function loadAirQuality(): Promise<Loaded<AirQualityReading[]>> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 600, expire: 7200 });
  cacheTag("openmeteo-aq");
  const raw = await fetchJson(openMeteoAqUrl(), { schema: openMeteoAqSchema, timeoutMs: 5000 });
  const result = stamp(normalizeAirQuality(raw));
  await saveSnapshot("openmeteo-aq", result);
  return result;
}

export async function loadForecast(globalIdLocal: number): Promise<Loaded<ForecastDay[]>> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  cacheTag(`ipma-forecast-${globalIdLocal}`);
  const raw = await fetchJson(ipmaForecastUrl(globalIdLocal), { schema: ipmaForecastSchema });
  const result = stamp(normalizeForecast(raw));
  await saveSnapshot(`ipma-forecast-${globalIdLocal}`, result);
  return result;
}
