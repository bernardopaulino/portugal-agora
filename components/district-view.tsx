"use client";

import { useState } from "react";

import type { District } from "@/data/districts";
import { useI18n } from "@/lib/i18n/client";
import { useLiveState, useMapControls } from "@/lib/hooks/live-state";
import type { ForecastDay } from "@/lib/sources/ipma-forecast";
import type { SourceResult } from "@/lib/sources/types";
import type { CountryState } from "@/lib/state/aggregate";
import { groupWarnings } from "@/lib/state/bulletin";
import { districtFireRisk } from "@/lib/state/district";

import { DistrictStage } from "./boletim/district-stage";
import { SectionNav } from "./boletim/section-nav";
import { AirAndUv } from "./cards/air-uv";
import { FireList } from "./cards/fire-list";
import { QuakeList } from "./cards/quake-list";
import { RiskTable } from "./cards/risk-table";
import { WarningGroups } from "./cards/warning-groups";
import { defaultLayers } from "./map/layers";
import { MapPanel } from "./map/map-panel";
import { EmptyState, Section } from "./status/section";

export function DistrictView({
  district,
  initial,
  forecast,
}: {
  district: District;
  initial: CountryState;
  forecast: SourceResult<ForecastDay[]>;
}) {
  const { t } = useI18n();
  const state = useLiveState(initial);
  const reference = new Date(state.generatedAt);
  const { map: controls, mapRef } = useMapControls(defaultLayers, district.region);
  const [allRisk, setAllRisk] = useState(false);
  const inPlace = t.inPlace(district);

  const warnings = (state.warnings.data ?? []).filter((w) => w.place.district === district.slug);
  const fires = (state.fires.data ?? []).filter((f) => f.place.district === district.slug);
  const quakes = (state.earthquakes.data ?? []).filter((q) => q.place.district === district.slug);
  const risk = districtFireRisk(state, district.slug);
  // Só os concelhos acima de "reduzido" hoje ou amanhã; os outros ficam dobrados.
  const notableRisk = risk.filter((r) => r.today >= 2 || r.tomorrow >= 2);
  const air = state.airQuality.data?.find((a) => a.district === district.slug);
  const uv = state.uv.data?.filter((u) => u.district === district.slug);
  const groups = groupWarnings(warnings.filter((w) => w.severity !== "none")).length;

  return (
    <>
      <DistrictStage district={district} state={state} forecast={forecast} />

      <SectionNav
        items={[
          {
            id: "avisos",
            label: t.nav.warnings,
            count: state.warnings.data ? groups : undefined,
          },
          {
            id: "incendios",
            label: t.nav.fires,
            count: state.fires.data ? fires.filter((f) => f.active).length : undefined,
          },
          {
            id: "sismos",
            label: t.nav.quakes,
            count: state.earthquakes.data ? quakes.length : undefined,
          },
          ...(risk.length > 0 ? [{ id: "risco", label: t.sections.riskByConcelho }] : []),
          { id: "ar", label: t.sections.airUv },
          { id: "mapa", label: t.sections.map },
        ]}
      />

      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-x-14 gap-y-14 px-4 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-14">
          <Section id="avisos" title={t.sections.warnings} result={state.warnings}>
            <WarningGroups
              warnings={warnings}
              reference={reference}
              emptyText={t.empty.warningsDistrict(inPlace)}
              showPlaces={district.region === "acores"}
            />
          </Section>

          <Section id="incendios" title={t.sections.fires} result={state.fires}>
            {state.fires.data ? (
              <FireList
                fires={fires}
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

          <Section id="sismos" title={t.sections.quakes} result={state.earthquakes}>
            <QuakeList
              quakes={quakes}
              reference={reference}
              selection={controls.selection}
              onSelect={controls.showOnMap}
              emptyText={t.empty.quakesNoneDistrict(inPlace)}
            />
          </Section>
        </div>

        <aside className="flex flex-col gap-12 self-start lg:sticky lg:top-16">
          {risk.length > 0 ? (
            <Section id="risco" title={t.sections.riskByConcelho} result={state.fireRisk} size="md">
              {notableRisk.length === 0 && !allRisk ? (
                <EmptyState>{t.empty.riskLow}</EmptyState>
              ) : (
                <RiskTable rows={allRisk ? risk : notableRisk} />
              )}
              {risk.length > notableRisk.length ? (
                <button
                  type="button"
                  onClick={() => setAllRisk((v) => !v)}
                  aria-expanded={allRisk}
                  className="self-start text-base font-bold text-accent underline underline-offset-4"
                >
                  {allRisk ? t.lists.riskOnlyNotable : t.lists.riskAll(risk.length)}
                </button>
              ) : null}
            </Section>
          ) : null}

          <Section id="ar" title={t.sections.airUv} result={state.airQuality} size="md">
            <AirAndUv air={air} uv={uv} />
            <p className="text-sm text-ink-2">{t.lists.airNoteDistrict(district.capital)}</p>
          </Section>
        </aside>
      </div>

      <section
        id="mapa"
        ref={mapRef}
        aria-labelledby="mapa-titulo"
        className="mx-auto mt-16 flex max-w-7xl scroll-mt-14 flex-col gap-4 px-4 sm:px-6"
      >
        <h2 id="mapa-titulo" className="font-display text-4xl leading-tight font-bold">
          {t.sections.mapOf(t.districtName(district))}
        </h2>
        <MapPanel
          state={state}
          layers={controls.layers}
          onToggleLayer={controls.toggleLayer}
          selection={controls.selection}
          onSelect={controls.setSelection}
          onClearSelection={() => controls.setSelection(null)}
          region={district.region}
          focus={district.slug}
        />
      </section>
    </>
  );
}
