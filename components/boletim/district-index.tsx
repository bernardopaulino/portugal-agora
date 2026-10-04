import { districts } from "@/data/districts";
import type { CountryState } from "@/lib/state/aggregate";
import { severityRank } from "@/lib/sources/types";
import { cn } from "@/lib/utils";

import { levels } from "../status/severity";
import { levelBlock } from "./parts";

/**
 * Todos os distritos e regiões, com o nível de cada um: os que têm aviso
 * primeiro. É o caminho em texto para o mapa do boletim.
 */
export function DistrictIndex({ state }: { state: CountryState }) {
  const rows = districts
    .map((d) => ({
      district: d,
      level: state.levelKnown ? (state.districts[d.slug]?.level ?? "none") : ("unknown" as const),
    }))
    .sort(
      (a, b) =>
        (b.level === "unknown" ? 0 : severityRank[b.level]) -
          (a.level === "unknown" ? 0 : severityRank[a.level]) ||
        a.district.name.localeCompare(b.district.name, "pt"),
    );

  return (
    <ul className="grid grid-cols-2 gap-x-4 border-t border-line">
      {rows.map(({ district, level }) => {
        const Icon = levels[level].icon;
        return (
          <li key={district.slug} className="border-b border-line">
            <a
              href={`/${district.slug}`}
              className="flex min-h-11 items-center gap-2.5 py-1.5 text-base text-ink no-underline hover:underline"
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-[3px]",
                  levelBlock[level],
                )}
              >
                <Icon aria-hidden className="size-3.5" strokeWidth={2.6} />
                <span className="sr-only">{levels[level].word}: </span>
              </span>
              <span className="min-w-0 truncate">{district.name}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
