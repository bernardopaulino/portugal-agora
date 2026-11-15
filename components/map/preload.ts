"use client";

import { useEffect } from "react";

import { supportsWebGL2 } from "@/lib/hooks/webgl";
import { stripLocale } from "@/lib/i18n/locales";
import { splitDistrictPath } from "@/lib/routes";

/*
 * Pedir de antemão o código do mapa de uma página de tema (MapLibre, ~300 KB
 * comprimido; nos sismos, a vista 3D com o three). Se ainda não chegou quando
 * a página nova aparece, o mapa só se mostra depois de a animação da mudança
 * de página acabar (o React não troca o "A carregar o mapa…" a meio dela):
 * cerca de 1 s depois do clique, mesmo com boa ligação. Começa ao apontar,
 * focar ou tocar numa ligação para essa página. Nada com a poupança de dados.
 */

const loaders = {
  map: () => import("./live-map"),
  depth: () => import("./quake-depth"),
};
type Kind = keyof typeof loaders;
type Loaded = { [K in Kind]?: Awaited<ReturnType<(typeof loaders)[K]>>["default"] };
const started = new Set<Kind>();
const loaded: Loaded = {};

function preload(kind: Kind) {
  if (started.has(kind)) return;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return;
  started.add(kind);
  loaders[kind]()
    .then((mod) => Object.assign(loaded, { [kind]: mod.default }))
    .catch(() => started.delete(kind));
}

/**
 * O componente já pedido de antemão, se chegou. O MapPanel usa-o em vez do
 * next/dynamic: um React.lazy suspende sempre no primeiro desenho, mesmo com
 * o código já carregado, e o mapa ficava à espera do fim da animação.
 */
export function preloaded<K extends Kind>(kind: K): Loaded[K] {
  return loaded[kind];
}

/** O que a página abre: os sismos abrem na vista 3D (com WebGL2), os outros temas no mapa. */
function kindFor(topic: string): Kind | null {
  if (topic === "/sismos") return supportsWebGL2() ? "depth" : "map";
  if (topic === "/avisos" || topic === "/incendios" || topic === "/risco") return "map";
  return null;
}

function onIntent(event: Event) {
  if (started.size === Object.keys(loaders).length) return;
  const href = (event.target as Element | null)?.closest?.("a[href]")?.getAttribute("href");
  if (!href) return;
  const url = new URL(href, location.href);
  if (url.origin !== location.origin) return;
  const kind = kindFor(splitDistrictPath(stripLocale(url.pathname)).topic);
  if (kind) preload(kind);
}

const INTENT = ["pointerover", "focusin", "touchstart"] as const;

/** Liga o pedido antecipado a todas as ligações do site (menu, painéis, "Ver no mapa"…). */
export function PreloadMapOnIntent() {
  useEffect(() => {
    for (const type of INTENT)
      document.addEventListener(type, onIntent, { capture: true, passive: true });
    return () => {
      for (const type of INTENT) document.removeEventListener(type, onIntent, { capture: true });
    };
  }, []);
  return null;
}
