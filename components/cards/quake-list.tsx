"use client";

import { useState } from "react";

import { useI18n } from "@/lib/i18n/client";
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
  emptyText,
  initial = INITIAL,
}: {
  quakes: EarthquakeEvent[];
  reference: Date;
  selection?: Selection | null;
  onSelect?: OnSelect;
  emptyText?: string;
  /** Quantos sismos notáveis mostrar antes do botão. */
  initial?: number;
}) {
  const { t, locale } = useI18n();
  const [expanded, setExpanded] = useState(false);
  if (quakes.length === 0) return <EmptyState>{emptyText ?? t.empty.quakesNone}</EmptyState>;
  // Por omissão: só os sismos sentidos ou em território português (os de Espanha e do
  // Atlântico ficam no botão).
  const notable = quakes.filter(isNotableQuake);
  const visible = expanded ? quakes : notable.slice(0, initial);

  return (
    <div className="flex flex-col gap-3">
      {visible.length > 0 ? (
        <ul className="flex flex-col border-t border-line">
          {visible.map((q) => (
            <EventRow
              key={q.id}
              id={q.id}
              level={q.severity === "none" ? "info" : q.severity}
              badge={t.lists.magnitude(formatNumber(q.magnitude, 1, locale))}
              title={capitalize(t.term(q.place.label))}
              meta={
                <>
                  {q.felt ? t.lists.felt : ""}
                  {t.lists.quakeMeta(
                    capitalize(formatDayTime(q.occurredAt, reference, q.place.region, locale)) +
                      (q.place.region === "acores" ? t.lists.azoresTime : ""),
                    Math.round(q.depthKm),
                    q.intensity,
                  )}
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
      {visible.length === 0 ? <EmptyState>{t.empty.quakesNoneNotable}</EmptyState> : null}
      {quakes.length > visible.length || expanded ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="h-12 self-start rounded-sm border border-ink px-5 font-display text-lg font-semibold hover:bg-ink hover:text-bg"
        >
          {expanded ? t.lists.showLess : t.lists.showAllQuakes(quakes.length)}
        </button>
      ) : null}
    </div>
  );
}
