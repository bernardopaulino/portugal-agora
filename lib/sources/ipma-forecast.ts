import "server-only";

import { z } from "zod";

import { weatherLabel } from "@/data/weather-types";

export const ipmaForecastUrl = (globalIdLocal: number) =>
  `https://api.ipma.pt/open-data/forecast/meteorology/cities/daily/${globalIdLocal}.json`;

export const ipmaForecastSchema = z.object({
  data: z.array(
    z.object({
      forecastDate: z.string(),
      tMin: z.coerce.number(),
      tMax: z.coerce.number(),
      precipitaProb: z.coerce.number(),
      idWeatherType: z.number(),
      predWindDir: z.string(),
      classWindSpeed: z.number(),
    }),
  ),
});

export type IpmaForecastRaw = z.infer<typeof ipmaForecastSchema>;

export interface ForecastDay {
  date: string;
  min: number;
  max: number;
  rainChance: number;
  weather: string;
  weatherId: number;
  wind: string;
}

const windClass: Record<number, string> = {
  1: "fraco",
  2: "moderado",
  3: "forte",
  4: "muito forte",
};

const windDir: Record<string, string> = {
  N: "norte",
  NE: "nordeste",
  E: "leste",
  SE: "sudeste",
  S: "sul",
  SW: "sudoeste",
  W: "oeste",
  NW: "noroeste",
};

const forecastDay = (d: {
  date: string;
  tMin: number;
  tMax: number;
  rain: number;
  weatherId: number;
  windDir: string;
  windClass: number;
}): ForecastDay => ({
  date: d.date,
  min: Math.round(d.tMin),
  max: Math.round(d.tMax),
  rainChance: Math.round(d.rain),
  weather: weatherLabel(d.weatherId),
  weatherId: d.weatherId,
  wind: `Vento ${windClass[d.windClass] ?? ""} de ${windDir[d.windDir] ?? d.windDir}`.replace(
    /\s+/g,
    " ",
  ),
});

export function normalizeForecast(raw: IpmaForecastRaw): ForecastDay[] {
  return raw.data.map((d) =>
    forecastDay({
      date: d.forecastDate,
      tMin: d.tMin,
      tMax: d.tMax,
      rain: d.precipitaProb,
      weatherId: d.idWeatherType,
      windDir: d.predWindDir,
      windClass: d.classWindSpeed,
    }),
  );
}

/*
 * Previsão de um concelho. Os ficheiros "open-data" só têm as capitais de
 * distrito; este (o que o site do IPMA usa) tem os ~420 locais de previsão,
 * com períodos de 1 h, 3 h e 24 h. Só interessam os diários (idPeriodo 24).
 */
export const ipmaLocalForecastUrl = (globalIdLocal: number) =>
  `https://api.ipma.pt/public-data/forecast/aggregate/${globalIdLocal}.json`;

/** Os mesmos 5 dias da previsão das capitais. */
const FORECAST_DAYS = 5;

export const ipmaLocalForecastSchema = z.array(
  z.object({
    idPeriodo: z.number(),
    dataPrev: z.string(),
    tMin: z.coerce.number().optional(),
    tMax: z.coerce.number().optional(),
    probabilidadePrecipita: z.coerce.number().optional(),
    idTipoTempo: z.number().optional(),
    ddVento: z.string().optional(),
    idFfxVento: z.number().optional(),
  }),
);

export type IpmaLocalForecastRaw = z.infer<typeof ipmaLocalForecastSchema>;

const valid = (n: number | undefined) => n !== undefined && n > -90;

export function normalizeLocalForecast(raw: IpmaLocalForecastRaw): ForecastDay[] {
  return (
    raw
      // O IPMA marca com -99 os valores em falta.
      .filter((d) => d.idPeriodo === 24 && valid(d.tMin) && valid(d.tMax))
      .sort((a, b) => a.dataPrev.localeCompare(b.dataPrev))
      .slice(0, FORECAST_DAYS)
      .map((d) =>
        forecastDay({
          date: d.dataPrev.slice(0, 10),
          tMin: d.tMin!,
          tMax: d.tMax!,
          rain: valid(d.probabilidadePrecipita) ? d.probabilidadePrecipita! : 0,
          weatherId: d.idTipoTempo ?? 0,
          windDir: d.ddVento ?? "",
          windClass: d.idFfxVento ?? 0,
        }),
      )
  );
}
