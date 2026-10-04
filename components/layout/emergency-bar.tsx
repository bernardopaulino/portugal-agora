"use client";

import { Phone } from "lucide-react";

import { useI18n } from "@/lib/i18n/client";

export function EmergencyBar() {
  const { t } = useI18n();
  return (
    <div className="bg-ink text-bg dark:bg-surface-2 dark:text-ink">
      <p className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-1.5 text-sm sm:px-6">
        <Phone aria-hidden className="size-4 shrink-0" />
        <span>
          {t.emergency.before}{" "}
          <a
            href="tel:112"
            className="font-extrabold text-bg decoration-bg/60 dark:text-ink dark:decoration-ink/60"
          >
            112
          </a>
          {t.emergency.after}
        </span>
      </p>
    </div>
  );
}
