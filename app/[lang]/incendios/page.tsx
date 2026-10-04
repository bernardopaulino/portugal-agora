import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FiresView } from "@/components/topic-views";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { alternates } from "@/lib/i18n/metadata";
import { getState } from "@/lib/state/get-state";

export async function generateMetadata(props: PageProps<"/[lang]/incendios">): Promise<Metadata> {
  const { lang } = await props.params;
  if (!isLocale(lang)) return {};
  const t = getDictionary(lang);
  return {
    title: t.pages.firesTitle,
    description: t.pages.firesIntro,
    alternates: alternates(lang, "/incendios"),
  };
}

export default async function IncendiosPage(props: PageProps<"/[lang]/incendios">) {
  const { lang } = await props.params;
  if (!isLocale(lang)) notFound();
  const state = await getState();
  return <FiresView initial={state} />;
}
