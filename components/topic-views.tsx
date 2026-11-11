"use client";

import type { ReactNode, RefObject } from "react";

import type { District, Region } from "@/data/districts";
import { useI18n } from "@/lib/i18n/client";
import { useLiveState, useMapControls } from "@/lib/hooks/live-state";
import { HISTORY_ORDER } from "@/lib/history/points";
import type { CountryState } from "@/lib/state/aggregate";
import { PENDING_STATE } from "@/lib/state/pending";

import { PageHead } from "./boletim/page-head";
import { AirQualitySummary } from "./cards/air-uv";
import { FireList } from "./cards/fire-list";
import { FireRiskSummary } from "./cards/fire-risk";
import { QuakeList } from "./cards/quake-list";
import { WarningGroups } from "./cards/warning-groups";
import { FeedLink } from "./cards/feed-link";
import { FiresHistorySection, WarningsHistorySection } from "./history/history-sections";
import type { LayerId } from "./map/layers";
import { MapPanel } from "./map/map-panel";
import { EmptyState, Section } from "./status/section";

/*
 * As páginas de cada tema (avisos, incêndios, sismos, risco e ar). Cada
 * uma tem o cabeçalho, o mapa detalhado só com a camada desse tema e,
 * por baixo, a lista. A página inicial fica só com o boletim.
 * Com `district`, é a página do tema num distrito (/lisboa/avisos): leva
 * a ligação de volta ao distrito e o mapa fica no distrito, só com o que
 * é dele, como a lista (o menu do cabeçalho passa a mostrar os temas do
 * distrito).
 */

type Controls = ReturnType<typeof useTopic>["controls"];

export function TopicLayout({
  title,
  intro,
  state,
  controls,
  mapRef,
  district,
  children,
}: {
  title: string;
  intro: string;
  /** null até o /api/state responder: só o cabeçalho e "A carregar os dados…". */
  state: CountryState | null;
  controls: Controls;
  mapRef: RefObject<HTMLElement | null>;
  district?: District;
  children: ReactNode;
}) {
  const { t, path } = useI18n();
  return (
    <>
      <PageHead
        title={title}
        intro={intro}
        generatedAt={state?.generatedAt}
        back={
          district
            ? { href: path(`/${district.slug}`), label: t.districtName(district) }
            : undefined
        }
      />
      {state ? null : (
        <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
          <p role="status" className="text-base text-ink-2">
            {t.concelho.loading}
          </p>
        </div>
      )}
      {/*
       * O mapa vem logo a seguir ao cabeçalho: nestes temas, "onde" é a
       * primeira pergunta. Em ecrãs largos, a lista fica ao lado e o mapa
       * acompanha a página (sticky), em vez de ocupar a largura toda com
       * Espanha e o mar à volta de Portugal.
       */}
      {state ? (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-10">
          <section
            id="mapa"
            ref={mapRef}
            aria-labelledby="mapa-titulo"
            className="flex scroll-mt-4 flex-col gap-3 pt-8 lg:sticky lg:top-36 lg:pb-4 xl:top-24"
          >
            <div className="flex flex-col gap-1">
              <h2
                id="mapa-titulo"
                className="font-display text-2xl leading-tight font-semibold tracking-[-0.02em]"
              >
                {district ? t.sections.mapOf(district) : t.sections.map}
              </h2>
              <p className="max-w-[70ch] text-base text-ink-2">
                {district ? t.sections.mapIntroDistrict(t.inPlace(district)) : t.sections.mapIntro}
              </p>
            </div>
            {/* Para quem navega com o teclado ou leitor de ecrã: a lista sem passar pelo mapa. */}
            <a
              href="#lista"
              className="sr-only self-start rounded-sm bg-ink px-4 py-3 font-bold text-bg focus:not-sr-only"
            >
              {t.sections.skipMap}
            </a>
            <MapPanel
              state={state}
              views={controls.views}
              layer={controls.layer}
              onLayer={controls.setLayer}
              selection={controls.selection}
              onSelect={controls.setSelection}
              onClearSelection={() => controls.setSelection(null)}
              region={district ? district.region : controls.region}
              onRegion={district ? undefined : controls.setRegion}
              focus={district?.slug}
            />
          </section>
          <div
            id="lista"
            tabIndex={-1}
            className="@container flex min-w-0 scroll-mt-4 flex-col gap-8 pt-10 outline-none lg:pt-8"
          >
            {children}
          </div>
        </div>
      ) : null}
    </>
  );
}

/**
 * `views`: as camadas que o mapa da página pode mostrar; abre na primeira.
 * As páginas não levam dados no HTML (para serem estáticas e não gastarem
 * "ISR writes" da Vercel): `live` é null até o /api/state responder, e é
 * ele que vai para o TopicLayout, que até lá só mostra o cabeçalho. `state`
 * nunca é null (o estado vazio enquanto carrega), para as vistas poderem
 * preparar a lista sem verificar; essa lista só se mostra com `live`.
 */
export function useTopic(views: LayerId[], region?: Region) {
  const live = useLiveState();
  const state = live ?? PENDING_STATE;
  const { map, mapRef } = useMapControls(views[0]!, region);
  return {
    live,
    state,
    controls: { ...map, views },
    mapRef,
    reference: new Date(state.generatedAt),
  };
}

export function WarningsView() {
  const { t } = useI18n();
  const { live, state, controls, mapRef, reference } = useTopic(["warnings", "observed", "sea"]);
  return (
    <TopicLayout
      title={t.pages.warningsTitle}
      intro={t.pages.warningsIntro}
      state={live}
      controls={controls}
      mapRef={mapRef}
    >
      <Section id="avisos" title={t.pages.warningsList} result={state.warnings}>
        {t.dataNote ? <p className="text-base text-ink-2">{t.dataNote}</p> : null}
        {state.warnings.data ? (
          // A lista do país chegava a 13 ecrãs no telemóvel: os 4 mais graves (e todos os laranja e vermelho) e um botão para o resto.
          <WarningGroups warnings={state.warnings.data} reference={reference} initial={4} />
        ) : (
          <EmptyState>{t.empty.warningsDown}</EmptyState>
        )}
        <FeedLink topic="avisos" />
      </Section>
      <WarningsHistorySection slugs={HISTORY_ORDER} linkDistricts />
    </TopicLayout>
  );
}

export function FiresView() {
  const { t } = useI18n();
  const { live, state, controls, mapRef, reference } = useTopic(["fires"]);
  return (
    <TopicLayout
      title={t.pages.firesTitle}
      intro={t.pages.firesIntro}
      state={live}
      controls={controls}
      mapRef={mapRef}
    >
      <Section id="incendios" title={t.pages.firesList} result={state.fires}>
        {state.fires.data ? (
          <FireList
            fires={state.fires.data}
            reference={reference}
            selection={controls.selection}
            onSelect={controls.showOnMap}
          />
        ) : (
          <EmptyState>
            {t.empty.firesDown}{" "}
            <a href="https://fogos.pt" rel="noopener">
              fogos.pt
            </a>
            .
          </EmptyState>
        )}
        <FeedLink topic="incendios" />
      </Section>
      <FiresHistorySection />
    </TopicLayout>
  );
}

export function QuakesView() {
  const { t } = useI18n();
  const { live, state, controls, mapRef, reference } = useTopic(["quakes"]);
  return (
    <TopicLayout
      title={t.pages.quakesTitle}
      intro={t.pages.quakesIntro}
      state={live}
      controls={controls}
      mapRef={mapRef}
    >
      <Section id="sismos" title={t.pages.quakesList} result={state.earthquakes}>
        {state.earthquakes.data ? (
          <QuakeList
            quakes={state.earthquakes.data}
            reference={reference}
            selection={controls.selection}
            onSelect={controls.showOnMap}
            initial={12}
          />
        ) : (
          <EmptyState>{t.empty.quakesDown}</EmptyState>
        )}
        <FeedLink topic="sismos" />
      </Section>
    </TopicLayout>
  );
}

export function RiskView() {
  const { t } = useI18n();
  const { live, state, controls, mapRef } = useTopic(["risk", "air"]);
  return (
    <TopicLayout
      title={t.pages.riskTitle}
      intro={t.pages.riskIntro}
      state={live}
      controls={controls}
      mapRef={mapRef}
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-14 @3xl:grid-cols-2">
        <Section id="risco" title={t.sections.riskToday} result={state.fireRisk}>
          {state.fireRisk.data ? (
            <FireRiskSummary risk={state.fireRisk.data} />
          ) : (
            <EmptyState>{t.empty.riskDown}</EmptyState>
          )}
          <button
            type="button"
            onClick={controls.scrollToMap}
            className="inline-flex min-h-11 items-center self-start text-base font-bold text-accent underline underline-offset-4"
          >
            {t.lists.riskOnMap}
          </button>
        </Section>

        <Section id="ar" title={t.sections.air} result={state.airQuality}>
          {state.airQuality.data ? (
            <AirQualitySummary readings={state.airQuality.data} />
          ) : (
            <EmptyState>{t.empty.airDown}</EmptyState>
          )}
          <p className="text-sm text-ink-2">{t.lists.airNote}</p>
        </Section>
      </div>
    </TopicLayout>
  );
}
