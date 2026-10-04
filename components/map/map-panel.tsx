"use client";

import { X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";

import { getDistrict, type Region } from "@/data/districts";
import { useI18n } from "@/lib/i18n/client";
import { fireRiskLabels } from "@/lib/sources/ipma-rcm";
import type { CountryState } from "@/lib/state/aggregate";
import { capitalize, formatDayTime, formatNumber } from "@/lib/time/format";
import { cn } from "@/lib/utils";

import { riskColors } from "../cards/fire-risk";
import type { OnSelect, Selection } from "../cards/types";
import { levels, SeverityBadge } from "../status/severity";
import { layerOptions, type LayerId } from "./layers";

const LiveMap = dynamic(() => import("./live-map"), {
  ssr: false,
  loading: () => <MapLoading />,
});

function MapLoading() {
  const { t } = useI18n();
  return (
    <div className="flex h-full w-full items-center justify-center bg-surface-2 text-ink-2">
      {t.map.loading}
    </div>
  );
}

const regions: Region[] = ["continente", "acores", "madeira"];

function Chip({
  pressed,
  onClick,
  children,
  role,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
  role?: "radio";
}) {
  return (
    <button
      type="button"
      role={role}
      aria-pressed={role ? undefined : pressed}
      aria-checked={role ? pressed : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-sm border px-4 font-display text-lg font-semibold",
        pressed
          ? "border-ink bg-ink text-bg"
          : "border-line bg-surface text-ink hover:bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}

function Detail({
  state,
  selection,
  onClose,
}: {
  state: CountryState;
  selection: Selection;
  onClose: () => void;
}) {
  const { t, locale, path } = useI18n();
  const reference = new Date(state.generatedAt);
  let body: React.ReactNode = null;

  if (selection.type === "district") {
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
              Math.round(quake.depthKm),
            )}
          </p>
          <p className="text-sm text-ink-2">{t.source.source}: IPMA</p>
        </>
      );
    }
  }
  if (!body) return null;

  return (
    <div className="absolute inset-x-3 bottom-3 z-10 flex gap-3 rounded-sm border border-line bg-surface p-4 shadow-[0_10px_30px_-12px_rgb(0_0_0/0.45)] sm:right-auto sm:max-w-md">
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

function Legend({ layers }: { layers: LayerId[] }) {
  const { t } = useI18n();
  const items: React.ReactNode[] = [];
  if (
    layers.includes("warnings") ||
    layers.includes("air") ||
    layers.includes("fires") ||
    layers.includes("quakes")
  ) {
    items.push(
      <span key="lv" className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {(["none", "yellow", "orange", "red"] as const).map((l) => (
          <span key={l} className="inline-flex items-center gap-1.5">
            <span aria-hidden className={cn("size-3.5 rounded-full", levels[l].solid)} />
            {t.levels[l]}
          </span>
        ))}
      </span>,
    );
  }
  if (layers.includes("risk")) {
    items.push(
      <span key="risk" className="flex flex-wrap items-center gap-x-3 gap-y-1">
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
      </span>,
    );
  }
  if (layers.includes("quakes"))
    items.push(
      <span key="q">{t.map.quakeLegend}</span>,
    );
  return <div className="flex flex-col gap-2 text-sm text-ink-2">{items}</div>;
}

export function MapPanel({
  state,
  layers,
  onToggleLayer,
  selection,
  onSelect,
  onClearSelection,
  region,
  onRegion,
  focus,
  className,
}: {
  state: CountryState;
  layers: LayerId[];
  onToggleLayer: (layer: LayerId) => void;
  selection: Selection | null;
  onSelect: OnSelect;
  onClearSelection: () => void;
  region: Region;
  onRegion?: (region: Region) => void;
  focus?: string;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {onRegion ? (
        <div role="radiogroup" aria-label={t.map.zone} className="flex flex-wrap gap-2">
          {regions.map((r) => (
            <Chip key={r} role="radio" pressed={region === r} onClick={() => onRegion(r)}>
              {t.map.regions[r]}
            </Chip>
          ))}
        </div>
      ) : null}
      <div className="relative h-[62vh] min-h-[360px] overflow-hidden rounded-sm border border-line bg-surface-2 lg:h-[min(72vh,720px)]">
        <LiveMap
          state={state}
          layers={layers}
          selection={selection}
          onSelect={onSelect}
          region={region}
          focus={focus}
        />
        {selection ? (
          <Detail state={state} selection={selection} onClose={onClearSelection} />
        ) : null}
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-base font-bold">{t.map.show}</legend>
        <div className="flex flex-wrap gap-2">
          {layerOptions.map((l) => (
            <Chip key={l} pressed={layers.includes(l)} onClick={() => onToggleLayer(l)}>
              {t.map.layers[l]}
            </Chip>
          ))}
        </div>
      </fieldset>
      <Legend layers={layers} />
    </div>
  );
}
