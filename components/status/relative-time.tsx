"use client";

import type { Region } from "@/data/districts";
import { useNow } from "@/lib/hooks/external";
import { useI18n } from "@/lib/i18n/client";
import { formatRelative, formatTime } from "@/lib/time/format";

/**
 * Mostra "às 16:15" no servidor (determinístico) e, no browser,
 * "há 3 min", atualizado a cada 30 segundos. A hora exata fica no title.
 */
export function RelativeTime({ iso, region }: { iso: string; region?: Region }) {
  const now = useNow();
  const { locale } = useI18n();
  const absolute = `${locale === "pt" ? "às" : "at"} ${formatTime(iso, region)}`;
  return (
    <time dateTime={iso} title={absolute}>
      {now ? formatRelative(iso, new Date(now), locale) : absolute}
    </time>
  );
}
