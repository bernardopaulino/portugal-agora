/**
 * Idiomas do site. O português é servido na raiz (/, /lisboa…) e o
 * inglês com o prefixo /en (/en, /en/lisboa…). O proxy reescreve os
 * endereços sem prefixo para /pt internamente.
 */
export const locales = ["pt", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "pt";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Etiqueta BCP 47 para Intl e para <html lang>. */
export const intlLocale: Record<Locale, string> = { pt: "pt-PT", en: "en-GB" };

/** Caminho público de uma página no idioma: ("en", "/lisboa") → "/en/lisboa". */
export function localePath(locale: Locale, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === defaultLocale) return clean;
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
}

/** Remove o prefixo de idioma de um caminho público: "/en/lisboa" → "/lisboa". */
export function stripLocale(pathname: string): string {
  for (const locale of locales) {
    if (locale === defaultLocale) continue;
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1);
  }
  return pathname;
}
