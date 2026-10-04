import { getDistrict } from "@/data/districts";
import type { WarningEvent } from "@/lib/sources/types";
import { groupWarnings, type WarningGroup } from "@/lib/state/bulletin";
import { capitalize, formatRange } from "@/lib/time/format";

import { EmptyState } from "../status/section";
import { SeverityBadge } from "../status/severity";

/**
 * Janelas com o mesmo texto ("em vigor até às 22:00 de hoje") juntam-se,
 * mesmo que o IPMA as tenha emitido com inícios diferentes.
 */
function windowsOf(group: WarningGroup, reference: Date) {
  const allAzores = group.items.every((w) => w.place.region === "acores");
  const mixed = !allAzores && group.items.some((w) => w.place.region === "acores");
  const merged = new Map<string, WarningEvent[]>();
  for (const w of group.windows) {
    const label =
      capitalize(
        formatRange(w.startsAt, w.endsAt, reference, allAzores ? "acores" : "continente"),
      ) + (allAzores ? " (hora dos Açores)" : mixed ? " (hora do continente)" : "");
    merged.set(label, [...(merged.get(label) ?? []), ...w.items]);
  }
  return [...merged.entries()].map(([label, items]) => ({
    label,
    items: items.sort((a, b) => a.place.label.localeCompare(b.place.label, "pt")),
  }));
}

function Places({ items }: { items: WarningEvent[] }) {
  return (
    <>
      {items.map((w, i) => {
        const district = w.place.district ? getDistrict(w.place.district) : undefined;
        return (
          <span key={w.id}>
            {district ? <a href={`/${district.slug}`}>{w.place.label}</a> : w.place.label}
            {i < items.length - 2 ? ", " : i === items.length - 2 ? " e " : "."}
          </span>
        );
      })}
    </>
  );
}

/**
 * Avisos agrupados: cada aviso diferente aparece uma vez, com o texto do
 * IPMA e, por baixo, cada janela de tempo com os locais onde vigora.
 */
export function WarningGroups({
  warnings,
  reference,
  emptyText = "Não há avisos meteorológicos em vigor nem previstos para os próximos três dias.",
  showPlaces = true,
}: {
  warnings: WarningEvent[];
  reference: Date;
  emptyText?: string;
  /** Na página de um distrito, a lista de locais é redundante. */
  showPlaces?: boolean;
}) {
  const groups = groupWarnings(warnings.filter((w) => w.severity !== "none"));
  if (groups.length === 0) return <EmptyState>{emptyText}</EmptyState>;

  return (
    <ul className="flex flex-col border-t border-line">
      {groups.map((g) => (
        <li key={g.key} className="flex flex-col gap-3 border-b border-line py-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <SeverityBadge level={g.severity} />
            <h3 className="font-display text-2xl leading-tight font-bold">{capitalize(g.type)}</h3>
          </div>
          {g.description ? (
            <p className="max-w-[70ch] text-base text-ink-2">{g.description}</p>
          ) : null}
          <ul className="flex flex-col gap-2">
            {windowsOf(g, reference).map((w) => (
              <li key={w.label} className="text-base">
                <span className="font-bold">{w.label}</span>
                {showPlaces ? (
                  <>
                    <span className="text-ink-2">
                      {" "}
                      · {w.items.length === 1 ? "em " : `${w.items.length} locais: `}
                    </span>
                    <Places items={w.items} />
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
