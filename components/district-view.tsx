"use client";

import type { District } from "@/data/districts";
import { useLiveState } from "@/lib/hooks/live-state";
import type { ForecastDay } from "@/lib/sources/ipma-forecast";
import type { SourceResult } from "@/lib/sources/types";
import type { CountryState } from "@/lib/state/aggregate";

import { DistrictStage } from "./boletim/district-stage";

/**
 * O resumo de um distrito: só o boletim (título, linhas de cada tema e
 * mapa) e a previsão. O detalhe de cada tema tem a sua página
 * (/lisboa/avisos, /lisboa/incendios…), a que se chega pelas linhas.
 */
export function DistrictView({
  district,
  initial,
  forecast,
}: {
  district: District;
  initial: CountryState;
  forecast: SourceResult<ForecastDay[]>;
}) {
  const state = useLiveState(initial);
  return <DistrictStage district={district} state={state} forecast={forecast} />;
}
