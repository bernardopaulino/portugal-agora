import "server-only";

import { claim } from "@/lib/cache/source-store";
import { getRedis } from "@/lib/cache/redis";
import { pointFromState } from "@/lib/history/points";
import { appendHistory } from "@/lib/history/store";
import {
  eventNotificationsFor,
  freshEvents,
  levelsOf,
  notableEvents,
  notificationsFor,
  rises,
} from "@/lib/push/changes";
import { sendAll } from "@/lib/push/send";
import { allSubscriptions } from "@/lib/push/subscriptions";
import { getObservationsAndStations, getSea } from "@/lib/sources/registry";
import type { Severity } from "@/lib/sources/types";
import type { CountryState } from "@/lib/state/aggregate";
import { getState } from "@/lib/state/get-state";

/*
 * O tick: verifica as fontes em atraso, envia as notificações se o nível de
 * algum distrito subiu (e de incêndios importantes e sismos sentidos novos) e, quando passaram 9 min desde o anterior, junta um ponto ao
 * histórico. Corre de três maneiras:
 * - por um agendador externo de 4 em 4 min (Upstash QStash ou cron-job.org,
 *   ver docs/OPERACAO.md), em /api/cron/tick com o segredo: mantém os dados
 *   frescos e as notificações a tempo mesmo com o site fechado;
 * - pelo GitHub Actions, de 10 em 10 min (reforço; o agendamento do GitHub atrasa);
 * - pelo próprio site, depois de responder a /api/state, se ninguém correu
 *   o tick nos últimos 9 min.
 */

const LEVELS_KEY = "push:levels";
/** Incêndios e sismos já notificados (ids, os mais recentes primeiro). */
const SEEN_EVENTS_KEY = "push:events";
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

async function notify(state: CountryState): Promise<TickResult["push"]> {
  const none = { rises: 0, sent: 0, removed: 0, failed: 0 };
  const redis = getRedis();
  if (!redis) return none;
  if (!(await claim(PUSH_LOCK_KEY, PUSH_LOCK_SECONDS))) return none;
  try {
    // Avisos que sobem e incêndios/sismos novos, lidos num só comando.
    const [prevLevels, seen] = await redis.mget<[Record<string, Severity> | null, string[] | null]>(
      LEVELS_KEY,
      SEEN_EVENTS_KEY,
    );
    const next = levelsOf(state);
    let changes: ReturnType<typeof rises> = [];
    if (next && JSON.stringify(prevLevels) !== JSON.stringify(next)) {
      await redis.set(LEVELS_KEY, next);
      changes = prevLevels ? rises(prevLevels, next) : [];
    }
    // Sem dados dos incêndios ou dos sismos, não se mexe no registo (voltariam a ser "novos").
    const eventsKnown = state.fires.data !== null && state.earthquakes.data !== null;
    const events = eventsKnown ? freshEvents(seen, notableEvents(state)) : null;
    if (events && (events.fresh.length > 0 || seen === null))
      await redis.set(SEEN_EVENTS_KEY, events.seen);
    const fresh = events?.fresh ?? [];
    if (changes.length === 0 && fresh.length === 0) return none;
    const jobs = (await allSubscriptions()).flatMap((subscription) =>
      [
        ...notificationsFor(subscription, changes, state),
        ...eventNotificationsFor(subscription, fresh),
      ].map((payload) => ({ subscription, payload })),
    );
    return { rises: changes.length + fresh.length, ...(await sendAll(jobs)) };
  } finally {
    await redis.del(PUSH_LOCK_KEY);
  }
}

export async function runTick(): Promise<TickResult> {
  // Verifica primeiro as fontes em atraso: o tick não tem ninguém à espera.
  // Observações e mar não entram no estado, mas também têm de estar frescos com o site fechado.
  const [state] = await Promise.all([
    getState("await"),
    getObservationsAndStations("await"),
    getSea("await"),
  ]);
  const push = await notify(state);
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
