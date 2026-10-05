import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";

import { EmergencyBar } from "@/components/layout/emergency-bar";
import { OfflineBanner } from "@/components/layout/offline-banner";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ServiceWorkerRegister } from "@/components/layout/sw-register";
import { themeScript } from "@/components/layout/theme";
import { site } from "@/lib/config/site";
import { fontClasses } from "@/lib/fonts";
import { I18nProvider } from "@/lib/i18n/client";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { intlLocale, isLocale, locales } from "@/lib/i18n/locales";

import "../globals.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata(props: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await props.params;
  if (!isLocale(lang)) return {};
  const t = getDictionary(lang);
  return {
    metadataBase: new URL(site.url),
    title: {
      default: `${site.name}: ${t.site.tagline}`,
      template: `%s | ${site.name}`,
    },
    description: t.site.description,
    applicationName: site.name,
    openGraph: {
      type: "website",
      locale: lang === "pt" ? "pt_PT" : "en_GB",
      siteName: site.name,
      // O LinkedIn mostra este título por baixo da imagem: só "Portugal Agora" dizia pouco.
      title: `${site.name}: ${t.site.tagline}`,
      description: t.site.description,
    },
    twitter: {
      card: "summary_large_image",
      title: `${site.name}: ${t.site.tagline}`,
      description: t.site.description,
    },
    robots: { index: true, follow: true },
    formatDetection: { telephone: false },
    // O site tem as suas versões em português e inglês: sem tradução automática do
    // Chrome/Google, que estragaria nomes, níveis e frases já traduzidas.
    other: { google: "notranslate" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#06121d" },
  ],
};

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);

  return (
    <html lang={intlLocale[lang]} translate="no" className={fontClasses} suppressHydrationWarning>
      <head>
        {/* Define o tema antes da primeira pintura (evita o "flash").
            suppressHydrationWarning: há extensões do browser que alteram
            este <script> (ex.: acrescentam um src) antes de o React carregar. */}
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <I18nProvider locale={lang}>
          <a
            href="#conteudo"
            className="sr-only z-50 rounded-sm bg-ink px-4 py-3 font-bold text-bg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
          >
            {t.nav.skip}
          </a>
          <EmergencyBar />
          <OfflineBanner />
          <SiteHeader />
          <main id="conteudo" className="flex-1">
            {children}
          </main>
          <SiteFooter />
          <ServiceWorkerRegister />
        </I18nProvider>
      </body>
    </html>
  );
}
