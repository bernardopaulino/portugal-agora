"use client";

import { useCallback, useRef, useState } from "react";
import useSWR from "swr";

import type { District } from "@/data/districts";
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
import type { Selection } from "./cards/types";
import { WarningGroups } from "./cards/warning-groups";
import { defaultLayers, type LayerId } from "./map/layers";
import { MapPanel } from "./map/map-panel";
import { EmptyState, Section } from "./status/section";

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
  const [allRisk, setAllRisk] = useState(false);
  const mapRef = useRef<HTMLElement>(null);
  const toggleLayer = useCallback(
    (layer: LayerId) =>
      setLayers((c) => (c.includes(layer) ? c.filter((l) => l !== layer) : [...c, layer])),
    [],
  );
  const showOnMap = useCallback((s: Selection) => {
    setSelection(s);
    mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

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
          { id: "avisos", label: "Avisos", count: state.warnings.data ? groups : undefined },
          {
            id: "incendios",
            label: "Incêndios",
            count: state.fires.data ? fires.filter((f) => f.active).length : undefined,
          },
          {
            id: "sismos",
            label: "Sismos",
            count: state.earthquakes.data ? quakes.length : undefined,
          },
          ...(risk.length > 0 ? [{ id: "risco", label: "Risco por concelho" }] : []),
          { id: "ar", label: "Ar e UV" },
          { id: "mapa", label: "Mapa detalhado" },
        ]}
      />

      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-x-14 gap-y-14 px-4 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-14">
          <Section id="avisos" title="Avisos meteorológicos" result={state.warnings}>
            <WarningGroups
              warnings={warnings}
              reference={reference}
              emptyText={`Não há avisos meteorológicos ${district.inName} para os próximos três dias.`}
              showPlaces={district.region === "acores"}
            />
          </Section>

          <Section id="incendios" title="Incêndios" result={state.fires}>
            {state.fires.data ? (
              <FireList
                fires={fires}
                reference={reference}
                selection={selection}
                onSelect={showOnMap}
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
              onSelect={showOnMap}
              emptyText={`Nenhum sismo de magnitude 2 ou superior ${district.inName} nos últimos 7 dias.`}
            />
          </Section>
        </div>

        <aside className="flex flex-col gap-12 self-start lg:sticky lg:top-16">
          {risk.length > 0 ? (
            <Section id="risco" title="Risco de incêndio" result={state.fireRisk} size="md">
              {notableRisk.length === 0 && !allRisk ? (
                <EmptyState>Risco reduzido em todos os concelhos, hoje e amanhã.</EmptyState>
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
                  {allRisk
                    ? "Mostrar só risco moderado ou superior"
                    : `Mostrar os ${risk.length} concelhos`}
                </button>
              ) : null}
            </Section>
          ) : null}

          <Section id="ar" title="Ar e raios UV" result={state.airQuality} size="md">
            <AirAndUv air={air} uv={uv} />
            <p className="text-sm text-ink-2">
              Qualidade do ar: estimativa de modelo (Copernicus CAMS via Open-Meteo) para{" "}
              {district.capital}. Índice UV: previsão do IPMA.
            </p>
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
          Mapa de {district.name}
        </h2>
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
      </section>
    </>
  );
}
