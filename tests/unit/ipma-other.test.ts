import { describe, expect, it } from "vitest";

import forecastRaw from "../fixtures/ipma-forecast-1110600.json";
import rcm0 from "../fixtures/ipma-rcm-d0.json";
import rcm1 from "../fixtures/ipma-rcm-d1.json";
import uvRaw from "../fixtures/ipma-uv.json";
import { ipmaForecastSchema, normalizeForecast } from "@/lib/sources/ipma-forecast";
import { ipmaRcmSchema, normalizeFireRisk } from "@/lib/sources/ipma-rcm";
import { ipmaUvSchema, normalizeUv, uvLabel } from "@/lib/sources/ipma-uv";

describe("normalizeFireRisk", () => {
  const risk = normalizeFireRisk(ipmaRcmSchema.parse(rcm0), ipmaRcmSchema.parse(rcm1));
  it("tem os 278 concelhos do continente com níveis de 1 a 5", () => {
    const values = Object.values(risk.today.byDico);
    expect(values).toHaveLength(278);
    expect(values.every((v) => v >= 1 && v <= 5)).toBe(true);
  });
  it("guarda a data de cada previsão", () => {
    expect(risk.tomorrow.date > risk.today.date).toBe(true);
  });
});

describe("normalizeUv", () => {
  const uv = normalizeUv(ipmaUvSchema.parse(uvRaw));
  it("tem valores para as 20 capitais de distrito e região", () => {
    const today = uv.filter((u) => u.date === uv[0]?.date);
    expect(new Set(today.map((u) => u.district)).size).toBe(20);
  });
  it.each([
    [1.2, "Baixo"],
    [4.8, "Moderado"],
    [6.5, "Elevado"],
    [9, "Muito elevado"],
    [11.5, "Extremo"],
  ])("índice %s → %s", (index, label) => {
    expect(uvLabel(index)).toBe(label);
  });
});

describe("normalizeForecast", () => {
  it("traduz tipos de tempo e vento para português simples", () => {
    const days = normalizeForecast(ipmaForecastSchema.parse(forecastRaw));
    expect(days.length).toBeGreaterThanOrEqual(5);
    expect(days[0]).toMatchObject({ weather: "Aguaceiros/chuva", wind: "Vento moderado de sul" });
  });
});
