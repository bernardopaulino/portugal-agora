import { site } from "@/lib/config/site";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { intlLocale, localePath, type Locale } from "@/lib/i18n/locales";

/**
 * Dados estruturados (schema.org) para o Google. Um <script> de dados não é
 * executado, por isso pode ser desenhado pelo React sem problema (e não precisa
 * de 'unsafe-inline' na CSP). O "<" é escapado para o texto nunca fechar o script.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

/** O autor do site, com os perfis públicos (o Google liga-os ao nome). */
export function author() {
  return {
    "@type": "Person",
    name: site.author,
    url: site.authorUrl,
    sameAs: [site.authorUrl, site.authorGithub],
  };
}

/** O site, com o idioma da página (só na página inicial). */
export function websiteJsonLd(locale: Locale, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: `${site.url}${localePath(locale, "/")}`,
    description,
    inLanguage: intlLocale[locale],
    author: author(),
  };
}

/**
 * Migalhas (Portugal › Lisboa › Incêndios). `trail` são os níveis depois do
 * primeiro, cada um com o nome e o caminho sem idioma.
 */
export function breadcrumbJsonLd(
  locale: Locale,
  t: Dictionary,
  trail: { name: string; path: string }[],
) {
  const items = [{ name: t.meta.breadcrumbHome, path: "/" }, ...trail];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${site.url}${localePath(locale, item.path)}`,
    })),
  };
}
