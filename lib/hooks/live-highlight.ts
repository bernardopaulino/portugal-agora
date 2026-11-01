"use client";

import { useEffect, useRef, type RefObject } from "react";

import { refreshCount } from "./live-state";

const CLASS = "live-new";

/**
 * Assinala uma vez, com um fundo que se desvanece, o que apareceu numa
 * lista desde a última atualização (um incêndio novo, um aviso que subiu
 * de nível). Cada item marca-se com data-live-key={chave}.
 *
 * A primeira resposta depois de a lista aparecer só põe em dia o HTML da
 * página (que pode ter até ~15 min): o que traz não é novidade para quem
 * está a ler, por isso não se assinala.
 * Mexe-se nas classes diretamente (num efeito) para não voltar a renderizar.
 */
export function useHighlightNew(keys: readonly string[], container: RefObject<HTMLElement | null>) {
  const seen = useRef<Set<string> | null>(null);
  const since = useRef(0);

  useEffect(() => {
    if (!seen.current) {
      seen.current = new Set(keys);
      since.current = refreshCount();
      return;
    }
    const fresh = keys.filter((k) => !seen.current!.has(k));
    if (fresh.length === 0) return;
    for (const k of fresh) seen.current.add(k);
    if (refreshCount() <= since.current + 1) return;

    const root = container.current;
    if (!root) return;
    for (const key of fresh) {
      const el = root.querySelector<HTMLElement>(`[data-live-key="${CSS.escape(key)}"]`);
      if (!el) continue; // escondido (ex.: atrás do botão "mostrar todos")
      el.classList.add(CLASS);
      const done = (event: AnimationEvent) => {
        if (event.target !== el) return;
        el.classList.remove(CLASS);
        el.removeEventListener("animationend", done);
      };
      el.addEventListener("animationend", done);
    }
  }, [keys, container]);
}
