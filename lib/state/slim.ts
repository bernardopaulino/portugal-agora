import type { CountryState } from "./aggregate";

/*
 * O estado que vai no HTML de uma página de tema: só os dados desse tema
 * (e, numa página de distrito, só os do distrito). O resto chega logo a
 * seguir pelo /api/state, que o browser pede ao abrir (useLiveState).
 *
 * Porquê: o estado inteiro tem ~75 KB e ia no HTML de todas as ~250
 * páginas. A Vercel conta cada renovação de página em unidades de 8 KB
 * ("ISR writes", limitadas no plano Hobby) e o telemóvel descarrega tudo.
 * Os níveis por distrito, o título e o resumo ficam sempre (o cabeçalho e
 * o mapa dos avisos usam-nos); o que se esvazia são as listas dos outros
 * temas, que esta página não mostra.
 */

export type StateTopic = "avisos" | "incendios" | "sismos" | "risco";

type ListKey = "warnings" | "fires" | "earthquakes" | "uv" | "airQuality";

const listsOf: Record<StateTopic, ListKey[]> = {
  avisos: ["warnings"],
  incendios: ["fires"],
  sismos: ["earthquakes"],
  risco: ["uv", "airQuality"],
};

export function slimState(state: CountryState, topic: StateTopic, district?: string): CountryState {
  const keep = new Set<ListKey>(listsOf[topic]);
  const slim: CountryState = { ...state };
  for (const key of ["warnings", "fires", "earthquakes", "uv", "airQuality"] as const) {
    const result = state[key];
    if (!result.data) continue;
    if (!keep.has(key)) {
      // Vazio, não null: null quer dizer "fonte em baixo" para quem a mostra.
      (slim[key] as typeof result) = { ...result, data: [] };
      continue;
    }
    // Num distrito, as listas com local ficam só com o que é do distrito.
    if (district && (key === "warnings" || key === "fires" || key === "earthquakes")) {
      const data = (result.data as { place: { district?: string } }[]).filter(
        (item) => item.place.district === district,
      );
      (slim[key] as typeof result) = { ...result, data } as typeof result;
    }
  }
  if (topic !== "risco" && state.fireRisk.data) {
    const { today, tomorrow } = state.fireRisk.data;
    slim.fireRisk = {
      ...state.fireRisk,
      data: { today: { ...today, byDico: {} }, tomorrow: { ...tomorrow, byDico: {} } },
    };
  }
  return slim;
}
