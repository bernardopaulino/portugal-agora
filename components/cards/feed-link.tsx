"use client";

import { Rss } from "lucide-react";

import type { District } from "@/data/districts";
import { feedPath, type FeedTopic } from "@/lib/feeds/paths";
import { useI18n } from "@/lib/i18n/client";

/** Ligação para o feed RSS de um tema (do país ou do distrito). */
export function FeedLink({ topic, district }: { topic: FeedTopic; district?: District }) {
  const { t, locale } = useI18n();
  return (
    <a
      href={feedPath(locale, topic, district)}
      type="application/rss+xml"
      className="inline-flex min-h-11 items-center gap-1.5 self-start text-base font-bold"
    >
      <Rss aria-hidden className="size-4" />
      {t.feed.subscribe[topic]}
    </a>
  );
}
