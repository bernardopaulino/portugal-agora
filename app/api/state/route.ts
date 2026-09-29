import { getState } from "@/lib/state/get-state";

/** Estado completo do país. É o que o browser consulta de minuto a minuto. */
export async function GET() {
  const state = await getState();
  return Response.json(state, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  });
}
