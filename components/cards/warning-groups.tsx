"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { getDistrict } from "@/data/districts";
import { useHighlightNew } from "@/lib/hooks/live-highlight";
import { useI18n } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/locales";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { reveal } from "@/lib/motion/reveal";
import { severityRank, type WarningEvent } from "@/lib/sources/types";
import { groupWarnings, type WarningGroup } from "@/lib/state/bulletin";
import { capitalize, formatRange } from "@/lib/time/format";

import { EmptyState } from "../status/section";
import { SeverityBadge } from "../status/severity";

/**
 * Janelas com o mesmo texto ("em vigor até às 22:00 de hoje") juntam-se,
 * mesmo que o IPMA as tenha emitido com inícios diferentes.
 */
function windowsOf(group: WarningGroup, reference: Date, t: Dictionary, locale: Locale) {
  const allAzores = group.items.every((w) => w.place.region === "acores");
  const mixed = !allAzores && group.items.some((w) => w.place.region === "acores");
  const merged = new Map<string, WarningEvent[]>();
  for (const w of group.windows) {
    const label =
      capitalize(
        formatRange(w.startsAt, w.endsAt, reference, allAzores ? "acores" : "continente", locale),
      ) + (allAzores ? t.lists.azoresTime : mixed ? t.lists.mainlandTime : "");
    merged.set(label, [...(merged.get(label) ?? []), ...w.items]);
  }
  return [...merged.entries()].map(([label, items]) => ({
    label,
    items: items.sort((a, b) => t.areaName(a.area).localeCompare(t.areaName(b.area), "pt")),
  }));
}

function Places({ items }: { items: WarningEvent[] }) {
  const { t, path } = useI18n();
  return (
    <>
      {items.map((w, i) => {
        const district = w.place.district ? getDistrict(w.place.district) : undefined;
        return (
          <span key={w.id}>
            {district ? (
              <Link href={path(`/${district.slug}`)}>{t.areaName(w.area)}</Link>
            ) : (
              t.areaName(w.area)
            )}
            {i < items.length - 2 ? ", " : i === items.length - 2 ? ` ${t.and} ` : "."}
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
  emptyText,
  showPlaces = true,
  initial,
}: {
  warnings: WarningEvent[];
  reference: Date;
  emptyText?: string;
  /** Na página de um distrito, a lista de locais é redundante. */
  showPlaces?: boolean;
  /**
   * Quantos avisos mostrar antes do botão "Mostrar os N avisos" (sem valor,
   * todos). Os laranja e vermelho aparecem sempre: só os amarelos ficam no botão.
   */
  initial?: number;
}) {
  const { t, locale } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const groups = groupWarnings(warnings.filter((w) => w.severity !== "none"));
  // Os grupos vêm do mais grave para o menos grave.
  const serious = groups.filter((g) => severityRank[g.severity] >= severityRank.orange).length;
  const limit = initial === undefined ? groups.length : Math.max(initial, serious);
  const visible = expanded ? groups : groups.slice(0, limit);
  // A chave inclui o nível: um aviso que passa de amarelo a laranja conta como novo.
  const listRef = useRef<HTMLUListElement>(null);
  useHighlightNew(
    groups.map((g) => g.key),
    listRef,
  );
  if (groups.length === 0) return <EmptyState>{emptyText ?? t.empty.warnings}</EmptyState>;

  return (
    <div className="flex flex-col gap-3">
      <ul ref={listRef} className="flex flex-col border-t border-line">
        {visible.map((g) => (
          <li
            key={g.key}
            data-live-key={g.key}
            ref={reveal}
            className="flex flex-col gap-3 border-b border-line py-5"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <SeverityBadge level={g.severity} />
              <h3 className="font-display text-2xl leading-tight font-semibold tracking-[-0.02em]">
                {capitalize(t.term(g.type))}
              </h3>
            </div>
            {g.description ? (
              <p lang="pt-PT" className="max-w-[70ch] text-base text-ink-2">
                {g.description}
              </p>
            ) : null}
            <ul className="flex flex-col gap-2">
              {windowsOf(g, reference, t, locale).map((w) => (
                <li key={w.label} className="text-base">
                  <span className="font-bold">{w.label}</span>
                  {showPlaces ? (
                    <>
                      <span className="text-ink-2">
                        {" "}
                        · {t.lists.windowPlaces(w.items.length, t.areaName(w.items[0]?.area ?? ""))}
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
      {groups.length > limit ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="h-12 self-start rounded-sm border border-ink px-5 font-display text-lg font-semibold hover:bg-ink hover:text-bg"
        >
          {expanded ? t.lists.showLess : t.lists.showAllWarnings(groups.length)}
        </button>
      ) : null}
    </div>
  );
}
