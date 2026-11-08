import { after, connection } from "next/server";

import { maybeTick } from "@/lib/cron/tick";
import { getState } from "@/lib/state/get-state";

/**
 * Estado completo do país. É o que o browser consulta de minuto a minuto.
 *
 * Gerado a pedido (connection()) e guardado na CDN 30 s, nunca como ISR.
 * Sem o connection(), o Next pré-gerava esta rota como ISR de 1 minuto: com
 * o site aberto, a Vercel reescrevia ~85 KB (11 unidades de 8 KB) quase a
 * cada minuto, o grosso do limite de "ISR writes" do plano Hobby. A cache
 * da CDN não conta para esse limite, e o getState continua em cache.
 */
export async function GET() {
  await connection();
  const state = await getState();
  // Com o site aberto, o tick (histórico e notificações) corre daqui, depois
  // de responder, no máximo uma vez a cada 9 min (ver lib/cron/tick.ts).
  after(maybeTick);
  return Response.json(state, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  });
}
