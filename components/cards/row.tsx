"use client";

import { MapPin } from "lucide-react";
import type { ReactNode } from "react";

import { useI18n } from "@/lib/i18n/client";
import { reveal } from "@/lib/motion/reveal";
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
  const { t } = useI18n();
  return (
    <li
      id={id}
      data-live-key={id}
      ref={reveal}
      className={cn(
        "-mx-3 flex scroll-mt-28 flex-col gap-3 rounded-xl border-b border-line px-3 py-4 transition-colors sm:flex-row sm:items-start sm:gap-6",
        selected && "border-transparent bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <SeverityBadge level={level} label={badge} />
          <h3 className="font-display text-xl leading-tight font-semibold tracking-[-0.02em]">
            {title}
          </h3>
        </div>
        {meta ? <div className="text-base text-ink-2">{meta}</div> : null}
        {children}
      </div>
      {onShow ? (
        <button
          type="button"
          onClick={onShow}
          aria-pressed={selected}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 self-start rounded-full border border-glass-line px-4 font-display text-base font-medium text-accent no-underline hover:border-accent hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] aria-pressed:border-accent"
        >
          <MapPin aria-hidden className="size-4" />
          {t.lists.showMap}
        </button>
      ) : null}
    </li>
  );
}
