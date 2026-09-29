import "server-only";

import { readSnapshot } from "@/lib/cache/snapshot";
import { features } from "@/lib/env";

import {
  loadAirQuality,
  loadEarthquakes,
  loadFireRisk,
  loadFires,
  loadForecast,
  loadUv,
  loadWarnings,
} from "./loaders";
import type { FireEvent, Loaded, SourceId, SourceResult } from "./types";

export const sourceNames: Record<SourceId, string> = {
  "ipma-warnings": "IPMA",
  "ipma-seismic": "IPMA",
  "ipma-rcm": "IPMA",
  "ipma-uv": "IPMA",
  "ipma-forecast": "IPMA",
  fogos: "Fogos.pt",
  "openmeteo-aq": "Open-Meteo",
};

/**
 * Executa um carregador e nunca lança: devolve os dados frescos, o
 * último snapshot (marcado como desatualizado) ou "indisponível".
 */
export async function resolveSource<T>(
  id: SourceId,
  load: () => Promise<Loaded<T>>,
  snapshotKey: string = id,
): Promise<SourceResult<T>> {
  try {
    const { data, fetchedAt } = await load();
    return { id, status: "ok", data, fetchedAt };
  } catch (error) {
    console.error(`[fonte ${id}]`, error instanceof Error ? error.message : error);
    const snapshot = await readSnapshot<Loaded<T>>(snapshotKey).catch(() => null);
    if (snapshot) {
      return {
        id,
        status: "stale",
        data: snapshot.data.data,
        fetchedAt: snapshot.data.fetchedAt,
        message: `${sourceNames[id]} sem resposta. A mostrar os últimos dados obtidos.`,
      };
    }
    return {
      id,
      status: "unavailable",
      data: null,
      message: `${sourceNames[id]} sem resposta de momento. Tentamos de novo em breve.`,
    };
  }
}

export const getWarnings = () => resolveSource("ipma-warnings", loadWarnings);
export const getEarthquakes = () => resolveSource("ipma-seismic", loadEarthquakes);
export const getFireRisk = () => resolveSource("ipma-rcm", loadFireRisk);
export const getUv = () => resolveSource("ipma-uv", loadUv);
export const getAirQuality = () => resolveSource("openmeteo-aq", loadAirQuality);

export async function getFires(): Promise<SourceResult<FireEvent[]>> {
  if (!features().fires) {
    return {
      id: "fogos",
      status: "disabled",
      data: null,
      message: "Dados de incêndios indisponíveis neste momento. Consulte fogos.pt.",
    };
  }
  return resolveSource("fogos", loadFires);
}

export const getForecast = (globalIdLocal: number) =>
  resolveSource(
    "ipma-forecast",
    () => loadForecast(globalIdLocal),
    `ipma-forecast-${globalIdLocal}`,
  );
