"use client";

import { ArrowRight, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useState } from "react";

import { fireDataRegions, fireRiskRegions, getDistrict, type Region } from "@/data/districts";
import { depthBoundsFor, inBounds } from "@/lib/geo/projection";
import { DEPTH_EXAGGERATION, RELIEF_EXAGGERATION } from "@/lib/geo/scales";
import { useWebGL } from "@/lib/hooks/webgl";
import { useI18n } from "@/lib/i18n/client";
import { fireRiskLabels } from "@/lib/sources/labels";
import type { EarthquakeEvent } from "@/lib/sources/types";
import type { CountryState } from "@/lib/state/aggregate";
import {
  capitalize,
  formatDayTime,
  formatNumber,
  formatTime,
  formatWeekday,
} from "@/lib/time/format";
import { cn } from "@/lib/utils";
import { Chip } from "../status/chip";

import { riskColors } from "../cards/fire-risk";
import type { OnSelect, Selection } from "../cards/types";
import { type Level, levels, SeverityBadge } from "../status/severity";
import { layerTopic, type LayerId, type RiskDay } from "./layers";

const LiveMap = dynamic(() => import("./live-map"), {
  ssr: false,
  loading: () => <MapLoading />,
});

// O three só é pedido quando alguém escolhe a vista 3D dos sismos.
const QuakeDepth = dynamic(() => import("./quake-depth"), {
  ssr: false,
  loading: () => <MapLoading />,
});

/** O que a vista 3D mostra em cada camada (avisos e qualidade do ar ficam só em 2D). */
type Mode3d = "depth" | "relief" | "height";

function mode3dFor(layer: LayerId, riskAvailable: boolean): Mode3d | null {
  if (layer === "quakes") return "depth";
  if (layer === "fires") return "relief";
  if (layer === "risk" && riskAvailable) return "height";
  return null;
}

function MapLoading() {
  const { t } = useI18n();
  return (
    <div className="flex h-full w-full items-center justify-center bg-surface-2 text-ink-2">
      {t.map.loading}
    </div>
  );
}

const regions: Region[] = ["continente", "acores", "madeira"];

function Detail({
  state,
  selection,
  layer,
  onClose,
}: {
  state: CountryState;
  selection: Selection;
  layer: LayerId;
  onClose: () => void;
}) {
  const { t, locale, path } = useI18n();
  const reference = new Date(state.generatedAt);
  let body: React.ReactNode = null;
  const observation =
    selection.type === "district" ? state.observations.data?.[selection.slug] : undefined;
  const spots = selection.type === "district" ? state.sea.data?.[selection.slug] : undefined;

  if (selection.type === "district" && layer === "observed" && observation) {
    const d = getDistrict(selection.slug);
    const dir = observation.windDir ? t.compass[observation.windDir] : undefined;
    const parts = [
      `${formatNumber(observation.temperature, 1, locale)} °C`,
      observation.windKmh === null
        ? null
        : observation.windKmh === 0
          ? t.observed.calm
          : dir
            ? t.observed.windFrom(String(observation.windKmh), dir)
            : `${observation.windKmh} km/h`,
      observation.humidity === null
        ? null
        : `${t.observed.humidity.toLowerCase()} ${Math.round(observation.humidity)} %`,
      observation.rainMm ? `${formatNumber(observation.rainMm, 1, locale)} mm` : null,
    ].filter(Boolean);
    body = (
      <>
        <p className="text-lg font-extrabold">{d ? t.districtName(d) : null}</p>
        <p className="text-base">{capitalize(parts.join(", "))}.</p>
        <p className="text-sm text-ink-2">
          {t.observed.station(
            observation.station,
            formatTime(observation.time, d?.region === "acores" ? "acores" : undefined),
          )}
        </p>
        {d ? (
          <Link href={path(`/${d.slug}`)} className="text-base font-bold">
            {t.map.seeAllAbout(t.districtName(d))}
          </Link>
        ) : null}
      </>
    );
  } else if (selection.type === "district" && layer === "sea" && spots?.length) {
    const d = getDistrict(selection.slug);
    const range = (min: number | null, max: number | null) => {
      const values = [min, max].filter((v): v is number => v !== null);
      const [a, b] = [...new Set(values.map((v) => formatNumber(v, 1, locale)))];
      return a ? `${b ? `${a}–${b}` : a} m` : "—";
    };
    body = (
      <>
        <p className="text-lg font-extrabold">{d ? t.districtName(d) : null}</p>
        {spots.map((spot) => (
          <p key={spot.name} className="text-base">
            <span className="font-bold">{spot.name}:</span>{" "}
            {spot.days
              .slice(0, 3)
              .map(
                (day, i) =>
                  `${i === 0 ? t.stage.today : i === 1 ? t.stage.tomorrow : formatWeekday(day.date, locale)} ${range(day.seaMin, day.seaMax)}`,
              )
              .join(" · ")}
          </p>
        ))}
        {d ? (
          <Link href={path(`/${d.slug}`)} className="text-base font-bold">
            {t.map.seeAllAbout(t.districtName(d))}
          </Link>
        ) : null}
      </>
    );
  } else if (selection.type === "district") {
    const d = getDistrict(selection.slug);
    const status = state.districts[selection.slug];
    const warnings = (state.warnings.data ?? []).filter((w) => w.place.district === selection.slug);
    const air = state.airQuality.data?.find((a) => a.district === selection.slug);
    body = (
      <>
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge level={state.levelKnown ? (status?.level ?? "none") : "unknown"} />
          <p className="text-lg font-extrabold">{d ? t.districtName(d) : null}</p>
        </div>
        <p className="text-base">
          {warnings.length === 0
            ? t.map.noWarnings
            : warnings
                .map((w) => t.term(w.title))
                .filter((t, i, all) => all.indexOf(t) === i)
                .join(". ") + "."}
          {status && status.activeFires > 0 ? t.map.firesInProgress(status.activeFires) : ""}
          {air ? t.map.airShort(t.term(air.label)) : ""}
        </p>
        {d ? (
          <Link href={path(`/${d.slug}`)} className="text-base font-bold">
            {t.map.seeAllAbout(t.districtName(d))}
          </Link>
        ) : null}
      </>
    );
  } else {
    const fire = state.fires.data?.find((f) => f.id === selection.id);
    const quake = state.earthquakes.data?.find((q) => q.id === selection.id);
    if (fire) {
      body = (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge
              level={fire.severity === "none" ? "info" : fire.severity}
              label={t.term(fire.status)}
            />
            <p className="text-lg font-extrabold">{fire.place.label}</p>
          </div>
          <p className="text-base">
            {t.map.fireDetail(
              t.term(fire.nature),
              formatDayTime(fire.startedAt, reference, fire.place.region, locale),
              fire.operatives,
              fire.aerialUnits,
            )}
          </p>
          <p className="text-sm text-ink-2">
            {t.source.source}:{" "}
            <a href="https://fogos.pt" rel="noopener">
              Fogos.pt
            </a>
          </p>
        </>
      );
    } else if (quake) {
      body = (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge
              level={quake.severity === "none" ? "info" : quake.severity}
              label={t.lists.magnitude(formatNumber(quake.magnitude, 1, locale))}
            />
            <p className="text-lg font-extrabold">{capitalize(t.term(quake.place.label))}</p>
          </div>
          <p className="text-base">
            {quake.felt ? t.lists.felt : ""}
            {t.map.quakeDetail(
              capitalize(formatDayTime(quake.occurredAt, reference, quake.place.region, locale)),
              quake.depthKm === null ? null : Math.round(quake.depthKm),
            )}
          </p>
          <p className="text-sm text-ink-2">{t.source.source}: IPMA</p>
        </>
      );
    }
  }
  if (!body) return null;

  return (
    <div className="absolute inset-x-3 bottom-3 z-10 flex gap-3 rounded-2xl p-4 glass-strong sm:right-auto sm:max-w-md">
      <div className="flex min-w-0 flex-1 flex-col gap-2">{body}</div>
      <button
        type="button"
        onClick={onClose}
        className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-surface-2"
        aria-label={t.map.close}
      >
        <X aria-hidden className="size-5" />
      </button>
    </div>
  );
}

type Severe = "red" | "orange" | "yellow" | "none";

/** Legenda só da camada mostrada, com as cores que o mapa usa nessa camada. */
function Legend({
  layer,
  region,
  mode3d,
  quakes,
  focus,
}: {
  layer: LayerId;
  region: Region;
  /** A vista 3D mostrada, se for o caso. */
  mode3d: Mode3d | null;
  /** Sismos da página (para as notas da vista em profundidade). */
  quakes: EarthquakeEvent[];
  /** Distrito da página, se for o caso: o bloco 3D é o dele. */
  focus?: string;
}) {
  const { t } = useI18n();
  const scale = (labels: Record<Severe, string>, none: Level) => (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {(["none", "yellow", "orange", "red"] as const).map((l) => (
        <span key={l} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className={cn("size-3.5 rounded-full", levels[l === "none" ? none : l].solid)}
          />
          {labels[l]}
        </span>
      ))}
    </span>
  );

  let items: React.ReactNode;
  if (layer === "warnings") items = scale(t.levels, "none");
  else if (layer === "fires") items = scale(t.map.fireLegend, "unknown");
  else if (layer === "air") items = scale(t.map.airLegend, "none");
  else if (layer === "observed") items = <span>{t.map.observedLegend}</span>;
  else if (layer === "sea") items = <span>{t.map.seaLegend}</span>;
  else if (layer === "quakes")
    items = (
      <>
        {scale(t.map.quakeLevels, "info")}
        <span>{t.map.quakeLegend}</span>
      </>
    );
  else
    items =
      region === "continente" ? (
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-bold">{t.map.risk}</span>
          {[1, 2, 3, 4, 5].map((l) => (
            <span key={l} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-3.5 rounded-sm"
                style={{ background: riskColors[l] }}
              />
              {t.term(fireRiskLabels[l]!)}
            </span>
          ))}
        </span>
      ) : (
        <span>{t.map.riskMainlandOnly}</span>
      );
  let extra: React.ReactNode = null;
  if (mode3d === "depth") {
    const bounds = depthBoundsFor(region, focus);
    const inRegion = quakes.filter((q) => q.place.region === region);
    const shown = inRegion.filter((q) => q.coordinates && inBounds(q.coordinates, bounds));
    const outside = inRegion.length - shown.length;
    extra = (
      <>
        <span className="font-bold text-ink">{t.view3d.depthLegend(DEPTH_EXAGGERATION)}</span>
        <span>{t.view3d.depthMarks}</span>
        {shown.some((q) => q.depthKm === null) ? <span>{t.view3d.depthMissing}</span> : null}
        {outside > 0 ? <span>{t.view3d.outside(outside)}</span> : null}
      </>
    );
  } else if (mode3d === "relief") {
    extra = (
      <span className="font-bold text-ink">{t.view3d.reliefLegend(RELIEF_EXAGGERATION)}</span>
    );
  } else if (mode3d === "height") {
    extra = <span className="font-bold text-ink">{t.view3d.heightLegend}</span>;
  }
  return (
    <div data-testid="map-legend" className="flex flex-col gap-2 text-sm text-ink-2">
      {extra}
      {mode3d === "depth" ? scale(t.map.quakeLevels, "info") : items}
    </div>
  );
}

/**
 * O mapa de uma página de tema: mostra só a camada desse tema. Na página
 * do risco (risco de incêndio e qualidade do ar) há uma escolha entre as
 * duas, uma de cada vez. Com `focus` (páginas de distrito), o mapa fica no
 * distrito e há uma ligação para o mesmo tema em todo o país.
 */
export function MapPanel({
  state,
  views,
  layer,
  onLayer,
  selection,
  onSelect,
  onClearSelection,
  region,
  onRegion,
  focus,
  className,
}: {
  state: CountryState;
  /** As camadas que esta página pode mostrar (normalmente só uma). */
  views: LayerId[];
  layer: LayerId;
  onLayer: (layer: LayerId) => void;
  selection: Selection | null;
  onSelect: OnSelect;
  onClearSelection: () => void;
  region: Region;
  onRegion?: (region: Region) => void;
  focus?: string;
  className?: string;
}) {
  const { t, path } = useI18n();
  // O risco de incêndio tem previsão para hoje e amanhã (só no continente).
  const [riskDay, setRiskDay] = useState<RiskDay>("today");
  // Nas páginas nacionais, só as zonas que têm dados desta camada: o risco de
  // incêndio do IPMA é só do continente; o Fogos.pt não tem os Açores.
  const zones: readonly Region[] =
    layer === "risk" ? fireRiskRegions : layer === "fires" ? fireDataRegions : regions;
  const shownRegion: Region = !onRegion || zones.includes(region) ? region : "continente";
  const showRiskDay =
    layer === "risk" && shownRegion === "continente" && state.fireRisk.data !== null;
  // Os mapas que têm vista 3D abrem nela (com a entrada da câmara); "Mapa" volta ao 2D.
  // O estado é deste componente, por isso reinicia ao mudar de página.
  const [view, setView] = useState<"map" | "3d">("3d");
  const webgl = useWebGL();
  const [lost, setLost] = useState(false);
  const mode3d = mode3dFor(layer, showRiskDay);
  const can3d = webgl && !lost;
  const active3d = view === "3d" && can3d ? mode3d : null;
  const quakes = (state.earthquakes.data ?? []).filter((q) => !focus || q.place.district === focus);
  const onWebglLost = useCallback(() => {
    setLost(true);
    setView("map");
  }, []);
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {(onRegion && zones.length > 1) || views.length > 1 || showRiskDay || mode3d ? (
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {views.length > 1 ? (
            <div role="radiogroup" aria-label={t.map.show} className="flex flex-wrap gap-2">
              {views.map((v) => (
                <Chip key={v} role="radio" pressed={layer === v} onClick={() => onLayer(v)}>
                  {t.map.layers[v]}
                </Chip>
              ))}
            </div>
          ) : null}
          {showRiskDay ? (
            <div role="radiogroup" aria-label={t.map.riskDay} className="flex flex-wrap gap-2">
              {(["today", "tomorrow"] as const).map((day) => (
                <Chip
                  key={day}
                  role="radio"
                  pressed={riskDay === day}
                  onClick={() => setRiskDay(day)}
                >
                  {t.lists[day]}
                </Chip>
              ))}
            </div>
          ) : null}
          {mode3d ? (
            <div role="radiogroup" aria-label={t.view3d.group} className="flex flex-wrap gap-2">
              <Chip role="radio" pressed={active3d === null} onClick={() => setView("map")}>
                {t.view3d.map}
              </Chip>
              <Chip
                role="radio"
                pressed={active3d !== null}
                onClick={() => setView("3d")}
                disabled={!can3d}
              >
                {t.view3d.threeD}
              </Chip>
            </div>
          ) : null}
          {onRegion && zones.length > 1 ? (
            <div role="radiogroup" aria-label={t.map.zone} className="flex flex-wrap gap-2">
              {zones.map((r) => (
                <Chip key={r} role="radio" pressed={shownRegion === r} onClick={() => onRegion(r)}>
                  {t.map.regions[r]}
                </Chip>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {mode3d && !can3d ? (
        <p className="text-sm text-ink-2">{lost ? t.view3d.lost : t.view3d.unavailable}</p>
      ) : null}
      <div className="relative h-[45vh] min-h-[300px] overflow-hidden rounded-2xl glass sm:h-[62vh] sm:min-h-[360px] lg:h-[min(66vh,720px)]">
        {active3d === "depth" ? (
          <QuakeDepth
            quakes={quakes}
            region={shownRegion}
            focus={focus}
            selection={selection}
            onSelect={onSelect}
            onClear={onClearSelection}
            generatedAt={state.generatedAt}
            onFailed={onWebglLost}
          />
        ) : (
          <LiveMap
            state={state}
            layer={layer}
            riskDay={riskDay}
            selection={selection}
            onSelect={onSelect}
            onClear={onClearSelection}
            region={shownRegion}
            focus={focus}
            view3d={active3d !== null}
            onWebglLost={onWebglLost}
          />
        )}
        {selection ? (
          <Detail state={state} selection={selection} layer={layer} onClose={onClearSelection} />
        ) : null}
      </div>
      <Legend layer={layer} region={shownRegion} mode3d={active3d} quakes={quakes} focus={focus} />
      {focus ? (
        <Link
          href={path(layerTopic[layer])}
          className="inline-flex min-h-11 items-center gap-1.5 self-start text-base font-bold"
        >
          {t.map.seeCountry[layer]} <ArrowRight aria-hidden className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}
