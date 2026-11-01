import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DistrictQuakesView } from "@/components/district-topic-views";
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
  props: PageProps<"/[lang]/[distrito]/sismos">,
): Promise<Metadata> {
  const { lang, distrito } = await props.params;
  const district = getDistrict(distrito);
  if (!district || !isLocale(lang)) return {};
  const t = getDictionary(lang);
  const inPlace = t.inPlace(district);
  return pageMetadata({
    locale: lang,
    path: `/${district.slug}/sismos`,
    title: t.meta.districtQuakesTitle(inPlace),
    description: t.districtPages.quakesIntro(inPlace),
    image: inheritedOgImage(lang, t.site.ogAlt, district.slug),
  });
}

export default async function DistrictSismosPage(props: PageProps<"/[lang]/[distrito]/sismos">) {
  const { lang, distrito } = await props.params;
  const district = getDistrict(distrito);
  if (!district || !isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const state = await getPageState();
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(lang, t, [
          { name: t.districtName(district), path: `/${district.slug}` },
          { name: t.pages.quakesTitle, path: `/${district.slug}/sismos` },
        ])}
      />
      <DistrictQuakesView district={district} initial={state} />
    </>
  );
}
