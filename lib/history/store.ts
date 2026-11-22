import "server-only";

import { getRedis } from "@/lib/cache/redis";

import { HISTORY_DAYS, HISTORY_MAX_POINTS, type HistoryPoint } from "./points";

const KEY = "history:v1";
/** Dois ticks com menos do que isto entre si contam como um só. */
const MIN_GAP_MS = 5 * 60_000;

/** Junta um ponto ao histórico (lista no Redis, a mais recente primeiro). */
export async function appendHistory(point: HistoryPoint): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  const [last] = await redis.lrange<HistoryPoint>(KEY, 0, 0);
  if (last && Date.parse(point.t) - Date.parse(last.t) < MIN_GAP_MS) return false;
  await redis.lpush(KEY, point);
  await redis.ltrim(KEY, 0, HISTORY_MAX_POINTS - 1);
  return true;
}

/** Os últimos 7 dias do histórico, do ponto mais antigo ao mais recente. */
export async function readHistory(now = Date.now()): Promise<HistoryPoint[]> {
  const redis = getRedis();
  if (!redis) return [];
  const points = await redis.lrange<HistoryPoint>(KEY, 0, -1);
  // Com ticks espaçados (sem agendador), o teto de pontos chega a cobrir mais dias.
  const since = now - HISTORY_DAYS * 24 * 3_600_000;
  return points.filter((p) => Date.parse(p.t) >= since).reverse();
}
