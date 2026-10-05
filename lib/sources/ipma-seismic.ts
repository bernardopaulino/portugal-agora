import "server-only";

import { z } from "zod";

import { locateDistrict, regionAt } from "@/lib/geo/locate";
import { formatNumber, ipmaUtc } from "@/lib/time/format";

import type { EarthquakeEvent, Severity } from "./types";

/** Área 7: continente e Madeira; área 3: Açores. */
export const IPMA_SEISMIC_URLS = [
  "https://api.ipma.pt/open-data/observation/seismic/7.json",
  "https://api.ipma.pt/open-data/observation/seismic/3.json",
];

export const ipmaSeismicSchema = z.object({
  data: z.array(
    z.object({
      time: z.string(),
      lat: z.coerce.number(),
      lon: z.coerce.number(),
      depth: z.coerce.number().nullish(),
      magnitud: z.coerce.number(),
      obsRegion: z.string().nullish(),
      sensed: z.boolean().nullish(),
      degree: z.string().nullish(),
    }),
  ),
});

export type IpmaSeismicRaw = z.infer<typeof ipmaSeismicSchema>;

const WINDOW_DAYS = 7;

const directions: Record<string, string> = {
  N: "norte",
  NNE: "nordeste",
  NE: "nordeste",
  ENE: "nordeste",
  E: "leste",
  ESE: "sudeste",
  SE: "sudeste",
  SSE: "sudeste",
  S: "sul",
  SSW: "sudoeste",
  SW: "sudoeste",
  WSW: "sudoeste",
  W: "oeste",
  WNW: "noroeste",
  NW: "noroeste",
  NNW: "noroeste",
};

const countries: Record<string, string> = {
  ESP: "Espanha",
  MARR: "Marrocos",
  MAR: "Marrocos",
  ARG: "Argélia",
  FRA: "França",
};

/**
 * O IPMA descreve o epicentro com abreviaturas ("W Matosinhos",
 * "S Al Hoceima (MARR)"). Convertemos para "a oeste de Matosinhos",
 * "a sul de Al Hoceima (Marrocos)".
 */
export function humanizeRegion(raw: string | null | undefined): string {
  const text = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "localização por confirmar";
  const withCountry = text.replace(/\(([A-Z]{3,4})\)/g, (m, code: string) =>
    countries[code] ? `(${countries[code]})` : m,
  );
  const match = /^([NSEW]{1,3})\s+(.+)$/.exec(withCountry);
  if (match && directions[match[1]!]) return `a ${directions[match[1]!]} de ${match[2]}`;
  return withCountry;
}

/**
 * Classificação nossa (documentada em /fontes), não do IPMA:
 * magnitude ≥ 5,5 vermelho; ≥ 4,5 laranja; ≥ 3,5 ou sentido, amarelo.
 */
export function earthquakeSeverity(magnitude: number, felt: boolean): Severity {
  if (magnitude >= 5.5) return "red";
  if (magnitude >= 4.5) return "orange";
  if (magnitude >= 3.5 || felt) return "yellow";
  return "none";
}

export function normalizeSeismic(raws: IpmaSeismicRaw[], now: Date): EarthquakeEvent[] {
  const since = now.getTime() - WINDOW_DAYS * 86_400_000;
  const seen = new Set<string>();
  const events: EarthquakeEvent[] = [];

  for (const raw of raws) {
    for (const s of raw.data) {
      // O IPMA usa -99 quando ainda não há magnitude calculada.
      if (!Number.isFinite(s.magnitud) || s.magnitud < 0) continue;
      const occurredAt = ipmaUtc(s.time);
      if (new Date(occurredAt).getTime() < since) continue;

      const id = `sismo-${occurredAt}-${s.lat}-${s.lon}`;
      if (seen.has(id)) continue;
      seen.add(id);

      const point: [number, number] = [s.lon, s.lat];
      const felt = s.sensed === true;
      events.push({
        kind: "earthquake",
        id,
        severity: earthquakeSeverity(s.magnitud, felt),
        title: `Sismo de magnitude ${formatNumber(s.magnitud)}`,
        magnitude: s.magnitud,
        depthKm: s.depth ?? 0,
        felt,
        intensity: s.degree ?? undefined,
        occurredAt,
        coordinates: point,
        place: {
          district: locateDistrict(point),
          region: regionAt(point),
          label: humanizeRegion(s.obsRegion),
        },
      });
    }
  }

  return events.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}
