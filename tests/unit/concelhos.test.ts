import { describe, expect, it } from "vitest";

import { concelhoForDico, concelhos, concelhosOf, getConcelho } from "@/data/concelhos";
import { districts } from "@/data/districts";
import { regionAt } from "@/lib/geo/locate";

describe("concelhos", () => {
  it("são os 308 da CAOP, cada um num distrito que existe", () => {
    expect(concelhos).toHaveLength(308);
    const slugs = new Set(districts.map((d) => d.slug));
    expect(concelhos.every((c) => slugs.has(c.district))).toBe(true);
  });

  it("o endereço é único no distrito e não choca com as páginas dos temas", () => {
    const paths = concelhos.map((c) => `${c.district}/${c.slug}`);
    expect(new Set(paths).size).toBe(paths.length);
    for (const reserved of ["avisos", "incendios", "sismos", "risco", "rss", "opengraph-image"])
      expect(concelhos.some((c) => c.slug === reserved)).toBe(false);
    expect(concelhos.every((c) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(c.slug))).toBe(true);
  });

  it("o ponto de cada concelho cai na sua região", () => {
    for (const c of concelhos) {
      const region =
        c.district === "acores" || c.district === "madeira" ? c.district : "continente";
      expect(regionAt(c.point), `${c.name}`).toBe(region);
    }
  });

  it("procura por distrito e slug, ou por código", () => {
    expect(getConcelho("lisboa", "sintra")?.dico).toBe("1111");
    expect(getConcelho("faro", "lagoa")?.name).toBe("Lagoa");
    expect(getConcelho("acores", "lagoa")?.dico).toBe("4201");
    expect(concelhoForDico("1106")?.slug).toBe("lisboa");
    expect(concelhosOf("lisboa").map((c) => c.name)).toContain("Sintra");
  });
});
