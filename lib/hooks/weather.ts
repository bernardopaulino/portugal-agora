"use client";

import useSWR from "swr";

import type { StationObservation } from "@/lib/sources/ipma-observations";
import type { SeaSpot } from "@/lib/sources/ipma-sea";
import type { SourceResult } from "@/lib/sources/types";

export interface Weather {
  observations: SourceResult<Record<string, StationObservation>>;
  sea: SourceResult<Record<string, SeaSpot[]>>;
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
    refreshInterval: 20 * 60_000,
    revalidateOnFocus: false,
  });
  return data ?? null;
}
