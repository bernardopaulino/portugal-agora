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
      className="flex h-12 min-w-12 shrink-0 items-center justify-center rounded-sm border border-line px-2 font-display text-lg font-semibold text-ink no-underline hover:border-ink"
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
    <nav
      aria-label={district ? t.districtPages.menu(t.districtName(district)) : t.nav.label}
      className="border-b border-line bg-surface"
    >
      <ul
        ref={listRef}
        className="mx-auto flex max-w-7xl [scrollbar-width:none] overflow-x-auto px-2 max-sm:justify-between sm:gap-1 sm:px-4"
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
                  "inline-flex h-12 min-w-11 items-center justify-center border-b-[3px] px-1.5 font-display text-[0.945rem] font-semibold no-underline sm:px-3 sm:text-lg",
                  active
                    ? "border-accent text-ink"
                    : "border-transparent text-ink-2 hover:border-line hover:text-ink",
                )}
              >
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
