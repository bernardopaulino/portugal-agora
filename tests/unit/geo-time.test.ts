import { describe, expect, it } from "vitest";

import { locateDistrict, regionAt } from "@/lib/geo/locate";
import { distanceKm } from "@/lib/geo/geometry";
import { formatDayTime, formatRange, formatRelative, formatTime, ipmaUtc } from "@/lib/time/format";

describe("locateDistrict", () => {
  it.each([
    [[-9.1393, 38.7223], "lisboa"],
    [[-8.611, 41.1496], "porto"],
    [[-7.9304, 37.0194], "faro"],
    [[-25.6687, 37.7412], "acores"],
    [[-16.9241, 32.6669], "madeira"],
    [[-6.9, 40.3], "guarda"],
  ] as const)("%j → %s", (point, slug) => {
    expect(locateDistrict([point[0], point[1]])).toBe(slug);
  });

  it("no mar junto à costa usa a capital mais próxima", () => {
    // Ao largo de Cascais: fora de qualquer polígono, a ~33 km de Lisboa.
    expect(locateDistrict([-9.5, 38.68])).toBe("lisboa");
  });

  it("longe de Portugal devolve undefined", () => {
    expect(locateDistrict([-3.7, 40.4])).toBeUndefined();
  });

  it("classifica a região", () => {
    expect(regionAt([-28, 38.5])).toBe("acores");
    expect(regionAt([-17, 32.7])).toBe("madeira");
    expect(regionAt([-8, 40])).toBe("continente");
  });
});

describe("distanceKm", () => {
  it("Lisboa–Porto ≈ 274 km", () => {
    expect(distanceKm([-9.1393, 38.7223], [-8.611, 41.1496])).toBeCloseTo(274, -1);
  });
});

describe("tempo", () => {
  const now = new Date("2026-09-29T16:00:00Z");

  it("acrescenta UTC às horas do IPMA", () => {
    expect(ipmaUtc("2026-09-29T15:00:00")).toBe("2026-09-29T15:00:00.000Z");
    expect(ipmaUtc("2026-09-29T15:00:00Z")).toBe("2026-09-29T15:00:00.000Z");
  });

  it("mostra horas locais (verão: UTC+1; Açores: UTC)", () => {
    expect(formatTime("2026-09-29T15:00:00Z")).toBe("16:00");
    expect(formatTime("2026-09-29T15:00:00Z", "acores")).toBe("15:00");
  });

  it("diz hoje/amanhã/ontem", () => {
    expect(formatDayTime("2026-09-29T20:00:00Z", now)).toBe("hoje às 21:00");
    expect(formatDayTime("2026-09-30T05:00:00Z", now)).toBe("amanhã às 06:00");
    expect(formatDayTime("2026-09-28T20:00:00Z", now)).toBe("ontem às 21:00");
  });

  it("formata tempo relativo", () => {
    expect(formatRelative("2026-09-29T15:59:30Z", now)).toBe("agora mesmo");
    expect(formatRelative("2026-09-29T15:47:00Z", now)).toBe("há 13 min");
    expect(formatRelative("2026-09-29T13:00:00Z", now)).toBe("há 3 h");
  });
});

describe("formatRange", () => {
  const now = new Date("2026-09-29T16:00:00Z");
  it("aviso já em vigor", () => {
    expect(formatRange("2026-09-29T12:00:00Z", "2026-09-29T21:00:00Z", now)).toBe(
      "em vigor até às 22:00 de hoje",
    );
  });
  it("aviso futuro no mesmo dia", () => {
    expect(formatRange("2026-09-29T17:00:00Z", "2026-09-29T21:00:00Z", now)).toBe(
      "hoje, das 18:00 às 22:00",
    );
  });
  it("aviso que atravessa a meia-noite", () => {
    expect(formatRange("2026-09-29T18:00:00Z", "2026-09-30T03:00:00Z", now)).toBe(
      "das 19:00 de hoje às 04:00 de amanhã",
    );
  });
});
