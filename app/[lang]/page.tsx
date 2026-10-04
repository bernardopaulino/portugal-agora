import type { Metadata } from "next";

import { Dashboard } from "@/components/dashboard";
import { isLocale } from "@/lib/i18n/locales";
import { alternates } from "@/lib/i18n/metadata";
import { getState } from "@/lib/state/get-state";

export async function generateMetadata(props: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await props.params;
  if (!isLocale(lang)) return {};
  return { alternates: alternates(lang, "/") };
}

export default async function Home() {
  const state = await getState();
  return <Dashboard initial={state} />;
}
