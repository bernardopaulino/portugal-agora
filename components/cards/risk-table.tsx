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
  const name = (r: ConcelhoRisk) => {
    const c = link && r.dico !== current ? concelhoForDico(r.dico) : undefined;
    const label = t.concelhoName(r.dico, r.name);
    return c ? <Link href={path(`/${c.district}/${c.slug}`)}>{label}</Link> : label;
  };
  return (
    <>
      {/*
       * Telemóvel: três colunas não cabem (o "Amanhã" ficava cortado e os nomes
       * partiam em três linhas). Cada concelho é uma linha, com hoje e amanhã
       * lado a lado por baixo. A tabela (escondida aqui) volta a partir de 640px.
       */}
      <ul aria-label={t.lists.riskTable} className="border-t border-line sm:hidden">
        {rows.map((r) => (
          <li
            key={r.dico}
            aria-current={r.dico === current ? "page" : undefined}
            className="flex flex-col gap-1 border-b border-line py-2.5 last:border-0"
          >
            <span className={r.dico === current ? "font-bold" : undefined}>{name(r)}</span>
            <dl className="grid grid-cols-2 gap-x-4 text-base">
              <div className="flex flex-col">
                <dt className="text-sm text-ink-2">{t.lists.today}</dt>
                <dd>
                  <RiskCell level={r.today} />
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="text-sm text-ink-2">{t.lists.tomorrow}</dt>
                <dd>
                  <RiskCell level={r.tomorrow} />
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
      <RiskGrid rows={rows} current={current} name={name} />
    </>
  );
}

function RiskGrid({
  rows,
  current,
  name,
}: {
  rows: ConcelhoRisk[];
  current?: string;
  name: (r: ConcelhoRisk) => React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    // Focável para quem usa teclado conseguir deslocar a tabela em ecrãs estreitos.
    <div
      className="hidden overflow-x-auto border-t border-line sm:block"
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
                {name(r)}
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
