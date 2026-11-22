import { describe, expect, it } from "vitest";

import forecastRaw from "../fixtures/ipma-forecast-1110600.json";
import rcm0 from "../fixtures/ipma-rcm-d0.json";
import rcm1 from "../fixtures/ipma-rcm-d1.json";
import uvRaw from "../fixtures/ipma-uv.json";
import localForecastRaw from "../fixtures/ipma-forecast-local.json";
import { forecastLocations } from "@/data/forecast-locations";
import { concelhos } from "@/data/concelhos";
import {
  ipmaForecastSchema,
  ipmaLocalForecastSchema,
  normalizeForecast,
  normalizeLocalForecast,
} from "@/lib/sources/ipma-forecast";
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

describe("normalizeLocalForecast", () => {
  const days = normalizeLocalForecast(ipmaLocalForecastSchema.parse(localForecastRaw));
  it("fica só com os 5 primeiros dias, por ordem, sem os períodos de horas", () => {
    expect(days).toHaveLength(5);
    expect(days.map((d) => d.date)).toEqual([...days.map((d) => d.date)].sort());
    expect(days[0]!.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("arredonda as temperaturas e traduz o vento", () => {
    expect(Number.isInteger(days[0]!.min)).toBe(true);
    expect(days[0]!.wind).toMatch(/^Vento (fraco|moderado|forte|muito forte) de /);
  });
  it("ignora valores em falta (-99)", () => {
    const raw = ipmaLocalForecastSchema.parse([
      { idPeriodo: 24, dataPrev: "2026-01-01T00:00:00", tMin: "-99.0", tMax: "-99.0" },
      {
        idPeriodo: 24,
        dataPrev: "2026-01-02T00:00:00",
        tMin: "8.4",
        tMax: "15.6",
        probabilidadePrecipita: "-99.0",
        idTipoTempo: 1,
      },
    ]);
    expect(normalizeLocalForecast(raw)).toMatchObject([
      { date: "2026-01-02", min: 8, max: 16, rainChance: 0 },
    ]);
  });
});

describe("forecastLocations", () => {
  it("tem um local de previsão para cada concelho", () => {
    const dicos = new Set(forecastLocations.map(([dico]) => dico));
    expect(concelhos.every((c) => dicos.has(c.dico))).toBe(true);
  });
  it("no continente, o local é o do próprio concelho", () => {
    const mainland = forecastLocations.filter(([dico]) => Number(dico.slice(0, 2)) <= 18);
    expect(mainland).toHaveLength(278);
    for (const [dico, id] of mainland) expect(id).toBe(1_000_000 + Number(dico) * 100);
  });
});
