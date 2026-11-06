import { describe, expect, it } from "vitest";

import { fireDataRegions, fireRiskRegions, getDistrict } from "@/data/districts";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { CountryState } from "@/lib/state/aggregate";
import { districtTopics } from "@/lib/state/bulletin";

const pt = getDictionary("pt");
const en = getDictionary("en");
const d = (slug: string) => getDistrict(slug)!;

describe("nomes de lugares com o artigo certo", () => {
  it.each([
    ["lisboa", "Mapa de Lisboa", "Map of Lisbon"],
    ["porto", "Mapa do Porto", "Map of Porto"],
    ["guarda", "Mapa da Guarda", "Map of Guarda"],
    ["acores", "Mapa dos Açores", "Map of the Azores"],
    ["madeira", "Mapa da Madeira", "Map of Madeira"],
  ])("%s", (slug, mapPt, mapEn) => {
    expect(pt.sections.mapOf(d(slug))).toBe(mapPt);
    expect(en.sections.mapOf(d(slug))).toBe(mapEn);
  });

  it("as capitais que levam artigo: Porto, Guarda, Funchal", () => {
    expect(pt.stage.forecastFor("Porto")).toBe("Previsão para o Porto");
    expect(pt.stage.forecastFor("Guarda")).toBe("Previsão para a Guarda");
    expect(pt.stage.forecastFor("Lisboa")).toBe("Previsão para Lisboa");
    expect(pt.districtPages.airIntro("Funchal")).toBe(
      "A qualidade do ar e o índice UV no Funchal.",
    );
    expect(pt.districtPages.airIntro("Ponta Delgada")).toBe(
      "A qualidade do ar e o índice UV em Ponta Delgada.",
    );
    expect(pt.lists.airNoteDistrict("Porto")).toContain("para o Porto.");
  });

  it("a qualidade do ar concorda com 'qualidade', não com 'ar'", () => {
    expect(pt.topics.airValue("Moderada")).toBe("Qualidade moderada");
    expect(en.topics.airValue("Moderate")).toBe("Moderate air");
  });
});

describe("cobertura das fontes por região", () => {
  it("o Fogos.pt não tem os Açores; o risco de incêndio é só do continente", () => {
    expect(fireDataRegions).toEqual(["continente", "madeira"]);
    expect(fireRiskRegions).toEqual(["continente"]);
  });

  it("nos Açores, a linha dos incêndios diz que não há dados, não 'nenhum'", () => {
    const state = {
      warnings: { data: [] },
      fires: { data: [] },
      earthquakes: { data: [] },
      fireRisk: { data: null },
      airQuality: { data: [] },
      uv: { data: [] },
      districts: {},
    } as unknown as CountryState;
    const fires = (slug: string) =>
      districtTopics(state, slug, pt).find((topic) => topic.id === "incendios")!;
    expect(fires("acores")).toMatchObject({ value: "Sem dados", level: "unknown" });
    expect(fires("acores").detail).toBe("o Fogos.pt não tem dados nos Açores");
    expect(fires("madeira").value).toBe("Nenhum");
    expect(fires("lisboa").value).toBe("Nenhum");
  });

  it("a introdução dos incêndios de cada região diz de onde vêm os dados", () => {
    expect(pt.districtPages.firesIntro(d("lisboa"))).toContain("(ANEPC)");
    expect(pt.districtPages.firesIntro(d("madeira"))).toContain("proteção civil regional");
    expect(pt.districtPages.firesIntro(d("acores"))).toBe(
      "O Fogos.pt não tem dados de incêndios nos Açores.",
    );
  });
});

describe("avisos numa só zona", () => {
  it.each([
    ["Açores, Grupo Oriental", "nos "],
    ["Madeira, costa norte", "na "],
    ["Porto", "no "],
    ["Guarda", "na "],
    ["Lisboa", "em "],
    ["Porto Santo", "em "],
  ])("%s → %j", (area, prefix) => {
    expect(pt.lists.windowPlaces(1, area)).toBe(prefix);
  });

  it("em inglês, os Açores levam artigo", () => {
    expect(en.lists.windowPlaces(1, "Azores, Eastern Group")).toBe("in the ");
    expect(en.lists.windowPlaces(1, "Madeira, north coast")).toBe("in ");
    expect(pt.lists.windowPlaces(3, "Lisboa")).toBe("3 locais: ");
  });
});
