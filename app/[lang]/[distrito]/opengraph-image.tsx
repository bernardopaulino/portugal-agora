import { connection } from "next/server";

import { getDistrict } from "@/data/districts";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { safeOgImage, statusCard } from "@/lib/og/card";
import { districtHeadline } from "@/lib/state/bulletin";
import { districtLevel } from "@/lib/state/district";
import { getState } from "@/lib/state/get-state";
import { levelsByDistrict } from "@/lib/og/text";

export const alt = "Portugal Agora";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/*
 * Gerada a pedido (connection()) e guardada 15 min na CDN (ver safeOgImage),
 * nunca pré-gerada como ISR: assim não gasta "ISR writes" da Vercel.
 */
export default async function Image({
  params,
}: {
  params: Promise<{ lang: string; distrito: string }>;
}) {
  await connection();
  const { lang, distrito } = await params;
  const locale = isLocale(lang) ? lang : "pt";
  const t = getDictionary(locale);
  const district = getDistrict(distrito) ?? getDistrict("lisboa")!;
  return safeOgImage(async () => {
    const state = await getState();
    return statusCard({
      level: state.levelKnown ? districtLevel(state, district.slug) : "unknown",
      place: t.districtName(district),
      headline: districtHeadline(district, state.warnings.data ?? [], state.levelKnown, t),
      generatedAt: state.generatedAt,
      locale,
      levels: levelsByDistrict(state),
      focus: district.slug,
    });
  }, locale);
}
