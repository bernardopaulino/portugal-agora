"use client";

import { ArrowDown, ArrowRight } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { districts, getDistrict } from "@/data/districts";
import { districtOfDico } from "@/data/dico-district";
import { projectPoint } from "@/data/map-shapes";
import { useLiveState } from "@/lib/hooks/live-state";
import { useWebGLEnhancement } from "@/lib/hooks/webgl";
import { useI18n } from "@/lib/i18n/client";
import { severityRank } from "@/lib/sources/types";
import type { CountryState } from "@/lib/state/aggregate";
import {
  countryHeadline,
  districtCaption,
  isNotableQuake,
  nationalCaption,
  nationalTopics,
  type Topic,
  type TopicId,
} from "@/lib/state/bulletin";
import { capitalize, formatDayTime, formatNumber } from "@/lib/time/format";
import { cn } from "@/lib/utils";

import { BulletinMap } from "../boletim/bulletin-map";
import { DistrictIndex } from "../boletim/district-index";
import { BulletinStamp, mapLevels, mapMarkers, topicPage } from "../boletim/national-stage";
import { LevelMark, LowerThird, MapLegend, TopicList } from "../boletim/parts";
import { FireRiskSummary } from "../cards/fire-risk";
import type { SceneFire, SceneQuake } from "../scene/portugal-scene";
import { Section } from "../status/section";
import { SeverityBadge } from "../status/severity";

// A cena (three) chega depois do primeiro desenho; até lá, e sem WebGL, fica o mapa SVG.
const PortugalScene = dynamic(() => import("../scene/portugal-scene"), { ssr: false });

/** Classe de risco de incêndio mais alta de hoje em cada distrito. */
export function districtRisk(state: CountryState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [dico, value] of Object.entries(state.fireRisk.data?.today.byDico ?? {})) {
    const slug = districtOfDico(dico);
    if (slug) out[slug] = Math.max(out[slug] ?? 0, value);
  }
  return out;
}

/** Incêndios em curso e sismos sentidos no viewBox do boletim, para a cena. */
export function sceneMarkers(state: CountryState, district?: string) {
  const people = new Map((state.fires.data ?? []).map((f) => [f.id, f.operatives]));
  const fires: SceneFire[] = [];
  const quakes: SceneQuake[] = [];
  for (const m of mapMarkers(state, district)) {
    const [x, y] = projectPoint(m.coordinates, m.region);
    const slug = (state.fires.data ?? []).find((f) => f.id === m.id)?.place.district;
    if (m.kind === "fire") fires.push({ id: m.id, x, y, people: people.get(m.id) ?? 0, slug });
    else {
      const q = state.earthquakes.data?.find((e) => e.id === m.id);
      quakes.push({ id: m.id, x, y, magnitude: m.magnitude ?? 2, slug: q?.place.district });
    }
  }
  return { fires, quakes };
}

/**
 * A página inicial: o país em 3D, fixo atrás da página, e um painel de
 * vidro por cima. O primeiro painel é o boletim (título, hora, temas e a
 * legenda que acompanha o distrito apontado); depois, um painel por tema,
 * e a câmara viaja até ele com o scroll. No fim, todos os distritos.
 */
export function ImmersiveHome({ initial }: { initial: CountryState }) {
  const { t, path } = useI18n();
  const router = useRouter();
  const state = useLiveState(initial);
  const [pointed, setPointed] = useState<string | null>(null);
  const enhance = useWebGLEnhancement();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const scene = enhance && !failed;

  const levels = mapLevels(state);
  const topics = nationalTopics(state, t);
  const reference = new Date(state.generatedAt);
  const caption = pointed ? districtCaption(state, pointed, t) : null;
  const national = state.levelKnown ? state.level : "unknown";
  const { fires, quakes } = sceneMarkers(state);
  const pointedDistrict = pointed ? getDistrict(pointed) : undefined;

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
                  }
                : undefined
            }
          />
        </div>
      ) : null}
      {/* Vinheta: o texto fica legível por cima da cena, sem esconder o país. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(120%_90%_at_75%_40%,transparent_35%,var(--bg)_100%)] max-lg:bg-[linear-gradient(to_bottom,transparent_30%,var(--bg)_92%)]"
      />

      <div className="pointer-events-none relative z-10">
        {/* O boletim. */}
        <section
          data-scene="hero"
          aria-labelledby="boletim-titulo"
          className="mx-auto grid min-h-[calc(100svh-8rem)] max-w-7xl items-end gap-6 px-4 pt-[38svh] pb-10 sm:px-6 lg:grid-cols-12 lg:items-center lg:pt-10"
        >
          <div className="pointer-events-auto flex flex-col gap-5 rounded-3xl p-6 glass sm:p-8 lg:col-span-6 xl:col-span-5">
            <p className="flex items-center gap-2 kicker">
              <span
                aria-hidden
                className="size-2 rounded-full bg-accent shadow-[0_0_12px_var(--accent)]"
              />
              {t.home.kicker}
            </p>
            <h1
              id="boletim-titulo"
              className="title-in font-display text-[clamp(2.1rem,1.1rem+2.6vw,3.6rem)] leading-[1.02] font-semibold tracking-[-0.035em] text-balance"
            >
              {countryHeadline(state.levelKnown, state.districts, t)}
            </h1>
            <BulletinStamp iso={state.generatedAt} />
            <TopicList topics={topics} hrefFor={(id) => path(topicPage[id])} compact />
            <p className="text-sm text-ink-2">
              {t.stage.levelRule} <Link href={path("/fontes#niveis")}>{t.stage.howWeRead}</Link>
            </p>
          </div>

          {/* Sem a cena (sem WebGL, a carregar ou a poupar dados), o mapa plano. */}
          {!ready ? (
            <div className="pointer-events-auto hidden justify-center lg:col-span-6 lg:flex xl:col-span-7">
              <BulletinMap
                levels={levels}
                markers={mapMarkers(state)}
                pointed={pointed}
                onPoint={setPointed}
                className="max-w-[480px]"
              />
            </div>
          ) : null}

          <div className="pointer-events-auto flex flex-col gap-3 lg:col-span-12">
            {caption ? (
              <LowerThird
                level={caption.level}
                levelLabel={t.levels[caption.level]}
                captionKey={caption.slug}
                action={
                  <Link
                    href={path(`/${caption.slug}`)}
                    className="inline-flex items-center gap-1.5 font-semibold"
                  >
                    {t.caption.open(caption.name)} <ArrowRight aria-hidden className="size-4" />
                  </Link>
                }
              >
                <span className="font-display text-2xl font-semibold tracking-[-0.02em]">
                  {caption.name}
                </span>
                <span className="text-base text-ink-2">
                  {caption.line}
                  {caption.activeFires > 0 ? t.caption.fires(caption.activeFires) : ""}.
                </span>
              </LowerThird>
            ) : (
              <LowerThird level={national} levelLabel={t.levels[national]} captionKey="pais">
                <span className="font-display text-2xl font-semibold tracking-[-0.02em]">
                  {t.caption.country}
                </span>
                <span className="text-base text-ink-2">{nationalCaption(state, reference, t)}</span>
              </LowerThird>
            )}
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <MapLegend />
              <p className="flex items-center gap-2 kicker">
                {t.home.scroll} <ArrowDown aria-hidden className="size-3.5" />
              </p>
            </div>
          </div>
        </section>

        {/* Um painel por tema; a câmara viaja até cada um. */}
        {topics.map((topic, i) => (
          <TopicStop
            key={topic.id}
            topic={topic}
            step={t.home.step(i + 1, topics.length)}
            state={state}
          />
        ))}

        <section
          data-scene="distritos"
          className="pointer-events-auto mx-auto max-w-7xl px-4 pt-[30svh] sm:px-6"
        >
          <Section id="distritos" title={t.sections.allDistricts}>
            <DistrictIndex state={state} />
          </Section>
        </section>
      </div>
    </div>
  );
}

function TopicStop({ topic, step, state }: { topic: Topic; step: string; state: CountryState }) {
  const { t, path } = useI18n();
  const id = topic.id;
  return (
    <section
      data-scene={id}
      aria-labelledby={`tema-${id}`}
      className="mx-auto flex min-h-[92svh] max-w-7xl items-center px-4 sm:px-6"
    >
      <article className="pointer-events-auto flex w-full max-w-xl flex-col gap-5 rounded-3xl p-6 glass sm:p-8">
        <p className="kicker">
          {step} · {topic.label}
        </p>
        <div className="flex items-center gap-4">
          <LevelMark level={topic.level} className="size-12" />
          <h2
            id={`tema-${id}`}
            className="font-display text-title font-semibold tracking-[-0.03em]"
          >
            {topic.value}
          </h2>
        </div>
        {topic.detail ? <p className="text-lg text-ink-2">{topic.detail}</p> : null}
        <TopicSummary id={id} state={state} />
        <p className="border-t border-line pt-4 text-sm text-ink-2">{t.home.legend[id]}</p>
        <Link
          href={path(topicPage[id])}
          className="inline-flex h-12 items-center gap-2 self-start rounded-full bg-accent px-5 font-display text-base font-semibold text-accent-ink no-underline shadow-[0_0_28px_-6px_var(--glow)] hover:brightness-110"
        >
          {t.home.cta[id]} <ArrowRight aria-hidden className="size-4" />
        </Link>
      </article>
    </section>
  );
}

function TopicSummary({ id, state }: { id: TopicId; state: CountryState }) {
  const { t, path, locale } = useI18n();
  const reference = new Date(state.generatedAt);
  if (id === "avisos") {
    if (!state.warnings.data) return null;
    const warned = districts
      .map((d) => ({ d, level: state.districts[d.slug]?.level ?? "none" }))
      .filter((x) => x.level !== "none")
      .sort((a, b) => severityRank[b.level] - severityRank[a.level]);
    if (warned.length === 0) return <p className="text-base">{t.home.warnedNone}</p>;
    return (
      <ul className="flex flex-wrap gap-2">
        {warned.slice(0, 10).map(({ d, level }) => {
          return (
            <li key={d.slug}>
              <Link
                href={path(`/${d.slug}`)}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-glass-line bg-[var(--stage-2)] py-1 pr-4 pl-1.5 text-base text-ink no-underline hover:border-accent"
              >
                <LevelMark level={level} className="size-8 rounded-full" />
                <span>{t.districtName(d)}</span>
                <span className="sr-only">: {t.levels[level]}</span>
              </Link>
            </li>
          );
        })}
        {warned.length > 10 ? (
          <li className="self-center text-ink-2">{t.home.more(warned.length - 10)}</li>
        ) : null}
      </ul>
    );
  }
  if (id === "incendios") {
    const active = (state.fires.data ?? [])
      .filter((f) => f.active)
      .sort((a, b) => b.operatives - a.operatives);
    if (!state.fires.data) return null;
    if (active.length === 0) return <p className="text-base">{t.home.firesNone}</p>;
    return (
      <ul className="flex flex-col divide-y divide-line">
        {active.slice(0, 3).map((f) => (
          <li key={f.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
            <SeverityBadge
              level={f.severity === "none" ? "info" : f.severity}
              label={t.term(f.status)}
            />
            <span className="font-display font-semibold">{f.place.label}</span>
            <span className="ml-auto kicker">{t.home.people(f.operatives)}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (id === "sismos") {
    const notable = (state.earthquakes.data ?? []).filter(isNotableQuake);
    if (!state.earthquakes.data) return null;
    if (notable.length === 0) return <p className="text-base">{t.home.quakesNone}</p>;
    return (
      <ul className="flex flex-col divide-y divide-line">
        {notable.slice(0, 3).map((q) => (
          <li key={q.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
            <SeverityBadge
              level={q.severity === "none" ? "info" : q.severity}
              label={t.lists.magnitude(formatNumber(q.magnitude, 1, locale))}
            />
            <span className="font-display font-semibold">{capitalize(t.term(q.place.label))}</span>
            <span className="ml-auto kicker">
              {formatDayTime(q.occurredAt, reference, q.place.region, locale)}
            </span>
          </li>
        ))}
      </ul>
    );
  }
  if (id === "risco" && state.fireRisk.data) return <FireRiskSummary risk={state.fireRisk.data} />;
  return null;
}
