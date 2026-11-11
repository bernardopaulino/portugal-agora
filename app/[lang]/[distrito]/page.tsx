import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DistrictView } from "@/components/district-view";
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { districts, getDistrict } from "@/data/districts";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { pageMetadata } from "@/lib/i18n/metadata";

export function generateStaticParams() {
  return districts.map((d) => ({ distrito: d.slug }));
}

export async function generateMetadata(props: PageProps<"/[lang]/[distrito]">): Promise<Metadata> {
  const { lang, distrito } = await props.params;
  const district = getDistrict(distrito);
  if (!district || !isLocale(lang)) return {};
  const t = getDictionary(lang);
  // A descrição não leva o estado atual: a página é estática (sem "ISR writes").
  const meta = t.districtMeta(t.districtName(district), t.inPlace(district));
  return pageMetadata({
    locale: lang,
    path: `/${district.slug}`,
    title: meta.title,
    description: meta.description,
  });
}

export default async function DistrictPage(props: PageProps<"/[lang]/[distrito]">) {
  const { lang, distrito } = await props.params;
  const district = getDistrict(distrito);
  if (!district || !isLocale(lang)) notFound();
  const t = getDictionary(lang);
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(lang, t, [
          { name: t.districtName(district), path: `/${district.slug}` },
        ])}
      />
      <DistrictView district={district} />
    </>
  );
}
