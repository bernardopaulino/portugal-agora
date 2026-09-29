import "server-only";

import { getRedis } from "@/lib/cache/redis";

/**
 * Guarda o último resultado bom de cada fonte. Quando uma fonte falha,
 * o site mostra este snapshot marcado como desatualizado em vez de
 * ficar vazio. Usa Redis se estiver configurado; caso contrário, uma
 * Map em memória (suficiente em desenvolvimento, perde-se entre
 * invocações serverless em produção).
 */
export interface Snapshot<T> {
  data: T;
  savedAt: string;
}

const PREFIX = "snapshot:";
const TTL_SECONDS = 60 * 60 * 24 * 7;
const memory = new Map<string, Snapshot<unknown>>();

export async function saveSnapshot<T>(key: string, data: T, now: Date = new Date()): Promise<void> {
  const snapshot: Snapshot<T> = { data, savedAt: now.toISOString() };
  const redis = getRedis();
  if (redis) {
    await redis.set(PREFIX + key, snapshot, { ex: TTL_SECONDS });
    return;
  }
  memory.set(PREFIX + key, snapshot);
}

export async function readSnapshot<T>(key: string): Promise<Snapshot<T> | null> {
  const redis = getRedis();
  if (redis) {
    return (await redis.get<Snapshot<T>>(PREFIX + key)) ?? null;
  }
  return (memory.get(PREFIX + key) as Snapshot<T> | undefined) ?? null;
}
