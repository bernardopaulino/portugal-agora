import { connection } from "next/server";

import { getObservationsAndStations, getSea } from "@/lib/sources/registry";

/**
 * Tempo observado (estações do IPMA) e estado do mar, à parte do estado do
 * país: só a página do distrito e o mapa dos avisos os mostram, por isso não
 * vão no HTML de todas as páginas (cada KB a mais em cada página regenerada
 * conta para o limite de "ISR writes"). Gerado a pedido, a partir do Redis,
 * e 5 min na CDN: o IPMA publica as observações de hora a hora (~:31).
 */
export async function GET() {
  await connection();
  const [{ observations, stations }, sea] = await Promise.all([
    getObservationsAndStations(),
    getSea(),
  ]);
  return Response.json(
    { observations, sea, stations },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800, stale-if-error=86400",
      },
    },
  );
}
