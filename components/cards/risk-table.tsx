import { fireRiskLabels } from "@/lib/sources/ipma-rcm";
import type { ConcelhoRisk } from "@/lib/state/district";

import { riskColors } from "./fire-risk";

function RiskCell({ level }: { level: number }) {
  if (!level) return <span className="text-ink-2">Sem dados</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className="size-3.5 shrink-0 rounded-sm"
        style={{ background: riskColors[level] }}
      />
      {fireRiskLabels[level]}
    </span>
  );
}

export function RiskTable({ rows }: { rows: ConcelhoRisk[] }) {
  return (
    // Focável para quem usa teclado conseguir deslocar a tabela em ecrãs estreitos.
    <div
      className="overflow-x-auto border-t border-line"
      tabIndex={0}
      role="region"
      aria-label="Tabela de risco de incêndio por concelho"
    >
      <table className="w-full text-left text-base">
        <caption className="sr-only">Risco de incêndio por concelho, hoje e amanhã</caption>
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="px-4 py-3 font-bold">
              Concelho
            </th>
            <th scope="col" className="px-4 py-3 font-bold">
              Hoje
            </th>
            <th scope="col" className="px-4 py-3 font-bold">
              Amanhã
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.dico} className="border-b border-line last:border-0">
              <th scope="row" className="px-4 py-2.5 font-normal">
                {r.name}
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
