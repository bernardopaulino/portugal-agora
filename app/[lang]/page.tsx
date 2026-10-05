import type { Metadata } from "next";

import { Dashboard } from "@/components/dashboard";
import { site } from "@/lib/config/site";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { intlLocale, isLocale, localePath } from "@/lib/i18n/locales";
import { alternates } from "@/lib/i18n/metadata";
import { getState } from "@/lib/state/get-state";

export async function generateMetadata(props: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await props.params;
  if (!isLocale(lang)) return {};
  return { alternates: alternates(lang, "/") };
}

export default async function Home(props: PageProps<"/[lang]">) {
  const { lang } = await props.params;
  const locale = isLocale(lang) ? lang : "pt";
  const state = await getState();
  // Dados estruturados (schema.org): o Google usa-os para mostrar o nome do
  // site nos resultados. Um <script> de dados não é executado, por isso pode
  // ser desenhado pelo React sem problema.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: `${site.url}${localePath(locale, "/")}`,
    description: getDictionary(locale).site.description,
    inLanguage: intlLocale[locale],
    author: { "@type": "Person", name: site.author },
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Dashboard initial={state} />
    </>
  );
}
