import type { Region } from "@/data/districts";

/** O que está selecionado (na lista ou no mapa). */
export type Selection =
  | { type: "district"; slug: string }
  | { type: "event"; id: string; coordinates: [number, number]; region: Region };

export type OnSelect = (selection: Selection) => void;
