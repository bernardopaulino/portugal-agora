import { timingSafeEqual } from "node:crypto";

import { connection } from "next/server";

import { getRedis } from "@/lib/cache/redis";
import { tickIfDue } from "@/lib/cron/tick";
import { env } from "@/lib/env";

/*
 * Chamado de 10 em 10 min pelo GitHub Actions (.github/workflows/tick.yml),
 * com o CRON_SECRET. Se o site já correu o tick há menos de 9 min (ver
 * lib/cron/tick.ts), não faz nada.
 */

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
  if (!getRedis()) return Response.json({ error: "Redis não configurado" }, { status: 503 });
  const result = await tickIfDue();
  return Response.json(result ?? { skipped: "o site correu o tick há menos de 9 min" }, {
    headers: { "Cache-Control": "no-store" },
  });
}
