import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Barlow_Semi_Condensed } from "next/font/google";

import { EmergencyBar } from "@/components/layout/emergency-bar";
import { OfflineBanner } from "@/components/layout/offline-banner";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ServiceWorkerRegister } from "@/components/layout/sw-register";
import { themeScript } from "@/components/layout/theme";
import { site } from "@/lib/config/site";

import "./globals.css";

/**
 * Atkinson Hyperlegible Next: desenhada pelo Braille Institute para
 * leitores com baixa visão — letras que não se confundem (I/l/1, O/0).
 */
const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
  // A fonte é recente e o Next ainda não tem métricas para gerar o fallback ajustado.
  adjustFontFallback: false,
});

/**
 * Barlow Semi Condensed: a letra das legendas do boletim (título,
 * números, barra de rodapé). O texto corrido fica em Atkinson.
 */
const barlow = Barlow_Semi_Condensed({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name}: ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  openGraph: {
    type: "website",
    locale: site.locale,
    siteName: site.name,
    title: site.name,
    description: site.description,
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#06121d" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-PT"
      className={`${atkinson.variable} ${barlow.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Define o tema antes da primeira pintura (evita o "flash").
            suppressHydrationWarning: há extensões do browser que alteram
            este <script> (ex.: acrescentam um src) antes de o React carregar. */}
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#conteudo"
          className="sr-only z-50 rounded-lg bg-ink px-4 py-3 font-bold text-bg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Saltar para o conteúdo
        </a>
        <EmergencyBar />
        <OfflineBanner />
        <SiteHeader />
        <main id="conteudo" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
