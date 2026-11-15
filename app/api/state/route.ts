import { after, connection } from "next/server";

import { maybeTick, TICK_LOCK_KEY } from "@/lib/cron/tick";
import { readState } from "@/lib/state/get-state";

/**
 * Estado completo do país. É o que o browser consulta de minuto a minuto.
 *
 * Gerado a pedido (connection()) e guardado na CDN 30 s, nunca como ISR.
 * Sem o connection(), o Next pré-gerava esta rota como ISR de 1 minuto: com
 * o site aberto, a Vercel reescrevia ~85 KB (11 unidades de 8 KB) quase a
 * cada minuto, o grosso do limite de "ISR writes" do plano Hobby. A cache
 * da CDN não conta para esse limite.
 *
 * Cada pedido que chega aqui é um MGET ao Redis (dados de todas as fontes e
 * o cadeado do tick); as fontes em atraso verificam-se depois de responder.
 * stale-if-error: se a função falhar, a CDN continua a servir a última
 * resposta boa durante um dia.
 */
export async function GET() {
  await connection();
  const { state, peeked } = await readState({ peek: [TICK_LOCK_KEY] });
  // Sem agendador externo, o tick (histórico e notificações) corre daqui,
  // depois de responder, quando ninguém o correu nos últimos 9 min.
  if (!peeked.get(TICK_LOCK_KEY)) after(maybeTick);
  return Response.json(state, {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300, stale-if-error=86400",
    },
  });
}
