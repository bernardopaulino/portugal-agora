import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { logoOutline } from "@/data/map-shapes";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locales";
import type { Severity } from "@/lib/sources/types";

import { dataStamp, headlineSize } from "./text";

export const ogSize = { width: 1200, height: 630 };

const tint: Record<Severity | "unknown", { bar: string; bg: string }> = {
  none: { bar: "#2e7d4f", bg: "#e2f1e7" },
  yellow: { bar: "#e8b000", bg: "#fff3c7" },
  orange: { bar: "#e0661b", bg: "#fde5d3" },
  red: { bar: "#c62828", bg: "#fbe0e0" },
  unknown: { bar: "#7c8b94", bg: "#e6ebee" },
};

// Os tokens ink e ink-2 do site (DESIGN.md).
const INK = "#0a1d2e";
const INK_2 = "#45586a";

/**
 * As letras do site, lidas do disco (assets/fonts, licença OFL) e não
 * pedidas à rede: Barlow Semi Condensed nos títulos, Atkinson Hyperlegible
 * Next no texto. O ImageResponse precisa de TTF/OTF estáticos.
 */
let fonts:
  Promise<NonNullable<ConstructorParameters<typeof ImageResponse>[1]>["fonts"]> | undefined;
function loadFonts() {
  fonts ??= Promise.all([
    readFile(join(process.cwd(), "assets/fonts/BarlowSemiCondensed-Bold.ttf")),
    readFile(join(process.cwd(), "assets/fonts/AtkinsonHyperlegibleNext-Regular.ttf")),
    readFile(join(process.cwd(), "assets/fonts/AtkinsonHyperlegibleNext-Bold.ttf")),
  ]).then(([barlow, atkinson, atkinsonBold]) => [
    { name: "Barlow Semi Condensed", data: barlow, weight: 700 as const, style: "normal" as const },
    {
      name: "Atkinson Hyperlegible Next",
      data: atkinson,
      weight: 400 as const,
      style: "normal" as const,
    },
    {
      name: "Atkinson Hyperlegible Next",
      data: atkinsonBold,
      weight: 700 as const,
      style: "normal" as const,
    },
  ]);
  return fonts;
}

/** Imagem de partilha com o estado atual: é o que aparece no WhatsApp ou no LinkedIn. */
export async function statusCard({
  level,
  place,
  headline,
  generatedAt,
  locale = "pt",
}: {
  level: Severity | "unknown";
  place: string;
  headline: string;
  /** Hora dos dados (state.generatedAt). */
  generatedAt: string;
  locale?: Locale;
}) {
  const t = getDictionary(locale);
  const colors = tint[level];
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: colors.bg,
        fontFamily: "Atkinson Hyperlegible Next",
        color: INK,
      }}
    >
      <div style={{ width: 28, height: "100%", background: colors.bar }} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 72px 52px",
          flex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* O logótipo do site: o contorno do continente com o ponto do nível. */}
          <svg width={40} height={70} viewBox={`-3 -2 ${logoOutline.width + 18} 104`}>
            <path d={logoOutline.d} fill={INK} />
            <circle
              cx={logoOutline.width - 4}
              cy="49"
              r="11.5"
              fill={colors.bar}
              stroke={colors.bg}
              strokeWidth="4.5"
            />
          </svg>
          <span style={{ fontFamily: "Barlow Semi Condensed", fontSize: 44, fontWeight: 700 }}>
            Portugal Agora
          </span>
          <span style={{ fontSize: 34, color: INK_2 }}>{place}</span>
        </div>

        <div
          style={{
            display: "block",
            fontFamily: "Barlow Semi Condensed",
            fontSize: headlineSize(headline),
            fontWeight: 700,
            lineHeight: 1.08,
            lineClamp: 4,
          }}
        >
          {headline}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 30, fontWeight: 700 }}>{dataStamp(generatedAt, locale, t)}</span>
          <span style={{ fontSize: 24, color: INK_2 }}>{t.site.ogSources}</span>
        </div>
      </div>
    </div>,
    { ...ogSize, fonts: await loadFonts() },
  );
}
