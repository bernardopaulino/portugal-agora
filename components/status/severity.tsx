"use client";

import {
  Activity,
  CircleCheck,
  CircleHelp,
  OctagonAlert,
  TriangleAlert,
  createLucideIcon,
  type LucideIcon,
} from "lucide-react";

import type { Severity } from "@/lib/sources/types";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/** Losango com ponto de exclamação: o símbolo do nível laranja, diferente do triângulo do amarelo. */
const DiamondAlert = createLucideIcon("diamond-alert", [
  [
    "path",
    {
      d: "M10.6 2.6a2 2 0 0 1 2.8 0l8 8a2 2 0 0 1 0 2.8l-8 8a2 2 0 0 1-2.8 0l-8-8a2 2 0 0 1 0-2.8Z",
      key: "d1",
    },
  ],
  ["path", { d: "M12 8v4", key: "d2" }],
  ["path", { d: "M12 16h.01", key: "d3" }],
]);

/** "info": evento sem gravidade (sismo pequeno, incêndio concluído). Não é "tudo bem", é só informação. */
export type Level = Severity | "unknown" | "info";

interface LevelStyle {
  word: string;
  icon: LucideIcon;
  /** Cor forte (barras, marcadores). */
  solid: string;
  /** Fundo suave + texto legível sobre ele. */
  soft: string;
  border: string;
}

/**
 * Cada nível tem cor, ícone de forma diferente e palavra — nunca só
 * cor, para quem não distingue cores.
 */
export const levels: Record<Level, LevelStyle> = {
  none: {
    word: "Sem aviso",
    icon: CircleCheck,
    solid: "bg-sev-none",
    soft: "bg-sev-none-bg text-sev-none-ink",
    border: "border-sev-none",
  },
  yellow: {
    word: "Amarelo",
    icon: TriangleAlert,
    solid: "bg-sev-yellow",
    soft: "bg-sev-yellow-bg text-sev-yellow-ink",
    border: "border-sev-yellow",
  },
  orange: {
    word: "Laranja",
    icon: DiamondAlert,
    solid: "bg-sev-orange",
    soft: "bg-sev-orange-bg text-sev-orange-ink",
    border: "border-sev-orange",
  },
  red: {
    word: "Vermelho",
    icon: OctagonAlert,
    solid: "bg-sev-red",
    soft: "bg-sev-red-bg text-sev-red-ink",
    border: "border-sev-red",
  },
  info: {
    word: "Informação",
    icon: Activity,
    solid: "bg-ink-2",
    soft: "bg-surface-2 text-ink",
    border: "border-ink-2",
  },
  unknown: {
    word: "Sem dados",
    icon: CircleHelp,
    solid: "bg-sev-unknown",
    soft: "bg-sev-unknown-bg text-sev-unknown-ink",
    border: "border-sev-unknown",
  },
};

/** Cores em hex para o mapa (MapLibre não lê variáveis CSS). */
export const mapColors: Record<"light" | "dark", Record<Level, string>> = {
  light: {
    none: "#2e7d4f",
    yellow: "#e8b000",
    orange: "#e0661b",
    red: "#c62828",
    unknown: "#7c8b94",
    info: "#44596a",
  },
  dark: {
    none: "#4caf73",
    yellow: "#f2c230",
    orange: "#f07a2e",
    red: "#ef5350",
    unknown: "#8d9ba3",
    info: "#a3b5bf",
  },
};

export function SeverityBadge({
  level,
  label,
  size = "md",
  className,
}: {
  level: Level;
  /** Texto alternativo ao nome do nível (ex.: "Em curso", "Moderada"). */
  label?: string;
  size?: "md" | "lg";
  className?: string;
}) {
  const { t } = useI18n();
  const style = levels[level];
  const Icon = style.icon;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full font-bold whitespace-nowrap",
        size === "lg" ? "px-3.5 py-1.5 text-base" : "px-2.5 py-0.5 text-sm",
        style.soft,
        className,
      )}
    >
      <Icon aria-hidden className={size === "lg" ? "size-5" : "size-4"} strokeWidth={2.4} />
      {label ?? t.levels[level]}
    </span>
  );
}
