import { Atkinson_Hyperlegible_Next, Geist, Geist_Mono } from "next/font/google";

/**
 * Atkinson Hyperlegible Next: desenhada pelo Braille Institute para
 * leitores com baixa visão — letras que não se confundem (I/l/1, O/0).
 * Fica no texto corrido: é o que mais se lê.
 */
const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
  // A fonte é recente e o Next ainda não tem métricas para gerar o fallback ajustado.
  adjustFontFallback: false,
});

/** Geist: títulos, números, nomes e controlos (a voz da interface). */
const geist = Geist({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

/** Geist Mono: etiquetas, horas e leituras de dados, em maiúsculas pequenas. */
const geistMono = Geist_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["500"],
  variable: "--font-data",
  display: "swap",
});

export const fontClasses = `${atkinson.variable} ${geist.variable} ${geistMono.variable}`;
