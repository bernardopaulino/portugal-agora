"use client";

import { X } from "lucide-react";
import dynamic from "next/dynamic";

import { getDistrict, type Region } from "@/data/districts";
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
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-surface-2 text-ink-2">
      A carregar o mapa…
    </div>
  ),
});

const regions: { id: Region; label: string }[] = [
  { id: "continente", label: "Continente" },
  { id: "acores", label: "Açores" },
  { id: "madeira", label: "Madeira" },
];

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
          <p className="text-lg font-extrabold">{d?.name}</p>
        </div>
        <p className="text-base">
          {warnings.length === 0
            ? "Sem avisos meteorológicos."
            : warnings
                .map((w) => w.title)
                .filter((t, i, all) => all.indexOf(t) === i)
                .join(". ") + "."}
          {status && status.activeFires > 0
            ? ` ${status.activeFires} ${status.activeFires === 1 ? "incêndio" : "incêndios"} em curso.`
            : ""}
          {air ? ` Qualidade do ar: ${air.label.toLowerCase()}.` : ""}
        </p>
        {d ? (
          <a href={`/${d.slug}`} className="text-base font-bold">
            Ver tudo sobre {d.name}
          </a>
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
              label={fire.status}
            />
            <p className="text-lg font-extrabold">{fire.place.label}</p>
          </div>
          <p className="text-base">
            {fire.nature}. Início {formatDayTime(fire.startedAt, reference, fire.place.region)}.{" "}
            {fire.operatives} operacionais, {fire.aerialUnits} meios aéreos.
          </p>
          <p className="text-sm text-ink-2">
            Fonte:{" "}
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
              label={`Magnitude ${formatNumber(quake.magnitude)}`}
            />
            <p className="text-lg font-extrabold">{capitalize(quake.place.label)}</p>
          </div>
          <p className="text-base">
            {quake.felt ? "Sentido pela população. " : ""}
            {capitalize(formatDayTime(quake.occurredAt, reference, quake.place.region))}, a{" "}
            {Math.round(quake.depthKm)} km de profundidade.
          </p>
          <p className="text-sm text-ink-2">Fonte: IPMA</p>
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
        aria-label="Fechar detalhe"
      >
        <X aria-hidden className="size-5" />
      </button>
    </div>
  );
}

function Legend({ layers }: { layers: LayerId[] }) {
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
            {levels[l].word}
          </span>
        ))}
      </span>,
    );
  }
  if (layers.includes("risk")) {
    items.push(
      <span key="risk" className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-bold">Risco:</span>
        {[1, 2, 3, 4, 5].map((l) => (
          <span key={l} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-3.5 rounded-sm"
              style={{ background: riskColors[l] }}
            />
            {fireRiskLabels[l]}
          </span>
        ))}
      </span>,
    );
  }
  if (layers.includes("quakes"))
    items.push(
      <span key="q">Sismos: círculo maior, magnitude maior; mais transparente, mais antigo.</span>,
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
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {onRegion ? (
        <div role="radiogroup" aria-label="Zona do mapa" className="flex flex-wrap gap-2">
          {regions.map((r) => (
            <Chip key={r.id} role="radio" pressed={region === r.id} onClick={() => onRegion(r.id)}>
              {r.label}
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
        <legend className="mb-1 text-base font-bold">Mostrar no mapa</legend>
        <div className="flex flex-wrap gap-2">
          {layerOptions.map((l) => (
            <Chip key={l.id} pressed={layers.includes(l.id)} onClick={() => onToggleLayer(l.id)}>
              {l.label}
            </Chip>
          ))}
        </div>
      </fieldset>
      <Legend layers={layers} />
    </div>
  );
}
