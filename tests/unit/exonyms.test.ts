import { describe, expect, it } from "vitest";

import { getDistrict } from "@/data/districts";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { districtHeadline, placesPhrase } from "@/lib/state/bulletin";

const en = getDictionary("en");
const pt = getDictionary("pt");
const lisboa = getDistrict("lisboa")!;
const acores = getDistrict("acores")!;

describe("nomes em inglês (exónimos)", () => {
  it("Lisboa é Lisbon e os Açores são the Azores", () => {
    expect(districtHeadline(lisboa, [], true, en)).toBe("No weather warnings in Lisbon.");
    expect(districtHeadline(acores, [], true, en)).toBe("No weather warnings in the Azores.");
    expect(en.districtName(lisboa)).toBe("Lisbon");
    expect(en.districtName(acores)).toBe("Azores");
    expect(en.capitalName(lisboa)).toBe("Lisbon");
  });

  it("a frase dos sítios mistura distritos e os Açores", () => {
    expect(placesPhrase(["porto", "lisboa"], en)).toBe("in Porto and in Lisbon");
    expect(placesPhrase(["porto", "braga", "lisboa", "acores"], en)).toBe(
      "in 3 districts and in the Azores",
    );
    expect(placesPhrase(["lisboa", "acores"], en)).toBe("in Lisbon and in the Azores");
  });

  it("as áreas de aviso das ilhas e o concelho de Lisboa", () => {
    expect(en.areaName("ACE")).toBe("Azores, Central Group");
    expect(en.areaName("MRM")).toBe("Madeira, mountain areas");
    expect(en.areaName("MPS")).toBe("Porto Santo");
    expect(en.areaName("LSB")).toBe("Lisbon");
    expect(en.concelhoName("1106", "Lisboa")).toBe("Lisbon");
  });

  it("os outros nomes ficam em português, com acentos", () => {
    for (const slug of ["porto", "evora", "setubal", "braganca", "santarem", "madeira"]) {
      const d = getDistrict(slug)!;
      expect(en.districtName(d)).toBe(d.name);
    }
    expect(en.districtName(getDistrict("evora")!)).toBe("Évora");
    expect(en.capitalName(getDistrict("acores")!)).toBe("Ponta Delgada");
    expect(en.concelhoName("0705", "Évora")).toBe("Évora");
  });

  it("em português não muda nada", () => {
    expect(districtHeadline(lisboa, [], true, pt)).toBe("Sem avisos meteorológicos em Lisboa.");
    expect(districtHeadline(acores, [], true, pt)).toBe("Sem avisos meteorológicos nos Açores.");
    expect(pt.areaName("ACE")).toBe("Açores, Grupo Central");
    expect(pt.areaName("LSB")).toBe("Lisboa");
    expect(pt.concelhoName("1106", "Lisboa")).toBe("Lisboa");
    expect(pt.capitalName(lisboa)).toBe("Lisboa");
  });
});
