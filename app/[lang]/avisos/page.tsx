import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { WarningsView } from "@/components/topic-views";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { inheritedOgImage, pageMetadata } from "@/lib/i18n/metadata";
import { getPageState } from "@/lib/state/get-state";

export async function generateMetadata(props: PageProps<"/[lang]/avisos">): Promise<Metadata> {
  const { lang } = await props.params;
  if (!isLocale(lang)) return {};
  const t = getDictionary(lang);
  return pageMetadata({
    locale: lang,
    path: "/avisos",
    title: t.meta.warningsTitle,
    description: t.pages.warningsIntro,
    image: inheritedOgImage(lang, t.site.ogAlt),
  });
}

export default async function AvisosPage(props: PageProps<"/[lang]/avisos">) {
  const { lang } = await props.params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const state = await getPageState();
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(lang, t, [{ name: t.pages.warningsTitle, path: "/avisos" }])}
      />
      <WarningsView initial={state} />
    </>
  );
}
