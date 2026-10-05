import { describe, expect, it } from "vitest";

import { aggregate, type StateInputs } from "@/lib/state/aggregate";
import { sourcesHealth } from "@/lib/state/health";
import type { SourceResult } from "@/lib/sources/types";

const now = new Date("2026-09-29T16:00:00Z");
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();

function ok<T>(id: SourceResult<T>["id"], data: T, fetchedAt = now.toISOString()): SourceResult<T> {
  return { id, status: "ok", data, fetchedAt };
}

function inputs(overrides: Partial<StateInputs> = {}): StateInputs {
  return {
    warnings: ok("ipma-warnings", []),
    earthquakes: ok("ipma-seismic", []),
    fires: ok("fogos", []),
    fireRisk: ok("ipma-rcm", {
      today: { date: "2026-09-29", byDico: {} },
      tomorrow: { date: "2026-09-30", byDico: {} },
    }),
    uv: ok("ipma-uv", []),
    airQuality: ok("openmeteo-aq", []),
    ...overrides,
  };
}

const health = (overrides: Partial<StateInputs> = {}) =>
  sourcesHealth(aggregate(inputs(overrides), now), now);

const find = (report: ReturnType<typeof health>, id: string) =>
  report.sources.find((s) => s.id === id)!;

describe("sourcesHealth", () => {
  it("está tudo bem quando todas as fontes têm dados recentes", () => {
    const report = health();
    expect(report.ok).toBe(true);
    expect(report.sources).toHaveLength(6);
  });

  it("assinala uma fonte que está a mostrar o último snapshot", () => {
    const report = health({
      warnings: { ...ok("ipma-warnings", [], minutesAgo(8)), status: "stale" },
    });
    expect(report.ok).toBe(false);
    expect(find(report, "ipma-warnings")).toMatchObject({ health: "stale", ageMinutes: 8 });
  });

  it("assinala dados mais antigos do que o limite da fonte", () => {
    expect(find(health({ fires: ok("fogos", [], minutesAgo(10)) }), "fogos").health).toBe("ok");
    expect(find(health({ fires: ok("fogos", [], minutesAgo(30)) }), "fogos").health).toBe("stale");
    // O risco de incêndio só muda uma vez por hora: 2 h ainda está bem.
    const risk = ok(
      "ipma-rcm",
      { today: { date: "", byDico: {} }, tomorrow: { date: "", byDico: {} } },
      minutesAgo(120),
    );
    expect(find(health({ fireRisk: risk }), "ipma-rcm").health).toBe("ok");
  });

  it("uma fonte sem dados ou desligada está em baixo", () => {
    const report = health({
      fires: { id: "fogos", status: "disabled", data: null },
      airQuality: { id: "openmeteo-aq", status: "unavailable", data: null },
    });
    expect(report.ok).toBe(false);
    expect(find(report, "fogos").health).toBe("down");
    expect(find(report, "openmeteo-aq").health).toBe("down");
  });
});
