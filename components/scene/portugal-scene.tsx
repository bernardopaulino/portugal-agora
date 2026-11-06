"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";

import { mapFrames, mapShapes } from "@/data/map-shapes";
import { useResolvedTheme } from "@/lib/hooks/external";
import { prefersReducedMotion } from "@/lib/hooks/webgl";

import type { MapLevel } from "../boletim/bulletin-map";
import { riskColors } from "../cards/fire-risk";

/*
 * A cena da pÃ¡gina inicial: Portugal em relevo, sozinho no escuro, com a
 * cor e a altura de cada distrito a repetir o nÃ­vel de aviso. Ã‰ fixa
 * atrÃ¡s da pÃ¡gina; cada secÃ§Ã£o (marcada com data-scene) tem uma posiÃ§Ã£o
 * de cÃ¢mara, e a cÃ¢mara viaja entre elas conforme o scroll, com um leve
 * paralaxe ao rato. Na secÃ§Ã£o do risco, os distritos mudam para a cor e a
 * altura do risco de incÃªndio. SÃ³ desenha quando algo muda; nada se move
 * sozinho depois da entrada. Com "reduzir movimento", a cÃ¢mara fica na
 * vista geral e as mudanÃ§as sÃ£o imediatas.
 */

/** Uma vista da cÃ¢mara: alvo (no plano do mapa), distÃ¢ncia e Ã¢ngulos. */
interface Shot {
  x: number;
  y: number;
  distance: number;
  /** InclinaÃ§Ã£o a partir da vertical, em graus. */
  tilt: number;
  /** RotaÃ§Ã£o Ã  volta do alvo, em graus (0 = de sul para norte). */
  turn: number;
}

export type SceneKey = "hero" | "avisos" | "incendios" | "sismos" | "risco" | "ar" | "distritos";

/** As vistas de cada secÃ§Ã£o, em unidades do mapa (o viewBox do boletim, centrado). */
const SHOTS: Record<SceneKey, Shot> = {
  hero: { x: 0, y: -20, distance: 1700, tilt: 42, turn: -8 },
  avisos: { x: -10, y: 60, distance: 1250, tilt: 50, turn: 10 },
  incendios: { x: 20, y: 270, distance: 950, tilt: 56, turn: 20 },
  sismos: { x: -470, y: 60, distance: 1050, tilt: 56, turn: -22 },
  risco: { x: -10, y: 0, distance: 1350, tilt: 28, turn: 4 },
  ar: { x: -20, y: -20, distance: 1400, tilt: 30, turn: -6 },
  distritos: { x: 60, y: 0, distance: 2200, tilt: 18, turn: 0 },
};

const W = 840;
const H = 1000;
/** Do viewBox (y para baixo) para o mundo da cena (y para norte, centrado). */
const toWorld = (x: number, y: number): [number, number] => [x - W / 2, H / 2 - y];

const LEVEL_HEIGHT: Record<MapLevel, number> = {
  none: 8,
  unknown: 5,
  yellow: 24,
  orange: 40,
  red: 58,
};
const RISK_UNIT = 11;
const LIFT = 14;
const LAND: Record<MapLevel, string> = {
  none: "#4f9d63",
  yellow: "#f2c200",
  orange: "#f07f1a",
  red: "#d7262b",
  unknown: "#8797a3",
};

const themes = {
  dark: {
    bg: "#05080f",
    ground: "#070d18",
    grid: "#6fe3ff",
    gridOpacity: 0.07,
    edge: "#ffffff",
    edgeOpacity: 0.55,
    dim: "#1c2b40",
    accent: "#6fe3ff",
    frame: "#6fe3ff",
    sky: "#9cc7ff",
    soil: "#05080f",
  },
  light: {
    bg: "#eaf0f7",
    ground: "#e2e9f2",
    grid: "#0060c7",
    gridOpacity: 0.06,
    edge: "#ffffff",
    edgeOpacity: 0.85,
    dim: "#c9d6e5",
    accent: "#0060c7",
    frame: "#0060c7",
    sky: "#ffffff",
    soil: "#c3cfdd",
  },
} as const;

export interface SceneFire {
  id: string;
  /** No viewBox do boletim. */
  x: number;
  y: number;
  /** Operacionais (a altura da coluna). */
  people: number;
  slug?: string;
}
export interface SceneQuake {
  id: string;
  x: number;
  y: number;
  magnitude: number;
  slug?: string;
}

interface District {
  slug: string;
  island: boolean;
  geometry: THREE.ExtrudeGeometry;
  rings: THREE.Vector2[][];
  anchor: [number, number];
}

function buildDistricts(): District[] {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg">${mapShapes
    .map((s) => `<path d="${s.d}"/>`)
    .join("")}</svg>`;
  return new SVGLoader().parse(svg).paths.map((path, i) => {
    const shape = mapShapes[i]!;
    const shapes = path.toShapes();
    return {
      slug: shape.slug,
      island: shape.region !== "continente",
      geometry: new THREE.ExtrudeGeometry(shapes, {
        depth: 1,
        bevelEnabled: false,
        curveSegments: 1,
      }),
      rings: shapes.flatMap((s) => [s.getPoints(), ...s.holes.map((h) => h.getPoints())]),
      anchor: shape.anchor,
    };
  });
}

function makeLines(rings: THREE.Vector2[][], color: string, opacity: number) {
  const material = new LineMaterial({
    color,
    linewidth: 1,
    transparent: true,
    opacity,
    worldUnits: false,
    // O mapa Ã© espelhado em Y (o SVG cresce para baixo).
    side: THREE.DoubleSide,
  });
  return rings.map((ring) => {
    const geometry = new LineGeometry();
    geometry.setPositions([...ring, ring[0]!].flatMap((p) => [p.x, p.y, 0]));
    return new Line2(geometry, material);
  });
}

/** Pesos de cada secÃ§Ã£o visÃ­vel: quanto mais perto do centro do ecrÃ£, mais pesa. */
function sectionWeights(): Partial<Record<SceneKey, number>> {
  const out: Partial<Record<SceneKey, number>> = {};
  const mid = innerHeight / 2;
  let total = 0;
  for (const el of document.querySelectorAll<HTMLElement>("[data-scene]")) {
    const key = el.dataset.scene as SceneKey;
    const r = el.getBoundingClientRect();
    if (r.height === 0) continue;
    const center = Math.min(
      Math.max(mid, r.top + 0.35 * innerHeight),
      r.bottom - 0.35 * innerHeight,
    );
    const w = Math.max(0, 1 - Math.abs(center - mid) / (innerHeight * 0.75));
    if (w <= 0) continue;
    out[key] = (out[key] ?? 0) + w;
    total += w;
  }
  if (total === 0) return { hero: 1 };
  for (const k of Object.keys(out) as SceneKey[]) out[k]! /= total;
  return out;
}

function blendShots(weights: Partial<Record<SceneKey, number>>, wide: boolean): Shot {
  const s: Shot = { x: 0, y: 0, distance: 0, tilt: 0, turn: 0 };
  for (const [k, w] of Object.entries(weights) as [SceneKey, number][]) {
    const shot = SHOTS[k];
    s.x += shot.x * w;
    s.y += shot.y * w;
    s.distance += shot.distance * w;
    s.tilt += shot.tilt * w;
    s.turn += shot.turn * w;
  }
  // Em ecrÃ£s estreitos o painel nÃ£o fica ao lado: o mapa vai ao centro e afasta-se.
  if (!wide) {
    s.x += 150;
    s.distance *= 1.55;
  }
  return s;
}

interface SceneProps {
  districts: District[];
  levels: Record<string, MapLevel>;
  risk: Record<string, number>;
  fires: SceneFire[];
  quakes: SceneQuake[];
  focus?: string;
  pointed: string | null;
  theme: "light" | "dark";
  reduced: boolean;
  onHover: (slug: string | null) => void;
  onOpen: (slug: string) => void;
  onReady: () => void;
  labels: RefObject<HTMLDivElement | null>;
}

function Scene({
  districts,
  levels,
  risk,
  fires,
  quakes,
  focus,
  pointed,
  theme,
  reduced,
  onHover,
  onOpen,
  onReady,
  labels,
}: SceneProps) {
  const get = useThree((s) => s.get);
  const invalidate = useThree((s) => s.invalidate);
  const size = useThree((s) => s.size);
  const colors = themes[theme];
  const meshes = useRef(new Map<string, THREE.Mesh>());
  const edges = useRef(new Map<string, THREE.Group>());
  const beams = useRef<THREE.Group>(null);
  const rings = useRef<THREE.Group>(null);
  const cam = useRef<Shot | null>(null);
  const pointer = useRef({ x: 0, y: 0, sx: 0, sy: 0 });
  const born = useRef<number | null>(null);
  const heights = useRef(new Map<string, number>());
  const lift = useRef(new Map<string, number>());
  const ready = useRef(false);
  const tmp = useMemo(() => new THREE.Color(), []);
  const tmp2 = useMemo(() => new THREE.Color(), []);
  const v = useMemo(() => new THREE.Vector3(), []);

  // A cÃ¢mara olha de cima para baixo com o norte para cima: o "up" Ã© o eixo z.
  useEffect(() => {
    const { camera, scene } = get();
    camera.up.set(0, 0, 1);
    scene.fog = new THREE.Fog(colors.bg, 1400, 5200);
    scene.background = null;
    invalidate();
  }, [get, invalidate, colors.bg]);

  // Scroll, rato e tamanho: a cena sÃ³ desenha quando algo muda.
  useEffect(() => {
    const onScroll = () => invalidate();
    const onMove = (e: PointerEvent) => {
      if (reduced || e.pointerType !== "mouse") return;
      pointer.current.x = (e.clientX / innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / innerHeight) * 2 - 1;
      invalidate();
    };
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("pointermove", onMove, { passive: true });
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("pointermove", onMove);
    };
  }, [invalidate, reduced]);

  // Materiais: topo e paredes por distrito (a cor muda entre aviso e risco).
  const materials = useMemo(() => {
    const out = new Map<string, [THREE.MeshStandardMaterial, THREE.MeshStandardMaterial]>();
    for (const d of districts) {
      out.set(d.slug, [
        new THREE.MeshStandardMaterial({
          roughness: 0.55,
          metalness: 0.05,
          side: THREE.DoubleSide,
        }),
        new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0, side: THREE.DoubleSide }),
      ]);
    }
    return out;
  }, [districts]);
  useEffect(() => () => materials.forEach(([a, b]) => (a.dispose(), b.dispose())), [materials]);

  const outlines = useMemo(() => {
    const out = new Map<string, Line2[]>();
    for (const d of districts) out.set(d.slug, makeLines(d.rings, colors.edge, colors.edgeOpacity));
    return out;
  }, [districts, colors.edge, colors.edgeOpacity]);
  const accent = useMemo(() => {
    const out = new Map<string, Line2[]>();
    for (const d of districts) out.set(d.slug, makeLines(d.rings, colors.accent, 1));
    return out;
  }, [districts, colors.accent]);
  const frames = useMemo(
    () =>
      (["acores", "madeira"] as const).flatMap((r) => {
        const [x, y, w, h] = mapFrames[r];
        return makeLines(
          [
            [
              new THREE.Vector2(x, y),
              new THREE.Vector2(x + w, y),
              new THREE.Vector2(x + w, y + h),
              new THREE.Vector2(x, y + h),
            ],
          ],
          colors.frame,
          0.35,
        );
      }),
    [colors.frame],
  );
  useEffect(() => {
    const all = [...outlines.values(), ...accent.values(), frames].flat();
    return () =>
      all.forEach((l) => {
        l.geometry.dispose();
        l.material.dispose();
      });
  }, [outlines, accent, frames]);
  // Espessuras em px: contornos finos, o distrito apontado mais grosso.
  useEffect(() => {
    const set = (ls: Line2[], width: number) =>
      ls.forEach((l) => {
        l.material.resolution.set(size.width, size.height);
        l.material.linewidth = width;
      });
    for (const ls of outlines.values()) set(ls, 1);
    for (const ls of accent.values()) set(ls, 2.5);
    set(frames, 1);
    invalidate();
  }, [outlines, accent, frames, size.width, size.height, invalidate]);

  // ChÃ£o: uma grelha fina que se perde no nevoeiro.
  const grid = useMemo(() => {
    const p: number[] = [];
    const R = 3000;
    for (let i = -R; i <= R; i += 60) p.push(i, -R, -1, i, R, -1, -R, i, -1, R, i, -1);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    return g;
  }, []);
  useEffect(() => () => grid.dispose(), [grid]);

  const beamGeo = useMemo(() => new THREE.CylinderGeometry(2.4, 2.4, 1, 10, 1, true), []);
  const glowGeo = useMemo(() => new THREE.CircleGeometry(1, 32), []);
  const ringGeo = useMemo(() => new THREE.RingGeometry(0.82, 1, 48), []);
  useEffect(
    () => () => [beamGeo, glowGeo, ringGeo].forEach((g) => g.dispose()),
    [beamGeo, glowGeo, ringGeo],
  );

  // Levantar o distrito apontado.
  useEffect(() => invalidate(), [pointed, invalidate]);

  const wide = size.width / Math.max(1, size.height) > 1.05;
  const focusShot = useMemo<Shot | null>(() => {
    const d = districts.find((x) => x.slug === focus);
    if (!d) return null;
    const [x, y] = toWorld(d.anchor[0], d.anchor[1]);
    return { x: x - (wide ? 120 : 0), y: y - 60, distance: wide ? 900 : 1300, tilt: 48, turn: -12 };
  }, [districts, focus, wide]);

  useFrame(({ camera }, delta) => {
    const now = performance.now();
    if (born.current === null) born.current = now;
    let moving = false;
    const dt = Math.min(delta, 0.1);
    const k = reduced ? 1 : 1 - Math.exp(-dt * 3.2);

    // Pesos das secÃ§Ãµes e a vista que lhes corresponde.
    const weights = focus ? { hero: 1 } : sectionWeights();
    let goal = focusShot ?? blendShots(weights, wide);
    if (reduced && !focus) goal = blendShots({ hero: 1 }, wide);
    const p = pointer.current;
    p.sx += (p.x - p.sx) * k;
    p.sy += (p.y - p.sy) * k;
    if (Math.abs(p.x - p.sx) + Math.abs(p.y - p.sy) > 0.002) moving = true;

    // A entrada: a cÃ¢mara parte de cima e de longe, e desce atÃ© Ã  primeira vista.
    if (!cam.current)
      cam.current = reduced
        ? { ...goal }
        : { ...goal, distance: goal.distance * 1.9, tilt: 6, turn: goal.turn - 40 };
    const c = cam.current;
    for (const key of ["x", "y", "distance", "tilt", "turn"] as const) {
      const d = goal[key] - c[key];
      if (Math.abs(d) > (key === "distance" ? 0.5 : 0.02)) moving = true;
      c[key] += d * (key === "distance" || key === "tilt" ? k * 0.85 : k);
    }
    const tilt = THREE.MathUtils.degToRad(c.tilt + p.sy * 3);
    const turn = THREE.MathUtils.degToRad(c.turn + p.sx * 5);
    camera.position.set(
      c.x + c.distance * Math.sin(tilt) * Math.sin(turn),
      c.y - c.distance * Math.sin(tilt) * Math.cos(turn),
      c.distance * Math.cos(tilt),
    );
    camera.lookAt(c.x, c.y, 0);

    // Distritos: cor e altura entre o aviso e o risco; os outros esbatidos numa pÃ¡gina de distrito.
    const wRisk = focus ? 0 : (weights.risco ?? 0) + (weights.ar ?? 0) * 0.6;
    const wWarn = focus ? 0 : (weights.avisos ?? 0);
    const grow = reduced ? 1 : Math.min(1, Math.max(0, (now - born.current - 300) / 1600));
    if (grow < 1) moving = true;
    const growK = 1 - Math.pow(1 - grow, 3);
    for (const d of districts) {
      const level = levels[d.slug] ?? "unknown";
      const dim = focus !== undefined && focus !== d.slug;
      const rc = risk[d.slug] ?? 0;
      tmp.set(dim ? colors.dim : LAND[level]);
      if (rc > 0 && wRisk > 0) tmp.lerp(tmp2.set(riskColors[rc]!), wRisk);
      // Sem risco publicado (as ilhas): apagado, para não parecer um nível.
      else if (wRisk > 0) tmp.lerp(tmp2.set(colors.dim), wRisk);
      if (wWarn > 0 && level === "none") tmp.lerp(tmp2.set(colors.dim), wWarn * 0.7);
      const [top, wall] = materials.get(d.slug)!;
      top.color.copy(tmp);
      top.emissive.copy(tmp).multiplyScalar(theme === "dark" ? 0.38 : 0.08);
      wall.color.copy(tmp).multiplyScalar(0.5);
      const target =
        (dim ? 2 : LEVEL_HEIGHT[level]) * (1 - wRisk) + (rc > 0 ? rc * RISK_UNIT : 3) * wRisk;
      const l = lift.current.get(d.slug) ?? 0;
      const lt = pointed === d.slug ? LIFT : 0;
      const nl = l + (lt - l) * (reduced ? 1 : 1 - Math.exp(-dt * 12));
      if (Math.abs(lt - nl) > 0.05) moving = true;
      lift.current.set(d.slug, nl);
      const h = Math.max(0.01, target * growK);
      const prev = heights.current.get(d.slug) ?? h;
      const hh = prev + (h - prev) * (reduced ? 1 : 1 - Math.exp(-dt * 6));
      if (Math.abs(hh - h) > 0.05) moving = true;
      heights.current.set(d.slug, hh);
      const mesh = meshes.current.get(d.slug);
      if (mesh) {
        mesh.scale.z = hh;
        mesh.position.z = nl;
      }
      const e = edges.current.get(d.slug);
      if (e) e.position.z = hh + nl + 0.1;
    }

    // Colunas de luz (incÃªndios) e anÃ©is (sismos): mais vivos na sua secÃ§Ã£o.
    const fireVis = focus
      ? 1
      : 0.35 + 0.65 * Math.min(1, (weights.incendios ?? 0) * 1.4 + (weights.hero ?? 0) * 0.4);
    const quakeVis = focus
      ? 1
      : 0.3 + 0.7 * Math.min(1, (weights.sismos ?? 0) * 1.4 + (weights.hero ?? 0) * 0.3);
    beams.current?.children.forEach((g, i) => {
      const f = fires[i];
      if (!f) return;
      const base = heights.current.get(f.slug ?? "") ?? 0;
      g.position.z = base;
      g.children.forEach((m) => {
        const mat = (m as THREE.Mesh).material as THREE.MeshBasicMaterial;
        mat.opacity = (m.userData.glow ? 0.35 : 0.9) * fireVis * growK;
      });
    });
    rings.current?.children.forEach((m, i) => {
      const q = quakes[i];
      if (!q) return;
      m.position.z = (heights.current.get(q.slug ?? "") ?? 0) + 0.6;
      ((m as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = quakeVis * growK;
    });

    // Etiquetas em HTML: nomes das caixas das ilhas (sÃ³ onde as ilhas sÃ£o o assunto,
    // para nÃ£o atravessarem os painÃ©is) e o distrito apontado.
    const islandsShown = focus
      ? Number(focus === "acores" || focus === "madeira")
      : Math.min(1, (weights.sismos ?? 0) * 1.6);
    const root = labels.current;
    if (root) {
      for (const el of root.querySelectorAll<HTMLElement>("[data-x]")) {
        const [wx, wy] = toWorld(Number(el.dataset.x), Number(el.dataset.y));
        const z = el.dataset.slug ? (heights.current.get(el.dataset.slug) ?? 0) + 20 : 0;
        v.set(wx, wy, z).project(camera);
        const visible = v.z < 1;
        el.style.opacity = !visible ? "0" : el.dataset.slug ? "1" : String(islandsShown);
        el.style.transform = `translate(${(((v.x + 1) / 2) * size.width).toFixed(1)}px, ${(((1 - v.y) / 2) * size.height).toFixed(1)}px)`;
      }
    }

    if (!ready.current) {
      ready.current = true;
      onReady();
    }
    if (moving) invalidate();
  });

  return (
    <>
      <hemisphereLight args={[colors.sky, colors.soil, theme === "dark" ? 1.35 : 1.6]} />
      <directionalLight position={[-900, 1400, 1800]} intensity={theme === "dark" ? 2.2 : 1.6} />
      <mesh position={[0, 0, -2]}>
        <planeGeometry args={[12000, 12000]} />
        <meshBasicMaterial color={colors.ground} />
      </mesh>
      <lineSegments geometry={grid}>
        <lineBasicMaterial color={colors.grid} transparent opacity={colors.gridOpacity} />
      </lineSegments>
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
              scale={[1, 1, 0.01]}
              onPointerOver={(e: ThreeEvent<PointerEvent>) => {
                e.stopPropagation();
                onHover(d.slug);
              }}
              onPointerOut={() => onHover(null)}
              onClick={(e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation();
                onOpen(d.slug);
              }}
            />
            <group
              ref={(g) => {
                if (g) edges.current.set(d.slug, g);
                else edges.current.delete(d.slug);
              }}
            >
              {(pointed === d.slug || focus === d.slug
                ? (accent.get(d.slug) ?? [])
                : (outlines.get(d.slug) ?? [])
              ).map((l, i) => (
                <primitive key={i} object={l} />
              ))}
            </group>
          </group>
        ))}
        <group ref={beams}>
          {fires.map((f) => (
            <group key={f.id} position={[f.x, f.y, 0]}>
              <mesh
                geometry={beamGeo}
                rotation-x={Math.PI / 2}
                scale={[1, 34 + Math.sqrt(f.people) * 7, 1]}
                position-z={(34 + Math.sqrt(f.people) * 7) / 2}
              >
                <meshBasicMaterial
                  color="#ff6a2a"
                  transparent
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                />
              </mesh>
              <mesh geometry={glowGeo} scale={12} position-z={0.5} userData={{ glow: true }}>
                <meshBasicMaterial
                  color="#ff6a2a"
                  transparent
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                />
              </mesh>
            </group>
          ))}
        </group>
        <group ref={rings}>
          {quakes.map((q) => (
            <mesh
              key={q.id}
              geometry={ringGeo}
              position={[q.x, q.y, 0]}
              scale={10 + Math.max(0, q.magnitude - 2) * 7}
            >
              <meshBasicMaterial
                color={colors.accent}
                transparent
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
          ))}
        </group>
      </group>
    </>
  );
}

export default function PortugalScene({
  levels,
  risk,
  fires,
  quakes,
  focus,
  pointed,
  onPoint,
  onOpen,
  onReady,
  onFailed,
  regionLabels,
  pointedLabel,
}: {
  levels: Record<string, MapLevel>;
  /** Classe de risco de incÃªndio mais alta de hoje em cada distrito (0 sem dados). */
  risk: Record<string, number>;
  fires: SceneFire[];
  quakes: SceneQuake[];
  /** PÃ¡gina de um distrito: a cÃ¢mara vai atÃ© ele e os outros ficam esbatidos. */
  focus?: string;
  pointed: string | null;
  onPoint: (slug: string | null) => void;
  onOpen: (slug: string) => void;
  onReady: () => void;
  onFailed: () => void;
  regionLabels: { acores: string; madeira: string };
  /** Nome e nÃ­vel do distrito apontado, para a etiqueta que flutua sobre ele. */
  pointedLabel?: { name: string; level: string };
}) {
  const theme = useResolvedTheme();
  const labels = useRef<HTMLDivElement>(null);
  const [reduced] = useState(() => prefersReducedMotion());
  const [hovering, setHovering] = useState(false);
  const districts = useMemo(() => buildDistricts(), []);
  useEffect(() => () => districts.forEach((d) => d.geometry.dispose()), [districts]);
  const anchor = pointed ? districts.find((d) => d.slug === pointed)?.anchor : undefined;

  return (
    <div className="absolute inset-0" style={{ cursor: hovering ? "pointer" : undefined }}>
      <Canvas
        frameloop="demand"
        flat
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ fov: 32, near: 10, far: 9000, position: [0, -2000, 2000] }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", () => onFailed());
        }}
        aria-hidden
      >
        <Scene
          districts={districts}
          levels={levels}
          risk={risk}
          fires={fires}
          quakes={quakes}
          focus={focus}
          pointed={pointed}
          theme={theme}
          reduced={reduced}
          onHover={(slug) => {
            setHovering(slug !== null);
            onPoint(slug);
          }}
          onOpen={onOpen}
          onReady={onReady}
          labels={labels}
        />
      </Canvas>
      <div
        ref={labels}
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {(["acores", "madeira"] as const).map((r) => {
          const [x, y] = mapFrames[r];
          return (
            <span
              key={r}
              data-x={x + 4}
              data-y={y - 14}
              className="absolute top-0 left-0 kicker whitespace-nowrap"
              style={{ translate: "0 -100%" }}
            >
              {regionLabels[r]}
            </span>
          );
        })}
        {anchor && pointedLabel ? (
          <span
            key={pointed}
            data-x={anchor[0]}
            data-y={anchor[1]}
            data-slug={pointed ?? undefined}
            className="caption-in absolute top-0 left-0 flex flex-col rounded-xl px-3 py-1.5 whitespace-nowrap glass-strong"
            style={{ translate: "-50% -110%" }}
          >
            <span className="font-display text-base font-semibold text-ink">
              {pointedLabel.name}
            </span>
            <span className="kicker">{pointedLabel.level}</span>
          </span>
        ) : null}
      </div>
    </div>
  );
}
