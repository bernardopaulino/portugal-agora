import { describe, expect, it } from "vitest";

import index from "@/public/geo/relief-tiles.json";
import { parseReliefIndex } from "@/lib/geo/relief-index";

// Área 4×2 ao zoom 3, a começar em x=4, y=0: tiles (5,0), (6,0) e (4,1).
const tiny = parseReliefIndex({
  z: 3,
  x0: 4,
  y0: 0,
  w: 4,
  h: 2,
  rows: [
    [1, 2],
    [0, 1],
  ],
});

describe("parseReliefIndex", () => {
  it("lê os tiles do zoom máximo", () => {
    expect(tiny.has(3, 5, 0)).toBe(true);
    expect(tiny.has(3, 6, 0)).toBe(true);
    expect(tiny.has(3, 4, 1)).toBe(true);
    expect(tiny.has(3, 4, 0)).toBe(false);
    expect(tiny.has(3, 7, 1)).toBe(false);
  });

  it("um tile de zoom mais baixo existe se algum descendente existir", () => {
    expect(tiny.has(2, 2, 0)).toBe(true); // cobre x 4–5, y 0–1
    expect(tiny.has(2, 3, 0)).toBe(true); // cobre x 6–7, y 0–1
    expect(tiny.has(2, 2, 1)).toBe(false); // cobre x 4–5, y 2–3
    expect(tiny.has(1, 1, 0)).toBe(true);
    expect(tiny.has(0, 0, 0)).toBe(true);
  });

  it("fora da área ou fora dos zooms, não há relevo", () => {
    expect(tiny.has(3, 0, 0)).toBe(false);
    expect(tiny.has(3, 5, 3)).toBe(false);
    expect(tiny.has(4, 10, 0)).toBe(false);
    expect(tiny.has(-1, 0, 0)).toBe(false);
  });
});

describe("relief-tiles.json", () => {
  const relief = parseReliefIndex(index);
  const tile = (lon: number, lat: number, z: number) => {
    const n = 2 ** z;
    const r = (lat * Math.PI) / 180;
    return [
      z,
      Math.floor(((lon + 180) / 360) * n),
      Math.floor(((1 - Math.asinh(Math.tan(r)) / Math.PI) / 2) * n),
    ] as const;
  };

  it("tem relevo em terra: Serra da Estrela, Pico, Pico Ruivo", () => {
    for (const z of [6, 9, 12]) {
      expect(relief.has(...tile(-7.61, 40.32, z))).toBe(true);
      expect(relief.has(...tile(-28.4, 38.47, z))).toBe(true);
      expect(relief.has(...tile(-16.94, 32.76, z))).toBe(true);
    }
  });

  it("não pede tiles em mar alto, onde a Mapterhorn responde 404", () => {
    expect(relief.has(6, 28, 24)).toBe(false);
    expect(relief.has(10, 485, 396)).toBe(false);
    expect(relief.has(...tile(-20, 36, 9))).toBe(false);
  });
});
