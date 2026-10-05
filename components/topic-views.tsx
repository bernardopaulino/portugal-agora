"use client";

import type { ReactNode, RefObject } from "react";

import type { District, Region } from "@/data/districts";
import { useI18n } from "@/lib/i18n/client";
import { useLiveState, useMapControls } from "@/lib/hooks/live-state";
import type { CountryState } from "@/lib/state/aggregate";

import { PageHead } from "./boletim/page-head";
import { AirQualitySummary } from "./cards/air-uv";
import { FireList } from "./cards/fire-list";
import { FireRiskSummary } from "./cards/fire-risk";
import { QuakeList } from "./cards/quake-list";
import { WarningGroups } from "./cards/warning-groups";
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
  state: CountryState;
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
        generatedAt={state.generatedAt}
        back={
          district
            ? { href: path(`/${district.slug}`), label: t.districtName(district) }
            : undefined
        }
      />
      {/* O mapa vem logo a seguir ao cabeçalho: nestes temas, "onde" é a primeira pergunta. */}
      <section
        id="mapa"
        ref={mapRef}
        aria-labelledby="mapa-titulo"
        className="mx-auto flex max-w-7xl scroll-mt-4 flex-col gap-3 px-4 pt-8 sm:px-6"
      >
        <div className="flex flex-col gap-1">
          <h2 id="mapa-titulo" className="font-display text-2xl leading-tight font-bold">
            {district ? t.sections.mapOf(t.districtName(district)) : t.sections.map}
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
        className="mx-auto flex max-w-7xl scroll-mt-4 flex-col gap-14 px-4 pt-14 outline-none sm:px-6"
      >
        {children}
      </div>
    </>
  );
}

/** `views`: as camadas que o mapa da página pode mostrar; abre na primeira. */
export function useTopic(initial: CountryState, views: LayerId[], region?: Region) {
  const state = useLiveState(initial);
  const { map, mapRef } = useMapControls(views[0]!, region);
  return {
    state,
    controls: { ...map, views },
    mapRef,
    reference: new Date(state.generatedAt),
  };
}

export function WarningsView({ initial }: { initial: CountryState }) {
  const { t } = useI18n();
  const { state, controls, mapRef, reference } = useTopic(initial, ["warnings"]);
  return (
    <TopicLayout
      title={t.pages.warningsTitle}
      intro={t.pages.warningsIntro}
      state={state}
      controls={controls}
      mapRef={mapRef}
    >
      <Section id="avisos" title={t.pages.warningsList} result={state.warnings}>
        {t.dataNote ? <p className="text-base text-ink-2">{t.dataNote}</p> : null}
        {state.warnings.data ? (
          <WarningGroups warnings={state.warnings.data} reference={reference} />
        ) : (
          <EmptyState>{t.empty.warningsDown}</EmptyState>
        )}
      </Section>
    </TopicLayout>
  );
}

export function FiresView({ initial }: { initial: CountryState }) {
  const { t } = useI18n();
  const { state, controls, mapRef, reference } = useTopic(initial, ["fires"]);
  return (
    <TopicLayout
      title={t.pages.firesTitle}
      intro={t.pages.firesIntro}
      state={state}
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
      </Section>
    </TopicLayout>
  );
}

export function QuakesView({ initial }: { initial: CountryState }) {
  const { t } = useI18n();
  const { state, controls, mapRef, reference } = useTopic(initial, ["quakes"]);
  return (
    <TopicLayout
      title={t.pages.quakesTitle}
      intro={t.pages.quakesIntro}
      state={state}
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
      </Section>
    </TopicLayout>
  );
}

export function RiskView({ initial }: { initial: CountryState }) {
  const { t } = useI18n();
  const { state, controls, mapRef } = useTopic(initial, ["risk", "air"]);
  return (
    <TopicLayout
      title={t.pages.riskTitle}
      intro={t.pages.riskIntro}
      state={state}
      controls={controls}
      mapRef={mapRef}
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-14 lg:grid-cols-2">
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
