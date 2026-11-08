"use client";

import { useNow } from "@/lib/hooks/external";
import { useStateRefreshing } from "@/lib/hooks/live-state";
import { useI18n } from "@/lib/i18n/client";
import type { CountryState } from "@/lib/state/aggregate";
import type { TopicId } from "@/lib/state/bulletin";
import { capitalize, formatLongDate, formatTime, localDate } from "@/lib/time/format";

import { RelativeTime } from "../status/relative-time";
import type { MapLevel, MapMarker } from "./bulletin-map";

const WEEK = 7 * 86_400_000;
/** HTML mais velho do que isto já não é o de getPageState (15 min): veio do deploy. */
const OLD_HTML_MS = 20 * 60_000;

/** Página de cada linha do boletim nacional. */
export const topicPage: Record<TopicId, string> = {
  avisos: "/avisos",
  incendios: "/incendios",
  sismos: "/sismos",
  risco: "/risco",
  ar: "/risco",
};

/** Carimbo do boletim: "Domingo, 4 de outubro · 16:07 · atualizado há 1 min". */
export function BulletinStamp({ iso }: { iso: string }) {
  const { locale, t } = useI18n();
  const now = useNow();
  const refreshing = useStateRefreshing();
  // A CDN às vezes entrega o HTML gerado no deploy, com dados de há dias, e o
  // estado atual chega logo a seguir por /api/state. Enquanto chega, não se
  // mostra a hora antiga como se fosse a atual. Se o pedido falhar, volta a
  // hora antiga com o "atualizado há…", que diz a idade verdadeira.
  if (refreshing && now !== null && now - Date.parse(iso) > OLD_HTML_MS) {
    return (
      <p
        role="status"
        className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[0.8rem] tracking-[0.08em] text-stage-ink-2 uppercase"
      >
        <span aria-hidden className="size-2 rounded-full bg-stage-ink-2" />
        <span className="text-stage-ink">{t.stage.refreshing}</span>
      </p>
    );
  }
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[0.8rem] tracking-[0.08em] text-stage-ink-2 uppercase">
      <span aria-hidden className="size-2 rounded-full bg-accent shadow-[0_0_12px_var(--accent)]" />
      <time dateTime={iso} className="text-stage-ink">
        {t.stage.stamp(
          capitalize(formatLongDate(localDate(iso), locale).replace("-feira", "")),
          formatTime(iso),
        )}
      </time>
      <span>
        · {t.stage.updated} <RelativeTime iso={iso} />
      </span>
    </p>
  );
}

/** Níveis por distrito para o mapa ("unknown" quando os avisos falharam). */
export function mapLevels(state: CountryState): Record<string, MapLevel> {
  return Object.fromEntries(
    Object.values(state.districts).map((s) => [s.slug, state.levelKnown ? s.level : "unknown"]),
  );
}

/** Incêndios em curso e sismos sentidos (7 dias) como pictogramas no mapa. */
export function mapMarkers(state: CountryState, district?: string): MapMarker[] {
  const since = new Date(state.generatedAt).getTime() - WEEK;
  const fires: MapMarker[] = (state.fires.data ?? [])
    .filter((f) => f.active && f.coordinates && (!district || f.place.district === district))
    .map((f) => ({
      id: f.id,
      kind: "fire",
      coordinates: f.coordinates!,
      region: f.place.region,
    }));
  const quakes: MapMarker[] = (state.earthquakes.data ?? [])
    .filter(
      (q) =>
        q.felt &&
        q.coordinates &&
        q.place.district &&
        new Date(q.occurredAt).getTime() >= since &&
        (!district || q.place.district === district),
    )
    .map((q) => ({
      id: q.id,
      kind: "quake",
      coordinates: q.coordinates!,
      region: q.place.region,
      magnitude: q.magnitude,
    }));
  return [...quakes, ...fires];
}
