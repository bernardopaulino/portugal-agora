import { describe, expect, it } from "vitest";

import { aggregate, placesPhrase, type StateInputs } from "@/lib/state/aggregate";
import type { EarthquakeEvent, FireEvent, SourceResult, WarningEvent } from "@/lib/sources/types";

const now = new Date("2026-09-29T16:00:00Z");

function warning(area: string, district: string, severity: WarningEvent["severity"]): WarningEvent {
  return {
    kind: "warning",
    id: `${area}-${severity}`,
    severity,
    title: "Aviso",
    type: "Vento",
    area,
    place: { district, region: district === "acores" ? "acores" : "continente", label: district },
    startsAt: "2026-09-29T12:00:00.000Z",
    endsAt: "2026-09-30T12:00:00.000Z",
  };
}

function ok<T>(id: SourceResult<T>["id"], data: T): SourceResult<T> {
  return { id, status: "ok", data, fetchedAt: now.toISOString() };
}

function inputs(overrides: Partial<StateInputs> = {}): StateInputs {
  return {
    warnings: ok("ipma-warnings", []),
    earthquakes: ok("ipma-seismic", []),
    fires: ok("fogos", []),
    fireRisk: ok("ipma-rcm", {
      today: { date: "2026-09-29", byDico: {} },
      tomorrow: { date: "2026-09-30", byDico: {} },
    }),
    uv: ok("ipma-uv", []),
    airQuality: ok("openmeteo-aq", []),
    ...overrides,
  };
}

describe("placesPhrase", () => {
  it("nomeia até dois sítios com a preposição certa", () => {
    expect(placesPhrase(["porto"])).toBe("no Porto");
    expect(placesPhrase(["porto", "viana-do-castelo"])).toBe("no Porto e em Viana do Castelo");
    expect(placesPhrase(["guarda", "acores"])).toBe("na Guarda e nos Açores");
  });
  it("conta os distritos e nomeia as regiões autónomas", () => {
    expect(placesPhrase(["porto", "braga", "lisboa", "acores"])).toBe(
      "em 3 distritos e nos Açores",
    );
    expect(placesPhrase(["porto", "braga", "lisboa"])).toBe("em 3 distritos");
  });
});

describe("aggregate", () => {
  it("sem avisos: semáforo verde e frase clara", () => {
    const state = aggregate(inputs(), now);
    expect(state.level).toBe("none");
    expect(state.levelKnown).toBe(true);
    expect(state.headline).toBe("Sem avisos meteorológicos em Portugal.");
  });

  it("o semáforo segue o aviso mais alto e a frase lista cada nível", () => {
    const state = aggregate(
      inputs({
        warnings: ok("ipma-warnings", [
          warning("PTO", "porto", "orange"),
          warning("PTO", "porto", "yellow"),
          warning("LSB", "lisboa", "yellow"),
          warning("BRG", "braga", "yellow"),
          warning("FAR", "faro", "yellow"),
        ]),
      }),
      now,
    );
    expect(state.level).toBe("orange");
    expect(state.headline).toBe("Aviso laranja no Porto. Aviso amarelo em 3 distritos.");
    expect(state.districts.porto).toMatchObject({ level: "orange", warnings: 2 });
    expect(state.districts.evora).toMatchObject({ level: "none", warnings: 0 });
  });

  it("sem dados do IPMA o semáforo fica desconhecido", () => {
    const state = aggregate(
      inputs({ warnings: { id: "ipma-warnings", status: "unavailable", data: null } }),
      now,
    );
    expect(state.levelKnown).toBe(false);
    expect(state.headline).toMatch(/Não foi possível/);
  });

  it("resume incêndios em curso e sismos sentidos nas últimas 24 h", () => {
    const fire = {
      kind: "fire",
      id: "f",
      severity: "orange",
      active: true,
      place: { district: "aveiro", region: "continente", label: "Aveiro" },
    } as FireEvent;
    const quake = {
      kind: "earthquake",
      id: "q",
      severity: "yellow",
      magnitude: 3.3,
      felt: true,
      occurredAt: "2026-09-29T09:00:00.000Z",
      place: { region: "continente", label: "SE Torre de Moncorvo" },
    } as EarthquakeEvent;
    const state = aggregate(
      inputs({
        fires: ok("fogos", [fire, { ...fire, id: "g" }]),
        earthquakes: ok("ipma-seismic", [quake]),
      }),
      now,
    );
    expect(state.summary).toContain("2 incêndios em curso.");
    expect(state.summary).toContain(
      "1 sismo sentido nas últimas 24 horas: magnitude 3,3, SE Torre de Moncorvo.",
    );
    expect(state.districts.aveiro?.activeFires).toBe(2);
  });

  it("filtra sismos pequenos não sentidos da lista", () => {
    const small = {
      kind: "earthquake",
      id: "s",
      severity: "none",
      magnitude: 1.2,
      felt: false,
      occurredAt: now.toISOString(),
      place: { region: "continente", label: "x" },
    } as EarthquakeEvent;
    const state = aggregate(inputs({ earthquakes: ok("ipma-seismic", [small]) }), now);
    expect(state.earthquakes.data).toEqual([]);
  });

  it("assinala risco de incêndio máximo", () => {
    const state = aggregate(
      inputs({
        fireRisk: ok("ipma-rcm", {
          today: { date: "d", byDico: { "0101": 5, "0102": 5, "0103": 4 } },
          tomorrow: { date: "e", byDico: {} },
        }),
      }),
      now,
    );
    expect(state.summary).toContain("Risco de incêndio máximo em 2 concelhos hoje.");
  });

  it("diz quando a informação de incêndios não está disponível", () => {
    const state = aggregate(
      inputs({ fires: { id: "fogos", status: "disabled", data: null } }),
      now,
    );
    expect(state.summary).toContain("Informação sobre incêndios indisponível.");
  });
});
