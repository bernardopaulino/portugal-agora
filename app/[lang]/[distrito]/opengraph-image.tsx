import { districts, getDistrict } from "@/data/districts";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { statusCard } from "@/lib/og/card";
import { districtHeadline } from "@/lib/state/bulletin";
import { districtLevel } from "@/lib/state/district";
import { getState } from "@/lib/state/get-state";

export const alt = "Portugal Agora";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return districts.map((d) => ({ distrito: d.slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ lang: string; distrito: string }>;
}) {
  const { lang, distrito } = await params;
  const locale = isLocale(lang) ? lang : "pt";
  const t = getDictionary(locale);
  const district = getDistrict(distrito) ?? getDistrict("lisboa")!;
  const state = await getState();
  return statusCard({
    level: state.levelKnown ? districtLevel(state, district.slug) : "unknown",
    place: t.districtName(district),
    headline: districtHeadline(district, state.warnings.data ?? [], state.levelKnown, t),
    generatedAt: state.generatedAt,
    locale,
  });
}
