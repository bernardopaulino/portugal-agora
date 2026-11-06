"use client";

import type { CountryState } from "@/lib/state/aggregate";

import { ImmersiveHome } from "./home/immersive-home";

/**
 * A página inicial: o país em 3D e o boletim por cima; ao descer, um
 * painel por tema e, no fim, todos os distritos. O detalhe de cada tema
 * tem a sua página, a que se chega pelos painéis ou pelo menu.
 */
export function Dashboard({ initial }: { initial: CountryState }) {
  return <ImmersiveHome initial={initial} />;
}
