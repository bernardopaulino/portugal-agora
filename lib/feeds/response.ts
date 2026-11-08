import "server-only";

import type { District } from "@/data/districts";
import type { Locale } from "@/lib/i18n/locales";
import { getState } from "@/lib/state/get-state";

import { buildWarningsFeed } from "./warnings";

/**
 * Os feeds são gerados a pedido (do estado em cache de getState) e ficam
 * 5 min na CDN. Não são ISR: os leitores de RSS consultam a toda a hora e
 * cada renovação ISR conta para o limite mensal da Vercel.
 */
export async function feedResponse(locale: Locale, district?: District): Promise<Response> {
  const xml = buildWarningsFeed({ state: await getState(), locale, district });
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
