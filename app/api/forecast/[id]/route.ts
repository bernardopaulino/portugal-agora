import { connection } from "next/server";

import { districts } from "@/data/districts";
import { getForecast } from "@/lib/sources/registry";

/**
 * Previsão a 5 dias do IPMA para a capital de um distrito (globalIdLocal),
 * para as páginas dos concelhos, que não levam dados no HTML. Só os locais
 * dos distritos; a pedido e 30 min na CDN (o IPMA atualiza de hora a hora).
 */
const known = new Set(districts.map((d) => String(d.globalIdLocal)));

export async function GET(_request: Request, ctx: RouteContext<"/api/forecast/[id]">) {
  await connection();
  const { id } = await ctx.params;
  if (!known.has(id)) return Response.json({ error: "Local desconhecido" }, { status: 404 });
  return Response.json(await getForecast(Number(id)), {
    headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
  });
}
