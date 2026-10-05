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
