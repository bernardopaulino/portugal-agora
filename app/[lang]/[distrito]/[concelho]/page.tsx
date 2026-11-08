import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ConcelhoView } from "@/components/concelho-view";
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { concelhos, getConcelho } from "@/data/concelhos";
import { getDistrict } from "@/data/districts";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { inheritedOgImage, pageMetadata } from "@/lib/i18n/metadata";

/*
 * Página de um concelho (/lisboa/sintra). Sem dados no HTML: o
 * ConcelhoView vai buscá-los ao abrir (ver components/concelho-view.tsx).
 * Assim as ~600 páginas (308 concelhos × 2 idiomas) não pesam no limite de
 * "ISR writes" da Vercel.
 */

export function generateStaticParams() {
  return concelhos.map((c) => ({ distrito: c.district, concelho: c.slug }));
}

export async function generateMetadata(
  props: PageProps<"/[lang]/[distrito]/[concelho]">,
): Promise<Metadata> {
  const { lang, distrito, concelho: slug } = await props.params;
  const district = getDistrict(distrito);
  const concelho = getConcelho(distrito, slug);
  if (!district || !concelho || !isLocale(lang)) return {};
  const t = getDictionary(lang);
  const name = t.concelhoName(concelho.dico, concelho.name);
  return pageMetadata({
    locale: lang,
    path: `/${district.slug}/${concelho.slug}`,
    title: t.concelho.metaTitle(name),
    description: t.concelho.metaDescription(name, t.inPlace(district)),
    image: inheritedOgImage(lang, t.site.ogAlt, district.slug),
  });
}

export default async function ConcelhoPage(props: PageProps<"/[lang]/[distrito]/[concelho]">) {
  const { lang, distrito, concelho: slug } = await props.params;
  const district = getDistrict(distrito);
  const concelho = getConcelho(distrito, slug);
  if (!district || !concelho || !isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const name = t.concelhoName(concelho.dico, concelho.name);
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(lang, t, [
          { name: t.districtName(district), path: `/${district.slug}` },
          { name, path: `/${district.slug}/${concelho.slug}` },
        ])}
      />
      <ConcelhoView concelho={concelho} district={district} />
    </>
  );
}
