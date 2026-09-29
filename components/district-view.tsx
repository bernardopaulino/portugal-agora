"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import useSWR from "swr";

import type { District } from "@/data/districts";
import type { ForecastDay } from "@/lib/sources/ipma-forecast";
import type { SourceResult } from "@/lib/sources/types";
import type { CountryState } from "@/lib/state/aggregate";
import {
  districtFireRisk,
  districtHeadline,
  districtLevel,
  districtSummary,
} from "@/lib/state/district";

import { AirAndUv } from "./cards/air-uv";
import { FireList } from "./cards/fire-list";
import { ForecastList } from "./cards/forecast";
import { QuakeList } from "./cards/quake-list";
import { RiskTable } from "./cards/risk-table";
import type { Selection } from "./cards/types";
import { WarningList } from "./cards/warning-list";
import { defaultLayers, type LayerId } from "./map/layers";
import { MapPanel } from "./map/map-panel";
import { EmptyState, Section } from "./status/section";
import { StatusBand } from "./status/status-band";

const fetcher = async (url: string): Promise<CountryState> => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

export function DistrictView({
  district,
  initial,
  forecast,
}: {
  district: District;
  initial: CountryState;
  forecast: SourceResult<ForecastDay[]>;
}) {
  const { data } = useSWR("/api/state", fetcher, {
    fallbackData: initial,
    refreshInterval: 60_000,
    revalidateOnMount: false,
    keepPreviousData: true,
  });
  const state = data ?? initial;
  const reference = new Date(state.generatedAt);
  const [layers, setLayers] = useState<LayerId[]>(defaultLayers);
  const [selection, setSelection] = useState<Selection | null>(null);
  const toggleLayer = useCallback(
    (layer: LayerId) =>
      setLayers((c) => (c.includes(layer) ? c.filter((l) => l !== layer) : [...c, layer])),
    [],
  );

  const warnings = (state.warnings.data ?? []).filter((w) => w.place.district === district.slug);
  const fires = (state.fires.data ?? []).filter((f) => f.place.district === district.slug);
  const quakes = (state.earthquakes.data ?? []).filter((q) => q.place.district === district.slug);
  const risk = districtFireRisk(state, district.slug);
  const air = state.airQuality.data?.find((a) => a.district === district.slug);
  const uv = state.uv.data?.filter((u) => u.district === district.slug);

  return (
    <>
      <StatusBand
        level={districtLevel(state, district.slug)}
        levelKnown={state.levelKnown}
        headline={districtHeadline(district, state.warnings.data ?? [], state.levelKnown)}
        summary={districtSummary(state, district)}
        updatedAt={state.generatedAt}
      >
        <Link href="/" className="inline-flex items-center gap-2 self-start text-base font-bold">
          <ArrowLeft aria-hidden className="size-4" /> Ver todo o país
        </Link>
      </StatusBand>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="self-start lg:sticky lg:top-4">
          <h2 className="sr-only">Mapa de {district.name}</h2>
          <MapPanel
            state={state}
            layers={layers}
            onToggleLayer={toggleLayer}
            selection={selection}
            onSelect={setSelection}
            onClearSelection={() => setSelection(null)}
            region={district.region}
            focus={district.slug}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-10">
          <Section id="previsao" title={`Previsão para ${district.capital}`} result={forecast}>
            {forecast.data ? (
              <ForecastList days={forecast.data} reference={reference} />
            ) : (
              <EmptyState>Sem previsão de momento. Consulte ipma.pt.</EmptyState>
            )}
          </Section>

          <Section id="avisos" title="Avisos meteorológicos" result={state.warnings}>
            <WarningList
              warnings={warnings}
              reference={reference}
              selection={selection}
              onSelect={setSelection}
              emptyText={`Não há avisos meteorológicos ${district.inName} para os próximos três dias.`}
              linkDistricts={false}
            />
          </Section>

          <Section id="incendios" title="Incêndios" result={state.fires}>
            {state.fires.data ? (
              <FireList
                fires={fires}
                reference={reference}
                selection={selection}
                onSelect={setSelection}
              />
            ) : (
              <EmptyState>
                Informação sobre incêndios indisponível neste momento. Consulte os incêndios ativos
                em{" "}
                <a href="https://fogos.pt" rel="noopener">
                  fogos.pt
                </a>
                .
              </EmptyState>
            )}
          </Section>

          <Section id="sismos" title="Sismos nos últimos 7 dias" result={state.earthquakes}>
            <QuakeList
              quakes={quakes}
              reference={reference}
              selection={selection}
              onSelect={setSelection}
              emptyText={`Nenhum sismo de magnitude 2 ou superior ${district.inName} nos últimos 7 dias.`}
            />
          </Section>

          {risk.length > 0 ? (
            <Section id="risco" title="Risco de incêndio por concelho" result={state.fireRisk}>
              <RiskTable rows={risk} />
            </Section>
          ) : null}

          <Section id="ar" title="Qualidade do ar e raios UV" result={state.airQuality}>
            <AirAndUv air={air} uv={uv} />
            <p className="text-sm text-ink-2">
              Qualidade do ar: estimativa de modelo (Copernicus CAMS via Open-Meteo) para{" "}
              {district.capital}. Índice UV: previsão do IPMA.
            </p>
          </Section>
        </div>
      </div>
    </>
  );
}
