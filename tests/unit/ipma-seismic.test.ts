import { describe, expect, it } from "vitest";

import azores from "../fixtures/ipma-seismic-3.json";
import mainland from "../fixtures/ipma-seismic-7.json";
import {
  earthquakeSeverity,
  humanizeRegion,
  ipmaSeismicSchema,
  normalizeSeismic,
} from "@/lib/sources/ipma-seismic";

const raws = [ipmaSeismicSchema.parse(mainland), ipmaSeismicSchema.parse(azores)];
const now = new Date("2026-09-29T16:51:00Z");

describe("normalizeSeismic", () => {
  const quakes = normalizeSeismic(raws, now);

  it("descarta magnitudes por calcular (-99)", () => {
    expect(quakes.every((q) => q.magnitude >= 0)).toBe(true);
  });

  it("mantém só os últimos 7 dias, do mais recente para o mais antigo", () => {
    const limit = now.getTime() - 7 * 86_400_000;
    expect(quakes.every((q) => new Date(q.occurredAt).getTime() >= limit)).toBe(true);
    const times = quakes.map((q) => q.occurredAt);
    expect([...times].sort().reverse()).toEqual(times);
  });

  it("identifica a região a partir das coordenadas", () => {
    const regions = new Set(quakes.map((q) => q.place.region));
    expect(regions.has("acores")).toBe(true);
    expect(regions.has("continente")).toBe(true);
  });

  it("usa vírgula decimal no título", () => {
    expect(quakes[0]?.title).toMatch(/^Sismo de magnitude \d+,\d$/);
  });

  it("não inventa distrito para sismos em Espanha", () => {
    const murcia = quakes.find((q) => q.place.label.includes("Murcia"));
    expect(murcia?.place.district).toBeUndefined();
  });
});

describe("earthquakeSeverity", () => {
  it.each([
    [2.1, false, "none"],
    [2.1, true, "yellow"],
    [3.6, false, "yellow"],
    [4.7, false, "orange"],
    [5.8, false, "red"],
  ] as const)("magnitude %s, sentido %s → %s", (m, felt, expected) => {
    expect(earthquakeSeverity(m, felt)).toBe(expected);
  });
});

describe("humanizeRegion", () => {
  it.each([
    ["W Matosinhos", "a oeste de Matosinhos"],
    ["SE  Torre de Moncorvo", "a sudeste de Torre de Moncorvo"],
    ["S Al Hoceima (MARR)", "a sul de Al Hoceima (Marrocos)"],
    ["E  Murcia (ESP)", "a leste de Murcia (Espanha)"],
    ["Alboran", "Alboran"],
    [null, "localização por confirmar"],
  ])("%s → %s", (raw, expected) => {
    expect(humanizeRegion(raw)).toBe(expected);
  });
});
