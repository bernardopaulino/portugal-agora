import { getDistrict } from "@/data/districts";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { localePath, type Locale } from "@/lib/i18n/locales";
import type { Severity } from "@/lib/sources/types";
import type { CountryState } from "@/lib/state/aggregate";
import { warningTypes } from "@/lib/state/bulletin";

/*
 * Quando notificar: o nível de um distrito (o aviso mais alto em vigor ou
 * previsto) sobe e chega ao limiar que a pessoa escolheu. Descidas não
 * notificam: a ideia é avisar, não narrar o tempo todo.
 */

export type Threshold = Exclude<Severity, "none">;

export interface Subscriber {
  districts: string[];
  min: Threshold;
  locale: Locale;
}

export interface Rise {
  slug: string;
  from: Severity;
  to: Severity;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  /** Uma notificação por distrito: a nova substitui a anterior. */
  tag: string;
}

const rank: Record<Severity, number> = { none: 0, yellow: 1, orange: 2, red: 3 };

/** Níveis por distrito, ou null quando os avisos falharam (não se compara nada). */
export function levelsOf(state: CountryState): Record<string, Severity> | null {
  if (!state.levelKnown) return null;
  return Object.fromEntries(Object.values(state.districts).map((d) => [d.slug, d.level]));
}

export function rises(prev: Record<string, Severity>, next: Record<string, Severity>): Rise[] {
  return Object.entries(next)
    .filter(([slug, to]) => prev[slug] !== undefined && rank[to] > rank[prev[slug]!])
    .map(([slug, to]) => ({ slug, from: prev[slug]!, to }));
}

export function notificationsFor(
  subscriber: Subscriber,
  changes: Rise[],
  state: CountryState,
): PushPayload[] {
  const t = getDictionary(subscriber.locale);
  return changes
    .filter((c) => subscriber.districts.includes(c.slug) && rank[c.to] >= rank[subscriber.min])
    .flatMap((c) => {
      const district = getDistrict(c.slug);
      if (!district || c.to === "none") return [];
      const warnings = (state.warnings.data ?? []).filter(
        (w) => w.place.district === c.slug && w.severity === c.to,
      );
      return [
        {
          title: t.push.title(t.districtName(district), t.levelAdjective[c.to]),
          body: t.headline.districtLevel(c.to, warningTypes(warnings, t), t.inPlace(district)),
          url: localePath(subscriber.locale, `/${c.slug}/avisos`),
          tag: `aviso-${c.slug}`,
        },
      ];
    });
}
