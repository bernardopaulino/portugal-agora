"use client";

import { ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { getDistrict, type District } from "@/data/districts";
import { useWebGLEnhancement } from "@/lib/hooks/webgl";
import { useI18n } from "@/lib/i18n/client";
import type { ForecastDay } from "@/lib/sources/ipma-forecast";
import type { SourceResult } from "@/lib/sources/types";
import type { CountryState } from "@/lib/state/aggregate";
import { districtHeadline, districtTopics, type TopicId } from "@/lib/state/bulletin";
import { PENDING_STATE } from "@/lib/state/pending";
import { cn } from "@/lib/utils";

import { districtRisk, sceneMarkers } from "../home/immersive-home";
import { BulletinMap } from "./bulletin-map";
import { ForecastStrip } from "./forecast-strip";
import { ConcelhoLinks } from "./concelho-links";
import { NowAndSea } from "./now-and-sea";
import { BulletinStamp, mapLevels, mapMarkers } from "./national-stage";
import { MapLegend, TopicList } from "./parts";

const PortugalScene = dynamic(() => import("../scene/portugal-scene"), { ssr: false });

/** Página de cada linha do boletim do distrito (o ar e UV estão na do risco). */
const districtTopicPage: Record<TopicId, string> = {
  avisos: "/avisos",
  incendios: "/incendios",
  sismos: "/sismos",
  risco: "/risco",
  ar: "/risco",
};

/**
 * O boletim de um distrito: o país em 3D atrás da página, com a câmara no
 * distrito e os outros esbatidos; por cima, o painel com o título, a hora
 * e os temas do distrito, e a previsão a 5 dias.
 */
export function DistrictStage({
  district,
  state: live,
  forecast,
}: {
  district: District;
  /** null até o /api/state responder: o mapa fica a cinzento e o boletim "a atualizar". */
  state: CountryState | null;
  /** undefined a carregar, null se o pedido falhou. */
  forecast: SourceResult<ForecastDay[]> | null | undefined;
}) {
  const { t, path } = useI18n();
  const router = useRouter();
  const state = live ?? PENDING_STATE;
  // A previsão e o tempo agora contam os dias a partir da hora dos dados.
  const reference = live ? new Date(live.generatedAt) : null;
  const enhance = useWebGLEnhancement();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pointed, setPointed] = useState<string | null>(null);
  const scene = enhance && !failed;
  const pointedDistrict = pointed ? getDistrict(pointed) : undefined;
  const levels = mapLevels(state);
  const { fires, quakes } = sceneMarkers(state, district.slug);

  return (
    <div className="relative">
      {scene ? (
        <div
          aria-hidden
          data-scene-ready={ready ? "on" : "off"}
          className={cn(
            "fixed inset-0 z-0 transition-opacity duration-700",
            ready ? "opacity-100" : "opacity-0",
          )}
        >
          <PortugalScene
            levels={levels}
            risk={districtRisk(state)}
            fires={fires}
            quakes={quakes}
            focus={district.slug}
            pointed={pointed}
            onPoint={setPointed}
            onOpen={(slug) => router.push(path(`/${slug}`))}
            onReady={() => setReady(true)}
            onFailed={() => setFailed(true)}
            regionLabels={{ acores: t.stage.acores, madeira: t.stage.madeira }}
            pointedLabel={
              pointedDistrict
                ? {
                    name: t.districtName(pointedDistrict),
                    level: t.levels[levels[pointedDistrict.slug] ?? "unknown"],
                    open: t.caption.open(t.districtName(pointedDistrict)),
                  }
                : undefined
            }
          />
        </div>
      ) : null}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(120%_90%_at_75%_40%,transparent_35%,var(--bg)_100%)] max-lg:bg-[linear-gradient(to_bottom,transparent_55%,var(--bg)_100%)]"
      />

      <section
        aria-labelledby="boletim-titulo"
        className="pointer-events-none relative z-10 mx-auto grid max-w-7xl gap-6 px-4 pt-2 pb-8 sm:px-6 lg:min-h-[calc(100svh-8rem)] lg:grid-cols-12 lg:items-center lg:pt-10"
      >
        {/* Telemóveis e tablets: o espaço do distrito, entre o cabeçalho e o painel (como na página inicial). */}
        <div
          data-scene-frame
          className="flex h-[clamp(8rem,100svh_-_27rem,20rem)] justify-center lg:hidden [@media(max-height:600px)]:hidden"
        >
          {!ready ? (
            <BulletinMap
              levels={levels}
              markers={mapMarkers(state, district.slug)}
              focus={district.slug}
              className="pointer-events-auto h-full w-auto max-w-full"
            />
          ) : null}
        </div>

        <div className="pointer-events-auto flex flex-col gap-5 rounded-3xl p-6 glass sm:p-8 lg:col-span-6 xl:col-span-5">
          <Link
            href={path("/")}
            className="inline-flex min-h-11 items-center gap-2 self-start font-display font-medium no-underline hover:underline"
          >
            <ArrowLeft aria-hidden className="size-4" /> {t.stage.back}
          </Link>
          <h1
            id="boletim-titulo"
            className="title-in font-display text-[clamp(2.1rem,1.1rem+2.6vw,3.6rem)] leading-[1.02] font-semibold tracking-[-0.035em] text-balance"
          >
            {live
              ? districtHeadline(district, live.warnings.data ?? [], live.levelKnown, t)
              : t.districtName(district)}
          </h1>
          <BulletinStamp iso={live?.generatedAt} />
          {live ? (
            <TopicList
              topics={districtTopics(live, district.slug, t)}
              hrefFor={(id) => path(`/${district.slug}${districtTopicPage[id]}`)}
              compact
            />
          ) : null}
          <p className="text-sm text-ink-2">
            <Link href={path("/fontes#niveis")}>{t.stage.howWeRead}</Link>
          </p>
        </div>

        {/* Sem a cena (sem WebGL, a carregar ou a poupar dados), o mapa plano. */}
        {!ready ? (
          <div className="pointer-events-auto hidden flex-col items-center gap-4 lg:col-span-6 lg:flex xl:col-span-7">
            <BulletinMap
              levels={levels}
              markers={mapMarkers(state, district.slug)}
              focus={district.slug}
              className="max-w-[400px]"
            />
          </div>
        ) : null}

        {/* Abaixo de 1024px a legenda fica por cima da terra: vai num vidro. */}
        <div className="pointer-events-auto max-lg:rounded-2xl max-lg:px-4 max-lg:py-3 max-lg:glass lg:col-span-12">
          <MapLegend showMarkers={false} />
        </div>
      </section>

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-6 px-4 pt-6 sm:px-6">
        {/* Os concelhos logo a seguir ao boletim: é aqui que se escolhe um. */}
        <ConcelhoLinks district={district} />
        {!reference || forecast === undefined ? null : forecast?.data ? (
          <ForecastStrip
            days={forecast.data}
            reference={reference}
            capital={t.capitalName(district)}
          />
        ) : (
          <section
            aria-labelledby="previsao-titulo"
            className="flex flex-col gap-2 rounded-2xl p-6 glass"
          >
            <h2 id="previsao-titulo" className="font-display text-2xl font-semibold">
              {t.stage.forecastFor(t.capitalName(district))}
            </h2>
            <p className="text-ink-2">
              {t.stage.forecastNone} <a href="https://www.ipma.pt">ipma.pt</a>.
            </p>
          </section>
        )}
        {reference ? <NowAndSea district={district} reference={reference} /> : null}
      </div>
    </div>
  );
}
