import { describe, expect, it } from "vitest";

import { getDictionary } from "@/lib/i18n/dictionaries";
import { dataStamp, headlineSize } from "@/lib/og/text";

describe("headlineSize", () => {
  it("desce com o comprimento do título", () => {
    expect(headlineSize("Sem avisos meteorológicos.")).toBe(72);
    expect(headlineSize("Aviso laranja em Beja. Aviso amarelo em 13 distritos.")).toBe(60);
    const long =
      "Aviso laranja de agitação marítima e vento em Viana do Castelo. Aviso amarelo de precipitação e trovoada.";
    expect(headlineSize(long)).toBe(50);
    expect(headlineSize(long + long)).toBe(42);
  });

  it("um título de 4 linhas no tamanho mais pequeno cabe na altura disponível", () => {
    // 630 px menos o cabeçalho (~70), o rodapé (~80) e as margens (~108).
    expect(42 * 1.08 * 4).toBeLessThan(630 - 70 - 80 - 108);
  });
});

describe("dataStamp", () => {
  const iso = "2026-10-05T10:48:00.000Z"; // 11:48 em Lisboa (hora de verão)

  it("em português, na hora de Lisboa", () => {
    expect(dataStamp(iso, "pt", getDictionary("pt"))).toBe("Dados de 5 de out., às 11:48");
  });

  it("em inglês", () => {
    expect(dataStamp(iso, "en", getDictionary("en"))).toBe("Data as of 5 Oct, 11:48");
  });

  it("no inverno, Lisboa está em UTC", () => {
    expect(dataStamp("2026-01-15T09:05:00.000Z", "pt", getDictionary("pt"))).toBe(
      "Dados de 15 de jan., às 09:05",
    );
  });
});
