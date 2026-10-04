import { MapPin } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { SeverityBadge, type Level } from "../status/severity";

/**
 * Linha de evento numa lista com filetes: nível e título, linha de
 * contexto e, se tiver onShow, um botão "Ver no mapa" (a lista é o
 * caminho acessível; o mapa é complementar).
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
        "flex scroll-mt-24 flex-col gap-3 border-b border-line py-4 sm:flex-row sm:items-start sm:gap-6",
        selected && "bg-surface-2",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <SeverityBadge level={level} label={badge} />
          <h3 className="font-display text-xl leading-tight font-bold">{title}</h3>
        </div>
        {meta ? <div className="text-base text-ink-2">{meta}</div> : null}
        {children}
      </div>
      {onShow ? (
        <button
          type="button"
          onClick={onShow}
          aria-pressed={selected}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 self-start rounded-sm px-2 text-base font-bold text-accent underline-offset-4 hover:underline"
        >
          <MapPin aria-hidden className="size-4" />
          Ver no mapa
        </button>
      ) : null}
    </li>
  );
}
