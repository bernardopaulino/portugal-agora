import "server-only";

import { getRedis } from "@/lib/cache/redis";
import { pointFromState } from "@/lib/history/points";
import { appendHistory } from "@/lib/history/store";
import { levelsOf, notificationsFor, rises } from "@/lib/push/changes";
import { sendAll } from "@/lib/push/send";
import { allSubscriptions } from "@/lib/push/subscriptions";
import type { Severity } from "@/lib/sources/types";
import { getState } from "@/lib/state/get-state";

/*
 * O tick: um ponto do histórico e, se o nível de algum distrito subiu desde
 * o tick anterior, as notificações. Corre de duas maneiras:
 * - pelo GitHub Actions, de 10 em 10 min (/api/cron/tick, com o segredo);
 * - pelo próprio site: depois de responder a /api/state (que o browser pede
 *   de minuto a minuto), se já passaram ~10 min. Os agendamentos do GitHub
 *   atrasam e às vezes nem correm; assim, com o site aberto, nunca falha.
 * Um cadeado no Redis garante que corre no máximo uma vez a cada 9 min.
 */

const LEVELS_KEY = "push:levels";
const LOCK_KEY = "tick:lock";
const LOCK_SECONDS = 9 * 60;
/** Cada instância só pergunta ao Redis pelo cadeado uma vez por minuto. */
const LOCAL_THROTTLE_MS = 60_000;
let lastAttempt = 0;

export interface TickResult {
  generatedAt: string;
  recorded: boolean;
  push: { rises: number; sent: number; removed: number; failed: number };
}

async function claimLock(): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  return (await redis.set(LOCK_KEY, 1, { nx: true, ex: LOCK_SECONDS })) === "OK";
}

export async function runTick(): Promise<TickResult> {
  const redis = getRedis();
  const state = await getState();
  const recorded = await appendHistory(pointFromState(state));
  let push = { rises: 0, sent: 0, removed: 0, failed: 0 };
  const next = levelsOf(state);
  if (redis && next) {
    const prev = await redis.get<Record<string, Severity>>(LEVELS_KEY);
    await redis.set(LEVELS_KEY, next);
    const changes = prev ? rises(prev, next) : [];
    if (changes.length > 0) {
      const jobs = (await allSubscriptions()).flatMap((subscription) =>
        notificationsFor(subscription, changes, state).map((payload) => ({
          subscription,
          payload,
        })),
      );
      push = { rises: changes.length, ...(await sendAll(jobs)) };
    }
  }
  return { generatedAt: state.generatedAt, recorded, push };
}

/** Corre o tick se ninguém o correu nos últimos 9 min (para o GitHub Actions). */
export async function tickIfDue(): Promise<TickResult | null> {
  if (!(await claimLock())) return null;
  return runTick();
}

/** Versão barata para chamar a cada pedido do site: no máximo 1 ida ao Redis por minuto. */
export async function maybeTick(): Promise<void> {
  const now = Date.now();
  if (now - lastAttempt < LOCAL_THROTTLE_MS) return;
  lastAttempt = now;
  try {
    await tickIfDue();
  } catch (error) {
    console.error("[tick]", error instanceof Error ? error.message : error);
  }
}
