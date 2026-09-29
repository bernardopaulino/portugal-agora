"use client";

import { useState } from "react";

import type { EarthquakeEvent } from "@/lib/sources/types";
import { capitalize, formatDayTime, formatNumber } from "@/lib/time/format";

import { EmptyState } from "../status/section";
import { EventRow } from "./row";
import type { OnSelect, Selection } from "./types";

const INITIAL = 6;

export function QuakeList({
  quakes,
  reference,
  selection,
  onSelect,
  emptyText = "Nenhum sismo de magnitude 2 ou superior nos últimos 7 dias.",
}: {
  quakes: EarthquakeEvent[];
  reference: Date;
  selection?: Selection | null;
  onSelect?: OnSelect;
  emptyText?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (quakes.length === 0) return <EmptyState>{emptyText}</EmptyState>;
  const visible = expanded ? quakes : quakes.slice(0, INITIAL);

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {visible.map((q) => (
          <EventRow
            key={q.id}
            id={q.id}
            level={q.severity === "none" ? "info" : q.severity}
            badge={`Magnitude ${formatNumber(q.magnitude)}`}
            title={capitalize(q.place.label)}
            meta={
              <>
                {q.felt ? "Sentido pela população. " : ""}
                {capitalize(formatDayTime(q.occurredAt, reference, q.place.region))}
                {q.place.region === "acores" ? " (hora dos Açores)" : ""}, a {Math.round(q.depthKm)}{" "}
                km de profundidade{q.intensity ? `, intensidade ${q.intensity}` : ""}.
              </>
            }
            selected={selection?.type === "event" && selection.id === q.id}
            onShow={
              onSelect && q.coordinates
                ? () =>
                    onSelect({
                      type: "event",
                      id: q.id,
                      coordinates: q.coordinates!,
                      region: q.place.region,
                    })
                : undefined
            }
          />
        ))}
      </ul>
      {quakes.length > INITIAL ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="h-12 self-start rounded-full border border-line bg-surface px-5 text-base font-bold hover:bg-surface-2"
        >
          {expanded ? "Mostrar menos" : `Mostrar os ${quakes.length} sismos dos últimos 7 dias`}
        </button>
      ) : null}
    </div>
  );
}
