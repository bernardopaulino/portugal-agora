import "server-only";

import type { Redis } from "@upstash/redis";

export type RedisHealth = "ok" | "not-configured" | "error";

/** Durante quanto tempo se reutiliza o resultado do último PING. */
export const REDIS_CHECK_TTL_MS = 30_000;

let last: { at: number; result: RedisHealth } | undefined;

/**
 * Estado do Redis para o /api/health. O PING é guardado 30 s: o endpoint é
 * público e sem cache, e alguém a chamá-lo em ciclo gastaria a quota de
 * comandos do Upstash (e, sem quota, os snapshots deixavam de funcionar).
 */
export async function checkRedis(client: Pick<Redis, "ping"> | null, now = Date.now()) {
  if (!client) return "not-configured" satisfies RedisHealth;
  if (last && now - last.at < REDIS_CHECK_TTL_MS) return last.result;
  let result: RedisHealth;
  try {
    await client.ping();
    result = "ok";
  } catch {
    result = "error";
  }
  last = { at: now, result };
  return result;
}

/** Só para os testes. */
export function resetRedisCheck() {
  last = undefined;
}
