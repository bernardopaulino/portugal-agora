import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DistrictWarningsView } from "@/components/district-topic-views";
import { districts, getDistrict } from "@/data/districts";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { alternates } from "@/lib/i18n/metadata";
import { getState } from "@/lib/state/get-state";

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
  return {
    title: t.districtPages.warningsTitle(inPlace),
    description: t.districtPages.warningsIntro(inPlace),
    alternates: alternates(lang, `/${district.slug}/avisos`),
  };
}

export default async function DistrictAvisosPage(props: PageProps<"/[lang]/[distrito]/avisos">) {
  const { lang, distrito } = await props.params;
  const district = getDistrict(distrito);
  if (!district || !isLocale(lang)) notFound();
  const state = await getState();
  return <DistrictWarningsView district={district} initial={state} />;
}
