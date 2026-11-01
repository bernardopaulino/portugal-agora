import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { FiresView } from "@/components/topic-views";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { inheritedOgImage, pageMetadata } from "@/lib/i18n/metadata";
import { getPageState } from "@/lib/state/get-state";

export async function generateMetadata(props: PageProps<"/[lang]/incendios">): Promise<Metadata> {
  const { lang } = await props.params;
  if (!isLocale(lang)) return {};
  const t = getDictionary(lang);
  return pageMetadata({
    locale: lang,
    path: "/incendios",
    title: t.meta.firesTitle,
    description: t.pages.firesIntro,
    image: inheritedOgImage(lang, t.site.ogAlt),
  });
}

export default async function IncendiosPage(props: PageProps<"/[lang]/incendios">) {
  const { lang } = await props.params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const state = await getPageState();
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(lang, t, [{ name: t.pages.firesTitle, path: "/incendios" }])}
      />
      <FiresView initial={state} />
    </>
  );
}
