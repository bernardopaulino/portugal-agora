import { describe, expect, it } from "vitest";

import { depthGrid, quakeRadiusPx, riskHeight, RISK_METERS_PER_CLASS } from "@/lib/geo/scales";

describe("depthGrid", () => {
  it.each([
    [0, [0, 10]],
    [4, [0, 10]],
    [10, [0, 10]],
    [14, [0, 10, 20]],
    [33, [0, 10, 20, 50]],
    [50, [0, 10, 20, 50]],
    [72, [0, 10, 20, 50, 100]],
    [150, [0, 10, 20, 50, 100, 200]],
    [610, [0, 10, 20, 50, 100, 200, 300, 400, 500, 600, 700]],
  ])("sismo mais profundo a %s km → %j", (max, grid) => {
    expect(depthGrid(max)).toEqual(grid);
  });

  it("sem dados, só a superfície e os 10 km", () => {
    expect(depthGrid(Number.NaN)).toEqual([0, 10]);
    expect(depthGrid(-Infinity)).toEqual([0, 10]);
  });
});

describe("quakeRadiusPx", () => {
  it("é a escala do mapa 2D (4 px + 3 px por magnitude)", () => {
    expect(quakeRadiusPx(0)).toBe(4);
    expect(quakeRadiusPx(2)).toBe(10);
    expect(quakeRadiusPx(5.5)).toBe(20.5);
  });
});

describe("riskHeight", () => {
  it("a altura sobe com a classe e repete-a", () => {
    const heights = [1, 2, 3, 4, 5].map(riskHeight);
    expect(heights).toEqual([1, 2, 3, 4, 5].map((c) => c * RISK_METERS_PER_CLASS));
    for (let i = 1; i < heights.length; i++) expect(heights[i]).toBeGreaterThan(heights[i - 1]!);
  });

  it.each([0, -1, 6, 2.5, Number.NaN])("classe inválida (%s) não tem altura", (c) => {
    expect(riskHeight(c)).toBe(0);
  });
});
