import { logoOutline } from "@/data/map-shapes";
import type { Severity } from "@/lib/sources/types";
import { cn } from "@/lib/utils";

const dotFill: Record<Severity | "unknown", string> = {
  none: "var(--land-none)",
  yellow: "var(--land-yellow)",
  orange: "var(--land-orange)",
  red: "var(--land-red)",
  unknown: "var(--land-unknown)",
};

/**
 * O logótipo: o contorno do continente com um ponto de sinal na cor do
 * nível de aviso do país (verde, amarelo, laranja, vermelho). O contorno
 * vem dos limites da CAOP (scripts/build-map-shapes.mjs).
 */
export function LogoMark({
  level = "none",
  className,
}: {
  level?: Severity | "unknown";
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      viewBox={`-3 -2 ${logoOutline.width + 18} 104`}
      className={cn("h-10 w-auto shrink-0", className)}
    >
      <path d={logoOutline.d} fill="var(--ink)" />
      <circle
        cx={logoOutline.width - 4}
        cy="49"
        r="11.5"
        fill={dotFill[level]}
        stroke="var(--surface)"
        strokeWidth="4.5"
      />
    </svg>
  );
}
