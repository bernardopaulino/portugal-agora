"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";

import { getDistrict } from "@/data/districts";
import { useCurrentPath, useI18n } from "@/lib/i18n/client";
import { localePath, type Locale } from "@/lib/i18n/locales";
import { splitDistrictPath } from "@/lib/routes";
import { cn } from "@/lib/utils";

/** Ligação para a página inicial no idioma atual (logótipo + nome). */
export function HomeLink({ children }: { children: ReactNode }) {
  const { t, path } = useI18n();
  return (
    <Link
      href={path("/")}
      aria-label={t.nav.home}
      className="flex min-h-11 min-w-11 items-center gap-2 text-ink no-underline sm:gap-2.5"
    >
      {children}
    </Link>
  );
}

/**
 * PT | EN: leva à mesma página no outro idioma. É um <a> e não um <Link>:
 * cada idioma tem o seu layout raiz (app/[lang]), e mudar de layout raiz
 * exige carregar a página de novo. Com o proxy a esconder o /pt, o router
 * do Next não dá por isso e tentaria trocar o layout raiz no browser.
 */
export function LanguageSwitch() {
  const { locale, t } = useI18n();
  const current = useCurrentPath();
  const other: Locale = locale === "pt" ? "en" : "pt";
  return (
    <a
      href={localePath(other, current)}
      hrefLang={other === "pt" ? "pt-PT" : "en"}
      lang={other === "pt" ? "pt-PT" : "en"}
      aria-label={t.header.otherLanguage}
      title={t.header.otherLanguage}
      className="flex h-11 min-w-11 shrink-0 items-center justify-center rounded-full glass-button px-2 font-mono text-sm font-medium tracking-[0.08em] no-underline"
    >
      {t.header.otherLanguageShort}
    </a>
  );
}

const tabs = [
  { path: "", key: "overview" },
  { path: "/avisos", key: "warnings" },
  { path: "/incendios", key: "fires" },
  { path: "/sismos", key: "quakes" },
  { path: "/risco", key: "riskAir" },
] as const;

/**
 * As páginas do site: resumo e um separador por tema. Dentro de um
 * distrito, os mesmos separadores levam às páginas desse distrito
 * (/lisboa, /lisboa/avisos…); o seletor no cabeçalho mostra qual é.
 * Em telemóveis os nomes são curtos ("Risco") para os cinco caberem a
 * 360 px; o nome completo fica como nome acessível. Abaixo disso a barra
 * desliza, e o separador ativo é trazido para a vista.
 */
export function MainNav() {
  const { t, path } = useI18n();
  const current = useCurrentPath();
  const district = getDistrict(splitDistrictPath(current).district ?? "");
  const base = district ? `/${district.slug}` : "";
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const active = list?.querySelector<HTMLElement>("[aria-current=page]");
    if (!list || !active || list.scrollWidth <= list.clientWidth) return;
    // scrollLeft e não scrollIntoView, que também deslocaria a página.
    list.scrollLeft = active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2;
  }, [current]);

  return (
    <nav aria-label={district ? t.districtPages.menu(t.districtName(district)) : t.nav.label}>
      <ul
        ref={listRef}
        className="flex [scrollbar-width:none] overflow-x-auto rounded-full border border-glass-line bg-[var(--stage-2)] p-0.5 max-lg:justify-between sm:p-1 lg:inline-flex lg:gap-0.5"
      >
        {tabs.map((tab) => {
          const href = base + tab.path || "/";
          const active = current === href;
          const full = t.nav[tab.key];
          const short = t.nav.short[tab.key];
          return (
            <li key={tab.key} className="shrink-0">
              <Link
                href={path(href)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative isolate inline-flex h-11 min-w-11 items-center justify-center rounded-full px-1 font-display text-[0.84rem] font-medium tracking-[-0.015em] no-underline min-[400px]:px-1.5 min-[400px]:text-[0.9rem] sm:px-3.5 sm:text-base",
                  active ? "text-ink" : "text-ink-2 hover:text-ink",
                )}
              >
                {/* A pílula do separador ativo tem nome de view transition: ao mudar de página desliza para o novo separador. */}
                {active ? (
                  <span
                    aria-hidden
                    className="absolute inset-0 -z-10 rounded-full border border-[color-mix(in_srgb,var(--accent)_45%,transparent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] shadow-[0_0_24px_-6px_var(--glow)] [view-transition-name:nav-indicator] forced-colors:border-[CanvasText]"
                  />
                ) : null}
                {short === full ? (
                  full
                ) : (
                  <>
                    <span aria-hidden className="sm:hidden">
                      {short}
                    </span>
                    <span className="max-sm:sr-only">{full}</span>
                  </>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
