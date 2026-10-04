"use client";

import { useState } from "react";

import type { FireEvent } from "@/lib/sources/types";
import { formatDayTime } from "@/lib/time/format";

import { EmptyState } from "../status/section";
import { EventRow } from "./row";
import type { OnSelect, Selection } from "./types";

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export function FireList({
  fires,
  reference,
  selection,
  onSelect,
}: {
  fires: FireEvent[];
  reference: Date;
  selection?: Selection | null;
  onSelect?: OnSelect;
}) {
  const [showAll, setShowAll] = useState(false);
  const relevant = fires.filter((f) => f.severity !== "none");
  const others = fires.filter((f) => f.severity === "none");

  if (fires.length === 0)
    return <EmptyState>Não há incêndios registados neste momento.</EmptyState>;

  const visible = showAll ? fires : relevant;
  return (
    <div className="flex flex-col gap-3">
      {relevant.length === 0 ? (
        <EmptyState>Nenhum incêndio em curso ou em resolução.</EmptyState>
      ) : null}
      {visible.length > 0 ? (
        <ul className="flex flex-col border-t border-line">
          {visible.map((f) => (
            <EventRow
              key={f.id}
              id={f.id}
              level={f.severity === "none" ? "info" : f.severity}
              badge={f.status}
              title={f.place.label}
              meta={`${f.nature}. Início ${formatDayTime(f.startedAt, reference, f.place.region)}.`}
              selected={selection?.type === "event" && selection.id === f.id}
              onShow={
                onSelect && f.coordinates
                  ? () =>
                      onSelect({
                        type: "event",
                        id: f.id,
                        coordinates: f.coordinates!,
                        region: f.place.region,
                      })
                  : undefined
              }
            >
              <p className="text-base">
                {plural(f.operatives, "operacional", "operacionais")},{" "}
                {plural(f.groundUnits, "meio terrestre", "meios terrestres")},{" "}
                {plural(f.aerialUnits, "meio aéreo", "meios aéreos")}.
              </p>
            </EventRow>
          ))}
        </ul>
      ) : null}
      {others.length > 0 ? (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          aria-expanded={showAll}
          className="h-12 self-start rounded-sm border border-ink px-5 font-display text-lg font-semibold hover:bg-ink hover:text-bg"
        >
          {showAll
            ? "Mostrar só os ativos"
            : `Mostrar também ${plural(others.length, "em conclusão ou vigilância", "em conclusão ou vigilância")}`}
        </button>
      ) : null}
    </div>
  );
}
