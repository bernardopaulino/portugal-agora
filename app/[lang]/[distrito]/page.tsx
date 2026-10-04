import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DistrictView } from "@/components/district-view";
import { districts, getDistrict } from "@/data/districts";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { alternates } from "@/lib/i18n/metadata";
import { getForecast } from "@/lib/sources/registry";
import { districtHeadline } from "@/lib/state/bulletin";
import { getState } from "@/lib/state/get-state";

export function generateStaticParams() {
  return districts.map((d) => ({ distrito: d.slug }));
}

export async function generateMetadata(props: PageProps<"/[lang]/[distrito]">): Promise<Metadata> {
  const { lang, distrito } = await props.params;
  const district = getDistrict(distrito);
  if (!district || !isLocale(lang)) return {};
  const t = getDictionary(lang);
  const state = await getState();
  const headline = districtHeadline(district, state.warnings.data ?? [], state.levelKnown, t);
  return {
    ...t.districtMeta(t.districtName(district), headline, t.inPlace(district)),
    alternates: alternates(lang, `/${district.slug}`),
  };
}

export default async function DistrictPage(props: PageProps<"/[lang]/[distrito]">) {
  const { lang, distrito } = await props.params;
  const district = getDistrict(distrito);
  if (!district || !isLocale(lang)) notFound();
  const [state, forecast] = await Promise.all([getState(), getForecast(district.globalIdLocal)]);
  return <DistrictView district={district} initial={state} forecast={forecast} />;
}
