import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DistrictView } from "@/components/district-view";
import { districts, getDistrict } from "@/data/districts";
import { getForecast } from "@/lib/sources/registry";
import { districtHeadline } from "@/lib/state/district";
import { getState } from "@/lib/state/get-state";

export function generateStaticParams() {
  return districts.map((d) => ({ distrito: d.slug }));
}

export async function generateMetadata(props: PageProps<"/[distrito]">): Promise<Metadata> {
  const { distrito } = await props.params;
  const district = getDistrict(distrito);
  if (!district) return {};
  const state = await getState();
  const description = districtHeadline(district, state.warnings.data ?? [], state.levelKnown);
  return {
    title: `${district.name}: avisos, incêndios e sismos agora`,
    description: `${description} Previsão, risco de incêndio, qualidade do ar e UV ${district.inName}.`,
    alternates: { canonical: `/${district.slug}` },
  };
}

export default async function DistrictPage(props: PageProps<"/[distrito]">) {
  const { distrito } = await props.params;
  const district = getDistrict(distrito);
  if (!district) notFound();
  const [state, forecast] = await Promise.all([getState(), getForecast(district.globalIdLocal)]);
  return <DistrictView district={district} initial={state} forecast={forecast} />;
}
