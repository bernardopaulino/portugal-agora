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
 * Estado do país "ao minuto", para /api/state (que o browser consulta de
 * minuto a minuto, com cache na CDN), para as imagens de partilha e para
 * /api/health/sources. Nenhuma página o usa no servidor: as páginas são
 * estáticas e os dados chegam pelo browser (ver useLiveState).
 */
export async function getState(): Promise<CountryState> {
  "use cache";
  cacheLife({ stale: 30, revalidate: 60, expire: 600 });
  cacheTag("state");
  return buildState();
}
