import { connection } from "next/server";

import { getObservationsAndStations, getSea } from "@/lib/sources/registry";
import { sourcesHealth } from "@/lib/state/health";
import { getState } from "@/lib/state/get-state";

/**
 * Para a monitorização externa (ex.: UptimeRobot): responde 200 se todas
 * as fontes têm dados recentes e 503 se alguma está desatualizada ou em
 * baixo, para o monitor alertar sem ter de ler o corpo. Só lê o Redis
 * (refresh "none"): nunca pergunta às fontes, para mostrar se a
 * atualização em segundo plano está mesmo a funcionar.
 * /api/health continua a ser a verificação simples (e a que o Playwright
 * espera para arrancar), que responde 200 mesmo com fontes em baixo.
 */
export async function GET() {
  await connection();
  const [state, { observations }, sea] = await Promise.all([
    getState("none"),
    getObservationsAndStations("none"),
    getSea("none"),
  ]);
  const report = sourcesHealth(state, new Date(), { observations, sea });
  return Response.json(
    { ...report, time: new Date().toISOString() },
    { status: report.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
