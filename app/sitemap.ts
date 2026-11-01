import type { MetadataRoute } from "next";

import { districts } from "@/data/districts";
import { site } from "@/lib/config/site";
import { intlLocale, localePath, locales } from "@/lib/i18n/locales";

type Entry = MetadataRoute.Sitemap[number];

/**
 * O sitemap é gerado no build: a data é a do último deploy, que é quando o texto e
 * a estrutura das páginas mudam (os dados ao minuto chegam pelo /api/state).
 */
const lastModified = new Date();

/**
 * Cada página nos dois idiomas, com as versões alternativas (hreflang) e o
 * x-default em português. O Google ignora changefreq e priority; ficam para
 * os outros motores, sem "always" (que só convida os bots a voltar sem razão).
 */
function page(path: string, changeFrequency: Entry["changeFrequency"], priority: number): Entry[] {
  const languages = {
    ...Object.fromEntries(locales.map((l) => [intlLocale[l], `${site.url}${localePath(l, path)}`])),
    "x-default": `${site.url}${localePath("pt", path)}`,
  };
  return locales.map((l) => ({
    url: `${site.url}${localePath(l, path)}`,
    lastModified,
    changeFrequency,
    priority: l === "pt" ? priority : Math.round(priority * 80) / 100,
    alternates: { languages },
  }));
}

const topics = ["/avisos", "/incendios", "/sismos", "/risco"];

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...page("/", "hourly", 1),
    ...topics.flatMap((p) => page(p, "hourly", 0.9)),
    ...districts.flatMap((d) => page(`/${d.slug}`, "hourly", 0.8)),
    ...districts.flatMap((d) => topics.flatMap((p) => page(`/${d.slug}${p}`, "hourly", 0.7))),
    ...page("/fontes", "monthly", 0.4),
    ...page("/privacidade", "yearly", 0.2),
    ...page("/sobre", "yearly", 0.3),
  ];
}
