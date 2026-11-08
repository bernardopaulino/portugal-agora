import { connection } from "next/server";

import { HISTORY_ORDER } from "@/lib/history/points";
import { readHistory } from "@/lib/history/store";

/** Os últimos 7 dias (ver lib/history). 5 min na CDN: o histórico muda de 10 em 10 min. */
export async function GET() {
  await connection();
  const points = await readHistory();
  return Response.json(
    { order: HISTORY_ORDER, points },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
