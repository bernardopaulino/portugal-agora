import "server-only";

import { getRedis } from "@/lib/cache/redis";
import type { Validators } from "@/lib/http/fetch-json";

/*
 * O armazém das fontes: a única cache de dados do servidor.
 *
 * Cada fonte tem duas chaves no Redis:
 * - `src:<fonte>`: os dados normalizados. Só se escrevem quando mudam.
 * - `meta:<fonte>`: quando se verificou a fonte, quando os dados mudaram,
 *   a última falha e os validadores HTTP (ETag / Last-Modified) para a
 *   próxima pergunta "mudou?".
 * Um pedido ao site lê tudo o que precisa num só MGET e nunca espera por
 * uma fonte externa enquanto houver dados (ver lib/sources/registry.ts).
 *
 * Não se usa o "use cache" do Next para isto: na Vercel essa cache vive na
 * memória de cada instância e quase nunca é reaproveitada entre pedidos.
 * Sem Redis (desenvolvimento, testes), usa-se uma Map em memória.
 */

export interface SourceMeta {
  /** Quando os dados guardados mudaram (ou foram obtidos) pela última vez. */
  fetchedAt?: string;
  /** Última verificação bem-sucedida da fonte (resposta 200 ou 304). */
  checkedAt?: string;
  /** Última falha; conta enquanto for mais recente do que checkedAt. */
  failedAt?: string;
  error?: string;
  /** Validadores HTTP de cada URL da fonte. */
  validators?: Record<string, Validators>;
}

export interface Entry<T> {
  data?: T;
  meta?: SourceMeta;
}

/** Os dados ficam uma semana, como os antigos snapshots: chega para qualquer falha longa. */
const TTL_SECONDS = 7 * 24 * 60 * 60;

const memory = new Map<string, { value: unknown; expires: number }>();

function memoryGet(key: string): unknown {
  const hit = memory.get(key);
  if (!hit) return null;
  if (hit.expires <= Date.now()) {
    memory.delete(key);
    return null;
  }
  return hit.value;
}

function memorySet(key: string, value: unknown, seconds: number) {
  memory.set(key, { value, expires: Date.now() + seconds * 1000 });
}

const dataKey = (key: string) => `src:${key}`;
const metaKey = (key: string) => `meta:${key}`;

/**
 * Lê as fontes pedidas num só comando, e de caminho outras chaves simples
 * (`peek`, ex.: o cadeado do tick), para não gastar mais comandos com elas.
 */
export async function readEntries(
  keys: readonly string[],
  peek: readonly string[] = [],
): Promise<{ entries: Map<string, Entry<unknown>>; peeked: Map<string, unknown> }> {
  const all = [...keys.flatMap((key) => [dataKey(key), metaKey(key)]), ...peek];
  const redis = getRedis();
  const values: unknown[] =
    all.length === 0 ? [] : redis ? await redis.mget<unknown[]>(...all) : all.map(memoryGet);

  const entries = new Map<string, Entry<unknown>>();
  keys.forEach((key, i) => {
    const data = values[2 * i];
    const meta = values[2 * i + 1];
    entries.set(key, {
      data: data ?? undefined,
      meta: (meta as SourceMeta | null) ?? undefined,
    });
  });
  const peeked = new Map<string, unknown>();
  peek.forEach((key, i) => peeked.set(key, values[2 * keys.length + i] ?? null));
  return { entries, peeked };
}

/** Grava os metadados e, se mudaram, os dados (um só pedido HTTP ao Upstash). */
export async function writeEntry(key: string, entry: { data?: unknown; meta: SourceMeta }) {
  const redis = getRedis();
  if (!redis) {
    if (entry.data !== undefined) memorySet(dataKey(key), entry.data, TTL_SECONDS);
    memorySet(metaKey(key), entry.meta, TTL_SECONDS);
    return;
  }
  const pipeline = redis.pipeline();
  if (entry.data !== undefined) pipeline.set(dataKey(key), entry.data, { ex: TTL_SECONDS });
  pipeline.set(metaKey(key), entry.meta, { ex: TTL_SECONDS });
  await pipeline.exec();
}

/** Cadeado simples (SET NX EX): só quem o apanha faz o trabalho. */
export async function claim(name: string, seconds: number): Promise<boolean> {
  const redis = getRedis();
  if (!redis) {
    if (memoryGet(name) !== null) return false;
    memorySet(name, 1, seconds);
    return true;
  }
  return (await redis.set(name, 1, { nx: true, ex: seconds })) === "OK";
}

/** Só para os testes. */
export function resetMemoryStore() {
  memory.clear();
}
