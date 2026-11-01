import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DistrictWarningsView } from "@/components/district-topic-views";
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
  props: PageProps<"/[lang]/[distrito]/avisos">,
): Promise<Metadata> {
  const { lang, distrito } = await props.params;
  const district = getDistrict(distrito);
  if (!district || !isLocale(lang)) return {};
  const t = getDictionary(lang);
  const inPlace = t.inPlace(district);
  return pageMetadata({
    locale: lang,
    path: `/${district.slug}/avisos`,
    title: t.meta.districtWarningsTitle(inPlace),
    description: t.districtPages.warningsIntro(inPlace),
    image: inheritedOgImage(lang, t.site.ogAlt, district.slug),
  });
}

export default async function DistrictAvisosPage(props: PageProps<"/[lang]/[distrito]/avisos">) {
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
          { name: t.pages.warningsTitle, path: `/${district.slug}/avisos` },
        ])}
      />
      <DistrictWarningsView district={district} initial={state} />
    </>
  );
}
