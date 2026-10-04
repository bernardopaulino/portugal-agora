"use client";

import { useState } from "react";

import { useI18n } from "@/lib/i18n/client";
import type { FireEvent } from "@/lib/sources/types";
import { formatDayTime } from "@/lib/time/format";

import { EmptyState } from "../status/section";
import { EventRow } from "./row";
import type { OnSelect, Selection } from "./types";

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
  const { t, locale } = useI18n();
  const [showAll, setShowAll] = useState(false);
  const relevant = fires.filter((f) => f.severity !== "none");
  const others = fires.filter((f) => f.severity === "none");

  if (fires.length === 0) return <EmptyState>{t.empty.firesNone}</EmptyState>;

  const visible = showAll ? fires : relevant;
  return (
    <div className="flex flex-col gap-3">
      {relevant.length === 0 ? <EmptyState>{t.empty.firesNoneActive}</EmptyState> : null}
      {visible.length > 0 ? (
        <ul className="flex flex-col border-t border-line">
          {visible.map((f) => (
            <EventRow
              key={f.id}
              id={f.id}
              level={f.severity === "none" ? "info" : f.severity}
              badge={t.term(f.status)}
              title={f.place.label}
              meta={t.lists.fireMeta(
                t.term(f.nature),
                formatDayTime(f.startedAt, reference, f.place.region, locale),
              )}
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
                {t.lists.fireMeans(f.operatives, f.groundUnits, f.aerialUnits)}
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
          {showAll ? t.lists.showActiveOnly : t.lists.showOthers(others.length)}
        </button>
      ) : null}
    </div>
  );
}
