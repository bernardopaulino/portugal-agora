import type { Region } from "@/data/districts";

/** O que está selecionado (na lista ou no mapa). */
export type Selection =
  | { type: "district"; slug: string }
  | { type: "concelho"; dico: string; district: string }
  | { type: "event"; id: string; coordinates: [number, number]; region: Region };

export type OnSelect = (selection: Selection) => void;

/** É o mesmo distrito, concelho ou evento? (Um segundo toque tira a seleção.) */
export function isSameSelection(a: Selection | null, b: Selection): boolean {
  if (!a || a.type !== b.type) return false;
  if (a.type === "district") return a.slug === (b as typeof a).slug;
  if (a.type === "concelho") return a.dico === (b as typeof a).dico;
  return a.id === (b as Extract<Selection, { type: "event" }>).id;
}
