import { describe, expect, it } from "vitest";

import {
  HISTORY_ORDER,
  levelAt,
  levelSpans,
  pointFromState,
  timeByLevel,
  type HistoryPoint,
} from "@/lib/history/points";
import {
  eventNotificationsFor,
  freshEvents,
  levelsOf,
  notableEvents,
  notificationsFor,
  rises,
} from "@/lib/push/changes";
import { aggregate } from "@/lib/state/aggregate";
import type { EarthquakeEvent, FireEvent, SourceResult, WarningEvent } from "@/lib/sources/types";

const now = new Date("2026-10-04T09:00:00.000Z");
const ok = <T>(id: SourceResult<T>["id"], data: T): SourceResult<T> => ({
  id,
  status: "ok",
  data,
  fetchedAt: now.toISOString(),
});

const warning = (district: string, severity: WarningEvent["severity"], type = "Vento") =>
  ({
    kind: "warning",
    id: `${district}-${type}-${severity}`,
    severity,
    title: "",
    type,
    area: district.toUpperCase(),
    place: { district, region: "continente", label: district },
    startsAt: "2026-10-04T08:00:00.000Z",
    endsAt: "2026-10-04T21:00:00.000Z",
  }) satisfies WarningEvent;

const fire = (active: boolean) =>
  ({
    kind: "fire",
    id: String(Math.random()),
    active,
    severity: "none",
    place: { region: "continente", label: "" },
  }) as unknown as FireEvent;

const state = (warnings: WarningEvent[], fires: FireEvent[] = [], warningsOk = true) =>
  aggregate(
    {
      warnings: warningsOk
        ? ok("ipma-warnings", warnings)
        : { id: "ipma-warnings", status: "unavailable", data: null },
      earthquakes: ok("ipma-seismic", []),
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

describe("histórico", () => {
  it("um carácter por distrito e os incêndios ativos", () => {
    const p = pointFromState(state([warning("lisboa", "orange")], [fire(true), fire(false)]));
    expect(p.l).toHaveLength(HISTORY_ORDER.length);
    expect(levelAt(p, "lisboa")).toBe("orange");
    expect(levelAt(p, "porto")).toBe("none");
    expect(p.f).toBe(1);
  });

  it("sem avisos do IPMA, os níveis ficam desconhecidos", () => {
    const p = pointFromState(state([], [], false));
    expect(levelAt(p, "lisboa")).toBe("unknown");
  });

  it("junta pontos seguidos com o mesmo nível e soma o tempo", () => {
    const at = (t: string, lisboa: string): HistoryPoint => ({
      t,
      l: HISTORY_ORDER.map((s) => (s === "lisboa" ? lisboa : "n")).join(""),
      f: 0,
    });
    const points = [
      at("2026-10-04T00:00:00Z", "n"),
      at("2026-10-04T01:00:00Z", "y"),
      at("2026-10-04T02:00:00Z", "y"),
      at("2026-10-04T03:00:00Z", "o"),
    ];
    const until = "2026-10-04T05:00:00Z";
    expect(levelSpans(points, "lisboa", until).map((s) => s.level)).toEqual([
      "none",
      "yellow",
      "orange",
    ]);
    expect(timeByLevel(points, "lisboa", until)).toEqual({
      none: 3_600_000,
      yellow: 7_200_000,
      orange: 7_200_000,
    });
  });
});

describe("notificações", () => {
  const before = levelsOf(state([warning("lisboa", "yellow")]))!;
  const after = levelsOf(
    state([warning("lisboa", "orange"), warning("porto", "yellow", "Chuva")]),
  )!;

  it("só as subidas contam", () => {
    expect(rises(before, after)).toEqual([
      { slug: "lisboa", from: "yellow", to: "orange" },
      { slug: "porto", from: "none", to: "yellow" },
    ]);
    expect(rises(after, before)).toEqual([]);
  });

  it("sem avisos do IPMA não se compara nada", () => {
    expect(levelsOf(state([], [], false))).toBeNull();
  });

  it("respeita os distritos e o limiar de cada pessoa", () => {
    const s = state([warning("lisboa", "orange"), warning("porto", "yellow", "Chuva")]);
    const changes = rises(before, after);
    const lisboaOrange = notificationsFor(
      { districts: ["lisboa"], min: "orange", locale: "pt" },
      changes,
      s,
    );
    expect(lisboaOrange).toEqual([
      {
        title: "Lisboa: aviso laranja",
        body: "Aviso laranja de vento em Lisboa. Fonte: IPMA.",
        url: "/lisboa/avisos",
        tag: "aviso-lisboa",
      },
    ]);
    expect(
      notificationsFor({ districts: ["porto"], min: "orange", locale: "pt" }, changes, s),
    ).toEqual([]);
    const en = notificationsFor({ districts: ["porto"], min: "yellow", locale: "en" }, changes, s);
    expect(en[0]).toMatchObject({ title: "Porto: yellow warning", url: "/en/porto/avisos" });
  });
});

describe("notificações de incêndios e sismos", () => {
  const bigFire = (id: string, patch: Partial<FireEvent> = {}) =>
    ({
      kind: "fire",
      id,
      active: true,
      severity: "orange",
      status: "Em curso",
      statusCode: 5,
      operatives: 80,
      place: { district: "viseu", region: "continente", label: "Tondela, Campo de Besteiros" },
      ...patch,
    }) as unknown as FireEvent;
  const quake = (id: string, felt: boolean) =>
    ({
      kind: "earthquake",
      id,
      severity: "none",
      magnitude: 3.4,
      depthKm: 10,
      felt,
      occurredAt: "2026-10-04T08:40:00.000Z",
      place: { district: "lisboa", region: "continente", label: "Oeste de Cascais" },
    }) as unknown as EarthquakeEvent;
  const withEvents = (fires: FireEvent[], quakes: EarthquakeEvent[]) => {
    const s = state([], fires);
    return { ...s, earthquakes: ok("ipma-seismic", quakes) };
  };

  it("só os incêndios importantes ou grandes e os sismos sentidos contam", () => {
    const s = withEvents(
      [
        bigFire("grande"),
        bigFire("pequeno", { operatives: 12 }),
        bigFire("importante", { operatives: 5, severity: "red" }),
        bigFire("extinto", { active: false }),
      ],
      [quake("sentido", true), quake("nao-sentido", false)],
    );
    expect(notableEvents(s).map((e) => e.id)).toEqual(["grande", "importante", "sentido"]);
  });

  it("na primeira vez não notifica o que já lá estava; depois, só o que é novo", () => {
    const a = { id: "a", district: "viseu", event: bigFire("a") };
    const b = { id: "b", district: "viseu", event: bigFire("b") };
    const first = freshEvents(null, [a]);
    expect(first.fresh).toEqual([]);
    expect(first.seen).toEqual(["a"]);
    const second = freshEvents(first.seen, [a, b]);
    expect(second.fresh.map((e) => e.id)).toEqual(["b"]);
    expect(second.seen).toEqual(["b", "a"]);
    // Um incêndio que sai e volta à lista não notifica outra vez.
    expect(freshEvents(second.seen, [a]).fresh).toEqual([]);
  });

  it("respeita os distritos e as escolhas de cada pessoa", () => {
    const events = notableEvents(withEvents([bigFire("f")], [quake("q", true)]));
    const base = { min: "yellow" as const, locale: "pt" as const };
    expect(eventNotificationsFor({ ...base, districts: ["viseu", "lisboa"] }, events)).toEqual([]);
    const both = eventNotificationsFor(
      { ...base, districts: ["viseu", "lisboa"], fires: true, quakes: true },
      events,
    );
    expect(both.map((p) => p.url)).toEqual(["/viseu/incendios", "/lisboa/sismos"]);
    expect(both[0]!.title).toBe("Incêndio importante: Tondela, Campo de Besteiros");
    expect(both[0]!.body).toBe("Em curso, 80 operacionais, em Viseu. Fonte: Fogos.pt (ANEPC).");
    expect(both[1]!.title).toBe("Sismo sentido, magnitude 3,4");
    expect(both[1]!.body).toContain("Fonte: IPMA.");
    expect(
      eventNotificationsFor({ ...base, districts: ["porto"], fires: true, quakes: true }, events),
    ).toEqual([]);
  });
});
