import type { District } from "@/data/districts";
import { site } from "@/lib/config/site";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { intlLocale, localePath, type Locale } from "@/lib/i18n/locales";
import type { WarningEvent } from "@/lib/sources/types";
import type { CountryState } from "@/lib/state/aggregate";
import { feedPath } from "./paths";
import { groupWarnings } from "@/lib/state/bulletin";
import { capitalize, formatLongDate, formatTime, localDate } from "@/lib/time/format";

/*
 * Feed RSS 2.0 dos avisos do IPMA, nacional (/avisos/rss) ou de um
 * distrito (/lisboa/avisos/rss). Um item por aviso diferente e por janela
 * de tempo, como na página: o mesmo texto para 18 distritos é um item só,
 * com os locais. O guid muda quando o aviso muda (nível, texto, janela ou
 * locais), para o leitor o mostrar como novo. As horas são absolutas
 * ("domingo, 8 de novembro, 06:00"): um feed lê-se mais tarde, e "hoje"
 * deixaria de ser verdade.
 */

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

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
  const pagePath = localePath(locale, district ? `/${district.slug}/avisos` : "/avisos");
  const warnings = (state.warnings.data ?? []).filter(
    (w) => w.severity !== "none" && (!district || w.place.district === district.slug),
  );
  const generated = new Date(state.generatedAt);

  const when = (iso: string, w: WarningEvent) => {
    const region = w.place.region === "acores" ? "acores" : undefined;
    return `${formatLongDate(localDate(iso, region), locale)}, ${formatTime(iso, region)}`;
  };

  const items = groupWarnings(warnings).flatMap((group) =>
    group.windows.map((window) => {
      const first = window.items[0]!;
      const areas = [...new Set(window.items.map((w) => t.areaName(w.area)))].sort((a, b) =>
        a.localeCompare(b, "pt"),
      );
      const title = `${t.feed.item(t.levelAdjective[group.severity], t.term(group.type).toLowerCase())} · ${areas.join(", ")}`;
      const range = t.feed.range(when(window.startsAt, first), when(window.endsAt, first));
      const lines = [
        `<p><strong>${escape(range)}</strong></p>`,
        group.description ? `<p lang="pt-PT">${escape(group.description)}</p>` : "",
        `<p>${escape(t.feed.places)}: ${escape(areas.join(", "))}.</p>`,
      ];
      const guid = [
        group.type,
        group.severity,
        group.description ?? "",
        window.startsAt,
        window.endsAt,
        window.items
          .map((w) => w.area)
          .sort()
          .join(","),
      ].join("|");
      // Um aviso futuro não tem data de publicação no futuro: fica a hora dos dados.
      const pub = new Date(window.startsAt) < generated ? new Date(window.startsAt) : generated;
      return [
        "<item>",
        `<title>${escape(capitalize(title))}</title>`,
        `<link>${site.url}${pagePath}</link>`,
        `<guid isPermaLink="false">${escape(guid)}</guid>`,
        `<pubDate>${pub.toUTCString()}</pubDate>`,
        `<category>${escape(t.levels[group.severity])}</category>`,
        `<description>${escape(lines.join(""))}</description>`,
        "</item>",
      ].join("");
    }),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">`,
    "<channel>",
    `<title>${escape(t.feed.title(where))}</title>`,
    `<link>${site.url}${pagePath}</link>`,
    `<atom:link href="${site.url}${feedPath(locale, district)}" rel="self" type="application/rss+xml"/>`,
    `<description>${escape(t.feed.description(where))}</description>`,
    `<language>${intlLocale[locale]}</language>`,
    `<lastBuildDate>${generated.toUTCString()}</lastBuildDate>`,
    "<ttl>15</ttl>",
    ...items,
    "</channel>",
    "</rss>",
  ].join("\n");
}
