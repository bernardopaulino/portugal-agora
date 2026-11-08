import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { useI18n } from "@/lib/i18n/client";
import type { Topic } from "@/lib/state/bulletin";
import { cn } from "@/lib/utils";

import { levels, type Level } from "../status/severity";

/** Fundo e texto de cada nível nas legendas (cor + ícone + palavra). */
export const levelBlock: Record<Level, string> = {
  none: "bg-[var(--land-none)] text-ink-on-land",
  yellow: "bg-[var(--land-yellow)] text-ink-on-land",
  orange: "bg-[var(--land-orange)] text-ink-on-land",
  red: "bg-[var(--land-red)] text-white",
  unknown: "bg-[var(--land-unknown)] text-ink-on-land",
  info: "bg-[var(--land-info)] text-ink-on-land",
};

/** Quadrado com o ícone do nível, para as linhas do boletim. */
export function LevelMark({ level, className }: { level: Level; className?: string }) {
  const Icon = levels[level].icon;
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl",
        levelBlock[level],
        className,
      )}
    >
      <Icon className="size-5" strokeWidth={2.4} />
    </span>
  );
}

/** As linhas do boletim: cada uma leva à secção com o detalhe. */
export function TopicList({
  topics,
  hrefFor = (id) => `#${id}`,
  compact = false,
}: {
  topics: Topic[];
  /** Linhas mais baixas, para o painel do boletim na página inicial. */
  compact?: boolean;
  /** Para onde leva cada linha (na página inicial, às páginas de cada tema). */
  hrefFor?: (id: Topic["id"]) => string;
}) {
  return (
    <ul className="cascade-in flex flex-col border-t border-stage-line">
      {topics.map((t, i) => (
        <li
          key={t.id}
          className="border-b border-stage-line"
          style={{ "--i": i } as React.CSSProperties}
        >
          <Link
            href={hrefFor(t.id)}
            className={cn(
              "lift-hover group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 no-underline",
              compact ? "py-2" : "py-3",
            )}
          >
            <LevelMark level={t.level} className={compact ? "size-8 rounded-lg" : undefined} />
            <span className="flex min-w-0 flex-col">
              <span className="text-sm text-stage-ink-2">{t.label}</span>
              <span
                className={cn(
                  "font-display leading-tight font-semibold tracking-[-0.02em] text-stage-ink",
                  compact ? "text-lg" : "text-2xl",
                )}
              >
                {t.value}
                {t.detail ? (
                  <span className="block font-sans text-base leading-snug font-normal text-stage-ink-2 sm:inline">
                    {" "}
                    {t.detail}
                  </span>
                ) : null}
              </span>
            </span>
            <ArrowRight
              aria-hidden
              className="size-5 text-stage-ink-2 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-stage-ink"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Barra de rodapé do boletim (lower third): bloco de cor com o nível à
 * esquerda e a legenda ao lado, numa barra clara sobre o palco.
 */
export function LowerThird({
  level,
  levelLabel,
  children,
  action,
  captionKey,
}: {
  level: Level;
  levelLabel: string;
  children: ReactNode;
  action?: ReactNode;
  /** Muda quando a legenda muda, para a animação curta de troca. */
  captionKey?: string;
}) {
  const Icon = levels[level].icon;
  return (
    // No telemóvel o nível fica numa pílula por cima da legenda (ao lado, o
    // texto ficava estreito e o bloco de cor esticava até à altura dele).
    <div className="lower-third lower-third-in flex min-h-16 flex-col gap-1 overflow-hidden rounded-2xl p-1.5 text-ink glass-strong sm:flex-row sm:items-stretch sm:gap-2">
      <span
        className={cn(
          "flex min-h-9 shrink-0 items-center gap-2 self-start rounded-xl px-3 font-display text-base font-semibold sm:min-w-40 sm:self-auto sm:px-4",
          levelBlock[level],
        )}
      >
        <Icon aria-hidden className="size-5" strokeWidth={2.4} />
        {levelLabel}
      </span>
      <div
        key={captionKey}
        className="caption-in flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 px-3 pt-1 pb-2.5 sm:px-4 sm:py-2.5"
        aria-live="polite"
      >
        {children}
        {/* No telemóvel a ação fica por baixo do texto, com alvo de toque de 44 px. */}
        {action ? (
          <div className="flex min-h-11 w-full items-center sm:hidden">{action}</div>
        ) : null}
      </div>
      {action ? (
        <div className="hidden min-h-11 shrink-0 items-center pr-4 sm:flex">{action}</div>
      ) : null}
    </div>
  );
}

/** Legenda do mapa: as quatro cores do IPMA e os pictogramas. */
export function MapLegend({ showMarkers = true }: { showMarkers?: boolean }) {
  const { t } = useI18n();
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-stage-ink-2">
      {(["none", "yellow", "orange", "red"] as const).map((l) => {
        const Icon = levels[l].icon;
        return (
          <li key={l} className="inline-flex items-center gap-2">
            <span
              aria-hidden
              className={cn("flex size-5 items-center justify-center rounded-md", levelBlock[l])}
            >
              <Icon className="size-3.5" strokeWidth={2.6} />
            </span>
            {t.levels[l]}
          </li>
        );
      })}
      {showMarkers ? (
        <>
          <li className="inline-flex items-center gap-2">
            <span
              aria-hidden
              className="size-3.5 rounded-full bg-[var(--fire)] ring-2 ring-white"
            />
            {t.stage.legendFire}
          </li>
          <li className="inline-flex items-center gap-2">
            <span aria-hidden className="size-3.5 rounded-full ring-2 ring-stage-accent" />
            {t.stage.legendQuake}
          </li>
        </>
      ) : null}
    </ul>
  );
}
