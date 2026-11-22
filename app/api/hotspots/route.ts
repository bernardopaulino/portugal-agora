import { connection } from "next/server";

import { env } from "@/lib/env";
import { getHotspots } from "@/lib/sources/registry";

/**
 * Pontos de calor por satélite (NASA FIRMS) das últimas 24 h em Portugal,
 * para as páginas de incêndios. A pedido e 10 min na CDN.
 */
export async function GET() {
  await connection();
  // Sem chave, os ficheiros públicos só cobrem o continente.
  const coverage = env().FIRMS_MAP_KEY ? "portugal" : "continente";
  return Response.json(
    { ...(await getHotspots()), coverage },
    {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800, stale-if-error=86400",
      },
    },
  );
}
