import type { Metadata } from "next";

import { site } from "@/lib/config/site";

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

interface PageMetaInput {
  locale: Locale;
  /** Caminho sem idioma ("/lisboa/incendios"). */
  path: string;
  /** Título da página; o layout acrescenta " | Portugal Agora" no <title>. */
  title: string;
  description: string;
  /** Título completo, sem o sufixo do layout (só a página inicial). */
  absoluteTitle?: boolean;
  /** Título para a partilha, quando deve ser diferente do <title> (ex.: o slogan na página inicial). */
  shareTitle?: string;
  /**
   * Imagem de partilha herdada de um segmento acima (ver `inheritedOgImage`). As páginas
   * com o seu próprio opengraph-image.tsx (inicial e distrito) não a passam.
   */
  image?: { url: string; alt: string };
}

/**
 * A imagem de partilha do país (/[lang]/opengraph-image) ou de um distrito
 * (/[lang]/[distrito]/opengraph-image). Quando uma página define o seu `openGraph`,
 * o Next deixa de herdar a imagem do segmento acima, por isso as páginas de tema
 * indicam-na aqui. O endereço tem sempre o prefixo do idioma (/pt/...): o proxy
 * deixa-o passar sem redirecionar, para o WhatsApp e o Facebook a mostrarem.
 */
export function inheritedOgImage(locale: Locale, alt: string, district?: string) {
  return { url: `/${locale}${district ? `/${district}` : ""}/opengraph-image`, alt };
}

/**
 * Metadados completos de uma página: <title>, descrição, canonical/hreflang e a
 * partilha (Open Graph e X). O Next substitui o `openGraph` do layout inteiro quando
 * uma página define o seu, por isso a partilha leva sempre todos os campos aqui.
 * A imagem vem do opengraph-image.tsx do segmento ou, nas páginas de tema, de `image`.
 */
export function pageMetadata({
  locale,
  path,
  title,
  description,
  absoluteTitle = false,
  shareTitle,
  image,
}: PageMetaInput): Metadata {
  const fullTitle = absoluteTitle ? title : `${title} | ${site.name}`;
  const social = shareTitle ?? fullTitle;
  const images = image
    ? [{ url: image.url, alt: image.alt, width: 1200, height: 630, type: "image/png" }]
    : undefined;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: alternates(locale, path),
    openGraph: {
      type: "website",
      locale: locale === "pt" ? "pt_PT" : "en_GB",
      alternateLocale: locale === "pt" ? ["en_GB"] : ["pt_PT"],
      siteName: site.name,
      url: localePath(locale, path),
      title: social,
      description,
      ...(images && { images }),
    },
    twitter: {
      card: "summary_large_image",
      title: social,
      description,
      ...(images && { images }),
    },
  };
}
