import { describe, expect, it } from "vitest";

import { allConcelhos } from "@/data/dico";
import { districtOfDico } from "@/data/dico-district";

describe("districtOfDico", () => {
  it("dá o mesmo distrito que a tabela dos concelhos, para todos os concelhos", () => {
    const concelhos = allConcelhos();
    expect(concelhos.length).toBeGreaterThan(300);
    for (const c of concelhos) expect(districtOfDico(c.dico), c.dico).toBe(c.district);
  });

  it("devolve undefined para códigos desconhecidos", () => {
    expect(districtOfDico("9901")).toBeUndefined();
    expect(districtOfDico("")).toBeUndefined();
  });
});
