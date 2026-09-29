import { MapPin } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { levels, SeverityBadge, type Level } from "../status/severity";

/**
 * Linha de evento: marca de severidade à esquerda, conteúdo à direita.
 * Se tiver onShow, mostra um botão "Ver no mapa" (a lista é o caminho
 * acessível; o mapa é complementar).
 */
export function EventRow({
  level,
  badge,
  title,
  meta,
  children,
  selected,
  onShow,
  id,
}: {
  level: Level;
  badge?: string;
  title: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
  selected?: boolean;
  onShow?: () => void;
  id?: string;
}) {
  return (
    <li
      id={id}
      className={cn(
        "relative flex scroll-mt-24 flex-col gap-3 rounded-lg bg-surface py-4 pr-4 pl-5 transition-shadow sm:flex-row sm:gap-4",
        selected && "ring-3 ring-accent",
      )}
    >
      <span
        aria-hidden
        className={cn("absolute inset-y-3 left-0 w-1.5 rounded-r-full", levels[level].solid)}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <SeverityBadge level={level} label={badge} />
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        {meta ? <div className="text-base text-ink-2">{meta}</div> : null}
        {children}
      </div>
      {onShow ? (
        <button
          type="button"
          onClick={onShow}
          aria-pressed={selected}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 self-start rounded-full border border-line px-3 text-sm font-bold text-ink hover:bg-surface-2"
        >
          <MapPin aria-hidden className="size-4" />
          Ver no mapa
        </button>
      ) : null}
    </li>
  );
}
