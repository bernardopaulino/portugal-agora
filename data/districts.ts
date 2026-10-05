/**
 * Distritos do continente e regiões autónomas, com os identificadores
 * de que as fontes precisam. Coordenadas e globalIdLocal das capitais
 * vêm de https://api.ipma.pt/open-data/distrits-islands.json.
 */
export type Region = "continente" | "acores" | "madeira";

export interface District {
  slug: string;
  name: string;
  /** Preposição correta em português: "em Lisboa", "no Porto", "nos Açores". */
  inName: string;
  /**
   * Formas em inglês, só onde há um nome inglês estabelecido (exónimo):
   * Lisbon, the Azores. Os outros nomes ficam em português, com acentos.
   */
  en?: { name: string; inName?: string; capital?: string };
  region: Region;
  /** Códigos de área dos avisos IPMA (idAreaAviso). */
  ipmaAreas: string[];
  /** Local de previsão/UV da capital (globalIdLocal IPMA). */
  globalIdLocal: number;
  capital: string;
  lat: number;
  lon: number;
}

export const districts: District[] = [
  {
    slug: "aveiro",
    name: "Aveiro",
    inName: "em Aveiro",
    region: "continente",
    ipmaAreas: ["AVR"],
    globalIdLocal: 1010500,
    capital: "Aveiro",
    lat: 40.6413,
    lon: -8.6535,
  },
  {
    slug: "beja",
    name: "Beja",
    inName: "em Beja",
    region: "continente",
    ipmaAreas: ["BJA"],
    globalIdLocal: 1020500,
    capital: "Beja",
    lat: 38.02,
    lon: -7.87,
  },
  {
    slug: "braga",
    name: "Braga",
    inName: "em Braga",
    region: "continente",
    ipmaAreas: ["BRG"],
    globalIdLocal: 1030300,
    capital: "Braga",
    lat: 41.5475,
    lon: -8.4227,
  },
  {
    slug: "braganca",
    name: "Bragança",
    inName: "em Bragança",
    region: "continente",
    ipmaAreas: ["BGC"],
    globalIdLocal: 1040200,
    capital: "Bragança",
    lat: 41.8076,
    lon: -6.7606,
  },
  {
    slug: "castelo-branco",
    name: "Castelo Branco",
    inName: "em Castelo Branco",
    region: "continente",
    ipmaAreas: ["CBO"],
    globalIdLocal: 1050200,
    capital: "Castelo Branco",
    lat: 39.8217,
    lon: -7.4957,
  },
  {
    slug: "coimbra",
    name: "Coimbra",
    inName: "em Coimbra",
    region: "continente",
    ipmaAreas: ["CBR"],
    globalIdLocal: 1060300,
    capital: "Coimbra",
    lat: 40.2081,
    lon: -8.4194,
  },
  {
    slug: "evora",
    name: "Évora",
    inName: "em Évora",
    region: "continente",
    ipmaAreas: ["EVR"],
    globalIdLocal: 1070500,
    capital: "Évora",
    lat: 38.5701,
    lon: -7.9104,
  },
  {
    slug: "faro",
    name: "Faro",
    inName: "em Faro",
    region: "continente",
    ipmaAreas: ["FAR"],
    globalIdLocal: 1080500,
    capital: "Faro",
    lat: 37.0146,
    lon: -7.9331,
  },
  {
    slug: "guarda",
    name: "Guarda",
    inName: "na Guarda",
    region: "continente",
    ipmaAreas: ["GDA"],
    globalIdLocal: 1090700,
    capital: "Guarda",
    lat: 40.5379,
    lon: -7.2647,
  },
  {
    slug: "leiria",
    name: "Leiria",
    inName: "em Leiria",
    region: "continente",
    ipmaAreas: ["LRA"],
    globalIdLocal: 1100900,
    capital: "Leiria",
    lat: 39.7473,
    lon: -8.8069,
  },
  {
    slug: "lisboa",
    name: "Lisboa",
    en: { name: "Lisbon", capital: "Lisbon" },
    inName: "em Lisboa",
    region: "continente",
    ipmaAreas: ["LSB"],
    globalIdLocal: 1110600,
    capital: "Lisboa",
    lat: 38.766,
    lon: -9.1286,
  },
  {
    slug: "portalegre",
    name: "Portalegre",
    inName: "em Portalegre",
    region: "continente",
    ipmaAreas: ["PTG"],
    globalIdLocal: 1121400,
    capital: "Portalegre",
    lat: 39.29,
    lon: -7.42,
  },
  {
    slug: "porto",
    name: "Porto",
    inName: "no Porto",
    region: "continente",
    ipmaAreas: ["PTO"],
    globalIdLocal: 1131200,
    capital: "Porto",
    lat: 41.158,
    lon: -8.6294,
  },
  {
    slug: "santarem",
    name: "Santarém",
    inName: "em Santarém",
    region: "continente",
    ipmaAreas: ["STM"],
    globalIdLocal: 1141600,
    capital: "Santarém",
    lat: 39.2,
    lon: -8.74,
  },
  {
    slug: "setubal",
    name: "Setúbal",
    inName: "em Setúbal",
    region: "continente",
    ipmaAreas: ["STB"],
    globalIdLocal: 1151200,
    capital: "Setúbal",
    lat: 38.5246,
    lon: -8.8856,
  },
  {
    slug: "viana-do-castelo",
    name: "Viana do Castelo",
    inName: "em Viana do Castelo",
    region: "continente",
    ipmaAreas: ["VCT"],
    globalIdLocal: 1160900,
    capital: "Viana do Castelo",
    lat: 41.6952,
    lon: -8.8365,
  },
  {
    slug: "vila-real",
    name: "Vila Real",
    inName: "em Vila Real",
    region: "continente",
    ipmaAreas: ["VRL"],
    globalIdLocal: 1171400,
    capital: "Vila Real",
    lat: 41.3053,
    lon: -7.744,
  },
  {
    slug: "viseu",
    name: "Viseu",
    inName: "em Viseu",
    region: "continente",
    ipmaAreas: ["VIS"],
    globalIdLocal: 1182300,
    capital: "Viseu",
    lat: 40.6585,
    lon: -7.912,
  },
  {
    slug: "acores",
    name: "Açores",
    inName: "nos Açores",
    en: { name: "Azores", inName: "in the Azores" },
    region: "acores",
    ipmaAreas: ["AOC", "ACE", "AOR"],
    globalIdLocal: 3420300,
    capital: "Ponta Delgada",
    lat: 37.7415,
    lon: -25.6677,
  },
  {
    slug: "madeira",
    name: "Madeira",
    inName: "na Madeira",
    region: "madeira",
    ipmaAreas: ["MCN", "MCS", "MRM", "MPS"],
    globalIdLocal: 2310300,
    capital: "Funchal",
    lat: 32.6485,
    lon: -16.9084,
  },
];

/** Nomes legíveis das áreas de aviso das ilhas (no continente, a área é o distrito). */
export const ipmaAreaNames: Record<string, string> = {
  AOC: "Açores, Grupo Ocidental",
  ACE: "Açores, Grupo Central",
  AOR: "Açores, Grupo Oriental",
  MCN: "Madeira, costa norte",
  MCS: "Madeira, costa sul",
  MRM: "Madeira, regiões montanhosas",
  MPS: "Porto Santo",
};

/** As mesmas áreas em inglês (o resto dos avisos usa o nome do distrito). */
export const ipmaAreaNamesEn: Record<string, string> = {
  AOC: "Azores, Western Group",
  ACE: "Azores, Central Group",
  AOR: "Azores, Eastern Group",
  MCN: "Madeira, north coast",
  MCS: "Madeira, south coast",
  MRM: "Madeira, mountain areas",
  MPS: "Porto Santo",
};

const bySlug = new Map(districts.map((d) => [d.slug, d]));
const byArea = new Map(districts.flatMap((d) => d.ipmaAreas.map((a) => [a, d] as const)));

export function getDistrict(slug: string): District | undefined {
  return bySlug.get(slug);
}

export function districtForIpmaArea(area: string): District | undefined {
  return byArea.get(area);
}

export function ipmaAreaLabel(area: string): string {
  return ipmaAreaNames[area] ?? districtForIpmaArea(area)?.name ?? area;
}

/** Enquadramentos do mapa por região: [[oeste, sul], [este, norte]]. */
export const regionBounds: Record<Region, [[number, number], [number, number]]> = {
  continente: [
    [-9.7, 36.85],
    [-6.1, 42.2],
  ],
  acores: [
    [-31.4, 36.8],
    [-24.9, 39.8],
  ],
  madeira: [
    [-17.35, 32.35],
    [-16.2, 33.15],
  ],
};
