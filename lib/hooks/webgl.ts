"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/**
 * O browser consegue desenhar WebGL2? (As vistas 3D precisam: o three
 * só usa WebGL2.) Testa-se uma vez, num canvas que se liberta logo.
 * No servidor e durante a hidratação, assume-se que sim, para o chip 3D
 * não piscar; o cliente corrige se não houver.
 */
let supported: boolean | undefined;

function detect(): boolean {
  if (supported !== undefined) return supported;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    supported = Boolean(gl);
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    supported = false;
  }
  return supported;
}

const subscribe = () => () => {};

export function useWebGL(): boolean {
  return useSyncExternalStore(subscribe, detect, () => true);
}

/** O visitante pediu menos movimento? (Lido no momento, para as câmaras.) */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Duração das viagens da câmara nas vistas 3D (0 com "reduzir movimento"). */
export function cameraDuration(): number {
  return prefersReducedMotion() ? 0 : 600;
}

/**
 * Vale a pena carregar uma cena 3D? Só com WebGL2 e sem "poupar dados", e
 * só quando o browser está livre (o que vem do servidor aparece primeiro).
 */
export function useWebGLEnhancement(): boolean {
  const webgl = useWebGL();
  const [on, setOn] = useState(false);
  useEffect(() => {
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
      ?.saveData;
    if (!webgl || saveData) return;
    if ("requestIdleCallback" in window) {
      const id = requestIdleCallback(() => setOn(true), { timeout: 1200 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(() => setOn(true), 200);
    return () => clearTimeout(id);
  }, [webgl]);
  return on;
}
