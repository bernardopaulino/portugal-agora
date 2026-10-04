"use client";

import { getDistrict, type Region } from "@/data/districts";
import { MAP_VIEWBOX, mapFrames, mapShapes, projectPoint } from "@/data/map-shapes";
import type { Severity } from "@/lib/sources/types";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { useRef } from "react";

export type MapLevel = Severity | "unknown";

const fill: Record<MapLevel, string> = {
  none: "var(--land-none)",
  yellow: "var(--land-yellow)",
  orange: "var(--land-orange)",
  red: "var(--land-red)",
  unknown: "var(--land-unknown)",
};

export interface MapMarker {
  id: string;
  kind: "fire" | "quake";
  coordinates: [number, number];
  region: Region;
  /** Magnitude, para o tamanho do círculo dos sismos. */
  magnitude?: number;
}

/**
 * Pictograma de aviso, com forma própria por nível (nunca só a cor):
 * triângulo (amarelo), losango (laranja), octógono (vermelho).
 */
const glyph = {
  yellow: { shape: "M0-17L17 13H-17Z", bar: "M0-5V4", dot: 9 },
  orange: { shape: "M0-19L19 0 0 19-19 0Z", bar: "M0-8V2", dot: 8 },
  red: { shape: "M-6.6-16H6.6L16-6.6V6.6L6.6 16H-6.6L-16 6.6V-6.6Z", bar: "M0-8V3", dot: 8.5 },
};

function WarningGlyph({ level, x, y }: { level: MapLevel; x: number; y: number }) {
  if (level === "none" || level === "unknown") return null;
  const g = glyph[level];
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden>
      <path
        d={g.shape}
        fill="var(--ink-on-land)"
        stroke="#fff"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d={g.bar} stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="0" cy={g.dot} r="2" fill="#fff" />
    </g>
  );
}

function FireGlyph({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden>
      <circle r="13" fill="var(--fire)" stroke="#fff" strokeWidth="2.5" />
      <path
        d="M0.4-7.5C1.5-4.2 5.5-2.6 5.5 2.2 5.5 5.6 3 8 0 8S-5.5 5.6-5.5 2.4C-5.5-0.6-3.7-2.3-2.4-3.3-2.2-1.2-1.1 0.1 0.2 0.4-0.6-2.6-0.5-5.2 0.4-7.5Z"
        fill="#fff"
      />
    </g>
  );
}

function QuakeGlyph({ x, y, magnitude = 2 }: { x: number; y: number; magnitude?: number }) {
  const r = 7 + Math.max(0, magnitude - 2) * 5;
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden>
      <circle r={r + 6} fill="none" stroke="var(--stage-accent)" strokeWidth="1.5" opacity="0.6" />
      <circle r={r} fill="none" stroke="var(--stage-accent)" strokeWidth="2.5" />
      <circle r="3" fill="var(--stage-accent)" />
    </g>
  );
}

/**
 * O mapa do boletim: o país em cores lisas, com o nível de aviso de cada
 * distrito. Cada distrito é uma ligação para a sua página; ao apontar
 * (rato ou teclado) chama onPoint, que alimenta a legenda do rodapé.
 */
export function BulletinMap({
  levels,
  markers = [],
  focus,
  pointed,
  onPoint,
  className,
}: {
  levels: Record<string, MapLevel>;
  markers?: MapMarker[];
  /** Na página de um distrito: os outros ficam esbatidos. */
  focus?: string;
  pointed?: string | null;
  onPoint?: (slug: string | null) => void;
  className?: string;
}) {
  // O último toque foi com o dedo ou caneta (e não com o rato)?
  const touch = useRef(false);
  const { t } = useI18n();
  const active = pointed ? mapShapes.find((s) => s.slug === pointed) : undefined;
  const focused = focus ? mapShapes.find((s) => s.slug === focus) : undefined;

  return (
    <svg
      viewBox={MAP_VIEWBOX}
      className={cn("h-auto w-full", className)}
      role="group"
      aria-label={t.stage.mapLabel}
      onMouseLeave={() => onPoint?.(null)}
      onPointerDown={(e) => {
        touch.current = e.pointerType !== "mouse";
      }}
      onKeyDown={() => {
        touch.current = false;
      }}
    >
      {(["acores", "madeira"] as const).map((region) => {
        const [x, y, w, h] = mapFrames[region];
        return (
          <g key={region} aria-hidden>
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              fill="none"
              stroke="var(--stage-line)"
              strokeWidth="1.5"
            />
            <text
              x={x + 2}
              y={y - 10}
              fill="var(--stage-ink-2)"
              className="font-display"
              fontSize="20"
              fontWeight="600"
            >
              {region === "acores" ? t.stage.acores : t.stage.madeira}
            </text>
          </g>
        );
      })}

      {mapShapes.map((shape) => {
        const level = levels[shape.slug] ?? "unknown";
        const district = getDistrict(shape.slug);
        const name = district ? t.districtName(district) : shape.slug;
        const dim = focus !== undefined && focus !== shape.slug;
        return (
          <a
            key={shape.slug}
            href={`/${shape.slug}`}
            aria-label={`${name}: ${t.levels[level].toLowerCase()}`}
            onMouseEnter={() => !touch.current && onPoint?.(shape.slug)}
            onFocus={() => !touch.current && onPoint?.(shape.slug)}
            onClick={(e) => {
              // Ecrã tátil: o primeiro toque mostra a legenda; o segundo (ou o
              // botão "Abrir" da legenda) abre a página do distrito.
              if (onPoint && pointed !== shape.slug && touch.current) {
                e.preventDefault();
                onPoint(shape.slug);
              }
            }}
            className="outline-none"
          >
            <path
              d={shape.d}
              fill={dim ? "var(--land-dim)" : fill[level]}
              fillOpacity={1}
              stroke="#fff"
              strokeOpacity={dim ? 0.35 : 0.95}
              strokeWidth="1.6"
              strokeLinejoin="round"
              className="cursor-pointer transition-[fill-opacity] duration-150"
            />
          </a>
        );
      })}

      {/* Contorno do distrito em foco ou apontado, por cima de todos. */}
      {[focused, active].map((shape, i) =>
        shape ? (
          <path
            key={`${i}-${shape.slug}`}
            d={shape.d}
            fill="none"
            stroke={i === 0 ? "#fff" : "var(--stage-accent)"}
            strokeWidth={i === 0 ? 3.5 : 4.5}
            strokeLinejoin="round"
            pointerEvents="none"
            aria-hidden
          />
        ) : null,
      )}

      <g pointerEvents="none">
        {mapShapes.map((shape) =>
          focus && focus !== shape.slug ? null : (
            <WarningGlyph
              key={shape.slug}
              level={levels[shape.slug] ?? "unknown"}
              x={shape.anchor[0]}
              y={shape.anchor[1]}
            />
          ),
        )}
        {markers.map((m) => {
          const [x, y] = projectPoint(m.coordinates, m.region);
          return m.kind === "fire" ? (
            <FireGlyph key={m.id} x={x} y={y} />
          ) : (
            <QuakeGlyph key={m.id} x={x} y={y} magnitude={m.magnitude} />
          );
        })}
      </g>
    </svg>
  );
}
