import type { District } from "@/data/districts";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locales";
import type { CountryState } from "@/lib/state/aggregate";
import { capitalize } from "@/lib/time/format";

import { absoluteTime, escapeXml, rssDocument, type FeedItem } from "./rss";

/*
 * Feed dos incêndios (Fogos.pt): os que estão em curso, como a lista da
 * página por omissão. O guid inclui o estado, para uma mudança ("Em curso"
 * → "Em resolução") aparecer como novidade no leitor.
 */

export function buildFiresFeed({
  state,
  locale,
  district,
}: {
  state: CountryState;
  locale: Locale;
  district?: District;
}): string {
  const t = getDictionary(locale);
  const where = district ? t.inPlace(district) : t.feed.national;
  const fires = (state.fires.data ?? []).filter(
    (f) => f.severity !== "none" && (!district || f.place.district === district.slug),
  );

  const items: FeedItem[] = fires.map((f) => ({
    title: `${capitalize(t.term(f.status))} · ${f.place.label}`,
    html: [
      `<p><strong>${escapeXml(t.feed.fireStart(absoluteTime(f.startedAt, f.place.region, locale)))}</strong></p>`,
      `<p>${escapeXml(capitalize(t.term(f.nature)))}.</p>`,
      `<p>${escapeXml(t.lists.fireMeans(f.operatives, f.groundUnits, f.aerialUnits))}</p>`,
    ].join(""),
    guid: `${f.id}|${f.statusCode}`,
    date: new Date(f.startedAt),
    category: t.term(f.status),
  }));

  return rssDocument({
    topic: "incendios",
    locale,
    district,
    title: t.feed.firesTitle(where),
    description: t.feed.firesDescription(where),
    updated: new Date(state.generatedAt),
    items,
  });
}
