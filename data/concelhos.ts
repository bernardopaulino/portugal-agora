import { concelhoPoints } from "./concelhos-geo";
import table from "./dico.json";

/*
 * Os 308 concelhos (CAOP 2025): código DICO, nome, distrito, slug do endereço
 * (/lisboa/sintra) e um ponto central para as distâncias (sismos perto,
 * estação mais próxima). Os pontos vêm de scripts/build-concelhos.mjs.
 */

export interface Concelho {
  dico: string;
  name: string;
  district: string;
  slug: string;
  /** [lon, lat] */
  point: [number, number];
}

const points = new Map(concelhoPoints.map(([dico, slug, lon, lat]) => [dico, { slug, lon, lat }]));

export const concelhos: Concelho[] = (table as [string, string, string][]).map(
  ([dico, name, district]) => {
    const p = points.get(dico)!;
    return { dico, name, district, slug: p.slug, point: [p.lon, p.lat] };
  },
);

const byDico = new Map(concelhos.map((c) => [c.dico, c]));
const byPath = new Map(concelhos.map((c) => [`${c.district}/${c.slug}`, c]));

export const getConcelho = (district: string, slug: string) => byPath.get(`${district}/${slug}`);
export const concelhoForDico = (dico: string) => byDico.get(dico);
export const concelhosOf = (district: string) =>
  concelhos
    .filter((c) => c.district === district)
    .sort((a, b) => a.name.localeCompare(b.name, "pt"));
