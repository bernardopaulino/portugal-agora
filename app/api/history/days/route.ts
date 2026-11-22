import { connection } from "next/server";

import { HISTORY_ORDER } from "@/lib/history/points";
import { readDays } from "@/lib/history/store";

/** O resumo por dia (até ~um ano, ver lib/history/days.ts). 1 h na CDN: muda pouco. */
export async function GET() {
  await connection();
  const days = await readDays();
  return Response.json(
    { order: HISTORY_ORDER, days },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" } },
  );
}
