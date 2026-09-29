"use client";

import { useCallback, useRef, useState } from "react";
import useSWR from "swr";

import { getDistrict, type Region } from "@/data/districts";
import { useStoredValue } from "@/lib/hooks/external";
import type { CountryState } from "@/lib/state/aggregate";

import { AirQualitySummary } from "./cards/air-uv";
import { FireList } from "./cards/fire-list";
import { FireRiskSummary } from "./cards/fire-risk";
import { QuakeList } from "./cards/quake-list";
import type { Selection } from "./cards/types";
import { WarningList } from "./cards/warning-list";
import { MY_DISTRICT_KEY } from "./layout/near-me";
import { defaultLayers, type LayerId } from "./map/layers";
import { MapPanel } from "./map/map-panel";
import { EmptyState, Section } from "./status/section";
import { SeverityBadge } from "./status/severity";
import { StatusBand } from "./status/status-band";

const fetcher = async (url: string): Promise<CountryState> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

function MyDistrict({ state }: { state: CountryState }) {
  const slug = useStoredValue(MY_DISTRICT_KEY);
  const district = slug ? getDistrict(slug) : undefined;
  if (!district) return null;
  const status = state.districts[district.slug];
  return (
    <p className="flex flex-wrap items-center gap-3 rounded-xl bg-surface px-4 py-3 text-lg">
      <span>O seu distrito:</span>
      <SeverityBadge level={state.levelKnown ? (status?.level ?? "none") : "unknown"} />
      <a href={`/${district.slug}`} className="font-extrabold">
        {district.name}
      </a>
    </p>
  );
}

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
  const mapRef = useRef<HTMLDivElement>(null);

  const toggleLayer = useCallback(
    (layer: LayerId) =>
      setLayers((current) =>
        current.includes(layer) ? current.filter((l) => l !== layer) : [...current, layer],
      ),
    [],
  );

  const selectFromMap = useCallback((s: Selection) => setSelection(s), []);

  const selectFromList = useCallback((s: Selection) => {
    setSelection(s);
    if (s.type === "event") setRegion(s.region);
    else {
      const d = getDistrict(s.slug);
      if (d) setRegion(d.region);
    }
    // No telemóvel o mapa está acima da lista: levar a pessoa até ele.
    if (window.matchMedia("(max-width: 1023px)").matches) {
      mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return (
    <>
      <StatusBand
        level={state.level}
        levelKnown={state.levelKnown}
        headline={state.headline}
        summary={state.summary}
        updatedAt={state.generatedAt}
      />
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 pt-8 sm:px-6">
        <MyDistrict state={state} />
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div ref={mapRef} className="scroll-mt-4 self-start lg:sticky lg:top-4">
            <h2 className="sr-only">Mapa</h2>
            <MapPanel
              state={state}
              layers={layers}
              onToggleLayer={toggleLayer}
              selection={selection}
              onSelect={selectFromMap}
              onClearSelection={() => setSelection(null)}
              region={region}
              onRegion={setRegion}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-10">
            <Section id="avisos" title="Avisos meteorológicos" result={state.warnings}>
              {state.warnings.data ? (
                <WarningList
                  warnings={state.warnings.data}
                  reference={reference}
                  selection={selection}
                  onSelect={selectFromList}
                />
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
                  onSelect={selectFromList}
                />
              ) : (
                <EmptyState>
                  Informação sobre incêndios indisponível neste momento. Consulte os incêndios
                  ativos em{" "}
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
                  onSelect={selectFromList}
                />
              ) : (
                <EmptyState>Sem dados de sismos de momento.</EmptyState>
              )}
            </Section>

            <Section
              id="risco"
              title="Risco de incêndio hoje"
              result={state.fireRisk}
              aside={
                !layers.includes("risk") ? (
                  <button
                    type="button"
                    onClick={() => {
                      toggleLayer("risk");
                      mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className="h-11 rounded-full border border-line bg-surface px-4 text-base font-bold hover:bg-surface-2"
                  >
                    Ver por concelho no mapa
                  </button>
                ) : null
              }
            >
              {state.fireRisk.data ? (
                <FireRiskSummary risk={state.fireRisk.data} />
              ) : (
                <EmptyState>Sem previsão de risco de incêndio de momento.</EmptyState>
              )}
            </Section>

            <Section id="ar" title="Qualidade do ar" result={state.airQuality}>
              <p className="text-base text-ink-2">
                Estimativa de modelo (Copernicus CAMS) para as capitais de distrito, não medição de
                estação.
              </p>
              {state.airQuality.data ? (
                <AirQualitySummary readings={state.airQuality.data} />
              ) : (
                <EmptyState>Sem dados de qualidade do ar de momento.</EmptyState>
              )}
            </Section>
          </div>
        </div>
      </div>
    </>
  );
}
