import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RiskView } from "@/components/topic-views";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { alternates } from "@/lib/i18n/metadata";
import { getState } from "@/lib/state/get-state";

export async function generateMetadata(props: PageProps<"/[lang]/risco">): Promise<Metadata> {
  const { lang } = await props.params;
  if (!isLocale(lang)) return {};
  const t = getDictionary(lang);
  return {
    title: t.pages.riskTitle,
    description: t.pages.riskIntro,
    alternates: alternates(lang, "/risco"),
  };
}

export default async function RiscoPage(props: PageProps<"/[lang]/risco">) {
  const { lang } = await props.params;
  if (!isLocale(lang)) notFound();
  const state = await getState();
  return <RiskView initial={state} />;
}
