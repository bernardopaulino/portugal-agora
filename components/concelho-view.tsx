"use client";

import useSWR from "swr";

import { concelhos, type Concelho } from "@/data/concelhos";
import { fireDataRegions, type District } from "@/data/districts";
import { distanceKm } from "@/lib/geo/geometry";
import { useLiveState } from "@/lib/hooks/live-state";
import { useWeather } from "@/lib/hooks/weather";
import { useI18n } from "@/lib/i18n/client";
import type { ForecastDay, LocalForecast } from "@/lib/sources/ipma-forecast";
import type { StationObservation } from "@/lib/sources/ipma-observations";
import { fireRiskLabels } from "@/lib/sources/labels";
import { maxSeverity, type SourceResult } from "@/lib/sources/types";
import { riskLevel, warningTypes } from "@/lib/state/bulletin";
import { formatNumber } from "@/lib/time/format";

import { ForecastStrip } from "./boletim/forecast-strip";
import { HourlyStrip } from "./boletim/hourly-strip";
import { ObservationCard, SeaCard } from "./boletim/now-and-sea";
import { PageHead } from "./boletim/page-head";
import { AirAndUv } from "./cards/air-uv";
import { RainAndDrought } from "./cards/rain-drought";
import { FireList } from "./cards/fire-list";
import { QuakeList } from "./cards/quake-list";
import { RiskTable } from "./cards/risk-table";
import { WarningGroups } from "./cards/warning-groups";
import { ConcelhoMap } from "./concelho-map";
import { ConcelhoSummary, type SummaryTile } from "./concelho-summary";
import { NearMeCheck } from "./layout/near-me-check";
import { EmptyState, Section } from "./status/section";

/*
 * A página de um concelho (/lisboa/sintra). Não leva dados no HTML: tudo
 * chega pelo /api/state, /api/weather e /api/forecast (gerados a pedido,
 * em cache na CDN), para as ~600 páginas dos concelhos não contarem para o
 * limite de "ISR writes" da Vercel.
 *
 * Por ordem: um resumo num relance (um mosaico por tema) ao lado do mapa;
 * o tempo (agora e o ar, as próximas horas, os próximos dias); os avisos e o
 * risco de incêndio; os incêndios e sismos perto, só quando há alguma coisa
 * (incluem os concelhos vizinhos: um incêndio na fronteira também importa);
 * no fim a chuva, a seca e o mar. Cada linha tem dois cartões da mesma altura.
 */

/** Incêndios nos concelhos vizinhos até esta distância do centro do concelho. */
const FIRE_RADIUS_KM = 15;
/** Raio dos "sismos perto": cobre o concelho e o que se sente nele. */
const QUAKE_RADIUS_KM = 30;
/** Pontos de previsão do mar até esta distância contam como "a costa do concelho". */
const SEA_RADIUS_KM = 40;
/** Concelhos vizinhos na tabela do risco. */
const RISK_NEIGHBOURS = 4;

type OwnForecast = SourceResult<LocalForecast> & { place?: string };

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

export function ConcelhoView({ concelho, district }: { concelho: Concelho; district: District }) {
  const { t, path, locale } = useI18n();
  const state = useLiveState();
  const weather = useWeather();
  const forecastOptions = { revalidateOnFocus: false, refreshInterval: 60 * 60_000 };
  // A previsão do próprio concelho; a da capital de distrito só se essa falhar.
  const { data: own, error: ownError } = useSWR(
    `/api/forecast/concelho/${concelho.dico}`,
    fetcher<OwnForecast>,
    forecastOptions,
  );
  const ownFailed = ownError !== undefined || (own !== undefined && !own.data);
  const { data: capitalForecast } = useSWR(
    ownFailed ? `/api/forecast/${district.globalIdLocal}` : null,
    fetcher<SourceResult<ForecastDay[]>>,
    forecastOptions,
  );
  const ownData = own?.data ?? null;
  // Os dias: os do concelho ou, se falhar, os da capital.
  const days = ownData?.days ?? (ownFailed ? capitalForecast?.data : null) ?? null;
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
  // O UV do próprio concelho (na sua previsão); senão, o da capital de distrito.
  const ownUv = ownData?.days.flatMap((d) =>
    d.uv ? [{ district: district.slug, date: d.date, index: d.uv.index, label: d.uv.label }] : [],
  );
  const uv = ownUv?.length ? ownUv : state.uv.data?.filter((u) => u.district === district.slug);

  const showFires = firesCovered && state.fires.data !== null && activeFires.length > 0;
  const showQuakes = state.earthquakes.data !== null && quakes.length > 0;

  // O resumo: um mosaico por tema, cada um a apontar para a sua secção.
  const level = state.levelKnown ? (state.districts[district.slug]?.level ?? "none") : "unknown";
  const riskToday = risk?.today.byDico[concelho.dico];
  const riskTomorrow = risk?.tomorrow.byDico[concelho.dico];
  const today = days?.[0];
  const tiles: SummaryTile[] = [
    {
      id: "avisos",
      label: t.concelho.summaryWarnings,
      level,
      detail:
        warnings.length > 0 ? warningTypes(warnings, t) : state.levelKnown ? inPlace : undefined,
      href: "#avisos",
    },
    {
      id: "risco",
      label: t.concelho.summaryRisk,
      ...(riskToday
        ? {
            level: riskLevel(riskToday),
            levelLabel: t.term(fireRiskLabels[riskToday] ?? ""),
            detail: riskTomorrow
              ? t.concelho.summaryTomorrow(t.term(fireRiskLabels[riskTomorrow] ?? ""))
              : undefined,
          }
        : {
            value: "—",
            detail:
              district.region !== "continente" ? t.concelho.summaryMainlandOnly : t.empty.riskDown,
          }),
      href: "#risco",
    },
    {
      id: "tempo",
      label: t.observed.heading,
      value: station ? `${formatNumber(station.observation.temperature, 0, locale)} °C` : "—",
      detail: today ? `${t.term(today.weather)} · ${today.max}° / ${today.min}°` : undefined,
      href: "#tempo",
    },
    {
      id: "ar",
      label: t.concelho.summaryAir,
      ...(air
        ? { level: air.severity, levelLabel: t.term(air.label) }
        : { value: "—", detail: t.lists.noReading }),
      href: "#ar",
    },
    {
      id: "incendios",
      label: t.concelho.summaryFires(FIRE_RADIUS_KM),
      ...(!firesCovered
        ? { value: "—", detail: t.concelho.firesNotCovered }
        : state.fires.data === null
          ? { value: "—", detail: t.concelho.summaryUnavailable }
          : activeFires.length > 0
            ? {
                level: maxSeverity(activeFires.map((f) => f.severity)),
                levelLabel: String(activeFires.length),
                detail: t.concelho.summaryFiresActive(activeFires.length),
              }
            : { value: t.concelho.summaryNone }),
      href: showFires ? "#incendios" : undefined,
    },
    {
      id: "sismos",
      label: t.concelho.summaryQuakes(QUAKE_RADIUS_KM),
      ...(state.earthquakes.data === null
        ? { value: "—", detail: t.concelho.summaryUnavailable }
        : quakes.length > 0
          ? {
              value: String(quakes.length),
              detail: t.concelho.summaryQuakesMax(
                quakes.length,
                formatNumber(Math.max(...quakes.map((q) => q.magnitude)), 1, locale),
              ),
            }
          : { value: t.concelho.summaryNone, detail: t.concelho.summaryLast7 }),
      href: showQuakes ? "#sismos" : undefined,
    },
  ];

  /** Uma linha de dois cartões da mesma altura; um cartão sozinho ocupa a linha. */
  const row = "grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2 lg:[&>*:only-child]:col-span-2";

  return (
    <>
      {head}
      <NearMeCheck concelho={concelho} />
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pt-8 sm:px-6 lg:gap-8">
        {/* 1. Num relance: o resumo e o mapa. */}
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-8">
          <ConcelhoSummary tiles={tiles} />
          <Section id="mapa" title={t.concelho.mapTitle} size="md">
            <div className="lg:[&_svg]:max-h-[14rem]">
              <ConcelhoMap concelho={concelho} district={district} fires={fires} quakes={quakes} />
            </div>
          </Section>
        </div>

        {/* 2. O tempo: agora, as próximas horas e os próximos dias. */}
        <div id="tempo" className={`${row} scroll-mt-28`}>
          {station && weather ? (
            <ObservationCard
              observation={station.observation}
              result={weather.stations}
              district={district}
              note={
                station.km >= 5 ? t.concelho.stationDistance(Math.round(station.km)) : undefined
              }
            />
          ) : null}
          {ownData && ownData.hours.length > 0 ? (
            <HourlyStrip hours={ownData.hours} now={reference} region={district.region} card />
          ) : null}
        </div>
        {days ? (
          <div className="flex flex-col gap-2">
            <ForecastStrip
              days={days}
              reference={reference}
              region={district.region}
              title={
                ownData
                  ? t.concelho.forecastTitle(name)
                  : t.stage.forecastFor(t.capitalName(district))
              }
            />
            {!ownData ? (
              <p className="text-sm text-ink-2">
                {t.concelho.forecastNote(t.capitalName(district))}
              </p>
            ) : own?.place && own.place.toLowerCase() !== concelho.name.toLowerCase() ? (
              <p className="text-sm text-ink-2">{t.concelho.forecastPlace(own.place)}</p>
            ) : null}
          </div>
        ) : null}

        {/* 3. Avisos e riscos. */}
        <div className={row}>
          <Section id="avisos" title={t.concelho.warningsTitle} result={state.warnings} size="md">
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
          <Section id="risco" title={t.concelho.riskTitle} result={state.fireRisk} size="md">
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
        </div>
        {showFires || showQuakes ? (
          <div className={row}>
            {showFires ? (
              <Section
                id="incendios"
                title={t.concelho.firesNearTitle(FIRE_RADIUS_KM)}
                result={state.fires}
                size="md"
              >
                <FireList fires={fires} reference={reference} />
              </Section>
            ) : null}
            {showQuakes ? (
              <Section
                id="sismos"
                title={t.concelho.quakesTitle(QUAKE_RADIUS_KM)}
                result={state.earthquakes}
                size="md"
              >
                <QuakeList quakes={quakes} reference={reference} initial={12} />
              </Section>
            ) : null}
          </div>
        ) : null}

        {/* 4. O ambiente: o ar, o UV e o pólen; a chuva e a seca; o mar. */}
        <div className={row}>
          <Section id="ar" title={t.concelho.airTitle} result={state.airQuality} size="md">
            <AirAndUv air={air} uv={uv} generatedAt={state.generatedAt} region={district.region} />
            <p className="text-sm text-ink-2">{t.lists.airNoteDistrict(t.capitalName(district))}</p>
          </Section>
          {district.region === "continente" ? (
            <RainAndDrought dico={concelho.dico} />
          ) : seaSpot && weather ? (
            <SeaCard
              spots={[seaSpot]}
              result={weather.sea}
              reference={reference}
              region={district.region}
            />
          ) : null}
        </div>
        {district.region === "continente" && seaSpot && weather ? (
          <SeaCard
            spots={[seaSpot]}
            result={weather.sea}
            reference={reference}
            region={district.region}
          />
        ) : null}
      </div>
    </>
  );
}
