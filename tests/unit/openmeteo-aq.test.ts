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
