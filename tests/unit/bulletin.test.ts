import { describe, expect, it } from "vitest";

import { groupWarnings, riskLevel, warningTypes } from "@/lib/state/bulletin";
import type { WarningEvent } from "@/lib/sources/types";

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
      warningTypes([
        warning("porto"),
        warning("braga", { type: "Precipitação" }),
        warning("faro", { type: "Trovoada" }),
      ]),
    ).toBe("trovoada e precipitação");
  });
});
