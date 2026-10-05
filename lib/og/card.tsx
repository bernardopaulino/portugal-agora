import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { unstable_rethrow } from "next/navigation";
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

type Fonts = NonNullable<ConstructorParameters<typeof ImageResponse>[1]>["fonts"];

/**
 * As letras do site, lidas do disco (assets/fonts, licença OFL) e não
 * pedidas à rede: Barlow Semi Condensed nos títulos, Atkinson Hyperlegible
 * Next no texto. O ImageResponse precisa de TTF/OTF estáticos.
 *
 * Lidas uma vez, ao carregar o módulo (top-level await, como na
 * documentação do Next para opengraph-image), e não durante a geração da
 * imagem. Antes eram lidas na primeira imagem de cada instância: com Cache
 * Components, ler um ficheiro a meio da geração é IO sem cache, e numa
 * instância fria (a primeira imagem depois de a função estar parada) o Next
 * abortava com "used IO that was not cached" e a imagem dava 500.
 * Se a leitura falhar, as imagens saem com a letra por omissão do next/og.
 */
async function loadFonts(): Promise<Fonts | undefined> {
  return Promise.all([
    readFile(join(process.cwd(), "assets/fonts/BarlowSemiCondensed-Bold.ttf")),
    readFile(join(process.cwd(), "assets/fonts/AtkinsonHyperlegibleNext-Regular.ttf")),
    readFile(join(process.cwd(), "assets/fonts/AtkinsonHyperlegibleNext-Bold.ttf")),
  ])
    .then(([barlow, atkinson, atkinsonBold]) => [
      {
        name: "Barlow Semi Condensed",
        data: barlow,
        weight: 700 as const,
        style: "normal" as const,
      },
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
    ])
    .catch((error: unknown) => {
      console.error("[og] não foi possível ler as letras; uso a letra por omissão", error);
      return undefined;
    });
}

const fonts = await loadFonts();

/** Imagem de partilha com o estado atual: é o que aparece no WhatsApp ou no LinkedIn. */
export function statusCard({
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
    { ...ogSize, fonts },
  );
}

/**
 * Imagem genérica (marca, sem estado), para quando a do estado falha. Usa
 * só a letra por omissão do next/og e nenhum dado, para não depender do que
 * pode ter falhado.
 */
export function fallbackCard(locale: Locale = "pt") {
  const t = getDictionary(locale);
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 28,
        width: "100%",
        height: "100%",
        padding: "0 96px",
        background: "#e6ebee",
        color: INK,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <svg width={64} height={112} viewBox={`-3 -2 ${logoOutline.width + 18} 104`}>
          <path d={logoOutline.d} fill={INK} />
        </svg>
        <span style={{ fontSize: 88, fontWeight: 700 }}>Portugal Agora</span>
      </div>
      <span style={{ fontSize: 44, color: INK_2 }}>{t.site.tagline}</span>
      <span style={{ fontSize: 28, color: INK_2 }}>portugalagora.pt</span>
    </div>,
    ogSize,
  );
}

/** Desenha já o PNG: o ImageResponse só desenha quando a resposta é lida. */
async function render(image: ImageResponse): Promise<Response> {
  const body = await image.arrayBuffer();
  // Os mesmos cabeçalhos (tipo e cache) que o ImageResponse definiu.
  return new Response(body, { status: image.status, headers: image.headers });
}

/**
 * A imagem de partilha nunca dá erro: se montar a do estado falhar (dados,
 * letras ou desenho), regista o erro e devolve a imagem genérica, com o
 * mesmo tamanho e tipo. Uma pré-visualização genérica no WhatsApp ou no
 * LinkedIn é melhor do que nenhuma. Os erros internos do Next (que ele
 * próprio trata) seguem o seu caminho.
 */
export async function safeOgImage(
  build: () => ImageResponse | Promise<ImageResponse>,
  locale: Locale = "pt",
): Promise<Response> {
  try {
    return await render(await build());
  } catch (error) {
    unstable_rethrow(error);
    console.error("[og] falhou a imagem de partilha; uso a genérica", error);
    return render(fallbackCard(locale));
  }
}
