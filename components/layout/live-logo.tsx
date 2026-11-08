"use client";

import { useLiveStateOnly } from "@/lib/hooks/live-state";

import { LogoMark } from "./logo";

/**
 * O logótipo do cabeçalho, na cor do nível do país. O nível vem do
 * /api/state no browser (cinzento até chegar), e não do servidor: assim o
 * cabeçalho, que está em todas as páginas, não as obriga a renovar-se de
 * 15 em 15 min. As páginas sem dados (fontes, sobre, concelhos) ficam
 * estáticas e não contam para o limite de "ISR writes" da Vercel.
 */
export function LiveLogoMark({ className }: { className?: string }) {
  const state = useLiveStateOnly();
  const level = !state ? "unknown" : state.levelKnown ? state.level : "unknown";
  return <LogoMark level={level} className={className} />;
}
