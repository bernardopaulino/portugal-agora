import type { Metadata } from "next";

import { intlLocale, localePath, locales, type Locale } from "./locales";

/** Endereço canónico da página e a mesma página nos outros idiomas (hreflang). */
export function alternates(locale: Locale, path: string): Metadata["alternates"] {
  return {
    canonical: localePath(locale, path),
    languages: {
      ...Object.fromEntries(locales.map((l) => [intlLocale[l], localePath(l, path)])),
      "x-default": localePath("pt", path),
    },
  };
}
