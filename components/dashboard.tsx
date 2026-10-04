"use client";

import { useCallback, useRef, useState } from "react";
import useSWR from "swr";

import { getDistrict, type Region } from "@/data/districts";
import type { CountryState } from "@/lib/state/aggregate";
import { groupWarnings, isNotableQuake } from "@/lib/state/bulletin";

import { DistrictIndex } from "./boletim/district-index";
import { NationalStage } from "./boletim/national-stage";
import { SectionNav } from "./boletim/section-nav";
import { AirQualitySummary } from "./cards/air-uv";
import { FireList } from "./cards/fire-list";
import { FireRiskSummary } from "./cards/fire-risk";
import { QuakeList } from "./cards/quake-list";
import type { Selection } from "./cards/types";
import { WarningGroups } from "./cards/warning-groups";
import { defaultLayers, type LayerId } from "./map/layers";
import { MapPanel } from "./map/map-panel";
import { EmptyState, Section } from "./status/section";

const fetcher = async (url: string): Promise<CountryState> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

export function Dashboard({ initial }: { initial: CountryState }) {
  const { data } = useSWR("/api/state", fetcher, {
    fallbackData: initial,
    refreshInterval: 60_000,
    revalidateOnFocus: true,
    revalidateOnMount: false,
    keepPreviousData: true,
  });
  const state = data ?? initial;
  const reference = new Date(state.generatedAt);

  const [layers, setLayers] = useState<LayerId[]>(defaultLayers);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [region, setRegion] = useState<Region>("continente");
  const mapRef = useRef<HTMLElement>(null);

  const toggleLayer = useCallback(
    (layer: LayerId) =>
      setLayers((current) =>
        current.includes(layer) ? current.filter((l) => l !== layer) : [...current, layer],
      ),
    [],
  );

  const showOnMap = useCallback((s: Selection) => {
    setSelection(s);
    if (s.type === "event") setRegion(s.region);
    else {
      const d = getDistrict(s.slug);
      if (d) setRegion(d.region);
    }
    mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const warningGroups = groupWarnings(
    (state.warnings.data ?? []).filter((w) => w.severity !== "none"),
  );
  const activeFires = (state.fires.data ?? []).filter((f) => f.active).length;

  return (
    <>
      <NationalStage state={state} />

      <SectionNav
        items={[
          {
            id: "avisos",
            label: "Avisos",
            count: state.warnings.data ? warningGroups.length : undefined,
          },
          {
            id: "incendios",
            label: "Incêndios",
            count: state.fires.data ? activeFires : undefined,
          },
          {
            id: "sismos",
            label: "Sismos",
            count: state.earthquakes.data?.filter(isNotableQuake).length,
          },
          { id: "risco", label: "Risco e ar" },
          { id: "distritos", label: "Distritos" },
          { id: "mapa", label: "Mapa detalhado" },
        ]}
      />

      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-x-14 gap-y-14 px-4 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="flex min-w-0 flex-col gap-14">
          <Section id="avisos" title="Avisos meteorológicos" result={state.warnings}>
            {state.warnings.data ? (
              <WarningGroups warnings={state.warnings.data} reference={reference} />
            ) : (
              <EmptyState>
                Consulte os avisos em ipma.pt enquanto a ligação ao IPMA não é restabelecida.
              </EmptyState>
            )}
          </Section>

          <Section id="incendios" title="Incêndios" result={state.fires}>
            {state.fires.data ? (
              <FireList
                fires={state.fires.data}
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
            {state.earthquakes.data ? (
              <QuakeList
                quakes={state.earthquakes.data}
                reference={reference}
                selection={selection}
                onSelect={showOnMap}
              />
            ) : (
              <EmptyState>Sem dados de sismos de momento.</EmptyState>
            )}
          </Section>
        </div>

        <aside className="flex flex-col gap-12 self-start lg:sticky lg:top-16">
          <Section id="risco" title="Risco de incêndio hoje" result={state.fireRisk} size="md">
            {state.fireRisk.data ? (
              <FireRiskSummary risk={state.fireRisk.data} />
            ) : (
              <EmptyState>Sem previsão de risco de incêndio de momento.</EmptyState>
            )}
            <button
              type="button"
              onClick={() => {
                if (!layers.includes("risk")) toggleLayer("risk");
                setRegion("continente");
                mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="self-start text-base font-bold text-accent underline underline-offset-4"
            >
              Ver por concelho no mapa
            </button>
          </Section>

          <Section id="ar" title="Qualidade do ar" result={state.airQuality} size="md">
            {state.airQuality.data ? (
              <AirQualitySummary readings={state.airQuality.data} />
            ) : (
              <EmptyState>Sem dados de qualidade do ar de momento.</EmptyState>
            )}
            <p className="text-sm text-ink-2">
              Estimativa de modelo (Copernicus CAMS) para as capitais de distrito, não medição de
              estação.
            </p>
          </Section>

          <Section id="distritos" title="Todos os distritos" size="md">
            <DistrictIndex state={state} />
          </Section>
        </aside>
      </div>

      <section
        id="mapa"
        ref={mapRef}
        aria-labelledby="mapa-titulo"
        className="mx-auto mt-16 flex max-w-7xl scroll-mt-14 flex-col gap-4 px-4 sm:px-6"
      >
        <div className="flex flex-col gap-1.5">
          <h2 id="mapa-titulo" className="font-display text-4xl leading-tight font-bold">
            Mapa detalhado
          </h2>
          <p className="max-w-[70ch] text-base text-ink-2">
            Aproxime para ver cada incêndio e sismo, o risco de incêndio por concelho e a qualidade
            do ar.
          </p>
        </div>
        <MapPanel
          state={state}
          layers={layers}
          onToggleLayer={toggleLayer}
          selection={selection}
          onSelect={setSelection}
          onClearSelection={() => setSelection(null)}
          region={region}
          onRegion={setRegion}
        />
      </section>
    </>
  );
}
