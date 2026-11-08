import { timingSafeEqual } from "node:crypto";

import { connection } from "next/server";

import { getRedis } from "@/lib/cache/redis";
import { env } from "@/lib/env";
import { pointFromState } from "@/lib/history/points";
import { appendHistory } from "@/lib/history/store";
import { levelsOf, notificationsFor, rises } from "@/lib/push/changes";
import { sendAll } from "@/lib/push/send";
import { allSubscriptions } from "@/lib/push/subscriptions";
import type { Severity } from "@/lib/sources/types";
import { getState } from "@/lib/state/get-state";

/*
 * Chamado de 10 em 10 min pelo GitHub Actions (.github/workflows/tick.yml),
 * com o CRON_SECRET. Guarda um ponto do histórico e, se o nível de algum
 * distrito subiu desde o tick anterior, envia as notificações.
 */

const LEVELS_KEY = "push:levels";

function authorized(request: Request): boolean {
  const secret = env().CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  await connection();
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
  const redis = getRedis();
  if (!redis) return Response.json({ error: "Redis não configurado" }, { status: 503 });

  const state = await getState();
  const recorded = await appendHistory(pointFromState(state));

  const next = levelsOf(state);
  let push = { rises: 0, sent: 0, removed: 0, failed: 0 };
  if (next) {
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

  return Response.json(
    { generatedAt: state.generatedAt, recorded, push },
    { headers: { "Cache-Control": "no-store" } },
  );
}
