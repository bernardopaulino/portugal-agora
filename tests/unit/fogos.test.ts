import { describe, expect, it } from "vitest";

import raw from "../fixtures/fogos-active.json";
import { fireSeverity, fogosSchema, normalizeFires, tidyPlaceName } from "@/lib/sources/fogos";

describe("normalizeFires", () => {
  const fires = normalizeFires(fogosSchema.parse(raw));

  it("valida a resposta real do Fogos.pt", () => {
    expect(fires.length).toBeGreaterThan(0);
  });

  it("ordena os incêndios ativos primeiro", () => {
    const firstInactive = fires.findIndex((f) => !f.active);
    if (firstInactive >= 0) expect(fires.slice(firstInactive).every((f) => !f.active)).toBe(true);
  });

  it("resolve o distrito a partir do código DICO", () => {
    const aveiro = fires.find((f) => f.id === "fogo-20261328520");
    expect(aveiro?.place.district).toBe("aveiro");
    expect(aveiro?.place.label).toBe("Aveiro, Eixo e Eirol");
    expect(aveiro?.coordinates).toEqual([-8.557347, 40.60797]);
  });

  it("converte a hora de início (epoch) para ISO", () => {
    const aveiro = fires.find((f) => f.id === "fogo-20261328520");
    expect(aveiro?.startedAt).toBe(new Date(1789731000 * 1000).toISOString());
  });
});

describe("tidyPlaceName", () => {
  it("põe as partículas em minúsculas no meio do nome", () => {
    expect(tidyPlaceName("Armação De Pêra")).toBe("Armação de Pêra");
    expect(tidyPlaceName("Vila Nova De Gaia")).toBe("Vila Nova de Gaia");
    expect(tidyPlaceName("São Pedro E São Paulo")).toBe("São Pedro e São Paulo");
    expect(tidyPlaceName("Torre Dos Moinhos Das Lajes")).toBe("Torre dos Moinhos das Lajes");
  });

  it("não mexe em nomes sem partículas", () => {
    expect(tidyPlaceName("Duas Igrejas")).toBe("Duas Igrejas");
    // "Ermida" e "Dosel" começam como partículas, mas não o são.
    expect(tidyPlaceName("Santa Ermida Dosel")).toBe("Santa Ermida Dosel");
  });

  it("mantém a partícula quando é a primeira palavra de um nome", () => {
    expect(tidyPlaceName("De Cima")).toBe("De Cima");
    expect(tidyPlaceName("Silves, Do Monte")).toBe("Silves, Do Monte");
    expect(tidyPlaceName("Silves, Armação De Pêra")).toBe("Silves, Armação de Pêra");
  });

  it("é aplicada ao local de cada incêndio", () => {
    const [fire] = normalizeFires(
      fogosSchema.parse({
        ...raw,
        data: [{ ...raw.data[0], concelho: "Silves", freguesia: "Armação De Pêra" }],
      }),
    );
    expect(fire?.place.label).toBe("Silves, Armação de Pêra");
  });
});

describe("fireSeverity", () => {
  it("marca como laranja os incêndios em combate", () => {
    expect(fireSeverity(5, false)).toBe("orange");
    expect(fireSeverity(6, false)).toBe("orange");
  });
  it("marca como amarelo os que estão em resolução", () => {
    expect(fireSeverity(7, false)).toBe("yellow");
  });
  it("não assinala conclusão nem vigilância", () => {
    expect(fireSeverity(8, false)).toBe("none");
    expect(fireSeverity(9, false)).toBe("none");
  });
  it("marca como vermelho os que a ANEPC considera importantes", () => {
    expect(fireSeverity(9, true)).toBe("red");
  });
});
