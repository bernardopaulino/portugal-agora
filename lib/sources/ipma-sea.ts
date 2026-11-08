import "server-only";

import { z } from "zod";

import { districtForIpmaArea } from "@/data/districts";

/*
 * Estado do mar do IPMA: previsão diária para hoje e os 2 dias seguintes
 * em 12 pontos da costa (continente, Madeira e Açores). Cada ponto liga-se
 * ao distrito pela área de aviso (idAreaAviso) do dicionário de locais.
 * Muitos números vêm como texto: convertem-se aqui.
 */

export const IPMA_SEA_URLS = [0, 1, 2].map(
  (day) =>
    `https://api.ipma.pt/open-data/forecast/oceanography/daily/hp-daily-sea-forecast-day${day}.json`,
);
export const IPMA_SEA_LOCATIONS_URL = "https://api.ipma.pt/open-data/sea-locations.json";

const num = z.coerce.number().nullable().catch(null);

export const ipmaSeaDaySchema = z.object({
  forecastDate: z.string(),
  data: z.array(
    z.object({
      globalIdLocal: z.number(),
      totalSeaMin: num,
      totalSeaMax: num,
      waveHighMin: num,
      waveHighMax: num,
      wavePeriodMin: num,
      wavePeriodMax: num,
      predWaveDir: z.string().nullable().catch(null),
      sstMin: num,
      sstMax: num,
    }),
  ),
});

export const ipmaSeaLocationsSchema = z.array(
  z.object({ globalIdLocal: z.number(), idAreaAviso: z.string(), local: z.string() }),
);

export interface SeaDay {
  date: string;
  /** Altura significativa total (agitação marítima), em m. */
  seaMin: number | null;
  seaMax: number | null;
  /** Ondulação: período (s) e direção de onde vem. */
  periodMin: number | null;
  periodMax: number | null;
  swellDir: string | null;
  /** Temperatura da água do mar, em °C. */
  waterMin: number | null;
  waterMax: number | null;
}

export interface SeaSpot {
  /** "Lisboa", "Sagres", "Ponta Delgada" (sem o ", costa" do IPMA). */
  name: string;
  district: string;
  days: SeaDay[];
}

/** Os pontos de cada distrito, cada um com os dias por ordem. */
export function normalizeSea(
  days: z.infer<typeof ipmaSeaDaySchema>[],
  locations: z.infer<typeof ipmaSeaLocationsSchema>,
): Record<string, SeaSpot[]> {
  const spots = new Map<number, SeaSpot>();
  for (const l of locations) {
    const district = districtForIpmaArea(l.idAreaAviso);
    if (!district) continue;
    const name = l.local.replace(/,\s*costa$/i, "").trim();
    spots.set(l.globalIdLocal, { name, district: district.slug, days: [] });
  }
  for (const day of [...days].sort((a, b) => a.forecastDate.localeCompare(b.forecastDate))) {
    for (const d of day.data) {
      spots.get(d.globalIdLocal)?.days.push({
        date: day.forecastDate,
        seaMin: d.totalSeaMin,
        seaMax: d.totalSeaMax,
        periodMin: d.wavePeriodMin,
        periodMax: d.wavePeriodMax,
        swellDir: d.predWaveDir,
        waterMin: d.sstMin,
        waterMax: d.sstMax,
      });
    }
  }
  const byDistrict: Record<string, SeaSpot[]> = {};
  for (const spot of spots.values()) {
    if (spot.days.length === 0) continue;
    (byDistrict[spot.district] ??= []).push(spot);
  }
  return byDistrict;
}
