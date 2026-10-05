import { describe, expect, it } from "vitest";

import { allConcelhos } from "@/data/dico";
import { aggregate } from "@/lib/state/aggregate";
import {
  districtTopics,
  groupWarnings,
  riskLevel,
  riskSummary,
  warningTypes,
} from "@/lib/state/bulletin";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { SourceResult, WarningEvent } from "@/lib/sources/types";

function warning(district: string, overrides: Partial<WarningEvent> = {}): WarningEvent {
  return {
    kind: "warning",
    id: `${district}-${overrides.type ?? "Trovoada"}-${overrides.startsAt ?? "a"}`,
    severity: "yellow",
    title: "Aviso amarelo de trovoada",
    type: "Trovoada",
    description: "Condições favoráveis para trovoada.",
    area: district.toUpperCase(),
    place: { district, region: "continente", label: district },
    startsAt: "2026-10-04T12:00:00.000Z",
    endsAt: "2026-10-04T21:00:00.000Z",
    ...overrides,
  };
}

describe("groupWarnings", () => {
  it("mostra uma vez o mesmo aviso emitido para vários distritos", () => {
    const groups = groupWarnings([warning("porto"), warning("braga"), warning("aveiro")]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.windows[0]!.items.map((w) => w.place.label)).toEqual([
      "aveiro",
      "braga",
      "porto",
    ]);
  });

  it("junta horários diferentes do mesmo aviso num só grupo, com uma janela cada", () => {
    const groups = groupWarnings([
      warning("porto"),
      warning("braga", { startsAt: "2026-10-05T12:00:00.000Z" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.windows).toHaveLength(2);
  });

  it("separa avisos com nível ou texto diferentes", () => {
    const groups = groupWarnings([
      warning("porto"),
      warning("beja", { severity: "orange" }),
      warning("faro", { description: "Outro texto." }),
    ]);
    expect(groups).toHaveLength(3);
    // O nível mais alto vem primeiro.
    expect(groups[0]!.severity).toBe("orange");
  });
});

describe("riskLevel", () => {
  it("usa as mesmas cores da tabela de risco", () => {
    expect([1, 2, 3, 4, 5].map(riskLevel)).toEqual(["none", "yellow", "orange", "orange", "red"]);
  });
});

describe("warningTypes", () => {
  it("junta os tipos sem repetir", () => {
    expect(
      warningTypes(
        [
          warning("porto"),
          warning("braga", { type: "Precipitação" }),
          warning("faro", { type: "Trovoada" }),
        ],
        getDictionary("pt"),
      ),
    ).toBe("trovoada e precipitação");
  });
});

describe("riskSummary", () => {
  const pt = getDictionary("pt");
  const en = getDictionary("en");

  it("com todos os concelhos no mesmo nível, diz 'em todos os N concelhos'", () => {
    const sixteen = Array(16).fill(1);
    expect(riskSummary(sixteen, pt, "district")).toEqual({
      value: "Reduzido",
      detail: "em todos os 16 concelhos",
    });
    expect(riskSummary(sixteen, en, "district")).toEqual({
      value: "Low",
      detail: "in all 16 municipalities",
    });
    expect(riskSummary(Array(278).fill(3), pt, "country")).toEqual({
      value: "Elevado",
      detail: "hoje, em todos os 278 concelhos",
    });
  });

  it("com níveis diferentes, mantém 'Até X' e conta os concelhos no nível mais alto", () => {
    expect(riskSummary([1, 2, 3, 3, 1], pt, "district")).toEqual({
      value: "Até elevado",
      detail: "em 2 concelhos",
    });
    expect(riskSummary([1, 4, 2], en, "country")).toEqual({
      value: "Up to very high",
      detail: "today, in 1 municipality",
    });
  });

  it("é a linha do risco na página do distrito", () => {
    const byDico = Object.fromEntries(
      allConcelhos()
        .filter((c) => c.district === "lisboa")
        .map((c) => [c.dico, 1]),
    );
    const ok = <T>(id: SourceResult<T>["id"], data: T): SourceResult<T> => ({
      id,
      status: "ok",
      data,
      fetchedAt: "2026-10-05T10:00:00.000Z",
    });
    const state = aggregate(
      {
        warnings: ok("ipma-warnings", []),
        earthquakes: ok("ipma-seismic", []),
        fires: ok("fogos", []),
        fireRisk: ok("ipma-rcm", { today: { date: "", byDico }, tomorrow: { date: "", byDico } }),
        uv: ok("ipma-uv", []),
        airQuality: ok("openmeteo-aq", []),
      },
      new Date("2026-10-05T10:00:00.000Z"),
    );
    const risk = districtTopics(state, "lisboa", pt).find((topic) => topic.id === "risco");
    expect(risk).toMatchObject({ value: "Reduzido", detail: "em todos os 16 concelhos" });
  });
});
