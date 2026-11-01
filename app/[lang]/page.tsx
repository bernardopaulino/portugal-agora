import type { Metadata } from "next";

import { Dashboard } from "@/components/dashboard";
import { JsonLd, websiteJsonLd } from "@/components/seo/json-ld";
import { site } from "@/lib/config/site";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getPageState } from "@/lib/state/get-state";

export async function generateMetadata(props: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await props.params;
  if (!isLocale(lang)) return {};
  const t = getDictionary(lang);
  return pageMetadata({
    locale: lang,
    path: "/",
    title: t.meta.homeTitle,
    description: t.site.description,
    absoluteTitle: true,
    // O LinkedIn mostra este título por baixo da imagem: fica o slogan.
    shareTitle: `${site.name}: ${t.site.tagline}`,
  });
}

export default async function Home(props: PageProps<"/[lang]">) {
  const { lang } = await props.params;
  const locale = isLocale(lang) ? lang : "pt";
  const state = await getPageState();
  // Dados estruturados (schema.org): o Google usa-os para mostrar o nome do site nos resultados.
  return (
    <>
      <JsonLd data={websiteJsonLd(locale, getDictionary(locale).site.description)} />
      <Dashboard initial={state} />
    </>
  );
}
