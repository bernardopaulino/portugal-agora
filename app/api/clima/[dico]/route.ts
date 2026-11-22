import { connection } from "next/server";

import { concelhoForDico } from "@/data/concelhos";
import { getDrought, getPrecip } from "@/lib/sources/registry";

/**
 * Chuva dos últimos 20 dias e índice de seca de um concelho do continente
 * (o IPMA não os tem para as ilhas), para a página do concelho. A pedido e
 * 1 h na CDN: a chuva muda uma vez por dia e a seca uma vez por mês.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/clima/[dico]">) {
  await connection();
  const { dico } = await ctx.params;
  const concelho = concelhoForDico(dico);
  if (!concelho || Number(dico.slice(0, 2)) > 18)
    return Response.json({ error: "Concelho desconhecido ou fora do continente" }, { status: 404 });
  const [precip, drought] = await Promise.all([getPrecip(), getDrought(dico, concelho.point)]);
  const days = precip.data?.byDico[dico];
  return Response.json(
    {
      rain: {
        ...precip,
        data: days && precip.data ? { start: precip.data.start, days } : null,
      },
      drought,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200, stale-if-error=86400",
      },
    },
  );
}
