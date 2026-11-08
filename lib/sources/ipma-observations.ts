import "server-only";

import { z } from "zod";

import { districts } from "@/data/districts";
import { distanceKm } from "@/lib/geo/geometry";
import { locateDistrict, regionAt } from "@/lib/geo/locate";

/*
 * Observações das estações do IPMA: a última hora disponível, com
 * coordenadas (obs-surface.geojson; publicado de hora a hora, cerca de
 * 35 min depois da hora certa). Para cada distrito escolhe-se a estação
 * do distrito mais próxima da capital que tenha temperatura.
 */

export const IPMA_OBSERVATIONS_URL =
  "https://api.ipma.pt/open-data/observation/meteorology/stations/obs-surface.geojson";

/** O IPMA usa -99 para "sem dado". */
const reading = z.number().nullable().catch(null);

export const ipmaObservationsSchema = z.object({
  features: z.array(
    z.object({
      geometry: z.object({ coordinates: z.tuple([z.number(), z.number()]) }),
      properties: z.object({
        idEstacao: z.number(),
        localEstacao: z.string(),
        time: z.string(),
        temperatura: reading,
        intensidadeVentoKM: reading,
        descDirVento: z.string().nullable().catch(null),
        humidade: reading,
        precAcumulada: reading,
      }),
    }),
  ),
});

export type IpmaObservationsRaw = z.infer<typeof ipmaObservationsSchema>;

export interface StationObservation {
  station: string;
  /** [lon, lat] da estação. */
  coordinates: [number, number];
  /** Hora da observação (ISO, UTC). */
  time: string;
  /** Distância da estação à capital do distrito, em km (arredondada). */
  distanceKm: number;
  temperature: number;
  windKmh: number | null;
  /** N, NE, … ou null (vento calmo ou sem dado). */
  windDir: string | null;
  humidity: number | null;
  /** Precipitação acumulada na hora, em mm. */
  rainMm: number | null;
}

const valid = (v: number | null) => (v === null || v <= -90 ? null : v);

/** Slug do distrito de uma estação; nas ilhas, a região inteira é um "distrito". */
function districtOf(point: [number, number]): string | undefined {
  const region = regionAt(point);
  if (region !== "continente") return region;
  return locateDistrict(point, 25);
}

export function normalizeObservations(
  raw: IpmaObservationsRaw,
): Record<string, StationObservation> {
  // O distrito de cada estação com temperatura, calculado uma vez.
  const stations = raw.features
    .filter((f) => valid(f.properties.temperatura) !== null)
    .map((f) => ({ f, slug: districtOf(f.geometry.coordinates) }));
  const byDistrict: Record<string, StationObservation> = {};
  for (const district of districts) {
    let best: StationObservation | undefined;
    for (const { f, slug } of stations) {
      if (slug !== district.slug) continue;
      const p = f.properties;
      const temperature = valid(p.temperatura)!;
      const point = f.geometry.coordinates;
      const km = distanceKm(point, [district.lon, district.lat]);
      if (best && km >= best.distanceKm) continue;
      const wind = valid(p.intensidadeVentoKM);
      best = {
        station: p.localEstacao,
        coordinates: point,
        time: `${p.time.slice(0, 19)}Z`,
        distanceKm: Math.round(km),
        temperature: Math.round(temperature * 10) / 10,
        windKmh: wind === null ? null : Math.round(wind),
        windDir: wind && p.descDirVento && p.descDirVento !== "C" ? p.descDirVento : null,
        humidity: valid(p.humidade),
        rainMm: valid(p.precAcumulada),
      };
    }
    if (best) byDistrict[district.slug] = best;
  }
  return byDistrict;
}
