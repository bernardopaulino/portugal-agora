import { describe, expect, it } from "vitest";

import raw from "../fixtures/ipma-warnings.json";
import { ipmaWarningsSchema, normalizeWarnings } from "@/lib/sources/ipma-warnings";

const parsed = ipmaWarningsSchema.parse(raw);
const now = new Date("2026-09-29T16:51:00Z");

describe("normalizeWarnings", () => {
  const warnings = normalizeWarnings(parsed, now);

  it("valida a resposta real do IPMA", () => {
    expect(parsed.length).toBeGreaterThan(100);
  });

  it("ignora os avisos verdes e os já terminados", () => {
    expect(warnings.every((w) => w.severity !== "none")).toBe(true);
    expect(warnings.every((w) => new Date(w.endsAt) > now)).toBe(true);
  });

  it("interpreta as horas do IPMA como UTC", () => {
    const porto = warnings.find((w) => w.area === "PTO" && w.type === "Precipitação");
    expect(porto?.startsAt).toBe("2026-09-29T15:00:00.000Z");
  });

  it("associa cada aviso a um distrito com texto legível", () => {
    const porto = warnings.find((w) => w.area === "PTO");
    expect(porto?.place).toEqual({ district: "porto", region: "continente", label: "Porto" });
    expect(porto?.title).toMatch(/^Aviso amarelo de /);
  });

  it("dá nomes legíveis às áreas das ilhas", () => {
    const islands = normalizeWarnings(
      [
        {
          text: "",
          awarenessTypeName: "Agitação Marítima",
          idAreaAviso: "MCN",
          startTime: "2026-09-29T12:00:00",
          endTime: "2026-09-30T12:00:00",
          awarenessLevelID: "orange",
        },
      ],
      now,
    );
    expect(islands[0]?.place).toEqual({
      district: "madeira",
      region: "madeira",
      label: "Madeira, costa norte",
    });
    expect(islands[0]?.title).toBe("Aviso laranja de agitação marítima");
  });

  it("ordena por severidade", () => {
    const mixed = normalizeWarnings(
      [
        {
          text: "",
          awarenessTypeName: "Vento",
          idAreaAviso: "LSB",
          startTime: "2026-09-29T12:00:00",
          endTime: "2026-09-30T12:00:00",
          awarenessLevelID: "yellow",
        },
        {
          text: "",
          awarenessTypeName: "Vento",
          idAreaAviso: "FAR",
          startTime: "2026-09-29T12:00:00",
          endTime: "2026-09-30T12:00:00",
          awarenessLevelID: "red",
        },
      ],
      now,
    );
    expect(mixed.map((w) => w.severity)).toEqual(["red", "yellow"]);
  });
});
