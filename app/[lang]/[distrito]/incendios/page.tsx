import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DistrictFiresView } from "@/components/district-topic-views";
import { districts, getDistrict } from "@/data/districts";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { alternates } from "@/lib/i18n/metadata";
import { getState } from "@/lib/state/get-state";

export function generateStaticParams() {
  return districts.map((d) => ({ distrito: d.slug }));
}

export async function generateMetadata(
  props: PageProps<"/[lang]/[distrito]/incendios">,
): Promise<Metadata> {
  const { lang, distrito } = await props.params;
  const district = getDistrict(distrito);
  if (!district || !isLocale(lang)) return {};
  const t = getDictionary(lang);
  const inPlace = t.inPlace(district);
  return {
    title: t.districtPages.firesTitle(inPlace),
    description: t.districtPages.firesIntro(inPlace),
    alternates: alternates(lang, `/${district.slug}/incendios`),
  };
}

export default async function DistrictIncendiosPage(
  props: PageProps<"/[lang]/[distrito]/incendios">,
) {
  const { lang, distrito } = await props.params;
  const district = getDistrict(distrito);
  if (!district || !isLocale(lang)) notFound();
  const state = await getState();
  return <DistrictFiresView district={district} initial={state} />;
}
