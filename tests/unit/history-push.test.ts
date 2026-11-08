import { describe, expect, it } from "vitest";

import {
  HISTORY_ORDER,
  levelAt,
  levelSpans,
  pointFromState,
  timeByLevel,
  type HistoryPoint,
} from "@/lib/history/points";
import { levelsOf, notificationsFor, rises } from "@/lib/push/changes";
import { aggregate } from "@/lib/state/aggregate";
import type { FireEvent, SourceResult, WarningEvent } from "@/lib/sources/types";

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
        body: "Aviso laranja de vento em Lisboa.",
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
