"use client";

import { Phone } from "lucide-react";

import { useI18n } from "@/lib/i18n/client";

export function EmergencyBar() {
  const { t } = useI18n();
  return (
    <div className="relative z-10 border-b border-line bg-bg-2 text-ink-2">
      <p className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-1.5 text-sm sm:px-6">
        <Phone aria-hidden className="size-4 shrink-0 text-accent" />
        <span>
          {t.emergency.before}{" "}
          <a href="tel:112" className="font-mono font-medium text-ink decoration-ink/50">
            112
          </a>
          {t.emergency.after}
        </span>
      </p>
    </div>
  );
}
