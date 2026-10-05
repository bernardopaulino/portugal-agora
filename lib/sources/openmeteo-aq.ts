import "server-only";

import { z } from "zod";

import { districts } from "@/data/districts";

import type { AirQualityReading, Severity } from "./types";

const POLLUTANTS = ["pm2_5", "pm10", "nitrogen_dioxide", "ozone"] as const;

export function openMeteoAqUrl(): string {
  const params = new URLSearchParams({
    latitude: districts.map((d) => d.lat).join(","),
    longitude: districts.map((d) => d.lon).join(","),
    current: ["european_aqi", ...POLLUTANTS.map((p) => `european_aqi_${p}`)].join(","),
    timezone: "UTC",
  });
  return `https://air-quality-api.open-meteo.com/v1/air-quality?${params}`;
}

const reading = z.object({
  current: z.object({
    time: z.string(),
    european_aqi: z.number().nullable(),
    european_aqi_pm2_5: z.number().nullish(),
    european_aqi_pm10: z.number().nullish(),
    european_aqi_nitrogen_dioxide: z.number().nullish(),
    european_aqi_ozone: z.number().nullish(),
  }),
});

/** Com várias coordenadas a API devolve uma lista; com uma só, um objeto. */
export const openMeteoAqSchema = z.union([z.array(reading), reading.transform((r) => [r])]);

export type OpenMeteoAqRaw = z.infer<typeof openMeteoAqSchema>;

const pollutantNames: Record<(typeof POLLUTANTS)[number], string> = {
  pm2_5: "partículas finas (PM2,5)",
  pm10: "partículas (PM10)",
  nitrogen_dioxide: "dióxido de azoto",
  ozone: "ozono",
};

/** Escalões do Índice Europeu de Qualidade do Ar (EAQI). */
export function eaqiLevel(value: number): { label: string; severity: Severity } {
  if (value <= 20) return { label: "Boa", severity: "none" };
  if (value <= 40) return { label: "Razoável", severity: "none" };
  if (value <= 60) return { label: "Moderada", severity: "yellow" };
  if (value <= 80) return { label: "Fraca", severity: "orange" };
  if (value <= 100) return { label: "Muito fraca", severity: "red" };
  return { label: "Extremamente fraca", severity: "red" };
}

export function normalizeAirQuality(raw: OpenMeteoAqRaw): AirQualityReading[] {
  return raw.flatMap((r, i) => {
    const district = districts[i];
    const value = r.current.european_aqi;
    if (!district || value == null) return [];
    const dominant = POLLUTANTS.map((p) => [p, r.current[`european_aqi_${p}`] ?? -1] as const).sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0];
    const level = eaqiLevel(value);
    return [
      {
        district: district.slug,
        eaqi: Math.round(value),
        label: level.label,
        severity: level.severity,
        pollutant: dominant ? pollutantNames[dominant] : "",
        observedAt: new Date(`${r.current.time}Z`).toISOString(),
      },
    ];
  });
}
