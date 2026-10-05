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

export function normalizeForecast(raw: IpmaForecastRaw): ForecastDay[] {
  return raw.data.map((d) => ({
    date: d.forecastDate,
    min: Math.round(d.tMin),
    max: Math.round(d.tMax),
    rainChance: Math.round(d.precipitaProb),
    weather: weatherLabel(d.idWeatherType),
    weatherId: d.idWeatherType,
    wind: `Vento ${windClass[d.classWindSpeed] ?? ""} de ${windDir[d.predWindDir] ?? d.predWindDir}`.replace(
      /\s+/g,
      " ",
    ),
  }));
}
