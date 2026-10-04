"use client";

import type { ReactNode, RefObject } from "react";

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
 * uma tem o cabeçalho, a lista e, por baixo, o mapa detalhado já com as
 * camadas desse tema ligadas. A página inicial fica só com o boletim.
 */

type Controls = ReturnType<typeof useMapControls>["map"];

function TopicLayout({
  title,
  intro,
  state,
  controls,
  mapRef,
  children,
}: {
  title: string;
  intro: string;
  state: CountryState;
  controls: Controls;
  mapRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <>
      <PageHead title={title} intro={intro} generatedAt={state.generatedAt} />
      <div className="mx-auto flex max-w-7xl flex-col gap-14 px-4 pt-10 sm:px-6">{children}</div>
      <section
        id="mapa"
        ref={mapRef}
        aria-labelledby="mapa-titulo"
        className="mx-auto mt-16 flex max-w-7xl scroll-mt-4 flex-col gap-4 px-4 sm:px-6"
      >
        <div className="flex flex-col gap-1.5">
          <h2 id="mapa-titulo" className="font-display text-4xl leading-tight font-bold">
            {t.sections.map}
          </h2>
          <p className="max-w-[70ch] text-base text-ink-2">{t.sections.mapIntro}</p>
        </div>
        <MapPanel
          state={state}
          layers={controls.layers}
          onToggleLayer={controls.toggleLayer}
          selection={controls.selection}
          onSelect={controls.setSelection}
          onClearSelection={() => controls.setSelection(null)}
          region={controls.region}
          onRegion={controls.setRegion}
        />
      </section>
    </>
  );
}

function useTopic(initial: CountryState, layers: LayerId[]) {
  const state = useLiveState(initial);
  const { map: controls, mapRef } = useMapControls(layers);
  return { state, controls, mapRef, reference: new Date(state.generatedAt) };
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
  const { state, controls, mapRef } = useTopic(initial, ["risk"]);
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
