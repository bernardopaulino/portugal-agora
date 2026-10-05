import { connection } from "next/server";

import { sourcesHealth } from "@/lib/state/health";
import { getState } from "@/lib/state/get-state";

/**
 * Para a monitorização externa (ex.: UptimeRobot): responde 200 se todas
 * as fontes têm dados recentes e 503 se alguma está desatualizada ou em
 * baixo, para o monitor alertar sem ter de ler o corpo. Usa o mesmo
 * estado em cache que o site: não faz chamadas extra às fontes.
 * /api/health continua a ser a verificação simples (e a que o Playwright
 * espera para arrancar), que responde 200 mesmo com fontes em baixo.
 */
export async function GET() {
  await connection();
  const report = sourcesHealth(await getState(), new Date());
  return Response.json(
    { ...report, time: new Date().toISOString() },
    { status: report.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
