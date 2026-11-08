import type { District } from "@/data/districts";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locales";
import type { CountryState } from "@/lib/state/aggregate";
import { isNotableQuake } from "@/lib/state/bulletin";
import { capitalize, formatNumber } from "@/lib/time/format";

import { absoluteTime, escapeXml, rssDocument, type FeedItem } from "./rss";

/*
 * Feed dos sismos (IPMA), dos últimos 7 dias. No país, só os sentidos ou
 * em território português, como a lista da página por omissão (os de
 * Espanha e do Atlântico ficariam a encher o leitor); num distrito, os
 * do distrito.
 */

export function buildQuakesFeed({
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
  const quakes = (state.earthquakes.data ?? []).filter((q) =>
    district ? q.place.district === district.slug : isNotableQuake(q),
  );

  const items: FeedItem[] = quakes.map((q) => {
    const magnitude = t.lists.magnitude(formatNumber(q.magnitude, 1, locale));
    const depth = q.depthKm === null ? null : Math.round(q.depthKm);
    return {
      title: `${magnitude} · ${capitalize(t.term(q.place.label))}${q.felt ? ` · ${t.feed.felt}` : ""}`,
      html: [
        q.felt ? `<p><strong>${escapeXml(t.lists.felt.trim())}</strong></p>` : "",
        `<p>${escapeXml(t.lists.quakeMeta(capitalize(absoluteTime(q.occurredAt, q.place.region, locale)), depth, q.intensity))}</p>`,
      ].join(""),
      guid: q.id,
      date: new Date(q.occurredAt),
      category: magnitude,
    };
  });

  return rssDocument({
    topic: "sismos",
    locale,
    district,
    title: t.feed.quakesTitle(where),
    description: t.feed.quakesDescription(where),
    updated: new Date(state.generatedAt),
    items,
  });
}
