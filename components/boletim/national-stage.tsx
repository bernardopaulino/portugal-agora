"use client";

import { useI18n } from "@/lib/i18n/client";
import type { CountryState } from "@/lib/state/aggregate";
import type { TopicId } from "@/lib/state/bulletin";
import { capitalize, formatLongDate, formatTime, localDate } from "@/lib/time/format";

import { RelativeTime } from "../status/relative-time";
import type { MapLevel, MapMarker } from "./bulletin-map";

const WEEK = 7 * 86_400_000;

/** Página de cada linha do boletim nacional. */
export const topicPage: Record<TopicId, string> = {
  avisos: "/avisos",
  incendios: "/incendios",
  sismos: "/sismos",
  risco: "/risco",
  ar: "/risco",
};

/**
 * Carimbo do boletim: "Domingo, 4 de outubro · 16:07 · atualizado há 1 min".
 * Sem hora (o estado ainda não chegou do /api/state), "A atualizar os dados…".
 */
export function BulletinStamp({ iso }: { iso?: string }) {
  const { locale, t } = useI18n();
  if (!iso) {
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
  // Texto corrido em pedaços que não se partem, com o separador no fim de cada
  // um: a linha parte entre pedaços, o ponto fica com a data e nenhuma linha
  // começa por "·". No telemóvel a data fica numa linha e a hora na seguinte.
  return (
    <p className="font-mono text-[0.8rem] leading-relaxed tracking-[0.08em] text-stage-ink-2 uppercase">
      <time dateTime={iso} className="text-stage-ink">
        <span className="whitespace-nowrap max-sm:block">
          <span
            aria-hidden
            className="mr-2 inline-block size-2 rounded-full bg-accent align-middle shadow-[0_0_12px_var(--accent)]"
          />
          {capitalize(formatLongDate(localDate(iso), locale).replace("-feira", ""))}
          <span className="max-sm:hidden"> ·</span>
        </span>{" "}
        <span className="whitespace-nowrap">{formatTime(iso)} ·</span>
      </time>{" "}
      <span className="whitespace-nowrap">
        {t.stage.updated} <RelativeTime iso={iso} />
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
