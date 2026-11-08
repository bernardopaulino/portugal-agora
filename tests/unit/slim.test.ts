import { describe, expect, it } from "vitest";

import { aggregate } from "@/lib/state/aggregate";
import { slimState } from "@/lib/state/slim";
import type { EarthquakeEvent, SourceResult, WarningEvent } from "@/lib/sources/types";

const now = new Date("2026-10-04T09:00:00.000Z");
const ok = <T>(id: SourceResult<T>["id"], data: T): SourceResult<T> => ({
  id,
  status: "ok",
  data,
  fetchedAt: now.toISOString(),
});

const warning = (district: string) =>
  ({
    kind: "warning",
    id: `w-${district}`,
    severity: "yellow",
    title: "",
    type: "Vento",
    area: district.toUpperCase(),
    place: { district, region: "continente", label: district },
    startsAt: now.toISOString(),
    endsAt: now.toISOString(),
  }) satisfies WarningEvent;

const quake = (district: string) =>
  ({
    kind: "earthquake",
    id: `q-${district}`,
    severity: "none",
    title: "",
    magnitude: 2.5,
    depthKm: 10,
    felt: false,
    occurredAt: now.toISOString(),
    place: { district, region: "continente", label: district },
  }) satisfies EarthquakeEvent;

const state = aggregate(
  {
    warnings: ok("ipma-warnings", [warning("lisboa"), warning("porto")]),
    earthquakes: ok("ipma-seismic", [quake("lisboa"), quake("faro")]),
    fires: ok("fogos", []),
    fireRisk: ok("ipma-rcm", {
      today: { date: "2026-10-04", byDico: { "1106": 3 } },
      tomorrow: { date: "2026-10-05", byDico: { "1106": 2 } },
    }),
    uv: ok("ipma-uv", [{ district: "lisboa", date: "2026-10-04", index: 5, label: "Moderado" }]),
    airQuality: ok("openmeteo-aq", []),
  },
  now,
);

describe("slimState", () => {
  it("numa página de tema, esvazia as listas dos outros temas (vazias, não null)", () => {
    const slim = slimState(state, "sismos");
    expect(slim.earthquakes.data).toHaveLength(2);
    expect(slim.warnings).toMatchObject({ status: "ok", data: [] });
    expect(slim.uv.data).toEqual([]);
    expect(slim.fireRisk.data?.today).toEqual({ date: "2026-10-04", byDico: {} });
  });

  it("mantém os níveis por distrito, o título e o nível geral", () => {
    const slim = slimState(state, "sismos");
    expect(slim.districts).toBe(state.districts);
    expect(slim.headline).toBe(state.headline);
    expect(slim.level).toBe("yellow");
  });

  it("num distrito, só os eventos do distrito", () => {
    expect(slimState(state, "avisos", "porto").warnings.data?.map((w) => w.id)).toEqual([
      "w-porto",
    ]);
    expect(slimState(state, "sismos", "faro").earthquakes.data?.map((q) => q.id)).toEqual([
      "q-faro",
    ]);
  });

  it("no risco, mantém o risco de incêndio, o UV e o ar", () => {
    const slim = slimState(state, "risco", "lisboa");
    expect(slim.fireRisk.data?.today.byDico).toEqual({ "1106": 3 });
    expect(slim.uv.data).toHaveLength(1);
    expect(slim.warnings.data).toEqual([]);
  });

  it("não altera o estado original", () => {
    slimState(state, "sismos");
    expect(state.warnings.data).toHaveLength(2);
  });
});
