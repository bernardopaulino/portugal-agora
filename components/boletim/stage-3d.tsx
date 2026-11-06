"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import * as THREE from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";

import { getDistrict } from "@/data/districts";
import { mapFrames, mapShapes, projectPoint } from "@/data/map-shapes";
import { useResolvedTheme } from "@/lib/hooks/external";
import { prefersReducedMotion } from "@/lib/hooks/webgl";
import { useI18n } from "@/lib/i18n/client";

import { FireGlyph, QuakeGlyph, WarningGlyph, type MapLevel, type MapMarker } from "./bulletin-map";

/*
 * O boletim em relevo. Desenha os mesmos contornos do mapa SVG (o mesmo
 * viewBox, vistos de cima, com as mesmas cores) e, quando o primeiro
 * fotograma está pronto, toma o lugar do SVG sem se notar. Depois, uma
 * entrada só: a câmara inclina-se e cada distrito sobe até uma altura que
 * repete o seu nível (o vermelho é o mais alto). Apontar um distrito
 * levanta-o e contorna-o. Nada roda nem anda em loop; com "reduzir
 * movimento" aparece logo no estado final. O SVG continua por baixo, com
 * os links que o teclado e os leitores de ecrã usam.
 */

const W = 840;
const H = 1000;

/** Altura de cada nível, em unidades do viewBox (o mapa tem 1000 de altura). */
const LEVEL_HEIGHT: Record<MapLevel, number> = {
  none: 8,
  unknown: 5,
  yellow: 22,
  orange: 38,
  red: 56,
};
const DIM_HEIGHT = 1.5;
const LIFT = 12;
const TILT = THREE.MathUtils.degToRad(38);
const ENTRY_MS = 1700;
const LIFT_MS = 180;
const RANK: Record<MapLevel, number> = { unknown: 0, none: 0, yellow: 1, orange: 2, red: 3 };

/** As cores do mapa do boletim (as mesmas do SVG; fixas entre temas, menos as esbatidas). */
const LAND: Record<MapLevel, string> = {
  none: "#4f9d63",
  yellow: "#f2c200",
  orange: "#f07f1a",
  red: "#d7262b",
  unknown: "#8797a3",
};
const palette = {
  light: { dim: "#b5cbdd", line: "#0a1d2e", lineOpacity: 0.15, accent: "#0b5cad" },
  dark: { dim: "#2b4f75", line: "#ffffff", lineOpacity: 0.16, accent: "#8fd6ff" },
} as const;

const expoOut = (k: number) => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k));
const cubicInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const cubicOut = (k: number) => 1 - Math.pow(1 - k, 3);

/** Escala do viewBox no canvas, igual à do SVG (preserveAspectRatio "meet"). */
const fit = (width: number, height: number) => Math.min(width / W, height / H);

interface District {
  slug: string;
  island: boolean;
  shapes: THREE.Shape[];
  geometry: THREE.ExtrudeGeometry;
  /** Contornos (exterior e buracos) em pontos do viewBox. */
  rings: THREE.Vector2[][];
  anchor: [number, number];
}

/** Os contornos do boletim como formas do three, uma vez por página. */
function buildDistricts(): District[] {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg">${mapShapes
    .map((s) => `<path id="${s.slug}" d="${s.d}"/>`)
    .join("")}</svg>`;
  const data = new SVGLoader().parse(svg);
  return data.paths.map((path, i) => {
    const shape = mapShapes[i]!;
    const shapes = path.toShapes();
    const geometry = new THREE.ExtrudeGeometry(shapes, {
      depth: 1,
      bevelEnabled: false,
      curveSegments: 1,
    });
    const rings = shapes.flatMap((s) => [s.getPoints(), ...s.holes.map((h) => h.getPoints())]);
    return {
      slug: shape.slug,
      island: shape.region !== "continente",
      shapes,
      geometry,
      rings,
      anchor: shape.anchor,
    };
  });
}

function inRing([x, y]: [number, number], ring: THREE.Vector2[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!;
    const b = ring[j]!;
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Linha com espessura em px (as linhas WebGL normais têm sempre 1 px). */
function makeLine(rings: THREE.Vector2[][], color: string, opacity = 1) {
  const material = new LineMaterial({
    color,
    linewidth: 1,
    transparent: opacity < 1,
    opacity,
    worldUnits: false,
    // O mapa é espelhado em Y (o SVG cresce para baixo): sem isto, as linhas ficavam de costas.
    side: THREE.DoubleSide,
  });
  return rings.map((ring) => {
    const geometry = new LineGeometry();
    const closed = [...ring, ring[0]!];
    geometry.setPositions(closed.flatMap((p) => [p.x, p.y, 0]));
    const line = new Line2(geometry, material);
    line.computeLineDistances();
    return line;
  });
}

interface SceneProps {
  districts: District[];
  levels: Record<string, MapLevel>;
  focus?: string;
  pointed: string | null;
  theme: "light" | "dark";
  animate: boolean;
  onReady: () => void;
  onPick: (slug: string, touch: boolean) => void;
  onHover: (slug: string | null) => void;
  overlay: RefObject<HTMLDivElement | null>;
}

function Scene({
  districts,
  levels,
  focus,
  pointed,
  theme,
  animate,
  onReady,
  onPick,
  onHover,
  overlay,
}: SceneProps) {
  const get = useThree((s) => s.get);
  const invalidate = useThree((s) => s.invalidate);
  const size = useThree((s) => s.size);
  const pivot = useRef<THREE.Group>(null);
  const meshes = useRef(new Map<string, THREE.Mesh>());
  const lines = useRef(new Map<string, THREE.Group>());
  const start = useRef<number | null>(null);
  const lift = useRef(new Map<string, { from: number; to: number; at: number }>());
  const ready = useRef(false);
  const colors = palette[theme];

  const targetHeight = (slug: string) =>
    focus && focus !== slug ? DIM_HEIGHT : LEVEL_HEIGHT[levels[slug] ?? "unknown"];

  // Materiais: topo na cor do nível, paredes um tom abaixo (cor lisa, como no SVG).
  const materials = useMemo(() => {
    const out = new Map<string, [THREE.MeshBasicMaterial, THREE.MeshBasicMaterial]>();
    for (const d of districts) {
      const color = focus && focus !== d.slug ? colors.dim : LAND[levels[d.slug] ?? "unknown"];
      const top = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
      const wall = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color).multiplyScalar(0.7),
        side: THREE.DoubleSide,
      });
      out.set(d.slug, [top, wall]);
    }
    return out;
  }, [districts, levels, focus, colors.dim]);
  useEffect(() => () => materials.forEach(([a, b]) => (a.dispose(), b.dispose())), [materials]);

  // Contornos: branco no continente, da própria cor nas ilhas (mais visíveis a esta escala).
  const outlines = useMemo(() => {
    const out = new Map<string, Line2[]>();
    for (const d of districts) {
      const color = d.island
        ? focus && focus !== d.slug
          ? colors.dim
          : LAND[levels[d.slug] ?? "unknown"]
        : "#ffffff";
      out.set(d.slug, makeLine(d.rings, color, d.island ? 1 : 0.95));
    }
    return out;
  }, [districts, levels, focus, colors.dim]);
  const accent = useMemo(() => {
    const out = new Map<string, Line2[]>();
    for (const d of districts) out.set(d.slug, makeLine(d.rings, colors.accent));
    return out;
  }, [districts, colors.accent]);
  const focusLine = useMemo(() => {
    const d = districts.find((x) => x.slug === focus);
    return d ? makeLine(d.rings, "#ffffff") : [];
  }, [districts, focus]);
  const frames = useMemo(
    () =>
      (["acores", "madeira"] as const).flatMap((r) => {
        const [x, y, w, h] = mapFrames[r];
        return makeLine(
          [
            [
              new THREE.Vector2(x, y),
              new THREE.Vector2(x + w, y),
              new THREE.Vector2(x + w, y + h),
              new THREE.Vector2(x, y + h),
            ],
          ],
          colors.line,
          colors.lineOpacity,
        );
      }),
    [colors.line, colors.lineOpacity],
  );
  useEffect(() => {
    const all = [...outlines.values(), ...accent.values(), focusLine, frames].flat();
    return () =>
      all.forEach((l) => {
        l.geometry.dispose();
        l.material.dispose();
      });
  }, [outlines, accent, focusLine, frames]);

  // Espessuras em px, como as do SVG (em unidades do viewBox) à escala atual.
  const ppu = fit(size.width, size.height);
  useEffect(() => {
    const set = (ls: Line2[], units: number) =>
      ls.forEach((l) => {
        l.material.linewidth = Math.max(1, units * ppu);
        l.material.resolution.set(size.width, size.height);
      });
    for (const d of districts) {
      set(outlines.get(d.slug) ?? [], d.island ? 5 : 1.6);
      set(accent.get(d.slug) ?? [], 4.5);
    }
    set(focusLine, 3.5);
    set(frames, 1.5);
    invalidate();
  }, [ppu, size.width, size.height, districts, outlines, accent, focusLine, frames, invalidate]);

  // Levantar o distrito apontado (e baixar o anterior).
  const prevPointed = useRef<string | null>(null);
  useEffect(() => {
    const now = performance.now();
    const current = (slug: string) => {
      const l = lift.current.get(slug);
      if (!l) return 0;
      const k = animate ? Math.min(1, (now - l.at) / LIFT_MS) : 1;
      return l.from + (l.to - l.from) * expoOut(k);
    };
    if (prevPointed.current && prevPointed.current !== pointed)
      lift.current.set(prevPointed.current, { from: current(prevPointed.current), to: 0, at: now });
    if (pointed) lift.current.set(pointed, { from: current(pointed), to: LIFT, at: now });
    prevPointed.current = pointed;
    invalidate();
  }, [pointed, animate, invalidate]);

  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera }) => {
    const now = performance.now();
    if (start.current === null) start.current = now;
    // O primeiro fotograma é plano e visto de cima, igual ao SVG: só depois começa a entrada.
    const elapsed = ready.current && animate ? now - start.current : ready.current ? ENTRY_MS : 0;
    const p = Math.min(1, elapsed / ENTRY_MS);
    let moving = p < 1;

    if (pivot.current) {
      pivot.current.rotation.x = -TILT * cubicInOut(p);
    }

    const heights = new Map<string, number>();
    for (const d of districts) {
      // Os níveis mais altos sobem por último: a atenção acaba no vermelho.
      const delay = 0.15 + RANK[levels[d.slug] ?? "unknown"] * 0.1;
      const k = cubicOut(Math.min(1, Math.max(0, (p - delay) / (1 - 0.45))));
      const l = lift.current.get(d.slug);
      let up = 0;
      if (l) {
        const kl = animate ? Math.min(1, (now - l.at) / LIFT_MS) : 1;
        if (kl < 1) moving = true;
        up = l.from + (l.to - l.from) * expoOut(kl);
      }
      const h = Math.max(0.001, targetHeight(d.slug) * k);
      heights.set(d.slug, h + up);
      const mesh = meshes.current.get(d.slug);
      if (mesh) {
        mesh.scale.z = h;
        mesh.position.z = up;
      }
      const group = lines.current.get(d.slug);
      if (group) group.position.z = h + up + 0.05;
    }

    // Pictogramas e nomes das caixas: HTML por cima do canvas, no topo de cada distrito.
    const root = overlay.current;
    const map = pivot.current?.children[0];
    if (root && map) {
      map.updateMatrixWorld();
      const glyphOpacity = String(Math.max(0, Math.min(1, (p - 0.55) / 0.3)));
      for (const el of root.querySelectorAll<HTMLElement>("[data-x]")) {
        const x = Number(el.dataset.x);
        const y = Number(el.dataset.y);
        const z = el.dataset.slug ? (heights.get(el.dataset.slug) ?? 0) : 0;
        v.set(x, y, z);
        map.localToWorld(v).project(camera);
        const sx = ((v.x + 1) / 2) * size.width;
        const sy = ((1 - v.y) / 2) * size.height;
        el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`;
        if (el.dataset.glyph) el.style.opacity = glyphOpacity;
      }
    }

    if (!ready.current) {
      ready.current = true;
      // Deixa o primeiro fotograma (plano) chegar ao ecrã antes de esconder o SVG.
      requestAnimationFrame(() => {
        start.current = performance.now();
        onReady();
        get().invalidate();
      });
    } else if (moving) invalidate();
  });

  return (
    <group ref={pivot}>
      <group position={[-W / 2, H / 2, 0]} scale={[1, -1, 1]}>
        {frames.map((l, i) => (
          <primitive key={`f${i}`} object={l} />
        ))}
        {districts.map((d) => (
          <group key={d.slug}>
            <mesh
              ref={(m) => {
                if (m) meshes.current.set(d.slug, m);
                else meshes.current.delete(d.slug);
              }}
              geometry={d.geometry}
              material={materials.get(d.slug)}
              scale={[1, 1, 0.001]}
              onPointerOver={(e: ThreeEvent<PointerEvent>) => {
                e.stopPropagation();
                if (e.pointerType === "mouse") onHover(d.slug);
              }}
              onPointerOut={() => onHover(null)}
              onClick={(e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation();
                onPick(d.slug, (e.nativeEvent as PointerEvent).pointerType !== "mouse");
              }}
            />
            <group
              ref={(g) => {
                if (g) lines.current.set(d.slug, g);
                else lines.current.delete(d.slug);
              }}
            >
              {(outlines.get(d.slug) ?? []).map((l, i) => (
                <primitive key={i} object={l} />
              ))}
              {pointed === d.slug
                ? (accent.get(d.slug) ?? []).map((l, i) => (
                    <primitive key={`a${i}`} object={l} renderOrder={3} />
                  ))
                : null}
              {focus === d.slug
                ? focusLine.map((l, i) => <primitive key={`fo${i}`} object={l} renderOrder={2} />)
                : null}
            </group>
          </group>
        ))}
      </group>
    </group>
  );
}

export default function Stage3D({
  levels,
  markers,
  focus,
  pointed,
  onPoint,
  onReady,
  onFailed,
}: {
  levels: Record<string, MapLevel>;
  markers: MapMarker[];
  focus?: string;
  pointed: string | null;
  onPoint?: (slug: string | null) => void;
  /** O primeiro fotograma (igual ao SVG) está no ecrã: o SVG pode sair de vista. */
  onReady: () => void;
  onFailed: () => void;
}) {
  const { t, path } = useI18n();
  const router = useRouter();
  const theme = useResolvedTheme();
  const overlay = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  const [animate] = useState(() => !prefersReducedMotion());
  const districts = useMemo(() => buildDistricts(), []);
  useEffect(() => () => districts.forEach((d) => d.geometry.dispose()), [districts]);

  // Cada pictograma de incêndio ou sismo fica no topo do distrito onde está.
  const placed = markers.map((m) => {
    const [x, y] = projectPoint(m.coordinates, m.region);
    const owner = districts.find((d) => d.rings.some((r) => inRing([x, y], r)));
    return { m, x, y, slug: owner?.slug };
  });

  const pick = (slug: string, touch: boolean) => {
    // No ecrã tátil, o primeiro toque mostra a legenda e o segundo abre o distrito (como no SVG).
    if (onPoint && touch && pointed !== slug) {
      onPoint(slug);
      return;
    }
    if (getDistrict(slug)) router.push(path(`/${slug}`));
  };

  const glyphs: ReactNode[] = [
    ...districts.map((d) =>
      focus && focus !== d.slug ? null : (
        <Glyph key={d.slug} x={d.anchor[0]} y={d.anchor[1]} slug={d.slug}>
          <WarningGlyph level={levels[d.slug] ?? "unknown"} x={0} y={0} />
        </Glyph>
      ),
    ),
    ...placed.map(({ m, x, y, slug }) => (
      <Glyph key={m.id} x={x} y={y} slug={slug}>
        {m.kind === "fire" ? (
          <FireGlyph x={0} y={0} />
        ) : (
          <QuakeGlyph x={0} y={0} magnitude={m.magnitude} />
        )}
      </Glyph>
    )),
  ];

  return (
    <div
      className="absolute inset-0"
      onPointerLeave={(e) => {
        setHovering(false);
        if (e.pointerType === "mouse") onPoint?.(null);
      }}
      style={{ cursor: hovering ? "pointer" : "default" }}
    >
      <Canvas
        orthographic
        flat
        frameloop="demand"
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        camera={{ position: [0, 0, 3000], near: 1, far: 6000, zoom: 1 }}
        onCreated={({ gl, camera, size }) => {
          gl.domElement.addEventListener("webglcontextlost", () => onFailed());
          camera.zoom = fit(size.width, size.height);
          camera.updateProjectionMatrix();
        }}
        resize={{ debounce: 0 }}
        aria-hidden
      >
        <Zoom />
        <Scene
          districts={districts}
          levels={levels}
          focus={focus}
          pointed={pointed}
          theme={theme}
          animate={animate}
          onReady={onReady}
          onPick={pick}
          onHover={(slug) => {
            setHovering(slug !== null);
            // Sair de um distrito para o mar não apaga a legenda (como no SVG): só sair do mapa.
            if (slug) onPoint?.(slug);
          }}
          overlay={overlay}
        />
      </Canvas>
      <div
        ref={overlay}
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {(["acores", "madeira"] as const).map((r) => {
          const [x, y] = mapFrames[r];
          return (
            <span
              key={r}
              data-x={x + 2}
              data-y={y - 12}
              className="absolute top-0 left-0 font-display text-[length:calc(30cqw/8.4)] leading-none font-semibold whitespace-nowrap text-stage-ink-2 lg:text-[length:calc(24cqw/8.4)]"
              style={{ translate: "0 -100%" }}
            >
              {r === "acores" ? t.stage.acores : t.stage.madeira}
            </span>
          );
        })}
        {glyphs}
      </div>
    </div>
  );
}

/** O zoom do canvas ortográfico: a largura do viewBox ocupa a do contentor. */
function Zoom() {
  const get = useThree((s) => s.get);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  useEffect(() => {
    const { camera, invalidate } = get();
    camera.zoom = fit(width, height);
    camera.updateProjectionMatrix();
    invalidate();
  }, [get, width, height]);
  return null;
}

/** Um pictograma do SVG do boletim, posicionado pelo Scene a cada fotograma. */
function Glyph({
  x,
  y,
  slug,
  children,
}: {
  x: number;
  y: number;
  slug?: string;
  children: ReactNode;
}) {
  return (
    <svg
      data-x={x}
      data-y={y}
      data-slug={slug}
      data-glyph="1"
      viewBox="-26 -26 52 52"
      className="absolute top-0 left-0 w-[calc(52cqw/8.4)] opacity-0"
      style={{ translate: "-50% -50%" }}
      overflow="visible"
    >
      {children}
    </svg>
  );
}
