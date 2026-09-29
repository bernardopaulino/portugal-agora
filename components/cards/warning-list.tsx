import { getDistrict } from "@/data/districts";
import { maxSeverity, type WarningEvent } from "@/lib/sources/types";
import { formatRange } from "@/lib/time/format";

import { EmptyState } from "../status/section";
import { EventRow } from "./row";
import type { OnSelect, Selection } from "./types";

/**
 * Avisos agrupados por área (distrito ou zona das ilhas): uma linha por
 * área com o nível mais alto e cada aviso com o seu horário.
 */
export function WarningList({
  warnings,
  reference,
  selection,
  onSelect,
  emptyText = "Não há avisos meteorológicos em vigor nem previstos para os próximos três dias.",
  linkDistricts = true,
}: {
  warnings: WarningEvent[];
  /** Instante de referência para "hoje/amanhã" (a hora dos dados, para ser determinístico). */
  reference: Date;
  selection?: Selection | null;
  onSelect?: OnSelect;
  emptyText?: string;
  /** Na página de um distrito, o nome não precisa de ligar à própria página. */
  linkDistricts?: boolean;
}) {
  if (warnings.length === 0) return <EmptyState>{emptyText}</EmptyState>;

  const groups = new Map<string, WarningEvent[]>();
  for (const w of warnings) groups.set(w.area, [...(groups.get(w.area) ?? []), w]);
  const ordered = [...groups.entries()]
    .map(([area, items]) => ({ area, items, level: maxSeverity(items.map((i) => i.severity)) }))
    .sort(
      (a, b) =>
        ["red", "orange", "yellow", "none"].indexOf(a.level) -
          ["red", "orange", "yellow", "none"].indexOf(b.level) ||
        a.items[0]!.place.label.localeCompare(b.items[0]!.place.label, "pt"),
    );

  return (
    <ul className="flex flex-col gap-3">
      {ordered.map(({ area, items, level }) => {
        const place = items[0]!.place;
        const district = place.district ? getDistrict(place.district) : undefined;
        return (
          <EventRow
            key={area}
            id={`aviso-${area}`}
            level={level}
            title={
              linkDistricts && district && district.region === "continente" ? (
                <a href={`/${district.slug}`} className="text-ink">
                  {place.label}
                </a>
              ) : (
                place.label
              )
            }
            selected={selection?.type === "district" && selection.slug === place.district}
            onShow={
              onSelect && place.district
                ? () => onSelect({ type: "district", slug: place.district! })
                : undefined
            }
          >
            <ul className="mt-1 flex flex-col gap-2">
              {items.map((w) => (
                <li key={w.id} className="text-base">
                  <span className="font-bold">{w.title}</span>
                  <span className="text-ink-2">
                    : {formatRange(w.startsAt, w.endsAt, reference, place.region)}
                    {place.region === "acores" ? " (hora dos Açores)" : ""}.
                  </span>
                  {w.description ? <span className="block text-ink-2">{w.description}</span> : null}
                </li>
              ))}
            </ul>
          </EventRow>
        );
      })}
    </ul>
  );
}
