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
        "flex size-10 shrink-0 items-center justify-center rounded-sm",
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
}: {
  topics: Topic[];
  /** Para onde leva cada linha (na página inicial, às páginas de cada tema). */
  hrefFor?: (id: Topic["id"]) => string;
}) {
  return (
    <ul className="flex flex-col border-t border-stage-line">
      {topics.map((t) => (
        <li key={t.id} className="border-b border-stage-line">
          <Link
            href={hrefFor(t.id)}
            className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 py-3 no-underline"
          >
            <LevelMark level={t.level} />
            <span className="flex min-w-0 flex-col">
              <span className="text-sm text-stage-ink-2">{t.label}</span>
              <span className="font-display text-2xl leading-tight font-bold text-stage-ink">
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
    <div className="lower-third lower-third-in flex min-h-16 items-stretch overflow-hidden rounded-sm bg-stage-ink text-ink-on-land shadow-[0_10px_30px_-12px_rgb(0_0_0/0.55)]">
      <span
        className={cn(
          "flex shrink-0 flex-col items-center justify-center gap-1 px-3 font-display text-base font-bold sm:min-w-44 sm:flex-row sm:justify-start sm:gap-2 sm:px-4 sm:text-lg",
          levelBlock[level],
        )}
      >
        <Icon aria-hidden className="size-5" strokeWidth={2.4} />
        {levelLabel}
      </span>
      <div
        key={captionKey}
        className="caption-in flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5"
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
              className={cn(
                "flex size-5 items-center justify-center rounded-[3px] ring-1 ring-white/70",
                levelBlock[l],
              )}
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
            <span aria-hidden className="size-3.5 rounded-full bg-[var(--fire)] ring-2 ring-white" />
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
