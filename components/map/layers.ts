export type LayerId = "warnings" | "fires" | "quakes" | "risk" | "air";

/** Dia do risco de incêndio mostrado no mapa. */
export type RiskDay = "today" | "tomorrow";

/** Página nacional de cada camada (a ligação "em todo o país" das páginas de distrito). */
export const layerTopic: Record<LayerId, string> = {
  warnings: "/avisos",
  fires: "/incendios",
  quakes: "/sismos",
  risk: "/risco",
  air: "/risco",
};
