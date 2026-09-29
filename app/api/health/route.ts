import { getRedis } from "@/lib/cache/redis";
import { features } from "@/lib/env";

/**
 * Verificação rápida da configuração em produção:
 * GET /api/health → que funcionalidades estão ativas e se o Redis responde.
 * Não expõe segredos, só booleanos.
 */
export async function GET() {
  const enabled = features();
  let redis: "ok" | "not-configured" | "error" = "not-configured";

  const client = getRedis();
  if (client) {
    try {
      await client.ping();
      redis = "ok";
    } catch {
      redis = "error";
    }
  }

  return Response.json(
    {
      ok: redis !== "error",
      redis,
      fires: enabled.fires ? "enabled" : "missing-api-key",
      time: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
