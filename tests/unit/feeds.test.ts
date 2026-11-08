import { describe, expect, it } from "vitest";

import { getDistrict } from "@/data/districts";
import { buildFiresFeed } from "@/lib/feeds/fires";
import { buildQuakesFeed } from "@/lib/feeds/quakes";
import { buildWarningsFeed } from "@/lib/feeds/warnings";
import { feedPath } from "@/lib/feeds/paths";
import { aggregate } from "@/lib/state/aggregate";
import type { EarthquakeEvent, FireEvent, SourceResult, WarningEvent } from "@/lib/sources/types";

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

const state = (
  warnings: WarningEvent[],
  fires: FireEvent[] = [],
  earthquakes: EarthquakeEvent[] = [],
) =>
  aggregate(
    {
      warnings: ok("ipma-warnings", warnings),
      earthquakes: ok("ipma-seismic", earthquakes),
      fires: ok("fogos", fires),
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

const fire = (overrides: Partial<FireEvent>): FireEvent => ({
  kind: "fire",
  id: "f1",
  severity: "red",
  title: "",
  status: "Em curso",
  statusCode: 5,
  active: true,
  startedAt: "2026-10-04T07:30:00.000Z",
  operatives: 42,
  groundUnits: 12,
  aerialUnits: 1,
  nature: "Mato",
  place: { district: "santarem", region: "continente", label: "Mação, Envendos" },
  ...overrides,
});

const quake = (overrides: Partial<EarthquakeEvent>): EarthquakeEvent => ({
  kind: "earthquake",
  id: "q1",
  severity: "yellow",
  title: "",
  magnitude: 3.4,
  depthKm: 11,
  felt: true,
  occurredAt: "2026-10-04T03:12:00.000Z",
  place: { district: "lisboa", region: "continente", label: "NW Arruda dos Vinhos" },
  ...overrides,
});

describe("buildFiresFeed", () => {
  const fires = [
    fire({}),
    fire({ id: "f2", severity: "none", status: "Em vigilância", statusCode: 8 }),
    fire({ id: "f3", place: { district: "faro", region: "continente", label: "Loulé, Ameixial" } }),
  ];

  it("só os incêndios em curso, com meios e hora de início absoluta", () => {
    const xml = buildFiresFeed({ state: state([], fires), locale: "pt" });
    expect(items(xml)).toBe(2);
    expect(xml).toContain("<title>Em curso · Mação, Envendos</title>");
    expect(xml).toContain("42 operacionais, 12 meios terrestres, 1 meio aéreo.");
    expect(xml).toContain("Início: domingo, 4 de outubro, 08:30.");
    expect(xml).toContain('<guid isPermaLink="false">f1|5</guid>');
  });

  it("num distrito, só os dele; em inglês, os termos traduzidos", () => {
    const xml = buildFiresFeed({
      state: state([], fires),
      locale: "en",
      district: getDistrict("faro"),
    });
    expect(items(xml)).toBe(1);
    expect(xml).toContain("Wildfires in Faro · Portugal Agora");
    expect(xml).toContain("Loulé, Ameixial");
  });
});

describe("buildQuakesFeed", () => {
  const quakes = [
    quake({}),
    quake({
      id: "q2",
      felt: false,
      magnitude: 2.4,
      place: { region: "continente", label: "Golfo de Cádis" },
    }),
  ];

  it("no país, só os sentidos ou em território português", () => {
    const xml = buildQuakesFeed({ state: state([], [], quakes), locale: "pt" });
    expect(items(xml)).toBe(1);
    expect(xml).toContain("<title>Magnitude 3,4 · NW Arruda dos Vinhos · sentido</title>");
    expect(xml).toContain("Domingo, 4 de outubro, 04:12, a 11 km de profundidade.");
  });

  it("num distrito, só os dele", () => {
    const porto = buildQuakesFeed({
      state: state([], [], quakes),
      locale: "pt",
      district: getDistrict("porto"),
    });
    expect(items(porto)).toBe(0);
    const lisboa = buildQuakesFeed({
      state: state([], [], quakes),
      locale: "en",
      district: getDistrict("lisboa"),
    });
    expect(lisboa).toContain("Magnitude 3.4");
    expect(lisboa).toContain("<language>en-GB</language>");
  });
});

describe("feedPath", () => {
  it("português na raiz, inglês em /en, um endereço por tema", () => {
    expect(feedPath("pt", "avisos")).toBe("/avisos/rss");
    expect(feedPath("en", "sismos", getDistrict("porto"))).toBe("/en/porto/sismos/rss");
    expect(feedPath("pt", "incendios", getDistrict("faro"))).toBe("/faro/incendios/rss");
  });
});
