"use client";

import useSWR from "swr";

import type { District } from "@/data/districts";
import { distanceKm } from "@/lib/geo/geometry";
import { useI18n } from "@/lib/i18n/client";
import type { Hotspot } from "@/lib/sources/nasa-firms";
import type { FireEvent, SourceResult } from "@/lib/sources/types";
import { formatDayTime } from "@/lib/time/format";

import { EmptyState, Section } from "../status/section";

/*
 * Pontos de calor por satélite (NASA FIRMS), agrupados por concelho. São
 * deteções, não incêndios confirmados: diz-se, e marca-se quando há uma
 * ocorrência do Fogos.pt perto (provavelmente o mesmo incêndio).
 */

/** Uma deteção a menos disto de uma ocorrência ativa conta como "perto de um incêndio". */
const NEAR_FIRE_KM = 3;

type HotspotsResponse = SourceResult<Hotspot[]> & { coverage?: "continente" | "portugal" };

const fetcher = async (url: string): Promise<HotspotsResponse> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

export function HotspotsSection({
  district,
  fires,
  reference,
}: {
  district?: District;
  fires: FireEvent[];
  reference: Date;
}) {
  const { t, locale } = useI18n();
  const { data } = useSWR("/api/hotspots", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 15 * 60_000,
  });
  if (!data) return null;
  const islandsUncovered =
    district !== undefined && district.region !== "continente" && data.coverage !== "portugal";
  const spots = (data.data ?? []).filter((h) => !district || h.place.district === district.slug);
  const active = fires.filter((f) => f.active && f.coordinates);
  const nearFire = (h: Hotspot) =>
    active.some((f) => distanceKm(f.coordinates!, h.coordinates) <= NEAR_FIRE_KM);

  // Por concelho: quantas, a mais recente e se alguma está perto de um incêndio conhecido.
  const groups = new Map<string, { name: string; spots: Hotspot[] }>();
  for (const h of spots) {
    const key = h.dico ?? h.place.label;
    const g = groups.get(key) ?? { name: h.place.label || t.hotspots.unknownPlace, spots: [] };
    g.spots.push(h);
    groups.set(key, g);
  }
  const rows = [...groups.values()]
    .map((g) => ({
      name: g.name,
      count: g.spots.length,
      latest: g.spots[0]!.detectedAt,
      near: g.spots.some(nearFire),
      region: g.spots[0]!.place.region,
    }))
    .sort((a, b) => Number(b.near) - Number(a.near) || b.count - a.count);

  return (
    <Section id="satelite" title={t.hotspots.title} result={data}>
      <p className="text-base text-ink-2">{t.hotspots.intro}</p>
      {islandsUncovered ? (
        <EmptyState>{t.hotspots.islandsUncovered}</EmptyState>
      ) : data.data === null ? (
        <EmptyState>{t.hotspots.down}</EmptyState>
      ) : rows.length === 0 ? (
        <EmptyState>{t.hotspots.none}</EmptyState>
      ) : (
        <ul className="flex flex-col border-t border-line">
          {rows.map((r) => (
            <li
              key={r.name}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line py-3"
            >
              <span className="text-lg font-semibold">{r.name}</span>
              <span className="text-base text-ink-2">
                {t.hotspots.count(r.count)} ·{" "}
                {t.hotspots.latest(formatDayTime(r.latest, reference, r.region, locale))}
                {r.near ? ` · ${t.hotspots.nearFire}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-ink-2">{t.hotspots.note}</p>
    </Section>
  );
}
