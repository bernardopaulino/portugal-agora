"use client";

import { useState } from "react";

import type { EarthquakeEvent } from "@/lib/sources/types";
import { isNotableQuake } from "@/lib/state/bulletin";
import { capitalize, formatDayTime, formatNumber } from "@/lib/time/format";

import { EmptyState } from "../status/section";
import { EventRow } from "./row";
import type { OnSelect, Selection } from "./types";

const INITIAL = 4;

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
  // Por omissão: só os sismos sentidos ou em território português (os de Espanha e do
  // Atlântico ficam no botão).
  const notable = quakes.filter(isNotableQuake);
  const visible = expanded ? quakes : notable.slice(0, INITIAL);

  return (
    <div className="flex flex-col gap-3">
      {visible.length > 0 ? (
        <ul className="flex flex-col border-t border-line">
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
                  {q.place.region === "acores" ? " (hora dos Açores)" : ""}, a{" "}
                  {Math.round(q.depthKm)} km de profundidade
                  {q.intensity ? `, intensidade ${q.intensity}` : ""}.
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
      ) : null}
      {visible.length === 0 ? (
        <EmptyState>
          Nenhum sismo sentido nem em território português nos últimos 7 dias.
        </EmptyState>
      ) : null}
      {quakes.length > visible.length || expanded ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="h-12 self-start rounded-sm border border-ink px-5 font-display text-lg font-semibold hover:bg-ink hover:text-bg"
        >
          {expanded ? "Mostrar menos" : `Mostrar os ${quakes.length} sismos dos últimos 7 dias`}
        </button>
      ) : null}
    </div>
  );
}
