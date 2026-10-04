import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WarningsView } from "@/components/topic-views";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { alternates } from "@/lib/i18n/metadata";
import { getState } from "@/lib/state/get-state";

export async function generateMetadata(props: PageProps<"/[lang]/avisos">): Promise<Metadata> {
  const { lang } = await props.params;
  if (!isLocale(lang)) return {};
  const t = getDictionary(lang);
  return {
    title: t.pages.warningsTitle,
    description: t.pages.warningsIntro,
    alternates: alternates(lang, "/avisos"),
  };
}

export default async function AvisosPage(props: PageProps<"/[lang]/avisos">) {
  const { lang } = await props.params;
  if (!isLocale(lang)) notFound();
  const state = await getState();
  return <WarningsView initial={state} />;
}
