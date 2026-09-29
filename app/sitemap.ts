import type { MetadataRoute } from "next";

import { districts } from "@/data/districts";
import { site } from "@/lib/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url;
  return [
    { url: base, changeFrequency: "always", priority: 1 },
    ...districts.map((d) => ({
      url: `${base}/${d.slug}`,
      changeFrequency: "always" as const,
      priority: 0.8,
    })),
    { url: `${base}/fontes`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/privacidade`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/sobre`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
