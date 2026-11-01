import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DistrictRiskView } from "@/components/district-topic-views";
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { districts, getDistrict } from "@/data/districts";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { inheritedOgImage, pageMetadata } from "@/lib/i18n/metadata";
import { getPageState } from "@/lib/state/get-state";

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
  // Os Açores e a Madeira não têm risco de incêndio do IPMA: só ar e UV.
  const continent = district.region === "continente";
  return pageMetadata({
    locale: lang,
    path: `/${district.slug}/risco`,
    title: continent ? t.meta.districtRiskTitle(inPlace) : t.meta.districtAirTitle(inPlace),
    description: continent
      ? t.districtPages.riskIntro(t.capitalName(district))
      : t.districtPages.airIntro(t.capitalName(district)),
    image: inheritedOgImage(lang, t.site.ogAlt, district.slug),
  });
}

export default async function DistrictRiscoPage(props: PageProps<"/[lang]/[distrito]/risco">) {
  const { lang, distrito } = await props.params;
  const district = getDistrict(distrito);
  if (!district || !isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const inPlace = t.inPlace(district);
  const state = await getPageState();
  const topic =
    district.region === "continente"
      ? t.districtPages.riskTitle(inPlace)
      : t.districtPages.airTitle(inPlace);
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(lang, t, [
          { name: t.districtName(district), path: `/${district.slug}` },
          { name: topic, path: `/${district.slug}/risco` },
        ])}
      />
      <DistrictRiskView district={district} initial={state} />
    </>
  );
}
