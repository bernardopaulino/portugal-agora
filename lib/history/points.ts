import { districts } from "@/data/districts";
import type { Severity } from "@/lib/sources/types";
import type { CountryState } from "@/lib/state/aggregate";

/*
 * Histórico dos últimos 7 dias: a cada ~12 minutos (o tick guarda um ponto
 * quando passaram 9 min desde o anterior e o QStash chama-o de 4 em 4 min),
 * o nível de cada distrito e o número de incêndios ativos.
 * Cada ponto é pequeno (~60 bytes): os níveis vão numa string, um
 * carácter por distrito, na ordem de `districts`.
 */

export interface HistoryPoint {
  /** Hora dos dados (ISO). */
  t: string;
  /** Um carácter por distrito: n (sem aviso), y, o, r; u = sem dados. */
  l: string;
  /** Incêndios ativos no país; null se o Fogos.pt falhou ou os dados são antigos. */
  f: number | null;
}

export type HistoryLevel = Severity | "unknown";

export const HISTORY_ORDER = districts.map((d) => d.slug);
/** O que o histórico guarda. */
export const HISTORY_DAYS = 7;
/**
 * Teto da lista no Redis, com folga: dois pontos nunca ficam a menos de 5 min
 * (lib/history/store.ts). O corte que conta é o dos 7 dias, pela hora.
 */
export const HISTORY_MAX_POINTS = (HISTORY_DAYS * 24 * 60) / 5;

const code: Record<Severity, string> = { none: "n", yellow: "y", orange: "o", red: "r" };
const decode: Record<string, HistoryLevel> = {
  n: "none",
  y: "yellow",
  o: "orange",
  r: "red",
  u: "unknown",
};

export function pointFromState(state: CountryState): HistoryPoint {
  const l = HISTORY_ORDER.map((slug) => {
    const d = state.districts[slug];
    return state.levelKnown && d ? code[d.level] : "u";
  }).join("");
  const fires =
    state.fires.status === "ok" ? (state.fires.data?.filter((f) => f.active).length ?? null) : null;
  return { t: state.generatedAt, l, f: fires };
}

export function levelAt(point: HistoryPoint, slug: string): HistoryLevel {
  const i = HISTORY_ORDER.indexOf(slug);
  return decode[point.l[i] ?? "u"] ?? "unknown";
}

/** Segmentos seguidos com o mesmo nível: [{ level, from, to }], do mais antigo ao mais recente. */
export function levelSpans(points: HistoryPoint[], slug: string, until: string) {
  const spans: { level: HistoryLevel; from: string; to: string }[] = [];
  for (const [i, p] of points.entries()) {
    const level = levelAt(p, slug);
    const to = points[i + 1]?.t ?? until;
    const last = spans[spans.length - 1];
    if (last && last.level === level) last.to = to;
    else spans.push({ level, from: p.t, to });
  }
  return spans;
}

/** Tempo total (ms) em cada nível. */
export function timeByLevel(points: HistoryPoint[], slug: string, until: string) {
  const total: Partial<Record<HistoryLevel, number>> = {};
  for (const s of levelSpans(points, slug, until)) {
    total[s.level] = (total[s.level] ?? 0) + Date.parse(s.to) - Date.parse(s.from);
  }
  return total;
}
