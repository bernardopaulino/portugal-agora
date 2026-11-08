import { connection } from "next/server";

import { getObservations, getSea } from "@/lib/sources/registry";

/**
 * Tempo observado (estações do IPMA) e estado do mar, à parte do estado do
 * país: só a página do distrito e o mapa dos avisos os mostram, por isso não
 * vão no HTML de todas as páginas (cada KB a mais em cada página regenerada
 * conta para o limite de "ISR writes"). Gerado a pedido e 10 min na CDN.
 */
export async function GET() {
  await connection();
  const [observations, sea] = await Promise.all([getObservations(), getSea()]);
  return Response.json(
    { observations, sea },
    { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200" } },
  );
}
