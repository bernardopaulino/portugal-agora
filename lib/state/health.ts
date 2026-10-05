import type { SourceResult, SourceStatus } from "@/lib/sources/types";

import type { CountryState } from "./aggregate";

/**
 * Idade máxima aceitável dos dados de cada fonte, em minutos. Cada uma
 * tem a sua cache (2 min a 1 h, ver lib/sources/loaders.ts); o limite dá
 * folga para algumas falhas seguidas antes de alertar.
 */
export const maxAgeMinutes = {
  warnings: 20,
  earthquakes: 20,
  fires: 15,
  fireRisk: 180,
  uv: 180,
  airQuality: 45,
} as const;

type Key = keyof typeof maxAgeMinutes;

export interface SourceHealth {
  id: string;
  /** "ok"; "stale": a mostrar dados antigos; "down": sem dados ou desligada. */
  health: "ok" | "stale" | "down";
  status: SourceStatus;
  fetchedAt?: string;
  ageMinutes?: number;
  maxAgeMinutes: number;
}

function check(result: SourceResult<unknown>, max: number, now: Date): SourceHealth {
  const ageMinutes = result.fetchedAt
    ? Math.round((now.getTime() - Date.parse(result.fetchedAt)) / 60_000)
    : undefined;
  const health =
    result.status === "unavailable" || result.status === "disabled" || !result.data
      ? "down"
      : result.status === "stale" || ageMinutes === undefined || ageMinutes > max
        ? "stale"
        : "ok";
  return {
    id: result.id,
    health,
    status: result.status,
    fetchedAt: result.fetchedAt,
    ageMinutes,
    maxAgeMinutes: max,
  };
}

/** Estado de cada fonte para a monitorização externa (/api/health/sources). */
export function sourcesHealth(state: CountryState, now: Date) {
  const sources = (Object.keys(maxAgeMinutes) as Key[]).map((key) =>
    check(state[key], maxAgeMinutes[key], now),
  );
  return { ok: sources.every((s) => s.health === "ok"), sources };
}
