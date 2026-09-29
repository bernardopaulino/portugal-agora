import { describe, expect, it } from "vitest";

import { getDistrict } from "@/data/districts";
import type { CountryState } from "@/lib/state/aggregate";
import { districtFireRisk, districtHeadline, districtSummary } from "@/lib/state/district";
import type { WarningEvent } from "@/lib/sources/types";

const lisboa = getDistrict("lisboa")!;
const porto = getDistrict("porto")!;

function w(type: string, severity: WarningEvent["severity"], district = "lisboa"): WarningEvent {
  return {
    kind: "warning",
    id: `${type}-${severity}-${district}`,
    severity,
    title: "",
    type,
    area: "LSB",
    place: { district, region: "continente", label: district },
    startsAt: "2026-09-29T12:00:00.000Z",
    endsAt: "2026-09-30T12:00:00.000Z",
  };
}

describe("districtHeadline", () => {
  it("sem avisos", () => {
    expect(districtHeadline(porto, [], true)).toBe("Sem avisos meteorológicos no Porto.");
  });
  it("agrupa tipos por nível, do mais alto para o mais baixo", () => {
    expect(
      districtHeadline(
        lisboa,
        [
          w("Vento", "orange"),
          w("Precipitação", "yellow"),
          w("Trovoada", "yellow"),
          w("Vento", "yellow", "porto"),
        ],
        true,
      ),
    ).toBe("Aviso laranja de vento em Lisboa. Aviso amarelo de precipitação e trovoada.");
  });
  it("sem dados do IPMA", () => {
    expect(districtHeadline(lisboa, [], false)).toMatch(/Não foi possível/);
  });
});

describe("risco e resumo do distrito", () => {
  const state = {
    fires: { id: "fogos", status: "ok", data: [] },
    earthquakes: { id: "ipma-seismic", status: "ok", data: [] },
    fireRisk: {
      id: "ipma-rcm",
      status: "ok",
      data: {
        today: { date: "a", byDico: { "1106": 3, "1105": 3, "1101": 1, "1301": 5 } },
        tomorrow: { date: "b", byDico: { "1106": 2 } },
      },
    },
  } as unknown as CountryState;

  it("lista só os concelhos do distrito, do maior risco para o menor", () => {
    const risk = districtFireRisk(state, "lisboa");
    expect(risk.map((r) => r.dico)).toEqual(["1106", "1105", "1101"]);
    expect(risk[0]).toMatchObject({ name: "Lisboa", today: 3, tomorrow: 2 });
  });

  it("resume incêndios e risco", () => {
    expect(districtSummary(state, lisboa)).toEqual([
      "Nenhum incêndio em curso.",
      "Risco de incêndio hoje: até elevado (2 concelhos).",
    ]);
  });
});
