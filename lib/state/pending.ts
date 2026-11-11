import type { SourceId, SourceResult } from "@/lib/sources/types";

import type { CountryState } from "./aggregate";

/*
 * O estado "ainda a carregar": as páginas não levam dados no HTML (para
 * serem estáticas e não gastarem "ISR writes" da Vercel) e o estado chega
 * logo a seguir pelo /api/state. Até lá, os mapas e a cena desenham-se com
 * isto: todos os distritos a cinzento ("unknown") e sem pictogramas.
 * Os textos não o usam: quem mostra frases sobre o estado verifica antes
 * se ele já chegou (useLiveState devolve null), para nunca dizer "fonte em
 * baixo" enquanto os dados estão só a caminho.
 */

const waiting = <T>(id: SourceId): SourceResult<T> => ({ id, status: "unavailable", data: null });

export const PENDING_STATE: CountryState = {
  generatedAt: new Date(0).toISOString(),
  level: "none",
  levelKnown: false,
  headline: "",
  summary: [],
  districts: {},
  warnings: waiting("ipma-warnings"),
  earthquakes: waiting("ipma-seismic"),
  fires: waiting("fogos"),
  fireRisk: waiting("ipma-rcm"),
  uv: waiting("ipma-uv"),
  airQuality: waiting("openmeteo-aq"),
};
