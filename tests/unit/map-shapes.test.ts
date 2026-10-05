import { describe, expect, it } from "vitest";

import { mapFrames, mapShapes, projectPoint, squeeze } from "@/data/map-shapes";

const gaps: [number, number, number][] = [
  [-30.95, -28.95, 0.3],
  [-26.95, -25.95, 0.3],
];

describe("squeeze (troços de mar encolhidos nos Açores)", () => {
  it("não mexe antes do primeiro troço e encolhe os troços de mar", () => {
    expect(squeeze(-31.2, gaps)).toBe(-31.2);
    expect(squeeze(-28.95, gaps)).toBeCloseTo(-30.65);
    expect(squeeze(-25.5, gaps)).toBeCloseTo(-25.5 - 1.7 - 0.7);
  });

  it("é contínua e crescente, por isso nenhum ponto troca de lugar", () => {
    let previous = -Infinity;
    for (let lon = -31.5; lon <= -24.8; lon += 0.01) {
      const value = squeeze(lon, gaps);
      expect(value).toBeGreaterThan(previous);
      if (previous !== -Infinity) expect(value - previous).toBeLessThan(0.0101);
      previous = value;
    }
  });
});

describe("projectPoint", () => {
  it("põe as ilhas dos Açores e da Madeira dentro das suas caixas", () => {
    const inside = (region: "acores" | "madeira", point: [number, number]) => {
      const [x, y] = projectPoint(point, region);
      const [bx, by, bw, bh] = mapFrames[region];
      return x > bx && x < bx + bw && y > by && y < by + bh;
    };
    expect(inside("acores", [-31.2, 39.45])).toBe(true); // Flores
    expect(inside("acores", [-27.2, 38.7])).toBe(true); // Terceira
    expect(inside("acores", [-25.1, 36.95])).toBe(true); // Santa Maria
    expect(inside("madeira", [-16.95, 32.75])).toBe(true); // Madeira
    expect(inside("madeira", [-16.33, 33.07])).toBe(true); // Porto Santo
  });

  it("mantém a ordem oeste–este dos grupos de ilhas", () => {
    const flores = projectPoint([-31.2, 39.45], "acores")[0];
    const faial = projectPoint([-28.7, 38.55], "acores")[0];
    const saoMiguel = projectPoint([-25.5, 37.8], "acores")[0];
    expect(flores).toBeLessThan(faial);
    expect(faial).toBeLessThan(saoMiguel);
  });

  it("as formas das ilhas existem nas duas regiões autónomas", () => {
    expect(mapShapes.find((s) => s.slug === "acores")?.d.length).toBeGreaterThan(100);
    expect(mapShapes.find((s) => s.slug === "madeira")?.d.length).toBeGreaterThan(100);
  });
});
