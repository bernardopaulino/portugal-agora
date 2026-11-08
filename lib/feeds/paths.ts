import type { District } from "@/data/districts";
import { localePath, type Locale } from "@/lib/i18n/locales";

/** Endereço público do feed RSS dos avisos: "/avisos/rss", "/en/lisboa/avisos/rss". */
export function feedPath(locale: Locale, district?: District): string {
  return localePath(locale, district ? `/${district.slug}/avisos/rss` : "/avisos/rss");
}
