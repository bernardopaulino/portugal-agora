"use client";

import useSWR from "swr";

import type { District } from "@/data/districts";
import { useLiveState } from "@/lib/hooks/live-state";
import type { ForecastDay } from "@/lib/sources/ipma-forecast";
import type { SourceResult } from "@/lib/sources/types";

import { DistrictStage } from "./boletim/district-stage";

const forecastFetcher = async (url: string): Promise<SourceResult<ForecastDay[]>> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

/**
 * O resumo de um distrito: só o boletim (título, linhas de cada tema e
 * mapa) e a previsão. O detalhe de cada tema tem a sua página
 * (/lisboa/avisos, /lisboa/incendios…), a que se chega pelas linhas.
 * A página é estática: o estado e a previsão chegam pelo browser
 * (/api/state e /api/forecast, em cache na CDN), sem "ISR writes".
 */
export function DistrictView({ district }: { district: District }) {
  const state = useLiveState();
  const { data: forecast, error } = useSWR(
    `/api/forecast/${district.globalIdLocal}`,
    forecastFetcher,
    { revalidateOnFocus: false },
  );
  return (
    <DistrictStage
      district={district}
      state={state}
      forecast={forecast ?? (error ? null : undefined)}
    />
  );
}
