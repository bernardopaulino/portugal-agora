import { Atkinson_Hyperlegible_Next, Barlow_Semi_Condensed } from "next/font/google";

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

export const fontClasses = `${atkinson.variable} ${barlow.variable}`;
