import { getRedis } from "@/lib/cache/redis";
import { checkRedis } from "@/lib/cache/redis-health";
import { features } from "@/lib/env";

/**
 * Verificação rápida da configuração em produção:
 * GET /api/health → que funcionalidades estão ativas e se o Redis responde.
 * Não expõe segredos, só booleanos. O PING ao Redis é reutilizado 30 s.
 */
export async function GET() {
  const enabled = features();
  const redis = await checkRedis(getRedis());

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
