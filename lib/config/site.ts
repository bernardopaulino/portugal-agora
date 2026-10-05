export const site = {
  name: "Portugal Agora",
  tagline: "O estado do país, agora.",
  description:
    "Avisos meteorológicos, sismos, incêndios e qualidade do ar em Portugal, num só sítio, a partir de fontes oficiais.",
  locale: "pt_PT",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://portugalagora.pt",
  repo: "https://github.com/bernardopaulino/portugal-agora",
  /** Autor do site: vai para <meta name="author"> (o LinkedIn mostra-o) e para o JSON-LD. */
  author: "Bernardo Paulino",
} as const;

/**
 * Fontes de dados e respetiva atribuição.
 * Os termos de uso do IPMA e do Fogos.pt exigem que a fonte seja
 * visível junto aos dados — estes objetos são a única fonte de verdade
 * para esses textos e links.
 */
export const attributions = {
  ipma: { label: "IPMA", url: "https://www.ipma.pt" },
  fogos: { label: "Fonte: Fogos.pt", url: "https://fogos.pt" },
  openMeteo: { label: "Open-Meteo / Copernicus CAMS", url: "https://open-meteo.com" },
  openFreeMap: {
    label: "© OpenFreeMap © OpenMapTiles © OpenStreetMap",
    url: "https://openfreemap.org",
  },
  dgt: { label: "DGT — CAOP 2025", url: "https://www.dgterritorio.gov.pt" },
} as const;
