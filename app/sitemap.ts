import type { MetadataRoute } from "next";

import { districts } from "@/data/districts";
import { site } from "@/lib/config/site";
import { intlLocale, localePath, locales } from "@/lib/i18n/locales";

type Entry = MetadataRoute.Sitemap[number];

/** Cada página em português, com a versão inglesa indicada em alternates. */
function page(path: string, changeFrequency: Entry["changeFrequency"], priority: number): Entry[] {
  const languages = Object.fromEntries(
    locales.map((l) => [intlLocale[l], `${site.url}${localePath(l, path)}`]),
  );
  return locales.map((l) => ({
    url: `${site.url}${localePath(l, path)}`,
    changeFrequency,
    priority: l === "pt" ? priority : priority * 0.8,
    alternates: { languages },
  }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...page("/", "always", 1),
    ...["/avisos", "/incendios", "/sismos", "/risco"].flatMap((p) => page(p, "always", 0.9)),
    ...districts.flatMap((d) => page(`/${d.slug}`, "always", 0.8)),
    ...districts.flatMap((d) =>
      ["/avisos", "/incendios", "/sismos", "/risco"].flatMap((p) =>
        page(`/${d.slug}${p}`, "always", 0.7),
      ),
    ),
    ...page("/fontes", "monthly", 0.4),
    ...page("/privacidade", "yearly", 0.2),
    ...page("/sobre", "yearly", 0.3),
  ];
}
