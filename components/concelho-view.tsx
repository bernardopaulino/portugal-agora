"use client";

import useSWR from "swr";

import type { Concelho } from "@/data/concelhos";
import { fireDataRegions, type District } from "@/data/districts";
import { distanceKm } from "@/lib/geo/geometry";
import { useLiveStateOnly } from "@/lib/hooks/live-state";
import { useWeather } from "@/lib/hooks/weather";
import { useI18n } from "@/lib/i18n/client";
import type { ForecastDay } from "@/lib/sources/ipma-forecast";
import type { StationObservation } from "@/lib/sources/ipma-observations";
import type { SourceResult } from "@/lib/sources/types";

import { ForecastStrip } from "./boletim/forecast-strip";
import { ObservationCard } from "./boletim/now-and-sea";
import { PageHead } from "./boletim/page-head";
import { FireList } from "./cards/fire-list";
import { RiskTable } from "./cards/risk-table";
import { QuakeList } from "./cards/quake-list";
import { WarningGroups } from "./cards/warning-groups";
import { EmptyState, Section } from "./status/section";

/*
 * A página de um concelho (/lisboa/sintra). Não leva dados no HTML: tudo
 * chega pelo /api/state, /api/weather e /api/forecast (gerados a pedido,
 * em cache na CDN), para as ~600 páginas dos concelhos não contarem para o
 * limite de "ISR writes" da Vercel.
 */

/** Raio dos "sismos perto": cobre o concelho e o que se sente nele. */
const QUAKE_RADIUS_KM = 30;

const forecastFetcher = async (url: string): Promise<SourceResult<ForecastDay[]>> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

export function ConcelhoView({ concelho, district }: { concelho: Concelho; district: District }) {
  const { t, path } = useI18n();
  const state = useLiveStateOnly();
  const weather = useWeather();
  const { data: forecast } = useSWR(`/api/forecast/${district.globalIdLocal}`, forecastFetcher, {
    revalidateOnFocus: false,
  });
  const name = t.concelhoName(concelho.dico, concelho.name);
  const inPlace = t.inPlace(district);

  const head = (
    <PageHead
      title={name}
      intro={`${t.concelho.kicker(district.region, t.districtName(district))}. ${t.concelho.intro}`}
      generatedAt={state?.generatedAt}
      back={{ href: path(`/${district.slug}`), label: t.districtName(district) }}
    />
  );
  if (!state) {
    return (
      <>
        {head}
        <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
          <p role="status" className="text-base text-ink-2">
            {t.concelho.loading}
          </p>
        </div>
      </>
    );
  }

  const reference = new Date(state.generatedAt);
  const warnings = (state.warnings.data ?? []).filter(
    (w) => w.severity !== "none" && w.place.district === district.slug,
  );
  const riskRow = state.fireRisk.data
    ? {
        dico: concelho.dico,
        name: concelho.name,
        today: state.fireRisk.data.today.byDico[concelho.dico] ?? 0,
        tomorrow: state.fireRisk.data.tomorrow.byDico[concelho.dico] ?? 0,
      }
    : null;
  const firesCovered = fireDataRegions.includes(district.region);
  const fires = (state.fires.data ?? []).filter((f) =>
    f.dico
      ? f.dico === concelho.dico
      : f.concelho === concelho.name && f.place.district === district.slug,
  );
  const quakes = (state.earthquakes.data ?? []).filter(
    (q) => q.coordinates && distanceKm(q.coordinates, concelho.point) <= QUAKE_RADIUS_KM,
  );
  // A estação com temperatura mais próxima do centro do concelho.
  const station = (weather?.stations.data ?? []).reduce<{
    observation: StationObservation;
    km: number;
  } | null>((best, observation) => {
    const km = distanceKm(observation.coordinates, concelho.point);
    return !best || km < best.km ? { observation, km } : best;
  }, null);

  return (
    <>
      {head}
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-8 px-4 pt-8 sm:px-6 lg:grid-cols-2 lg:items-start">
        <Section id="avisos" title={t.concelho.warningsTitle} result={state.warnings}>
          <p className="text-base text-ink-2">{t.concelho.warningsNote(inPlace)}</p>
          {state.warnings.data ? (
            <WarningGroups
              warnings={warnings}
              reference={reference}
              emptyText={t.concelho.warningsNone(inPlace)}
              showPlaces={district.region === "acores"}
            />
          ) : (
            <EmptyState>{t.empty.warningsDown}</EmptyState>
          )}
        </Section>

        <div className="flex flex-col gap-8">
          {station && weather ? (
            <div className="flex flex-col gap-2">
              <ObservationCard
                observation={station.observation}
                result={weather.stations}
                district={district}
              />
              {station.km >= 5 ? (
                <p className="text-sm text-ink-2">
                  {t.concelho.stationDistance(Math.round(station.km))}
                </p>
              ) : null}
            </div>
          ) : null}

          <Section id="risco" title={t.concelho.riskTitle} result={state.fireRisk} size="md">
            {district.region !== "continente" ? (
              <EmptyState>{t.concelho.riskMainlandOnly}</EmptyState>
            ) : riskRow ? (
              <RiskTable rows={[riskRow]} link={false} />
            ) : (
              <EmptyState>{t.empty.riskDown}</EmptyState>
            )}
          </Section>
        </div>

        <Section
          id="incendios"
          title={t.concelho.firesTitle}
          result={firesCovered ? state.fires : undefined}
        >
          {!firesCovered ? (
            <EmptyState>{t.concelho.firesNotCovered}</EmptyState>
          ) : !state.fires.data ? (
            <EmptyState>{t.empty.firesDown}</EmptyState>
          ) : fires.length === 0 ? (
            <EmptyState>{t.concelho.firesNone}</EmptyState>
          ) : (
            <FireList fires={fires} reference={reference} />
          )}
        </Section>

        <Section
          id="sismos"
          title={t.concelho.quakesTitle(QUAKE_RADIUS_KM)}
          result={state.earthquakes}
        >
          {state.earthquakes.data ? (
            <QuakeList
              quakes={quakes}
              reference={reference}
              emptyText={t.concelho.quakesNone(QUAKE_RADIUS_KM)}
              initial={12}
            />
          ) : (
            <EmptyState>{t.empty.quakesDown}</EmptyState>
          )}
        </Section>

        {forecast?.data ? (
          <div className="flex flex-col gap-2 lg:col-span-2">
            <ForecastStrip
              days={forecast.data}
              reference={reference}
              capital={t.capitalName(district)}
            />
            <p className="text-sm text-ink-2">{t.concelho.forecastNote(t.capitalName(district))}</p>
          </div>
        ) : null}
      </div>
    </>
  );
}
