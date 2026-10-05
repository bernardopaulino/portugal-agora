import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { unstable_rethrow } from "next/navigation";
import { ImageResponse } from "next/og";

import { logoOutline, MAP_VIEWBOX, mapFrames, mapShapes } from "@/data/map-shapes";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locales";
import type { Severity } from "@/lib/sources/types";

import { dataStamp, headlineSize } from "./text";

export const ogSize = { width: 1200, height: 630 };

/*
 * Cores do "palco" do boletim no tema escuro e das terras do mapa
 * (tokens de app/globals.css / DESIGN.md). Escuro de propósito: no feed
 * branco do LinkedIn, um cartão claro passava despercebido.
 */
const STAGE = "#071f38";
const STAGE_2 = "#0b2b4c";
const STAGE_INK = "#ffffff";
const STAGE_INK_2 = "#b8cbe0";
const LAND_DIM = "#2b4f75";

export type MapLevel = Severity | "unknown";

const land: Record<MapLevel, string> = {
  none: "#4f9d63",
  yellow: "#f2c200",
  orange: "#f07f1a",
  red: "#d7262b",
  unknown: "#8797a3",
};

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

/** O logótipo: o contorno do continente com o ponto na cor do nível. */
function Logo({ dot, size = 64 }: { dot?: string; size?: number }) {
  const width = logoOutline.width + 18;
  return (
    <svg width={(size * width) / 104} height={size} viewBox={`-3 -2 ${width} 104`}>
      <path d={logoOutline.d} fill={STAGE_INK} />
      {dot ? (
        <circle
          cx={logoOutline.width - 4}
          cy="49"
          r="11.5"
          fill={dot}
          stroke={STAGE}
          strokeWidth="4.5"
        />
      ) : null}
    </svg>
  );
}

/**
 * O mapa do boletim (continente e as caixas dos Açores e da Madeira) com
 * a cor do nível de cada distrito. Numa página de distrito, os outros
 * ficam esbatidos, como no site.
 */
function BulletinMap({
  levels,
  focus,
  height,
}: {
  levels?: Record<string, MapLevel>;
  focus?: string;
  height: number;
}) {
  return (
    <svg width={(height * 840) / 1000} height={height} viewBox={MAP_VIEWBOX}>
      {(["acores", "madeira"] as const).map((region) => {
        const [x, y, w, h] = mapFrames[region];
        return (
          <rect
            key={region}
            x={x}
            y={y}
            width={w}
            height={h}
            fill="none"
            stroke={STAGE_INK_2}
            strokeOpacity={0.35}
            strokeWidth={2}
          />
        );
      })}
      {mapShapes.map((shape) => {
        const islands = shape.region !== "continente";
        const color =
          focus && focus !== shape.slug ? LAND_DIM : land[levels?.[shape.slug] ?? "unknown"];
        return (
          <path
            key={shape.slug}
            d={shape.d}
            fill={color}
            stroke={islands ? color : STAGE}
            strokeWidth={islands ? 5 : 2.5}
            strokeLinejoin="round"
          />
        );
      })}
    </svg>
  );
}

/** Imagem de partilha com o estado atual: é o que aparece no WhatsApp ou no LinkedIn. */
export function statusCard({
  level,
  place,
  headline,
  generatedAt,
  locale = "pt",
  levels,
  focus,
}: {
  level: MapLevel;
  place: string;
  headline: string;
  /** Hora dos dados (state.generatedAt). */
  generatedAt: string;
  locale?: Locale;
  /** Nível de cada distrito, para o mapa. */
  levels: Record<string, MapLevel>;
  /** Na imagem de um distrito: os outros ficam esbatidos no mapa. */
  focus?: string;
}) {
  const t = getDictionary(locale);
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        backgroundImage: `linear-gradient(135deg, ${STAGE} 0%, ${STAGE} 55%, ${STAGE_2} 100%)`,
        fontFamily: "Atkinson Hyperlegible Next",
        color: STAGE_INK,
      }}
    >
      {/* A faixa na cor do nível, como a barra de rodapé do boletim. */}
      <div style={{ width: 20, height: "100%", background: land[level] }} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: 700,
          padding: "52px 40px 48px 60px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Logo dot={land[level]} size={62} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontFamily: "Barlow Semi Condensed",
                fontSize: 42,
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              Portugal Agora
            </span>
            <span style={{ fontSize: 26, color: STAGE_INK_2, marginTop: 6 }}>{place}</span>
          </div>
        </div>

        <div
          style={{
            display: "block",
            fontFamily: "Barlow Semi Condensed",
            fontSize: headlineSize(headline),
            fontWeight: 700,
            lineHeight: 1.06,
            lineClamp: 5,
          }}
        >
          {headline}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 28, fontWeight: 700 }}>{dataStamp(generatedAt, locale, t)}</span>
          <span style={{ fontSize: 22, color: STAGE_INK_2 }}>{t.site.ogSources}</span>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingRight: 32,
        }}
      >
        <BulletinMap levels={levels} focus={focus} height={540} />
      </div>
    </div>,
    { ...ogSize, fonts },
  );
}

/**
 * Imagem genérica (marca, sem estado), para quando a do estado falha. Usa
 * só a letra por omissão do next/og e nenhum dado ao vivo (o mapa sai sem
 * níveis), para não depender do que pode ter falhado.
 */
export function fallbackCard(locale: Locale = "pt") {
  const t = getDictionary(locale);
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: STAGE,
        color: STAGE_INK,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 24,
          width: 720,
          padding: "0 64px 0 80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Logo size={96} />
          <span style={{ fontSize: 64, whiteSpace: "nowrap" }}>Portugal Agora</span>
        </div>
        <span style={{ fontSize: 40, color: STAGE_INK_2 }}>{t.site.tagline}</span>
        <span style={{ fontSize: 26, color: STAGE_INK_2 }}>portugalagora.pt</span>
      </div>
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingRight: 32,
        }}
      >
        <BulletinMap height={540} />
      </div>
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
