import { timingSafeEqual } from "node:crypto";

import { connection } from "next/server";

import { getRedis } from "@/lib/cache/redis";
import { runTick } from "@/lib/cron/tick";
import { env } from "@/lib/env";

/*
 * Chamado com o CRON_SECRET (cabeçalho Authorization: Bearer) por um
 * agendador externo de 4 em 4 min e pelo GitHub Actions de 10 em 10 min
 * (.github/workflows/tick.yml). Verifica as fontes em atraso e envia as
 * notificações; o histórico só leva um ponto de 9 em 9 min (lib/cron/tick.ts).
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
  return Response.json(await runTick(), { headers: { "Cache-Control": "no-store" } });
}
