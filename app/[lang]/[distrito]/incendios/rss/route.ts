import { connection } from "next/server";

import { getDistrict } from "@/data/districts";
import { feedResponse } from "@/lib/feeds/response";
import { isLocale } from "@/lib/i18n/locales";

/** Feed RSS do tema num distrito (ver lib/feeds). */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/[lang]/[distrito]/incendios/rss">,
) {
  await connection();
  const { lang, distrito } = await ctx.params;
  const district = getDistrict(distrito);
  if (!isLocale(lang) || !district) return new Response("Not found", { status: 404 });
  return feedResponse(lang, "incendios", district);
}
