import "server-only";

import { claim } from "@/lib/cache/source-store";
import { getRedis } from "@/lib/cache/redis";
import { pointFromState } from "@/lib/history/points";
import { appendHistory } from "@/lib/history/store";
import { levelsOf, notificationsFor, rises } from "@/lib/push/changes";
import { sendAll } from "@/lib/push/send";
import { allSubscriptions } from "@/lib/push/subscriptions";
import type { Severity } from "@/lib/sources/types";
import type { CountryState } from "@/lib/state/aggregate";
import { getState } from "@/lib/state/get-state";

/*
 * O tick: verifica as fontes em atraso, envia as notificações se o nível de
 * algum distrito subiu e, no máximo de 9 em 9 min, junta um ponto ao
 * histórico. Corre de três maneiras:
 * - por um agendador externo de 4 em 4 min (Upstash QStash ou cron-job.org,
 *   ver docs/OPERACAO.md), em /api/cron/tick com o segredo: mantém os dados
 *   frescos e as notificações a tempo mesmo com o site fechado;
 * - pelo GitHub Actions, de 10 em 10 min (reforço; o agendamento do GitHub atrasa);
 * - pelo próprio site, depois de responder a /api/state, se ninguém correu
 *   o tick nos últimos 9 min.
 */

const LEVELS_KEY = "push:levels";
/** Cadeado do histórico (e sinal, lido em /api/state, de que o tick está a correr). */
export const TICK_LOCK_KEY = "tick:lock";
const TICK_LOCK_SECONDS = 9 * 60;
/** Dois ticks ao mesmo tempo não podem enviar a mesma notificação duas vezes. */
const PUSH_LOCK_KEY = "push:lock";
const PUSH_LOCK_SECONDS = 60;

export interface TickResult {
  generatedAt: string;
  recorded: boolean;
  push: { rises: number; sent: number; removed: number; failed: number };
}

async function notifyRises(state: CountryState): Promise<TickResult["push"]> {
  const none = { rises: 0, sent: 0, removed: 0, failed: 0 };
  const redis = getRedis();
  const next = levelsOf(state);
  if (!redis || !next) return none;
  if (!(await claim(PUSH_LOCK_KEY, PUSH_LOCK_SECONDS))) return none;
  try {
    const prev = await redis.get<Record<string, Severity>>(LEVELS_KEY);
    if (prev && JSON.stringify(prev) === JSON.stringify(next)) return none;
    await redis.set(LEVELS_KEY, next);
    const changes = prev ? rises(prev, next) : [];
    if (changes.length === 0) return none;
    const jobs = (await allSubscriptions()).flatMap((subscription) =>
      notificationsFor(subscription, changes, state).map((payload) => ({ subscription, payload })),
    );
    return { rises: changes.length, ...(await sendAll(jobs)) };
  } finally {
    await redis.del(PUSH_LOCK_KEY);
  }
}

export async function runTick(): Promise<TickResult> {
  // Verifica primeiro as fontes em atraso: o tick não tem ninguém à espera.
  const state = await getState("await");
  const push = await notifyRises(state);
  const recorded =
    (await claim(TICK_LOCK_KEY, TICK_LOCK_SECONDS)) && (await appendHistory(pointFromState(state)));
  return { generatedAt: state.generatedAt, recorded, push };
}

/** Para chamar depois de /api/state: só quando o cadeado do tick (lido no mesmo MGET) está livre. */
export async function maybeTick(): Promise<void> {
  try {
    await runTick();
  } catch (error) {
    console.error("[tick]", error instanceof Error ? error.message : error);
  }
}
