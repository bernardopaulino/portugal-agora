import Link from "next/link";
import type { ReactNode } from "react";

import type { Severity } from "@/lib/sources/types";
import { cn } from "@/lib/utils";

import { RelativeTime } from "./relative-time";
import { levels, SeverityBadge, type Level } from "./severity";

const bandLabel: Record<Level, string> = {
  none: "Sem avisos",
  yellow: "Aviso amarelo",
  orange: "Aviso laranja",
  red: "Aviso vermelho",
  unknown: "Sem dados do IPMA",
  info: "Informação",
};

const bandTint: Record<Level, string> = {
  none: "bg-sev-none-bg",
  yellow: "bg-sev-yellow-bg",
  orange: "bg-sev-orange-bg",
  red: "bg-sev-red-bg",
  unknown: "bg-sev-unknown-bg",
  info: "bg-surface-2",
};

/**
 * O elemento principal do site: a faixa com o estado atual, que assume
 * a cor do nível de aviso mais alto. Responde em segundos à pergunta
 * "está tudo bem?".
 */
export function StatusBand({
  level,
  levelKnown,
  headline,
  summary,
  updatedAt,
  titleAs: Title = "h1",
  children,
}: {
  level: Severity;
  levelKnown: boolean;
  headline: string;
  summary: string[];
  updatedAt: string;
  titleAs?: "h1" | "h2";
  children?: ReactNode;
}) {
  const shown: Level = levelKnown ? level : "unknown";
  return (
    <div className={cn("border-b border-line", bandTint[shown])}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div
          className={cn(
            "flex flex-col gap-4 border-l-[10px] py-7 pl-5 sm:py-9 sm:pl-7",
            levels[shown].border,
          )}
          aria-live="polite"
          aria-atomic="true"
        >
          <SeverityBadge
            level={shown}
            label={bandLabel[shown]}
            size="lg"
            className="self-start bg-surface/70 dark:bg-bg/40"
          />
          <Title className="max-w-[26ch] text-display font-extrabold text-ink">{headline}</Title>
          {summary.length > 0 ? (
            <ul className="flex max-w-3xl flex-col gap-1 text-lg text-ink sm:text-xl">
              {summary.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
          <p className="text-base text-ink-2">
            Atualizado <RelativeTime iso={updatedAt} />. O nível segue o aviso mais alto do IPMA em
            vigor ou previsto. <Link href="/fontes#niveis">Como lemos os dados</Link>
          </p>
          {children}
        </div>
      </div>
    </div>
  );
}
