import type { District } from "@/data/districts";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locales";
import type { CountryState } from "@/lib/state/aggregate";
import { groupWarnings } from "@/lib/state/bulletin";
import { capitalize } from "@/lib/time/format";

import { absoluteTime, escapeXml, rssDocument, type FeedItem } from "./rss";

/*
 * Feed dos avisos do IPMA, nacional (/avisos/rss) ou de um distrito
 * (/lisboa/avisos/rss). Um item por aviso diferente e por janela de
 * tempo, como na página: o mesmo texto para 18 distritos é um item só,
 * com os locais. O guid muda quando o aviso muda (nível, texto, janela ou
 * locais), para o leitor o mostrar como novo.
 */

export function buildWarningsFeed({
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
  const generated = new Date(state.generatedAt);
  const warnings = (state.warnings.data ?? []).filter(
    (w) => w.severity !== "none" && (!district || w.place.district === district.slug),
  );

  const items: FeedItem[] = groupWarnings(warnings).flatMap((group) =>
    group.windows.map((window) => {
      const region = window.items[0]!.place.region;
      const areas = [...new Set(window.items.map((w) => t.areaName(w.area)))].sort((a, b) =>
        a.localeCompare(b, "pt"),
      );
      const severity = group.severity as Exclude<typeof group.severity, "none">;
      const title = `${t.feed.item(t.levelAdjective[severity], t.term(group.type).toLowerCase())} · ${areas.join(", ")}`;
      const range = t.feed.range(
        absoluteTime(window.startsAt, region, locale),
        absoluteTime(window.endsAt, region, locale),
      );
      // Um aviso futuro não tem data de publicação no futuro: fica a hora dos dados.
      const start = new Date(window.startsAt);
      return {
        title: capitalize(title),
        html: [
          `<p><strong>${escapeXml(range)}</strong></p>`,
          group.description ? `<p lang="pt-PT">${escapeXml(group.description)}</p>` : "",
          `<p>${escapeXml(t.feed.places)}: ${escapeXml(areas.join(", "))}.</p>`,
        ].join(""),
        guid: [
          group.type,
          group.severity,
          group.description ?? "",
          window.startsAt,
          window.endsAt,
          window.items
            .map((w) => w.area)
            .sort()
            .join(","),
        ].join("|"),
        date: start < generated ? start : generated,
        category: t.levels[group.severity],
      };
    }),
  );

  return rssDocument({
    topic: "avisos",
    locale,
    district,
    title: t.feed.title(where),
    description: t.feed.description(where),
    updated: generated,
    items,
  });
}
