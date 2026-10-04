import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { QuakesView } from "@/components/topic-views";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { alternates } from "@/lib/i18n/metadata";
import { getState } from "@/lib/state/get-state";

export async function generateMetadata(props: PageProps<"/[lang]/sismos">): Promise<Metadata> {
  const { lang } = await props.params;
  if (!isLocale(lang)) return {};
  const t = getDictionary(lang);
  return {
    title: t.pages.quakesTitle,
    description: t.pages.quakesIntro,
    alternates: alternates(lang, "/sismos"),
  };
}

export default async function SismosPage(props: PageProps<"/[lang]/sismos">) {
  const { lang } = await props.params;
  if (!isLocale(lang)) notFound();
  const state = await getState();
  return <QuakesView initial={state} />;
}
