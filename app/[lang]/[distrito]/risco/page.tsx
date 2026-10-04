import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DistrictRiskView } from "@/components/district-topic-views";
import { districts, getDistrict } from "@/data/districts";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { alternates } from "@/lib/i18n/metadata";
import { getState } from "@/lib/state/get-state";

export function generateStaticParams() {
  return districts.map((d) => ({ distrito: d.slug }));
}

export async function generateMetadata(
  props: PageProps<"/[lang]/[distrito]/risco">,
): Promise<Metadata> {
  const { lang, distrito } = await props.params;
  const district = getDistrict(distrito);
  if (!district || !isLocale(lang)) return {};
  const t = getDictionary(lang);
  const inPlace = t.inPlace(district);
  return {
    // Os Açores e a Madeira não têm risco de incêndio do IPMA: só ar e UV.
    ...(district.region === "continente"
      ? {
          title: t.districtPages.riskTitle(inPlace),
          description: t.districtPages.riskIntro(district.capital),
        }
      : {
          title: t.districtPages.airTitle(inPlace),
          description: t.districtPages.airIntro(district.capital),
        }),
    alternates: alternates(lang, `/${district.slug}/risco`),
  };
}

export default async function DistrictRiscoPage(props: PageProps<"/[lang]/[distrito]/risco">) {
  const { lang, distrito } = await props.params;
  const district = getDistrict(distrito);
  if (!district || !isLocale(lang)) notFound();
  const state = await getState();
  return <DistrictRiskView district={district} initial={state} />;
}
