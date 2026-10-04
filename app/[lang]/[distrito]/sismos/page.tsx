import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DistrictQuakesView } from "@/components/district-topic-views";
import { districts, getDistrict } from "@/data/districts";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { alternates } from "@/lib/i18n/metadata";
import { getState } from "@/lib/state/get-state";

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
  return {
    title: t.districtPages.quakesTitle(inPlace),
    description: t.districtPages.quakesIntro(inPlace),
    alternates: alternates(lang, `/${district.slug}/sismos`),
  };
}

export default async function DistrictSismosPage(props: PageProps<"/[lang]/[distrito]/sismos">) {
  const { lang, distrito } = await props.params;
  const district = getDistrict(distrito);
  if (!district || !isLocale(lang)) notFound();
  const state = await getState();
  return <DistrictQuakesView district={district} initial={state} />;
}
