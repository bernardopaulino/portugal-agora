import { connection } from "next/server";

import { forecastLocations } from "@/data/forecast-locations";
import { getLocalForecast } from "@/lib/sources/registry";

/**
 * Previsão a 5 dias do IPMA para um concelho (pelo DICO), para a página do
 * concelho. Leva o nome do local de previsão (`place`): nas ilhas, alguns
 * concelhos usam o do concelho vizinho. A pedido e 30 min na CDN.
 */
const locations = new Map(forecastLocations.map(([dico, id, name]) => [dico, { id, name }]));

export async function GET(_request: Request, ctx: RouteContext<"/api/forecast/concelho/[dico]">) {
  await connection();
  const { dico } = await ctx.params;
  const location = locations.get(dico);
  if (!location) return Response.json({ error: "Concelho desconhecido" }, { status: 404 });
  const result = await getLocalForecast(location.id);
  return Response.json(
    { ...result, place: location.name },
    {
      headers: {
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600, stale-if-error=86400",
      },
    },
  );
}
