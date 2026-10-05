import { describe, expect, it } from "vitest";

import { getDictionary } from "@/lib/i18n/dictionaries";
import { locales } from "@/lib/i18n/locales";

const keys = ["overview", "warnings", "fires", "quakes", "riskAir"] as const;

describe("nomes curtos dos separadores", () => {
  it.each(locales)("%s: o nome visível faz parte do nome acessível (WCAG 2.5.3)", (locale) => {
    const t = getDictionary(locale);
    for (const key of keys) {
      expect(t.nav[key].toLowerCase()).toContain(t.nav.short[key].toLowerCase());
    }
  });

  it("os nomes curtos são os previstos", () => {
    expect(getDictionary("pt").nav.short.riskAir).toBe("Risco");
    expect(getDictionary("en").nav.short).toMatchObject({ quakes: "Quakes", riskAir: "Risk" });
  });
});

describe("textos do mapa das páginas de tema", () => {
  it("dizem que o mapa é só do distrito e oferecem saltá-lo, nos dois idiomas", () => {
    const pt = getDictionary("pt").sections;
    const en = getDictionary("en").sections;
    expect(pt.mapIntroDistrict("em Lisboa")).toBe(
      "Só o que acontece em Lisboa. Aproxime e toque num evento para ver o detalhe.",
    );
    expect(en.mapIntroDistrict("in Lisboa")).toBe(
      "Only what is happening in Lisboa. Zoom in and tap an event for details.",
    );
    expect([pt.skipMap, en.skipMap]).toEqual(["Saltar o mapa", "Skip the map"]);
  });
});

describe("dia do risco de incêndio no mapa", () => {
  it("tem nome nos dois idiomas e reutiliza Hoje/Amanhã", () => {
    expect(getDictionary("pt").map.riskDay).toBe("Dia do risco de incêndio");
    expect(getDictionary("en").map.riskDay).toBe("Wildfire risk day");
    expect([getDictionary("pt").lists.today, getDictionary("pt").lists.tomorrow]).toEqual([
      "Hoje",
      "Amanhã",
    ]);
    expect([getDictionary("en").lists.today, getDictionary("en").lists.tomorrow]).toEqual([
      "Today",
      "Tomorrow",
    ]);
  });
});
