"use client";

import { useEffect, useLayoutEffect } from "react";

import { useCurrentPath } from "@/lib/i18n/client";

/*
 * Sinal de que a página está a mudar: um traço no topo do ecrã, desde o
 * clique até a nova página aparecer. Sem ele, quando a página nova demorava
 * (telemóvel lento, ligação fraca, página ainda não pedida de antemão),
 * nada no ecrã respondia ao clique.
 *
 * Liga-se fora do React (um atributo no <html>), no próprio clique: assim
 * aparece no frame seguinte, antes de o React começar a desenhar a página
 * nova. O CSS (.nav-progress em globals.css) só o mostra passados 100 ms,
 * para as mudanças rápidas não piscarem.
 */

const ATTR = "data-navigating";
/** Se a página nunca mudar (navegação cancelada, erro), o traço não fica para sempre. */
const GIVE_UP_MS = 15_000;
let timer: ReturnType<typeof setTimeout> | undefined;

function stop() {
  clearTimeout(timer);
  document.documentElement.removeAttribute(ATTR);
}

/**
 * Para as mudanças de página feitas por código (router.push: seletor de
 * distrito, "Perto de mim", mapas). Os cliques em ligações já são apanhados.
 */
export function startNavigationFeedback(href: string) {
  const url = new URL(href, location.href);
  if (url.origin !== location.origin) return;
  if (url.pathname === location.pathname && url.search === location.search) return;
  clearTimeout(timer);
  document.documentElement.setAttribute(ATTR, "");
  timer = setTimeout(stop, GIVE_UP_MS);
}

function onClick(event: MouseEvent) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    return;
  // Também as ligações dentro de SVG (mapa dos concelhos), por isso getAttribute e não .href.
  const link = (event.target as Element | null)?.closest?.("a[href]");
  const href = link?.getAttribute("href");
  if (!link || !href) return;
  const target = link.getAttribute("target");
  if ((target && target !== "_self") || link.hasAttribute("download")) return;
  // Os feeds RSS abrem um ficheiro XML (ou são descarregados): não há página nova.
  if (link.hasAttribute("type") || /\/rss$/.test(new URL(href, location.href).pathname)) return;
  startNavigationFeedback(href);
}

export function NavigationProgress() {
  const path = useCurrentPath();

  // No commit da página nova (dentro da view transition): a página que entra já não leva o traço.
  useLayoutEffect(() => stop(), [path]);

  useEffect(() => {
    // Fase de captura: o <Link> do Next cancela o clique (preventDefault) antes de chegar cá abaixo.
    document.addEventListener("click", onClick, true);
    // Voltar à página pela cache do browser (bfcache) não pode trazer o traço ligado.
    window.addEventListener("pageshow", stop);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("pageshow", stop);
    };
  }, []);

  return <div aria-hidden className="nav-progress" />;
}
