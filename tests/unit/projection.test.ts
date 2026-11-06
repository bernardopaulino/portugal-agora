import { describe, expect, it } from "vitest";

import {
  boundsCenter,
  depthSceneBounds,
  inBounds,
  KM_PER_DEGREE,
  localProjection,
} from "@/lib/geo/projection";
import { distanceKm } from "@/lib/geo/geometry";

describe("localProjection", () => {
  const center: [number, number] = [-8.6, 39.3];
  const p = localProjection(center, 3);

  it("põe o centro na origem", () => {
    expect(p.project(center)).toEqual({ east: 0, north: 0, up: 0 });
  });

  it("um grau de latitude são cerca de 111,2 km para norte", () => {
    const north = p.project([-8.6, 40.3]);
    expect(north.north).toBeCloseTo(111.19, 1);
    expect(north.east).toBeCloseTo(0, 6);
    expect(KM_PER_DEGREE).toBeCloseTo(111.195, 2);
  });

  it("um grau de longitude encolhe com o cosseno da latitude", () => {
    const east = p.project([-7.6, 39.3]);
    expect(east.east).toBeCloseTo(111.195 * Math.cos((39.3 * Math.PI) / 180), 2);
    expect(east.east).toBeCloseTo(86.0, 0);
  });

  it("bate certo com a distância geodésica Lisboa–Porto (~274 km)", () => {
    const lx: [number, number] = [-9.139, 38.722];
    const po: [number, number] = [-8.611, 41.149];
    const a = p.project(lx);
    const b = p.project(po);
    const km = Math.hypot(a.east - b.east, a.north - b.north);
    expect(Math.abs(km - distanceKm(lx, po))).toBeLessThan(2);
    expect(km).toBeGreaterThan(270);
    expect(km).toBeLessThan(280);
  });

  it("a profundidade cresce para baixo e só ela leva exagero", () => {
    const flat = localProjection(center, 1);
    const shallow = p.project([-9, 38], 5);
    const deep = p.project([-9, 38], 20);
    expect(deep.up).toBeLessThan(shallow.up);
    expect(deep.up).toBe(-60);
    expect(flat.project([-9, 38], 20).up).toBe(-20);
    expect(deep.east).toBe(flat.project([-9, 38], 20).east);
    expect(deep.north).toBe(flat.project([-9, 38], 20).north);
  });

  it("sem profundidade, fica à superfície", () => {
    expect(p.project([-9, 38], null).up).toBe(0);
    expect(p.project([-9, 38]).up).toBe(0);
  });
});

describe("blocos de crosta", () => {
  it("cada bloco contém o seu centro e as capitais da região", () => {
    for (const bounds of Object.values(depthSceneBounds)) {
      expect(inBounds(boundsCenter(bounds), bounds)).toBe(true);
    }
    expect(inBounds([-9.139, 38.722], depthSceneBounds.continente)).toBe(true);
    expect(inBounds([-25.67, 37.74], depthSceneBounds.acores)).toBe(true);
    expect(inBounds([-16.91, 32.65], depthSceneBounds.madeira)).toBe(true);
    expect(inBounds([-3.6, 37.2], depthSceneBounds.continente)).toBe(false);
  });
});
