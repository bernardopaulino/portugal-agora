import {
  getAirQuality,
  getEarthquakes,
  getFireRisk,
  getFires,
  getUv,
  getWarnings,
} from "@/lib/sources/registry";

const getters = {
  "ipma-warnings": getWarnings,
  "ipma-seismic": getEarthquakes,
  "ipma-rcm": getFireRisk,
  "ipma-uv": getUv,
  fogos: getFires,
  "openmeteo-aq": getAirQuality,
} as const;

/** Dados normalizados de uma fonte, com o seu estado (ok, desatualizado, indisponível). */
export async function GET(_request: Request, ctx: RouteContext<"/api/sources/[id]">) {
  const { id } = await ctx.params;
  const getter = getters[id as keyof typeof getters];
  if (!getter) {
    return Response.json(
      { error: `Fonte desconhecida. Fontes disponíveis: ${Object.keys(getters).join(", ")}.` },
      { status: 404 },
    );
  }
  return Response.json(await getter(), {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  });
}
