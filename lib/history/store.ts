import "server-only";

import { getRedis } from "@/lib/cache/redis";

import { DAYS_KEPT, daysFromPoints, mergeDay, type DayPoint } from "./days";
import { HISTORY_DAYS, HISTORY_MAX_POINTS, type HistoryPoint } from "./points";

const KEY = "history:v1";
/** Um resumo por dia, o mais recente primeiro (ver lib/history/days.ts). */
const DAYS_KEY = "history:days:v1";
/** Dois ticks com menos do que isto entre si contam como um só. */
const MIN_GAP_MS = 5 * 60_000;

/** Junta um ponto ao histórico (lista no Redis, a mais recente primeiro) e ao resumo do dia. */
export async function appendHistory(point: HistoryPoint): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  const [last] = await redis.lrange<HistoryPoint>(KEY, 0, 0);
  if (last && Date.parse(point.t) - Date.parse(last.t) < MIN_GAP_MS) return false;
  await redis.lpush(KEY, point);
  await redis.ltrim(KEY, 0, HISTORY_MAX_POINTS - 1);
  await appendDay(point);
  return true;
}

async function appendDay(point: HistoryPoint): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const [today] = await redis.lrange<DayPoint>(DAYS_KEY, 0, 0);
  if (!today) {
    // A primeira vez: começa com os dias que os pontos finos ainda guardam.
    const points = (await redis.lrange<HistoryPoint>(KEY, 0, -1)).reverse();
    const days = daysFromPoints(points);
    if (days.length > 0) await redis.lpush(DAYS_KEY, ...days);
    return;
  }
  const merged = mergeDay(today, point);
  if (merged.d === today.d) {
    if (merged.l !== today.l || merged.f !== today.f) await redis.lset(DAYS_KEY, 0, merged);
  } else {
    await redis.lpush(DAYS_KEY, merged);
    await redis.ltrim(DAYS_KEY, 0, DAYS_KEPT - 1);
  }
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

/** O resumo diário (até ~um ano), do dia mais antigo ao mais recente. */
export async function readDays(): Promise<DayPoint[]> {
  const redis = getRedis();
  if (!redis) return [];
  return (await redis.lrange<DayPoint>(DAYS_KEY, 0, -1)).reverse();
}
