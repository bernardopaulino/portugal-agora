"use client";

import type { ReactNode } from "react";

import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

import { SeverityBadge, type Level } from "./status/severity";

/*
 * O resumo da página do concelho: um mosaico por tema (avisos, risco de
 * incêndio, tempo, ar, incêndios e sismos perto), para se perceber num
 * relance se está tudo bem. Cada mosaico leva à sua secção.
 */

export interface SummaryTile {
  id: string;
  label: string;
  /** Nível para o selo (cor + ícone + palavra); sem nível, só o texto. */
  level?: Level;
  levelLabel?: string;
  value?: ReactNode;
  detail?: ReactNode;
  /** Âncora da secção com o pormenor. */
  href?: string;
}

export function ConcelhoSummary({ tiles }: { tiles: SummaryTile[] }) {
  const { t } = useI18n();
  return (
    <section aria-labelledby="resumo-titulo" className="flex flex-col gap-4 lg:h-full">
      <h2 id="resumo-titulo" className="kicker">
        {t.concelho.summaryTitle}
      </h2>
      <ul className="grid flex-1 auto-rows-fr grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((tile) => {
          const body = (
            <>
              <span className="text-sm [overflow-wrap:anywhere] text-ink-2">{tile.label}</span>
              {tile.level ? (
                <SeverityBadge
                  level={tile.level}
                  label={tile.levelLabel}
                  className="max-w-full self-start max-[359px]:whitespace-normal"
                />
              ) : null}
              {tile.value !== undefined ? (
                <span className="font-display text-xl leading-tight font-semibold [overflow-wrap:anywhere] min-[360px]:text-2xl">
                  {tile.value}
                </span>
              ) : null}
              {tile.detail ? (
                <span className="text-sm [overflow-wrap:anywhere] text-ink-2">{tile.detail}</span>
              ) : null}
            </>
          );
          const box = "flex h-full min-w-0 flex-col gap-2 rounded-2xl p-3 glass min-[360px]:p-4";
          return (
            <li key={tile.id} className="min-w-0">
              {tile.href ? (
                <a
                  href={tile.href}
                  className={cn(box, "text-ink no-underline transition-colors hover:bg-ink/5")}
                >
                  {body}
                </a>
              ) : (
                <div className={box}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
