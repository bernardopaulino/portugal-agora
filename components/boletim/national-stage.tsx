"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useI18n } from "@/lib/i18n/client";
import type { CountryState } from "@/lib/state/aggregate";
import {
  countryHeadline,
  districtCaption,
  nationalCaption,
  nationalTopics,
  type TopicId,
} from "@/lib/state/bulletin";
import { capitalize, formatLongDate, formatTime, localDate } from "@/lib/time/format";

import { RelativeTime } from "../status/relative-time";
import { BulletinMap, type MapLevel, type MapMarker } from "./bulletin-map";
import { LowerThird, MapLegend, TopicList } from "./parts";

const WEEK = 7 * 86_400_000;

/** Página de cada linha do boletim nacional. */
export const topicPage: Record<TopicId, string> = {
  avisos: "/avisos",
  incendios: "/incendios",
  sismos: "/sismos",
  risco: "/risco",
  ar: "/risco",
};

/** Carimbo do boletim: "Domingo, 4 de outubro · 16:07 · atualizado há 1 min". */
export function BulletinStamp({ iso }: { iso: string }) {
  const { locale, t } = useI18n();
  return (
    <p className="font-display text-lg font-semibold text-stage-ink-2">
      <time dateTime={iso}>
        {t.stage.stamp(
          capitalize(formatLongDate(localDate(iso), locale).replace("-feira", "")),
          formatTime(iso),
        )}
      </time>
      <span className="font-sans text-base font-normal">
        {" "}
        · {t.stage.updated} <RelativeTime iso={iso} />
      </span>
    </p>
  );
}

/** Níveis por distrito para o mapa ("unknown" quando os avisos falharam). */
export function mapLevels(state: CountryState): Record<string, MapLevel> {
  return Object.fromEntries(
    Object.values(state.districts).map((s) => [s.slug, state.levelKnown ? s.level : "unknown"]),
  );
}

/** Incêndios em curso e sismos sentidos (7 dias) como pictogramas no mapa. */
export function mapMarkers(state: CountryState, district?: string): MapMarker[] {
  const since = new Date(state.generatedAt).getTime() - WEEK;
  const fires: MapMarker[] = (state.fires.data ?? [])
    .filter((f) => f.active && f.coordinates && (!district || f.place.district === district))
    .map((f) => ({
      id: f.id,
      kind: "fire",
      coordinates: f.coordinates!,
      region: f.place.region,
    }));
  const quakes: MapMarker[] = (state.earthquakes.data ?? [])
    .filter(
      (q) =>
        q.felt &&
        q.coordinates &&
        q.place.district &&
        new Date(q.occurredAt).getTime() >= since &&
        (!district || q.place.district === district),
    )
    .map((q) => ({
      id: q.id,
      kind: "quake",
      coordinates: q.coordinates!,
      region: q.place.region,
      magnitude: q.magnitude,
    }));
  return [...quakes, ...fires];
}

/**
 * O primeiro ecrã da página inicial: o boletim. Título com o estado do
 * país, quatro linhas (avisos, incêndios, sismos, risco) que levam às
 * páginas de cada tema, e o mapa com a legenda do rodapé, que acompanha
 * o distrito para onde se aponta.
 */
export function NationalStage({ state }: { state: CountryState }) {
  const { t, path } = useI18n();
  const [pointed, setPointed] = useState<string | null>(null);
  const reference = new Date(state.generatedAt);
  const caption = pointed ? districtCaption(state, pointed, t) : null;
  const national = state.levelKnown ? state.level : "unknown";

  return (
    <section
      aria-labelledby="boletim-titulo"
      className="on-stage overflow-hidden bg-stage text-stage-ink"
    >
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-x-12 gap-y-8 px-4 pt-8 pb-8 sm:px-6 lg:grid-cols-12 lg:pt-10">
        <div className="flex flex-col gap-7 lg:col-span-5 lg:self-center">
          <div className="flex flex-col gap-3">
            <h1 id="boletim-titulo" className="font-display text-display font-bold text-balance">
              {countryHeadline(state.levelKnown, state.districts, t)}
            </h1>
            <BulletinStamp iso={state.generatedAt} />
          </div>
          <TopicList topics={nationalTopics(state, t)} hrefFor={(id) => path(topicPage[id])} />
          <p className="text-sm text-stage-ink-2">
            {t.stage.levelRule} <Link href={path("/fontes#niveis")}>{t.stage.howWeRead}</Link>
          </p>
        </div>

        <div className="flex justify-center lg:order-first lg:col-span-7">
          <BulletinMap
            levels={mapLevels(state)}
            markers={mapMarkers(state)}
            pointed={pointed}
            onPoint={setPointed}
            className="max-w-[380px] sm:max-w-[440px] xl:max-w-[480px]"
          />
        </div>

        <div className="flex flex-col gap-4 lg:col-span-12">
          {caption ? (
            <LowerThird
              level={caption.level}
              levelLabel={t.levels[caption.level]}
              captionKey={caption.slug}
              action={
                <Link
                  href={path(`/${caption.slug}`)}
                  className="inline-flex items-center gap-1.5 font-bold"
                >
                  {t.caption.open(caption.name)} <ArrowRight aria-hidden className="size-4" />
                </Link>
              }
            >
              <span className="font-display text-2xl font-bold">{caption.name}</span>
              <span className="text-base">
                {caption.line}
                {caption.activeFires > 0 ? t.caption.fires(caption.activeFires) : ""}.
              </span>
            </LowerThird>
          ) : (
            <LowerThird level={national} levelLabel={t.levels[national]} captionKey="pais">
              <span className="font-display text-2xl font-bold">{t.caption.country}</span>
              <span className="text-base">{nationalCaption(state, reference, t)}</span>
            </LowerThird>
          )}
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <MapLegend />
            <p className="text-sm text-stage-ink-2">
              {t.stage.pickHint} {t.stage.dataFrom}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
