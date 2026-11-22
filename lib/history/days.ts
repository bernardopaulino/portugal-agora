import { localDate } from "@/lib/time/format";

import { HISTORY_ORDER, levelAt, type HistoryLevel, type HistoryPoint } from "./points";

/*
 * Histórico longo: um resumo por dia (dia de Lisboa), com o nível mais alto
 * de cada distrito nesse dia e o máximo de incêndios ativos. ~40 bytes por
 * dia: um ano cabe numa lista pequena do Redis. Os pontos de ~12 min (7 dias)
 * continuam a ser o histórico fino.
 */

export interface DayPoint {
  /** AAAA-MM-DD, na hora de Lisboa. */
  d: string;
  /** Um carácter por distrito (ordem de HISTORY_ORDER): n, y, o, r; u = sem dados nesse dia. */
  l: string;
  /** Máximo de incêndios ativos no dia; null sem dados do Fogos.pt. */
  f: number | null;
}

/** Quantos dias se guardam (um ano e uma margem). */
export const DAYS_KEPT = 400;

const rank: Record<string, number> = { u: -1, n: 0, y: 1, o: 2, r: 3 };

/** O ponto juntado ao dia: o nível mais alto de cada distrito e o máximo de incêndios. */
export function mergeDay(day: DayPoint | undefined, point: HistoryPoint): DayPoint {
  const d = localDate(point.t);
  if (!day || day.d !== d) return { d, l: point.l, f: point.f };
  const l = [...point.l]
    .map((c, i) => {
      const prev = day.l[i] ?? "u";
      return (rank[c] ?? -1) > (rank[prev] ?? -1) ? c : prev;
    })
    .join("");
  const f = day.f === null ? point.f : point.f === null ? day.f : Math.max(day.f, point.f);
  return { d, l, f };
}

/** Os dias a partir dos pontos finos (para começar o histórico longo com o que já há). */
export function daysFromPoints(points: HistoryPoint[]): DayPoint[] {
  const days: DayPoint[] = [];
  for (const p of points) {
    const last = days[days.length - 1];
    const merged = mergeDay(last, p);
    if (last && last.d === merged.d) days[days.length - 1] = merged;
    else days.push(merged);
  }
  return days;
}

export function dayLevel(day: DayPoint, slug: string): HistoryLevel {
  return levelAt({ t: day.d, l: day.l, f: day.f }, slug);
}

/** Dias com cada nível como o mais alto, num distrito (só dias com dados). */
export function levelDays(days: DayPoint[], slug: string) {
  const count = { none: 0, yellow: 0, orange: 0, red: 0, known: 0 };
  for (const day of days) {
    const level = dayLevel(day, slug);
    if (level === "unknown") continue;
    count[level]++;
    count.known++;
  }
  return count;
}

export const DAYS_ORDER = HISTORY_ORDER;
