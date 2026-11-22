import { describe, expect, it } from "vitest";

import raw from "../fixtures/openmeteo-aq.json";
import {
  eaqiLevel,
  normalizeAirQuality,
  openMeteoAqSchema,
  openMeteoAqUrl,
} from "@/lib/sources/openmeteo-aq";

describe("normalizeAirQuality", () => {
  const readings = normalizeAirQuality(openMeteoAqSchema.parse(raw));

  it("associa as 20 leituras aos distritos pela ordem pedida", () => {
    expect(readings).toHaveLength(20);
    expect(readings[10]?.district).toBe("lisboa");
  });

  it("indica o poluente dominante em português", () => {
    expect(readings[10]?.pollutant).toBe("partículas finas (PM2,5)");
  });

  it("pede as 20 coordenadas numa só chamada", () => {
    const url = new URL(openMeteoAqUrl());
    expect(url.searchParams.get("latitude")?.split(",")).toHaveLength(20);
  });
});

describe("eaqiLevel", () => {
  it.each([
    [15, "Boa", "none"],
    [35, "Razoável", "none"],
    [55, "Moderada", "yellow"],
    [75, "Fraca", "orange"],
    [95, "Muito fraca", "red"],
    [130, "Extremamente fraca", "red"],
  ] as const)("EAQI %s → %s", (value, label, severity) => {
    expect(eaqiLevel(value)).toEqual({ label, severity });
  });
});

describe("pólen (CAMS)", () => {
  const one = (hourly?: Record<string, (number | null)[]>) =>
    normalizeAirQuality(
      openMeteoAqSchema.parse({
        current: { time: "2026-05-10T12:00", european_aqi: 30 },
        ...(hourly ? { hourly } : {}),
      }),
    )[0]!;

  it("guarda o máximo previsto para hoje de cada pólen, do mais abundante, sem os ausentes", () => {
    const r = one({
      time: [0, 1, 2] as unknown as number[],
      grass_pollen: [3.2, 21.5, 9],
      olive_pollen: [0, 0.2, 0],
      birch_pollen: [1, 4.6, 2],
    });
    expect(r.pollen).toEqual([
      { type: "gramíneas", grains: 22 },
      { type: "bétula", grains: 5 },
    ]);
  });

  it("onde o CAMS não chega (Açores), null; sem horas na resposta, nada", () => {
    expect(one({ grass_pollen: [null, null], olive_pollen: [null] }).pollen).toBeNull();
    expect(one().pollen).toBeUndefined();
  });

  it("pede o pólen às horas, só para hoje", () => {
    const url = new URL(openMeteoAqUrl());
    expect(url.searchParams.get("hourly")).toContain("grass_pollen");
    expect(url.searchParams.get("forecast_days")).toBe("1");
  });
});
