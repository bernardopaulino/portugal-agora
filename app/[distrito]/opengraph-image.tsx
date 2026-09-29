import { districts, getDistrict } from "@/data/districts";
import { statusCard } from "@/lib/og/card";
import { districtHeadline, districtLevel } from "@/lib/state/district";
import { getState } from "@/lib/state/get-state";

export const alt = "Estado atual do distrito: avisos, incêndios e sismos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return districts.map((d) => ({ distrito: d.slug }));
}

export default async function Image({ params }: { params: Promise<{ distrito: string }> }) {
  const { distrito } = await params;
  const district = getDistrict(distrito) ?? getDistrict("lisboa")!;
  const state = await getState();
  return statusCard({
    level: state.levelKnown ? districtLevel(state, district.slug) : "unknown",
    place: district.name,
    headline: districtHeadline(district, state.warnings.data ?? [], state.levelKnown),
  });
}
