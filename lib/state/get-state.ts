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

/**
 * Estado do país, recalculado no máximo a cada minuto. É o que a página
 * inicial, as páginas de distrito, /api/state e as imagens de partilha usam.
 */
export async function getState(): Promise<CountryState> {
  "use cache";
  cacheLife({ stale: 30, revalidate: 60, expire: 600 });
  cacheTag("state");
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
