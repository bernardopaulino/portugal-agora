import type { District } from "@/data/districts";
import { localePath, type Locale } from "@/lib/i18n/locales";

export const FEED_TOPICS = ["avisos", "incendios", "sismos"] as const;
export type FeedTopic = (typeof FEED_TOPICS)[number];

/** Página de um tema: "/avisos", "/lisboa/sismos". */
export function topicPath(topic: FeedTopic, district?: District): string {
  return district ? `/${district.slug}/${topic}` : `/${topic}`;
}

/** Endereço público do feed RSS de um tema: "/avisos/rss", "/en/lisboa/sismos/rss". */
export function feedPath(locale: Locale, topic: FeedTopic, district?: District): string {
  return localePath(locale, `${topicPath(topic, district)}/rss`);
}
