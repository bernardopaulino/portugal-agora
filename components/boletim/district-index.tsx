"use client";

import { districts } from "@/data/districts";
import type { CountryState } from "@/lib/state/aggregate";
import { severityRank } from "@/lib/sources/types";
import { useI18n } from "@/lib/i18n/client";
import { reveal } from "@/lib/motion/reveal";
import { cn } from "@/lib/utils";

import { levels } from "../status/severity";
import { levelBlock } from "./parts";

/**
 * Todos os distritos e regiões, com o nível de cada um: os que têm aviso
 * primeiro. É o caminho em texto para o mapa do boletim.
 */
export function DistrictIndex({ state }: { state: CountryState }) {
  const { t, path } = useI18n();
  const rows = districts
    .map((d) => ({
      district: d,
      level: state.levelKnown ? (state.districts[d.slug]?.level ?? "none") : ("unknown" as const),
    }))
    .sort(
      (a, b) =>
        (b.level === "unknown" ? 0 : severityRank[b.level]) -
          (a.level === "unknown" ? 0 : severityRank[a.level]) ||
        t.districtName(a.district).localeCompare(t.districtName(b.district), t.locale),
    );

  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {rows.map(({ district, level }) => {
        const Icon = levels[level].icon;
        return (
          <li key={district.slug} ref={reveal}>
            <a
              href={path(`/${district.slug}`)}
              className="flex min-h-12 items-center gap-2.5 rounded-xl border border-glass-line bg-[var(--stage-2)] px-3 py-2 text-base text-ink no-underline transition-colors hover:border-[color-mix(in_srgb,var(--accent)_50%,transparent)] hover:bg-surface-2"
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-md",
                  levelBlock[level],
                )}
              >
                <Icon aria-hidden className="size-3.5" strokeWidth={2.6} />
                <span className="sr-only">{t.levels[level]}: </span>
              </span>
              <span className="min-w-0 truncate">{t.districtName(district)}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
