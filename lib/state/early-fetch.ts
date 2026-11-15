/*
 * O estado do país pedido logo no <head>, em paralelo com o JavaScript, em vez
 * de só quando a página fica pronta (o useLiveState). O primeiro pedido do SWR
 * usa esta resposta; os seguintes (de minuto a minuto) vão à rede como sempre.
 * Um <link rel="preload"> fazia o mesmo, mas o Chrome pedia o /api/state duas
 * vezes (o fetch do SWR não reaproveitava a resposta, que não fica em cache).
 */

const KEY = "__paState";

/** Script em linha do <head> (layout de app/[lang]). */
export const earlyStateScript = `window.${KEY}=fetch("/api/state")`;

/** A resposta pedida pelo <head>, uma só vez; depois, undefined. */
export function takeEarlyState(): Promise<Response> | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as Window & { [KEY]?: Promise<Response> };
  const early = w[KEY];
  w[KEY] = undefined;
  return early;
}
