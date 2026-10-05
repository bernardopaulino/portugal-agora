import type { Region } from "@/data/districts";

/** O que está selecionado (na lista ou no mapa). */
export type Selection =
  | { type: "district"; slug: string }
  | { type: "event"; id: string; coordinates: [number, number]; region: Region };

export type OnSelect = (selection: Selection) => void;

/** É o mesmo distrito ou o mesmo evento? (Um segundo toque tira a seleção.) */
export function isSameSelection(a: Selection | null, b: Selection): boolean {
  if (!a || a.type !== b.type) return false;
  return a.type === "district"
    ? a.slug === (b as typeof a).slug
    : a.id === (b as Extract<Selection, { type: "event" }>).id;
}
