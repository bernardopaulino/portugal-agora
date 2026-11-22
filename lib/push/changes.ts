import { getDistrict } from "@/data/districts";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { localePath, type Locale } from "@/lib/i18n/locales";
import type { EarthquakeEvent, FireEvent, Severity } from "@/lib/sources/types";
import type { CountryState } from "@/lib/state/aggregate";
import { warningTypes } from "@/lib/state/bulletin";
import { formatNumber, formatTime } from "@/lib/time/format";

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
          body: `${t.headline.districtLevel(c.to, warningTypes(warnings, t), t.inPlace(district))} ${t.push.source}`,
          url: localePath(subscriber.locale, `/${c.slug}/avisos`),
          tag: `aviso-${c.slug}`,
        },
      ];
    });
}

/*
 * Incêndios e sismos, para quem os escolheu: uma notificação por ocorrência,
 * só nos distritos escolhidos. Incêndios: os que a ANEPC assinala como
 * importantes ou com muitos operacionais (os pequenos são dezenas por dia no
 * verão). Sismos: os sentidos.
 */

/** A partir daqui, um incêndio ativo notifica mesmo sem a ANEPC o assinalar. */
export const FIRE_NOTIFY_OPERATIVES = 50;
/** Ocorrências já notificadas que se guardam (as mais recentes). */
const SEEN_MAX = 300;

export interface NotableEvent {
  id: string;
  district: string;
  event: FireEvent | EarthquakeEvent;
}

export interface EventSubscriber extends Subscriber {
  fires?: boolean;
  quakes?: boolean;
}

export function notableEvents(state: CountryState): NotableEvent[] {
  const fires = (state.fires.data ?? []).filter(
    (f) => f.active && (f.severity === "red" || f.operatives >= FIRE_NOTIFY_OPERATIVES),
  );
  const quakes = (state.earthquakes.data ?? []).filter((q) => q.felt);
  return [...fires, ...quakes].flatMap((event) =>
    event.place.district ? [{ id: event.id, district: event.place.district, event }] : [],
  );
}

/**
 * As ocorrências novas desde a última vez. Sem registo anterior (a primeira
 * vez), nada é novo: não se notifica o que já lá estava.
 */
export function freshEvents(
  seen: string[] | null,
  current: NotableEvent[],
): { fresh: NotableEvent[]; seen: string[] } {
  const known = new Set(seen ?? current.map((e) => e.id));
  const fresh = seen ? current.filter((e) => !known.has(e.id)) : [];
  const next = [...fresh.map((e) => e.id), ...(seen ?? current.map((e) => e.id))];
  return { fresh, seen: [...new Set(next)].slice(0, SEEN_MAX) };
}

export function eventNotificationsFor(
  subscriber: EventSubscriber,
  events: NotableEvent[],
): PushPayload[] {
  const t = getDictionary(subscriber.locale);
  return events
    .filter((e) => subscriber.districts.includes(e.district))
    .flatMap(({ event, district: slug }): PushPayload[] => {
      const district = getDistrict(slug);
      if (!district) return [];
      if (event.kind === "fire") {
        if (!subscriber.fires) return [];
        return [
          {
            title: t.push.fireTitle(event.place.label),
            body: `${t.push.fireBody(t.term(event.status), event.operatives, t.inPlace(district))} ${t.push.fireSource}`,
            url: localePath(subscriber.locale, `/${slug}/incendios`),
            tag: event.id,
          },
        ];
      }
      if (!subscriber.quakes) return [];
      return [
        {
          title: t.push.quakeTitle(formatNumber(event.magnitude, 1, subscriber.locale)),
          body: `${t.push.quakeBody(event.place.label, formatTime(event.occurredAt, event.place.region))} ${t.push.source}`,
          url: localePath(subscriber.locale, `/${slug}/sismos`),
          tag: event.id,
        },
      ];
    });
}
