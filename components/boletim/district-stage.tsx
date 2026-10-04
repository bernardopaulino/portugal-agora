"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { District } from "@/data/districts";
import type { ForecastDay } from "@/lib/sources/ipma-forecast";
import type { SourceResult } from "@/lib/sources/types";
import type { CountryState } from "@/lib/state/aggregate";
import { districtTopics } from "@/lib/state/bulletin";
import { districtHeadline } from "@/lib/state/district";

import { BulletinMap } from "./bulletin-map";
import { ForecastStrip } from "./forecast-strip";
import { BulletinStamp, mapLevels, mapMarkers } from "./national-stage";
import { MapLegend, TopicList } from "./parts";

/**
 * O boletim de um distrito: o país com o distrito em destaque, o título
 * com os avisos, as linhas do distrito e a previsão a 5 dias.
 */
export function DistrictStage({
  district,
  state,
  forecast,
}: {
  district: District;
  state: CountryState;
  forecast: SourceResult<ForecastDay[]>;
}) {
  const [pointed, setPointed] = useState<string | null>(null);
  const reference = new Date(state.generatedAt);

  return (
    <section
      aria-labelledby="boletim-titulo"
      className="on-stage overflow-hidden bg-stage text-stage-ink"
    >
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-x-12 gap-y-8 px-4 pt-6 pb-8 sm:px-6 lg:grid-cols-12 lg:pt-8">
        <div className="flex flex-col gap-6 lg:col-span-7 lg:self-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 self-start text-base font-bold no-underline hover:underline"
          >
            <ArrowLeft aria-hidden className="size-4" /> Todo o país
          </Link>
          <div className="flex flex-col gap-3">
            <h1 id="boletim-titulo" className="font-display text-display font-bold text-balance">
              {districtHeadline(district, state.warnings.data ?? [], state.levelKnown)}
            </h1>
            <BulletinStamp iso={state.generatedAt} />
          </div>
          <TopicList topics={districtTopics(state, district.slug)} />
          <p className="text-sm text-stage-ink-2">
            <Link href="/fontes#niveis">Como lemos os dados</Link>
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 lg:order-first lg:col-span-5">
          <BulletinMap
            levels={mapLevels(state)}
            markers={mapMarkers(state, district.slug)}
            focus={district.slug}
            pointed={pointed}
            onPoint={setPointed}
            className="max-w-[300px] sm:max-w-[400px]"
          />
          <MapLegend showMarkers={false} />
        </div>

        <div className="lg:col-span-12">
          {forecast.data ? (
            <ForecastStrip days={forecast.data} reference={reference} capital={district.capital} />
          ) : (
            <section aria-labelledby="previsao-titulo" className="flex flex-col gap-2">
              <h2 id="previsao-titulo" className="font-display text-2xl font-bold">
                Previsão para {district.capital}
              </h2>
              <p className="text-stage-ink-2">
                Sem previsão de momento. Consulte <a href="https://www.ipma.pt">ipma.pt</a>.
              </p>
            </section>
          )}
        </div>
      </div>
    </section>
  );
}
