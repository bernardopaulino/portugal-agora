"use client";

import Link from "next/link";

import { concelhoForDico } from "@/data/concelhos";
import { useI18n } from "@/lib/i18n/client";
import { fireRiskLabels } from "@/lib/sources/labels";
import type { ConcelhoRisk } from "@/lib/state/district";

import { riskColors } from "./fire-risk";

function RiskCell({ level }: { level: number }) {
  const { t } = useI18n();
  if (!level) return <span className="text-ink-2">{t.topics.noData}</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className="size-3.5 shrink-0 rounded-sm"
        style={{ background: riskColors[level] }}
      />
      {t.term(fireRiskLabels[level]!)}
    </span>
  );
}

/**
 * `link`: o nome de cada concelho leva à sua página. `current`: o concelho da
 * página onde a tabela está (a negrito e sem ligação para si próprio).
 */
export function RiskTable({
  rows,
  link = true,
  current,
}: {
  rows: ConcelhoRisk[];
  link?: boolean;
  current?: string;
}) {
  const { t, path } = useI18n();
  return (
    // Focável para quem usa teclado conseguir deslocar a tabela em ecrãs estreitos.
    <div
      className="overflow-x-auto border-t border-line"
      tabIndex={0}
      role="region"
      aria-label={t.lists.riskTable}
    >
      <table className="w-full text-left text-base">
        <caption className="sr-only">{t.lists.riskTable}</caption>
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="px-4 py-3 font-bold">
              {t.lists.concelho}
            </th>
            <th scope="col" className="px-4 py-3 font-bold">
              {t.lists.today}
            </th>
            <th scope="col" className="px-4 py-3 font-bold">
              {t.lists.tomorrow}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.dico} className="border-b border-line last:border-0">
              <th
                scope="row"
                aria-current={r.dico === current ? "page" : undefined}
                className={r.dico === current ? "px-4 py-2.5 font-bold" : "px-4 py-2.5 font-normal"}
              >
                {(() => {
                  const c = link && r.dico !== current ? concelhoForDico(r.dico) : undefined;
                  const label = t.concelhoName(r.dico, r.name);
                  return c ? <Link href={path(`/${c.district}/${c.slug}`)}>{label}</Link> : label;
                })()}
              </th>
              <td className="px-4 py-2.5">
                <RiskCell level={r.today} />
              </td>
              <td className="px-4 py-2.5">
                <RiskCell level={r.tomorrow} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
