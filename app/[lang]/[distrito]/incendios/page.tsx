import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DistrictFiresView } from "@/components/district-topic-views";
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { districts, getDistrict } from "@/data/districts";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { inheritedOgImage, pageMetadata } from "@/lib/i18n/metadata";
import { feedPath } from "@/lib/feeds/paths";

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
  return pageMetadata({
    locale: lang,
    path: `/${district.slug}/incendios`,
    title: t.meta.districtFiresTitle(inPlace),
    description: t.districtPages.firesIntro(district),
    image: inheritedOgImage(lang, t.site.ogAlt, district.slug),
    feed: {
      title: t.feed.firesTitle(t.inPlace(district)),
      url: feedPath(lang, "incendios", district),
    },
  });
}

export default async function DistrictIncendiosPage(
  props: PageProps<"/[lang]/[distrito]/incendios">,
) {
  const { lang, distrito } = await props.params;
  const district = getDistrict(distrito);
  if (!district || !isLocale(lang)) notFound();
  const t = getDictionary(lang);
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(lang, t, [
          { name: t.districtName(district), path: `/${district.slug}` },
          { name: t.pages.firesTitle, path: `/${district.slug}/incendios` },
        ])}
      />
      <DistrictFiresView
        // Uma vista nova por distrito: ao mudar de distrito no mesmo tema, o Next
        // reaproveitava o mapa do distrito anterior (filtros, entrada 3D, câmara).
        key={district.slug}
        district={district}
      />
    </>
  );
}
