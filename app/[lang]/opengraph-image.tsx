import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, locales } from "@/lib/i18n/locales";
import { statusCard } from "@/lib/og/card";
import { countryHeadline } from "@/lib/state/bulletin";
import { getState } from "@/lib/state/get-state";

export const alt = "Portugal Agora";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : "pt";
  const t = getDictionary(locale);
  const state = await getState();
  return statusCard({
    level: state.levelKnown ? state.level : "unknown",
    place: t.site.wholeCountry,
    headline: countryHeadline(state.levelKnown, state.districts, t),
    generatedAt: state.generatedAt,
    locale,
  });
}
