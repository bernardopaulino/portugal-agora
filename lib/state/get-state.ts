import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import {
  getAirQuality,
  getEarthquakes,
  getFireRisk,
  getFires,
  getUv,
  getWarnings,
} from "@/lib/sources/registry";

import { aggregate, type CountryState } from "./aggregate";

async function buildState(): Promise<CountryState> {
  const [warnings, earthquakes, fires, fireRisk, uv, airQuality] = await Promise.all([
    getWarnings(),
    getEarthquakes(),
    getFires(),
    getFireRisk(),
    getUv(),
    getAirQuality(),
  ]);
  return aggregate({ warnings, earthquakes, fires, fireRisk, uv, airQuality }, new Date());
}

/**
 * Estado do país "ao minuto". Só para /api/state (que o browser consulta
 * de minuto a minuto, com cache na CDN) e para /api/health/sources.
 */
export async function getState(): Promise<CountryState> {
  "use cache";
  cacheLife({ stale: 30, revalidate: 60, expire: 600 });
  cacheTag("state");
  return buildState();
}

/**
 * Estado do país para as páginas e imagens de partilha, renovado a cada
 * 15 minutos. Cada renovação de uma página pré-gerada conta como uma
 * "ISR write" na Vercel (limite de 200 mil/mês no plano Hobby), e há
 * ~250 páginas e imagens que dependem disto. Os dados frescos chegam ao
 * browser logo a seguir pelo useLiveState (/api/state), por isso o HTML
 * não precisa de ser regenerado ao minuto.
 */
export async function getPageState(): Promise<CountryState> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 900, expire: 3600 });
  cacheTag("state-page");
  return buildState();
}
