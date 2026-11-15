"use client";

import useSWR from "swr";

import type { StationObservation } from "@/lib/sources/ipma-observations";
import type { SeaSpot } from "@/lib/sources/ipma-sea";
import type { SourceResult } from "@/lib/sources/types";

export interface Weather {
  observations: SourceResult<Record<string, StationObservation>>;
  sea: SourceResult<Record<string, SeaSpot[]>>;
  /** Todas as estações com temperatura (as páginas dos concelhos escolhem a mais próxima). */
  stations: SourceResult<StationObservation[]>;
}

const fetcher = async (url: string): Promise<Weather> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

/**
 * Tempo observado e estado do mar (/api/weather), pedidos só onde são
 * mostrados. null enquanto chegam ou se o pedido falhar.
 */
export function useWeather(enabled = true): Weather | null {
  const { data } = useSWR(enabled ? "/api/weather" : null, fetcher, {
    // O IPMA publica observações de hora a hora (~:31): de 10 em 10 min, e ao
    // voltar ao separador (no máximo de 5 em 5 min), para não ficar uma hora atrás.
    refreshInterval: 10 * 60_000,
    revalidateOnFocus: true,
    focusThrottleInterval: 5 * 60_000,
  });
  return data ?? null;
}
