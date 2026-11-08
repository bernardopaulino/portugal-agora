"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";

import { concelhoForDico, type Concelho } from "@/data/concelhos";
import type { District } from "@/data/districts";
import { distanceKm, type ConcelhoFeature } from "@/lib/geo/geometry";
import { useResolvedTheme } from "@/lib/hooks/external";
import { useI18n } from "@/lib/i18n/client";
import type { EarthquakeEvent, FireEvent } from "@/lib/sources/types";

import { mapColors } from "./status/severity";

/*
 * Mapa pequeno da página do concelho, em SVG (sem WebGL nem mosaicos): os
 * concelhos do distrito, cada um com ligação para a sua página, o concelho
 * da página realçado e os incêndios e sismos à volta. Nas ilhas, só as
 * ilhas a menos de 60 km do concelho (os Açores inteiros ficavam minúsculos
 * e o Funchal inclui as Selvagens, a 280 km).
 */

type Ring = number[][];
const W = 400;
const ISLAND_RADIUS_KM = 60;

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as { features: ConcelhoFeature[] };
};

function polygonsOf(f: ConcelhoFeature): Ring[][] {
  return f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
}

export function ConcelhoMap({
  concelho,
  district,
  fires,
  quakes,
}: {
  concelho: Concelho;
  district: District;
  fires: FireEvent[];
  quakes: EarthquakeEvent[];
}) {
  const { t, path } = useI18n();
  const router = useRouter();
  const theme = useResolvedTheme();
  const colors = mapColors[theme];
  const { data } = useSWR("/geo/concelhos.json", fetcher, { revalidateOnFocus: false });
  if (!data) return <div className="aspect-[4/3] w-full rounded-xl bg-surface-2" aria-hidden />;

  const islands = district.region !== "continente";
  const shapes = data.features
    .filter((f) => f.properties.district === district.slug)
    .map((f) => ({
      f,
      polygons: polygonsOf(f).filter(
        (p) =>
          !islands ||
          p[0]!.some(([lon, lat]) => distanceKm([lon!, lat!], concelho.point) <= ISLAND_RADIUS_KM),
      ),
    }))
    .filter((s) => s.polygons.length > 0);

  // Enquadramento: equirretangular com a escala da latitude do centro.
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const s of shapes)
    for (const p of s.polygons)
      for (const [x, y] of p[0]!) {
        minX = Math.min(minX, x!);
        maxX = Math.max(maxX, x!);
        minY = Math.min(minY, y!);
        maxY = Math.max(maxY, y!);
      }
  const k = Math.cos((((minY + maxY) / 2) * Math.PI) / 180);
  const pad = 8;
  const scale = (W - 2 * pad) / Math.max((maxX - minX) * k, 1e-6);
  const H = Math.round((maxY - minY) * scale + 2 * pad);
  const project = ([lon, lat]: [number, number]) => [
    pad + (lon - minX) * k * scale,
    pad + (maxY - lat) * scale,
  ];
  const inView = ([lon, lat]: [number, number]) =>
    lon >= minX && lon <= maxX && lat >= minY && lat <= maxY;
  const d = (polygons: Ring[][]) =>
    polygons
      .flatMap((p) =>
        p.map(
          (ring) =>
            ring
              .map((c, i) => {
                const [x, y] = project(c as [number, number]);
                return `${i ? "L" : "M"}${x!.toFixed(1)} ${y!.toFixed(1)}`;
              })
              .join("") + "Z",
        ),
      )
      .join("");

  const fireDots = fires.filter((f) => f.coordinates && inView(f.coordinates));
  const quakeDots = quakes.filter((q) => q.coordinates && inView(q.coordinates));
  const name = t.concelhoName(concelho.dico, concelho.name);

  return (
    <figure className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto max-h-[28rem] w-full"
        role="group"
        aria-label={t.concelho.mapAria(name, t.districtName(district))}
      >
        {shapes.map(({ f, polygons }) => {
          const current = f.properties.dico === concelho.dico;
          const other = concelhoForDico(f.properties.dico);
          const shape = (
            <path
              d={d(polygons)}
              fillRule="evenodd"
              className={
                current
                  ? "fill-[color-mix(in_srgb,var(--accent)_35%,transparent)] stroke-accent"
                  : "fill-surface-2 stroke-line transition-colors hover:fill-[color-mix(in_srgb,var(--accent)_15%,transparent)]"
              }
              strokeWidth={current ? 2 : 1}
              vectorEffect="non-scaling-stroke"
            >
              <title>{t.concelhoName(f.properties.dico, f.properties.name)}</title>
            </path>
          );
          if (current || !other) return <g key={f.properties.dico}>{shape}</g>;
          const href = path(`/${other.district}/${other.slug}`);
          return (
            <a
              key={f.properties.dico}
              href={href}
              onClick={(e) => {
                e.preventDefault();
                router.push(href);
              }}
            >
              {shape}
            </a>
          );
        })}
        {quakeDots.map((q) => {
          const [x, y] = project(q.coordinates!);
          return (
            <circle key={q.id} cx={x} cy={y} r={6} fill="none" stroke={colors.info} strokeWidth={2}>
              <title>{t.lists.magnitude(String(q.magnitude))}</title>
            </circle>
          );
        })}
        {fireDots.map((f) => {
          const [x, y] = project(f.coordinates!);
          return (
            <circle
              key={f.id}
              cx={x}
              cy={y}
              r={5}
              fill={f.severity === "none" ? colors.unknown : colors.orange}
              stroke={theme === "dark" ? "#0b1a23" : "#ffffff"}
              strokeWidth={1.5}
            >
              <title>{f.place.label}</title>
            </circle>
          );
        })}
      </svg>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
        <span>{t.concelho.mapCaption}</span>
        {fireDots.length ? (
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-3 rounded-full"
              style={{ background: colors.orange }}
            />
            {t.concelho.mapFires}
          </span>
        ) : null}
        {quakeDots.length ? (
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-3 rounded-full border-2"
              style={{ borderColor: colors.info }}
            />
            {t.concelho.mapQuakes}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
