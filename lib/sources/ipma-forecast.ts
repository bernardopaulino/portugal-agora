import "server-only";

import { z } from "zod";

import { weatherLabel } from "@/data/weather-types";

import { uvLabel } from "./ipma-uv";

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
  /** Índice UV máximo do dia (só na previsão dos concelhos). */
  uv?: { index: number; label: string };
}

/** Uma hora (ou um bloco de 3 h, depois dos primeiros 3 dias) da previsão de um concelho. */
export interface ForecastHour {
  /** Início do período, ISO em UTC. */
  time: string;
  temp: number;
  /** null quando o IPMA não a dá (-99). */
  rainChance: number | null;
  weather: string;
  weatherId: number;
  /** km/h */
  windKmh: number;
  windDir: string;
}

/** A previsão de um concelho: os 5 dias e as horas. */
export interface LocalForecast {
  days: ForecastDay[];
  hours: ForecastHour[];
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
 * com períodos de 1 h (os primeiros ~3 dias), 3 h e 24 h.
 *
 * As horas (dataPrev) estão em UTC: o fim das horas é o mesmo nos Açores e no
 * continente, e os modelos do IPMA correm em UTC. Os dias (T00:00) são datas.
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
    tMed: z.coerce.number().optional(),
    ffVento: z.coerce.number().optional(),
    iUv: z.coerce.number().optional(),
  }),
);

export type IpmaLocalForecastRaw = z.infer<typeof ipmaLocalForecastSchema>;

const valid = (n: number | undefined) => n !== undefined && n > -90;

export function normalizeLocalForecast(raw: IpmaLocalForecastRaw): LocalForecast {
  return { days: localDays(raw), hours: localHours(raw) };
}

function localHours(raw: IpmaLocalForecastRaw): ForecastHour[] {
  return raw
    .filter((d) => (d.idPeriodo === 1 || d.idPeriodo === 3) && valid(d.tMed))
    .sort((a, b) => a.dataPrev.localeCompare(b.dataPrev))
    .map((d) => ({
      time: `${d.dataPrev}Z`,
      temp: Math.round(d.tMed!),
      rainChance: valid(d.probabilidadePrecipita) ? Math.round(d.probabilidadePrecipita!) : null,
      weather: weatherLabel(d.idTipoTempo ?? 0),
      weatherId: d.idTipoTempo ?? 0,
      windKmh: valid(d.ffVento) ? Math.round(d.ffVento!) : 0,
      windDir: d.ddVento ?? "",
    }));
}

function localDays(raw: IpmaLocalForecastRaw): ForecastDay[] {
  return (
    raw
      // O IPMA marca com -99 os valores em falta.
      .filter((d) => d.idPeriodo === 24 && valid(d.tMin) && valid(d.tMax))
      .sort((a, b) => a.dataPrev.localeCompare(b.dataPrev))
      .slice(0, FORECAST_DAYS)
      .map((d) => ({
        ...forecastDay({
          date: d.dataPrev.slice(0, 10),
          tMin: d.tMin!,
          tMax: d.tMax!,
          rain: valid(d.probabilidadePrecipita) ? d.probabilidadePrecipita! : 0,
          weatherId: d.idTipoTempo ?? 0,
          windDir: d.ddVento ?? "",
          windClass: d.idFfxVento ?? 0,
        }),
        ...(valid(d.iUv) && d.iUv! >= 0 ? { uv: { index: d.iUv!, label: uvLabel(d.iUv!) } } : {}),
      }))
  );
}
