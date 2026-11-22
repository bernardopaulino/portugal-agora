import { describe, expect, it } from "vitest";

import { dayLevel, daysFromPoints, levelDays, mergeDay } from "@/lib/history/days";
import { HISTORY_ORDER, type HistoryPoint } from "@/lib/history/points";

/** Um ponto com o mesmo nível em todos os distritos, menos os indicados. */
const point = (t: string, levels: Record<string, string> = {}, f: number | null = 0) => ({
  t,
  l: HISTORY_ORDER.map((slug) => levels[slug] ?? "n").join(""),
  f,
});

describe("resumo diário do histórico", () => {
  it("guarda o nível mais alto de cada distrito no dia e o máximo de incêndios", () => {
    let day = mergeDay(undefined, point("2026-11-22T08:00:00Z", { lisboa: "y" }, 3));
    day = mergeDay(day, point("2026-11-22T12:00:00Z", { lisboa: "o", porto: "y" }, 7));
    day = mergeDay(day, point("2026-11-22T18:00:00Z", { lisboa: "n" }, 2));
    expect(day.d).toBe("2026-11-22");
    expect(dayLevel(day, "lisboa")).toBe("orange");
    expect(dayLevel(day, "porto")).toBe("yellow");
    expect(dayLevel(day, "faro")).toBe("none");
    expect(day.f).toBe(7);
  });

  it("um ponto sem dados não apaga o que se sabia do dia", () => {
    const day = mergeDay(
      mergeDay(undefined, point("2026-11-22T08:00:00Z", { lisboa: "r" }, 4)),
      point("2026-11-22T09:00:00Z", { lisboa: "u" }, null),
    );
    expect(dayLevel(day, "lisboa")).toBe("red");
    expect(day.f).toBe(4);
  });

  it("o dia é o de Lisboa: 23:30 UTC no verão já é o dia seguinte", () => {
    const day = mergeDay(undefined, point("2026-07-01T23:30:00Z"));
    expect(day.d).toBe("2026-07-02");
  });

  it("começa a partir dos pontos finos, um registo por dia", () => {
    const points: HistoryPoint[] = [
      point("2026-11-20T10:00:00Z", { braga: "y" }),
      point("2026-11-20T20:00:00Z"),
      point("2026-11-21T10:00:00Z", { braga: "o" }),
      point("2026-11-22T10:00:00Z"),
    ];
    const days = daysFromPoints(points);
    expect(days.map((d) => d.d)).toEqual(["2026-11-20", "2026-11-21", "2026-11-22"]);
    expect(levelDays(days, "braga")).toEqual({
      none: 1,
      yellow: 1,
      orange: 1,
      red: 0,
      known: 3,
    });
  });
});
