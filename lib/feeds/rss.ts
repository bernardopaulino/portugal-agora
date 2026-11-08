import type { District } from "@/data/districts";
import { site } from "@/lib/config/site";
import { intlLocale, localePath, type Locale } from "@/lib/i18n/locales";
import type { Region } from "@/data/districts";
import { formatLongDate, formatTime, localDate } from "@/lib/time/format";

import { feedPath, topicPath, type FeedTopic } from "./paths";

/*
 * Peças comuns dos feeds RSS 2.0 (avisos, incêndios, sismos). As horas são
 * absolutas ("domingo, 8 de novembro, 06:00"): um feed lê-se mais tarde,
 * e "hoje" deixaria de ser verdade.
 */

export const escapeXml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** "domingo, 8 de novembro, 06:00" (hora dos Açores nos Açores). */
export function absoluteTime(iso: string, region: Region | undefined, locale: Locale): string {
  const zone = region === "acores" ? "acores" : undefined;
  return `${formatLongDate(localDate(iso, zone), locale)}, ${formatTime(iso, zone)}`;
}

export interface FeedItem {
  title: string;
  /** Texto em HTML simples (vai escapado dentro de <description>). */
  html: string;
  guid: string;
  date: Date;
  category?: string;
}

export function rssDocument({
  topic,
  locale,
  district,
  title,
  description,
  updated,
  items,
}: {
  topic: FeedTopic;
  locale: Locale;
  district?: District;
  title: string;
  description: string;
  updated: Date;
  items: FeedItem[];
}): string {
  const link = `${site.url}${localePath(locale, topicPath(topic, district))}`;
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">`,
    "<channel>",
    `<title>${escapeXml(title)}</title>`,
    `<link>${link}</link>`,
    `<atom:link href="${site.url}${feedPath(locale, topic, district)}" rel="self" type="application/rss+xml"/>`,
    `<description>${escapeXml(description)}</description>`,
    `<language>${intlLocale[locale]}</language>`,
    `<lastBuildDate>${updated.toUTCString()}</lastBuildDate>`,
    "<ttl>15</ttl>",
    ...items.map((item) =>
      [
        "<item>",
        `<title>${escapeXml(item.title)}</title>`,
        `<link>${link}</link>`,
        `<guid isPermaLink="false">${escapeXml(item.guid)}</guid>`,
        `<pubDate>${item.date.toUTCString()}</pubDate>`,
        item.category ? `<category>${escapeXml(item.category)}</category>` : "",
        `<description>${escapeXml(item.html)}</description>`,
        "</item>",
      ].join(""),
    ),
    "</channel>",
    "</rss>",
  ].join("\n");
}
