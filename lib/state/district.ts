import { concelhoByDico } from "@/data/dico";
import type { District } from "@/data/districts";
import { fireRiskLabels } from "@/lib/sources/ipma-rcm";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries";
import { maxSeverity, type Severity, type WarningEvent } from "@/lib/sources/types";

import type { CountryState } from "./aggregate";
import { districtHeadline as headline } from "./bulletin";

/** "Aviso laranja de vento em Lisboa. Aviso amarelo de precipitação." */
export function districtHeadline(
  district: District,
  warnings: WarningEvent[],
  known: boolean,
  t: Dictionary = getDictionary("pt"),
): string {
  return headline(district, warnings, known, t);
}

export interface ConcelhoRisk {
  dico: string;
  name: string;
  today: number;
  tomorrow: number;
}

export function districtFireRisk(state: CountryState, slug: string): ConcelhoRisk[] {
  const risk = state.fireRisk.data;
  if (!risk) return [];
  return Object.keys(risk.today.byDico)
    .map((dico) => ({ dico, info: concelhoByDico(dico) }))
    .filter((x) => x.info?.district === slug)
    .map(({ dico, info }) => ({
      dico,
      name: info!.name,
      today: risk.today.byDico[dico] ?? 0,
      tomorrow: risk.tomorrow.byDico[dico] ?? 0,
    }))
    .sort(
      (a, b) => b.today - a.today || b.tomorrow - a.tomorrow || a.name.localeCompare(b.name, "pt"),
    );
}

export function districtSummary(state: CountryState, district: District): string[] {
  const lines: string[] = [];
  const fires = state.fires.data;
  if (fires) {
    const active = fires.filter((f) => f.active && f.place.district === district.slug).length;
    lines.push(
      active === 0
        ? "Nenhum incêndio em curso."
        : active === 1
          ? "1 incêndio em curso."
          : `${active} incêndios em curso.`,
    );
  }
  const quakes = (state.earthquakes.data ?? []).filter((q) => q.place.district === district.slug);
  const felt = quakes.filter((q) => q.felt).length;
  if (felt > 0)
    lines.push(
      felt === 1
        ? "1 sismo sentido nos últimos 7 dias."
        : `${felt} sismos sentidos nos últimos 7 dias.`,
    );

  const risk = districtFireRisk(state, district.slug);
  if (risk.length > 0) {
    const top = risk[0]!.today;
    const count = risk.filter((r) => r.today === top).length;
    lines.push(
      `Risco de incêndio hoje: até ${fireRiskLabels[top]?.toLowerCase()} (${count} ${count === 1 ? "concelho" : "concelhos"}).`,
    );
  }
  return lines;
}

export function districtLevel(state: CountryState, slug: string): Severity {
  return maxSeverity(
    (state.warnings.data ?? []).filter((w) => w.place.district === slug).map((w) => w.severity),
  );
}
