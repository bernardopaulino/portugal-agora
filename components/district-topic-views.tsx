"use client";

import { useState } from "react";

import type { District } from "@/data/districts";
import { useI18n } from "@/lib/i18n/client";
import type { CountryState } from "@/lib/state/aggregate";
import { districtFireRisk } from "@/lib/state/district";

import { AirAndUv } from "./cards/air-uv";
import { FireList } from "./cards/fire-list";
import { QuakeList } from "./cards/quake-list";
import { RiskTable } from "./cards/risk-table";
import { WarningGroups } from "./cards/warning-groups";
import { EmptyState, Section } from "./status/section";
import { TopicLayout, useTopic } from "./topic-views";

/*
 * As páginas de cada tema dentro de um distrito (/lisboa/avisos…): a
 * mesma estrutura das páginas nacionais, só com o que é do distrito.
 * O resumo do distrito (/lisboa) fica só com o boletim e a previsão.
 */

type Props = { district: District; initial: CountryState };

export function DistrictWarningsView({ district, initial }: Props) {
  const { t } = useI18n();
  const { state, controls, mapRef, reference } = useTopic(initial, ["warnings"], district.region);
  const inPlace = t.inPlace(district);
  const warnings = (state.warnings.data ?? []).filter((w) => w.place.district === district.slug);
  return (
    <TopicLayout
      title={t.districtPages.warningsTitle(inPlace)}
      intro={t.districtPages.warningsIntro(inPlace)}
      state={state}
      controls={controls}
      mapRef={mapRef}
      district={district}
    >
      <Section id="avisos" title={t.pages.warningsList} result={state.warnings}>
        {t.dataNote ? <p className="text-base text-ink-2">{t.dataNote}</p> : null}
        {state.warnings.data ? (
          <WarningGroups
            warnings={warnings}
            reference={reference}
            emptyText={t.empty.warningsDistrict(inPlace)}
            // Nos Açores os avisos são por grupo de ilhas; num distrito, o local é redundante.
            showPlaces={district.region === "acores"}
          />
        ) : (
          <EmptyState>{t.empty.warningsDown}</EmptyState>
        )}
      </Section>
    </TopicLayout>
  );
}

export function DistrictFiresView({ district, initial }: Props) {
  const { t } = useI18n();
  const { state, controls, mapRef, reference } = useTopic(initial, ["fires"], district.region);
  const inPlace = t.inPlace(district);
  const fires = (state.fires.data ?? []).filter((f) => f.place.district === district.slug);
  return (
    <TopicLayout
      title={t.districtPages.firesTitle(inPlace)}
      intro={t.districtPages.firesIntro(inPlace)}
      state={state}
      controls={controls}
      mapRef={mapRef}
      district={district}
    >
      <Section id="incendios" title={t.pages.firesList} result={state.fires}>
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
    </TopicLayout>
  );
}

export function DistrictQuakesView({ district, initial }: Props) {
  const { t } = useI18n();
  const { state, controls, mapRef, reference } = useTopic(initial, ["quakes"], district.region);
  const inPlace = t.inPlace(district);
  const quakes = (state.earthquakes.data ?? []).filter((q) => q.place.district === district.slug);
  return (
    <TopicLayout
      title={t.districtPages.quakesTitle(inPlace)}
      intro={t.districtPages.quakesIntro(inPlace)}
      state={state}
      controls={controls}
      mapRef={mapRef}
      district={district}
    >
      <Section id="sismos" title={t.pages.quakesList} result={state.earthquakes}>
        {state.earthquakes.data ? (
          <QuakeList
            quakes={quakes}
            reference={reference}
            selection={controls.selection}
            onSelect={controls.showOnMap}
            emptyText={t.empty.quakesNoneDistrict(inPlace)}
            initial={12}
          />
        ) : (
          <EmptyState>{t.empty.quakesDown}</EmptyState>
        )}
      </Section>
    </TopicLayout>
  );
}

/** Risco de incêndio por concelho (só no continente), qualidade do ar e UV. */
export function DistrictRiskView({ district, initial }: Props) {
  const { t } = useI18n();
  const risk = districtFireRisk(initial, district.slug);
  const hasRisk = risk.length > 0;
  const { state, controls, mapRef } = useTopic(
    initial,
    [hasRisk ? "risk" : "air"],
    district.region,
  );
  const [allRisk, setAllRisk] = useState(false);
  const inPlace = t.inPlace(district);
  const liveRisk = districtFireRisk(state, district.slug);
  // Só os concelhos acima de "reduzido" hoje ou amanhã; os outros ficam dobrados.
  const notableRisk = liveRisk.filter((r) => r.today >= 2 || r.tomorrow >= 2);
  const air = state.airQuality.data?.find((a) => a.district === district.slug);
  const uv = state.uv.data?.filter((u) => u.district === district.slug);

  return (
    <TopicLayout
      title={hasRisk ? t.districtPages.riskTitle(inPlace) : t.districtPages.airTitle(inPlace)}
      intro={
        hasRisk
          ? t.districtPages.riskIntro(district.capital)
          : t.districtPages.airIntro(district.capital)
      }
      state={state}
      controls={controls}
      mapRef={mapRef}
      district={district}
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-14 lg:grid-cols-2">
        {liveRisk.length > 0 ? (
          <Section id="risco" title={t.sections.riskByConcelho} result={state.fireRisk}>
            {notableRisk.length === 0 && !allRisk ? (
              <EmptyState>{t.empty.riskLow}</EmptyState>
            ) : (
              <RiskTable rows={allRisk ? liveRisk : notableRisk} />
            )}
            {liveRisk.length > notableRisk.length ? (
              <button
                type="button"
                onClick={() => setAllRisk((v) => !v)}
                aria-expanded={allRisk}
                className="inline-flex min-h-11 items-center self-start text-base font-bold text-accent underline underline-offset-4"
              >
                {allRisk ? t.lists.riskOnlyNotable : t.lists.riskAll(liveRisk.length)}
              </button>
            ) : null}
          </Section>
        ) : null}

        <Section id="ar" title={t.sections.airUv} result={state.airQuality}>
          <AirAndUv air={air} uv={uv} />
          <p className="text-sm text-ink-2">{t.lists.airNoteDistrict(district.capital)}</p>
        </Section>
      </div>
    </TopicLayout>
  );
}
