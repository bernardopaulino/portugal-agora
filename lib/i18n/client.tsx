"use client";

import { useSelectedLayoutSegments } from "next/navigation";
import { createContext, useContext, type ReactNode } from "react";

import { dictionaries, type Dictionary } from "./dictionaries";
import { defaultLocale, localePath, type Locale } from "./locales";

const LocaleContext = createContext<Locale>(defaultLocale);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

/** Idioma atual, o seu dicionário e uma função para os endereços nesse idioma. */
export function useI18n(): { locale: Locale; t: Dictionary; path: (p: string) => string } {
  const locale = useContext(LocaleContext);
  return { locale, t: dictionaries[locale], path: (p) => localePath(locale, p) };
}

/**
 * Caminho da página atual sem o idioma ("/", "/lisboa", "/avisos").
 * Lê os segmentos da rota em vez do endereço: com a reescrita do proxy,
 * usePathname() daria valores diferentes no servidor e no browser.
 * Só funciona em componentes desenhados pelo layout de app/[lang].
 */
export function useCurrentPath(): string {
  const segments = useSelectedLayoutSegments().filter(
    (s) => !s.startsWith("(") && !s.startsWith("__"),
  );
  return `/${segments.join("/")}`;
}
