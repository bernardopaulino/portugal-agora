import { connection } from "next/server";

import { feedResponse } from "@/lib/feeds/response";
import { isLocale } from "@/lib/i18n/locales";

/** Feed RSS dos avisos do país (ver lib/feeds/warnings.ts). */
export async function GET(_request: Request, ctx: RouteContext<"/[lang]/avisos/rss">) {
  await connection();
  const { lang } = await ctx.params;
  if (!isLocale(lang)) return new Response("Not found", { status: 404 });
  return feedResponse(lang);
}
