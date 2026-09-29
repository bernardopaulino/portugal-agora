import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next } from "next/font/google";

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
    { media: "(prefers-color-scheme: dark)", color: "#0b1a23" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-PT" className={atkinson.variable} suppressHydrationWarning>
      <head>
        {/* Define o tema antes da primeira pintura (evita o "flash"). */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
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
