import { describe, expect, it } from "vitest";

import { getDistrict } from "@/data/districts";
import { buildWarningsFeed } from "@/lib/feeds/warnings";
import { feedPath } from "@/lib/feeds/paths";
import { aggregate } from "@/lib/state/aggregate";
import type { SourceResult, WarningEvent } from "@/lib/sources/types";

const now = new Date("2026-10-04T09:00:00.000Z");
const ok = <T>(id: SourceResult<T>["id"], data: T): SourceResult<T> => ({
  id,
  status: "ok",
  data,
  fetchedAt: now.toISOString(),
});

function warning(district: string, overrides: Partial<WarningEvent> = {}): WarningEvent {
  return {
    kind: "warning",
    id: `${district}-${overrides.type ?? "Trovoada"}`,
    severity: "yellow",
    title: "Aviso amarelo de trovoada",
    type: "Trovoada",
    description: "Condições favoráveis para trovoada & aguaceiros <fortes>.",
    area: { porto: "PTO", braga: "BRG", lisboa: "LSB" }[district] ?? district.toUpperCase(),
    place: { district, region: "continente", label: district },
    startsAt: "2026-10-04T12:00:00.000Z",
    endsAt: "2026-10-04T21:00:00.000Z",
    ...overrides,
  };
}

const state = (warnings: WarningEvent[]) =>
  aggregate(
    {
      warnings: ok("ipma-warnings", warnings),
      earthquakes: ok("ipma-seismic", []),
      fires: ok("fogos", []),
      fireRisk: ok("ipma-rcm", {
        today: { date: "", byDico: {} },
        tomorrow: { date: "", byDico: {} },
      }),
      uv: ok("ipma-uv", []),
      airQuality: ok("openmeteo-aq", []),
    },
    now,
  );

const items = (xml: string) => xml.match(/<item>/g)?.length ?? 0;

describe("buildWarningsFeed", () => {
  const warnings = [
    warning("porto"),
    warning("braga"),
    warning("lisboa", { type: "Vento", severity: "orange", description: undefined }),
    warning("lisboa", { type: "Chuva", severity: "none" }),
  ];

  it("junta o mesmo aviso de vários distritos num item e ignora os verdes", () => {
    const xml = buildWarningsFeed({ state: state(warnings), locale: "pt" });
    expect(items(xml)).toBe(2);
    expect(xml).toContain("<title>Aviso amarelo de trovoada · Braga, Porto</title>");
    expect(xml).toContain("<title>Aviso laranja de vento · Lisboa</title>");
    expect(xml).not.toContain("chuva");
  });

  it("escapa o texto do IPMA e usa horas absolutas", () => {
    const xml = buildWarningsFeed({ state: state(warnings), locale: "pt" });
    expect(xml).toContain("&amp;amp; aguaceiros &amp;lt;fortes&amp;gt;");
    expect(xml).toContain("De domingo, 4 de outubro, 13:00 a domingo, 4 de outubro, 22:00");
    expect(xml).not.toMatch(/hoje|amanhã/);
  });

  it("um aviso futuro tem a data de publicação dos dados, não do futuro", () => {
    const xml = buildWarningsFeed({ state: state(warnings), locale: "pt" });
    expect(xml).toContain(`<pubDate>${now.toUTCString()}</pubDate>`);
  });

  it("no distrito, só os avisos dele; em inglês, os termos traduzidos", () => {
    const lisboa = getDistrict("lisboa")!;
    const xml = buildWarningsFeed({ state: state(warnings), locale: "en", district: lisboa });
    expect(items(xml)).toBe(1);
    expect(xml).toContain("<title>Orange warning: wind · Lisbon</title>");
    expect(xml).toContain("<language>en-GB</language>");
    expect(xml).toContain(`href="https://portugalagora.pt/en/lisboa/avisos/rss"`);
  });

  it("sem avisos é um feed válido, sem itens", () => {
    const xml = buildWarningsFeed({ state: state([]), locale: "pt" });
    expect(items(xml)).toBe(0);
    expect(xml).toContain("<title>Avisos em Portugal · Portugal Agora</title>");
  });
});

describe("feedPath", () => {
  it("português na raiz, inglês em /en", () => {
    expect(feedPath("pt")).toBe("/avisos/rss");
    expect(feedPath("en", getDistrict("porto"))).toBe("/en/porto/avisos/rss");
  });
});
