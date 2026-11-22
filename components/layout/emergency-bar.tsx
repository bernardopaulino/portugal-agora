"use client";

import { Phone, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { useLiveState } from "@/lib/hooks/live-state";
import { useI18n } from "@/lib/i18n/client";
import type { CountryState } from "@/lib/state/aggregate";
import { cn } from "@/lib/utils";

/** Um dia mau: aviso vermelho em algum distrito ou um incêndio que a ANEPC assinala como importante. */
export function isBadDay(state: CountryState | null): boolean {
  if (!state) return false;
  const red = state.levelKnown && state.level === "red";
  const majorFire = (state.fires.data ?? []).some((f) => f.active && f.severity === "red");
  return red || majorFire;
}

/**
 * A barra do 112, em todas as páginas, com "O que fazer" (a página de
 * emergência). Num dia mau fica em destaque, a vermelho.
 */
export function EmergencyBar() {
  const { t, path } = useI18n();
  const bad = isBadDay(useLiveState());
  const Icon = bad ? TriangleAlert : Phone;
  return (
    <div
      className={cn(
        "relative z-10 border-b",
        bad ? "border-sev-red bg-sev-red-bg text-sev-red-ink" : "border-line bg-bg-2 text-ink-2",
      )}
    >
      <p className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-1.5 text-sm sm:px-6">
        <Icon aria-hidden className={cn("size-4 shrink-0", bad ? "text-sev-red" : "text-accent")} />
        <span>
          {bad ? `${t.emergency.badDay} ` : null}
          {t.emergency.before}{" "}
          <a href="tel:112" className="font-mono font-medium text-ink decoration-ink/50">
            112
          </a>
          {t.emergency.after}{" "}
          <Link href={path("/emergencia")} className="font-semibold whitespace-nowrap text-ink">
            {t.emergency.whatToDo}
          </Link>
        </span>
      </p>
    </div>
  );
}
