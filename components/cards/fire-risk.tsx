"use client";

import { useI18n } from "@/lib/i18n/client";
import { fireRiskLabels } from "@/lib/sources/ipma-rcm";
import type { FireRisk } from "@/lib/sources/types";
import { cn } from "@/lib/utils";

/** Cores da escala de risco (1 a 5), alinhadas com a escala do IPMA. */
export const riskColors: Record<number, string> = {
  1: "#6bb86e",
  2: "#e8d44d",
  3: "#f0a13a",
  4: "#e0661b",
  5: "#b3202a",
};

/** Distribuição do risco de incêndio de hoje pelos concelhos do continente. */
export function FireRiskSummary({ risk }: { risk: FireRisk }) {
  const { t } = useI18n();
  const values = Object.values(risk.today.byDico);
  const total = values.length;
  const counts = [1, 2, 3, 4, 5].map((level) => ({
    level,
    n: values.filter((v) => v === level).length,
  }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-4 w-full overflow-hidden rounded-sm" aria-hidden>
        {counts
          .filter((c) => c.n > 0)
          .map((c) => (
            <span
              key={c.level}
              style={{ width: `${(c.n / total) * 100}%`, background: riskColors[c.level] }}
            />
          ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-base">
        {counts.map((c) => {
          const [label, count] = t.lists.riskLevels(t.term(fireRiskLabels[c.level]!), c.n);
          return (
            <li key={c.level} className={cn("flex items-center gap-2", c.n === 0 && "text-ink-2")}>
              <span
                aria-hidden
                className="size-3.5 shrink-0 rounded-sm"
                style={{ background: riskColors[c.level] }}
              />
              <span>
                {label}: <strong>{count}</strong>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
