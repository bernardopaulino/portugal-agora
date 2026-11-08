import { describe, expect, it } from "vitest";

import obsFixture from "../fixtures/ipma-observations.json";
import seaFixture from "../fixtures/ipma-sea.json";
import { ipmaObservationsSchema, normalizeObservations } from "@/lib/sources/ipma-observations";
import { ipmaSeaDaySchema, ipmaSeaLocationsSchema, normalizeSea } from "@/lib/sources/ipma-sea";

describe("observações das estações do IPMA", () => {
  const byDistrict = normalizeObservations(ipmaObservationsSchema.parse(obsFixture));

  it("escolhe a estação do distrito mais próxima da capital, ignorando o -99", () => {
    expect(byDistrict.lisboa).toMatchObject({
      station: "Lisboa, Amoreiras (Lic. Francês)",
      temperature: 17.3,
    });
    expect(Object.values(byDistrict).map((o) => o.station)).not.toContain("Estação sem dados");
    expect(byDistrict.lisboa!.time).toBe("2026-11-08T14:00:00Z");
    expect(byDistrict.porto?.station).toMatch(/Porto|Serra do Pilar/);
  });

  it("nas ilhas, qualquer estação da região conta para o seu distrito", () => {
    expect(byDistrict.acores?.station).toBe("Ponta Delgada (Aeroporto)");
    expect(byDistrict.madeira?.station).toBe("Funchal");
  });

  it("distritos sem estação no ficheiro ficam de fora", () => {
    expect(byDistrict.braganca).toBeUndefined();
  });
});

describe("estado do mar do IPMA", () => {
  const spots = normalizeSea(
    seaFixture.days.map((d) => ipmaSeaDaySchema.parse(d)),
    ipmaSeaLocationsSchema.parse(seaFixture.locations),
  );

  it("liga cada ponto ao distrito pela área de aviso e tira o ', costa'", () => {
    expect(spots.faro?.map((s) => s.name).sort()).toEqual(["Faro", "Sagres"]);
    expect(spots.setubal?.map((s) => s.name)).toEqual(["Sines"]);
    expect(spots.acores?.map((s) => s.name).sort()).toEqual([
      "Horta",
      "Ponta Delgada",
      "Santa Cruz das Flores",
    ]);
    expect(spots.braganca).toBeUndefined();
  });

  it("os dias ficam por ordem e os números em texto passam a números", () => {
    const funchal = spots.madeira!.find((s) => s.name === "Funchal")!;
    expect(funchal.days.map((d) => d.date)).toEqual(["2026-11-08", "2026-11-09"]);
    expect(typeof funchal.days[0]!.waterMax).toBe("number");
    expect(typeof funchal.days[0]!.seaMax).toBe("number");
  });
});
