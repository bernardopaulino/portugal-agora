"use client";

import { useSyncExternalStore } from "react";

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
