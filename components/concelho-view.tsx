"use client";

import useSWR from "swr";

import { concelhos, type Concelho } from "@/data/concelhos";
import { fireDataRegions, type District } from "@/data/districts";
import { distanceKm } from "@/lib/geo/geometry";
import { useLiveStateOnly } from "@/lib/hooks/live-state";
import { useWeather } from "@/lib/hooks/weather";
import { useI18n } from "@/lib/i18n/client";
import type { ForecastDay } from "@/lib/sources/ipma-forecast";
import type { StationObservation } from "@/lib/sources/ipma-observations";
import type { SourceResult } from "@/lib/sources/types";

import { ForecastStrip } from "./boletim/forecast-strip";
import { ObservationCard, SeaCard } from "./boletim/now-and-sea";
import { PageHead } from "./boletim/page-head";
import { AirAndUv } from "./cards/air-uv";
import { FireList } from "./cards/fire-list";
import { QuakeList } from "./cards/quake-list";
import { RiskTable } from "./cards/risk-table";
import { WarningGroups } from "./cards/warning-groups";
import { ConcelhoMap } from "./concelho-map";
import { EmptyState, Section } from "./status/section";

/*
 * A página de um concelho (/lisboa/sintra). Não leva dados no HTML: tudo
 * chega pelo /api/state, /api/weather e /api/forecast (gerados a pedido,
 * em cache na CDN), para as ~600 páginas dos concelhos não contarem para o
 * limite de "ISR writes" da Vercel.
 *
 * Primeiro o que interessa a quem mora lá: o mapa e o "agora" (o que está
 * calmo numa só linha, o tempo, o ar). As caixas de incêndios e sismos só
 * aparecem quando há alguma coisa; incluem o que está perto, nos concelhos
 * vizinhos, porque um incêndio na fronteira também importa.
 */

/** Incêndios nos concelhos vizinhos até esta distância do centro do concelho. */
const FIRE_RADIUS_KM = 15;
/** Raio dos "sismos perto": cobre o concelho e o que se sente nele. */
const QUAKE_RADIUS_KM = 30;
/** Pontos de previsão do mar até esta distância contam como "a costa do concelho". */
const SEA_RADIUS_KM = 40;
/** Concelhos vizinhos na tabela do risco. */
const RISK_NEIGHBOURS = 4;

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
  const near = (point: [number, number] | undefined, km: number) =>
    point !== undefined && distanceKm(point, concelho.point) <= km;

  const warnings = (state.warnings.data ?? []).filter(
    (w) => w.severity !== "none" && w.place.district === district.slug,
  );
  const firesCovered = fireDataRegions.includes(district.region);
  // No concelho (pelo código do Fogos.pt) ou perto, num concelho vizinho.
  const fires = (state.fires.data ?? []).filter(
    (f) =>
      (f.dico ? f.dico === concelho.dico : f.concelho === concelho.name) ||
      near(f.coordinates, FIRE_RADIUS_KM),
  );
  const activeFires = fires.filter((f) => f.severity !== "none");
  const quakes = (state.earthquakes.data ?? []).filter((q) => near(q.coordinates, QUAKE_RADIUS_KM));

  // O risco do concelho e dos concelhos mais próximos (do continente, com dados).
  const risk = state.fireRisk.data;
  const neighbours = risk
    ? concelhos
        .filter((c) => c.dico !== concelho.dico && risk.today.byDico[c.dico] !== undefined)
        .sort((a, b) => distanceKm(a.point, concelho.point) - distanceKm(b.point, concelho.point))
        .slice(0, RISK_NEIGHBOURS)
    : [];
  const riskRows = risk
    ? [concelho, ...neighbours]
        .filter((c) => risk.today.byDico[c.dico] !== undefined)
        .map((c) => ({
          dico: c.dico,
          name: c.name,
          today: risk.today.byDico[c.dico] ?? 0,
          tomorrow: risk.tomorrow.byDico[c.dico] ?? 0,
        }))
    : [];

  // A estação com temperatura mais próxima do centro do concelho.
  const station = (weather?.stations.data ?? []).reduce<{
    observation: StationObservation;
    km: number;
  } | null>((best, observation) => {
    const km = distanceKm(observation.coordinates, concelho.point);
    return !best || km < best.km ? { observation, km } : best;
  }, null);
  // O ponto de previsão do mar mais próximo, se o concelho tiver costa perto.
  const seaSpot = (weather?.sea.data?.[district.slug] ?? [])
    .map((spot) => ({ spot, km: distanceKm(spot.coordinates, concelho.point) }))
    .filter((s) => s.km <= SEA_RADIUS_KM)
    .sort((a, b) => a.km - b.km)[0]?.spot;

  const air = state.airQuality.data?.find((a) => a.district === district.slug);
  const uv = state.uv.data?.filter((u) => u.district === district.slug);

  const showFires = firesCovered && state.fires.data !== null && activeFires.length > 0;
  const showQuakes = state.earthquakes.data !== null && quakes.length > 0;
  const firesCalm = firesCovered && state.fires.data !== null && !showFires;
  const quakesCalm = state.earthquakes.data !== null && !showQuakes;
  const calm =
    firesCalm && quakesCalm
      ? t.concelho.calmBoth(FIRE_RADIUS_KM, QUAKE_RADIUS_KM)
      : firesCalm
        ? t.concelho.calmFires(FIRE_RADIUS_KM)
        : quakesCalm
          ? t.concelho.calmQuakes(QUAKE_RADIUS_KM)
          : null;

  return (
    <>
      {head}
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-8 px-4 pt-8 sm:px-6 lg:grid-cols-2 lg:items-start">
        <Section id="mapa" title={t.concelho.mapTitle}>
          <ConcelhoMap concelho={concelho} district={district} fires={fires} quakes={quakes} />
        </Section>

        <div className="flex flex-col gap-8">
          <Section id="agora" title={t.concelho.nowTitle} size="md">
            {calm ? <p className="text-base">{calm}</p> : null}
            {!firesCovered ? (
              <p className="text-base text-ink-2">{t.concelho.firesNotCovered}</p>
            ) : state.fires.data === null ? (
              // Fogos.pt em baixo (ou sem chave): diz-se, em vez de calar os incêndios.
              <p className="text-base text-ink-2">
                {t.empty.firesDown}{" "}
                <a href="https://fogos.pt" rel="noopener">
                  fogos.pt
                </a>
                .
              </p>
            ) : null}
            {state.earthquakes.data === null ? (
              <p className="text-base text-ink-2">{t.empty.quakesDown}</p>
            ) : null}
            {station && weather ? (
              <div className="flex flex-col gap-2">
                <ObservationCard
                  observation={station.observation}
                  result={weather.stations}
                  district={district}
                  inPanel
                />
                {station.km >= 5 ? (
                  <p className="text-sm text-ink-2">
                    {t.concelho.stationDistance(Math.round(station.km))}
                  </p>
                ) : null}
              </div>
            ) : null}
          </Section>

          <Section id="ar" title={t.concelho.airTitle} result={state.airQuality} size="md">
            <AirAndUv air={air} uv={uv} />
            <p className="text-sm text-ink-2">{t.lists.airNoteDistrict(t.capitalName(district))}</p>
          </Section>
        </div>

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

        <Section id="risco" title={t.concelho.riskTitle} result={state.fireRisk}>
          {district.region !== "continente" ? (
            <EmptyState>{t.concelho.riskMainlandOnly}</EmptyState>
          ) : riskRows.length > 0 ? (
            <>
              <RiskTable rows={riskRows} current={concelho.dico} />
              <p className="text-sm text-ink-2">{t.concelho.riskNeighbours}</p>
            </>
          ) : (
            <EmptyState>{t.empty.riskDown}</EmptyState>
          )}
        </Section>

        {showFires ? (
          <Section
            id="incendios"
            title={t.concelho.firesNearTitle(FIRE_RADIUS_KM)}
            result={state.fires}
          >
            <FireList fires={fires} reference={reference} />
          </Section>
        ) : null}

        {showQuakes ? (
          <Section
            id="sismos"
            title={t.concelho.quakesTitle(QUAKE_RADIUS_KM)}
            result={state.earthquakes}
          >
            <QuakeList quakes={quakes} reference={reference} initial={12} />
          </Section>
        ) : null}

        {seaSpot && weather ? (
          <SeaCard spots={[seaSpot]} result={weather.sea} reference={reference} />
        ) : null}

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
