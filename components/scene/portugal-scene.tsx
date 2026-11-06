"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";

import { mapFrames, mapShapes } from "@/data/map-shapes";
import { useResolvedTheme } from "@/lib/hooks/external";
import { prefersReducedMotion } from "@/lib/hooks/webgl";
import { cn } from "@/lib/utils";

import type { MapLevel } from "../boletim/bulletin-map";
import { riskColors } from "../cards/fire-risk";

/*
 * A cena da página inicial: Portugal em relevo, sozinho no escuro, com a
 * cor e a altura de cada distrito a repetir o nível de aviso. É fixa
 * atrás da página; cada secção (marcada com data-scene) tem uma posição
 * de câmara, e a câmara viaja entre elas conforme o scroll, com um leve
 * paralaxe ao rato. Na secção do risco, os distritos mudam para a cor e a
 * altura do risco de incêndio. Só desenha quando algo muda; nada se move
 * sozinho depois da entrada. Com "reduzir movimento", a câmara fica na
 * vista geral e as mudanças são imediatas.
 *
 * Em ecrãs estreitos os painéis ocupam a largura toda; por isso cada
 * secção tem por cima do painel um espaço vazio (marcado com
 * data-scene-frame) e a câmara enquadra o assunto nesse espaço: a
 * distância é a que o faz caber lá e o alvo vai para o centro dele.
 */

/** Uma vista da câmara: alvo (no plano do mapa), distância e ângulos. */
interface View {
  x: number;
  y: number;
  distance: number;
  /** Inclinação a partir da vertical, em graus. */
  tilt: number;
  /** Rotação à volta do alvo, em graus (0 = de sul para norte). */
  turn: number;
}
interface Shot extends View {
  /** Altura do ecrã (0 em cima, 1 em baixo) onde fica o alvo. */
  fy: number;
}

export type SceneKey = "hero" | "avisos" | "incendios" | "sismos" | "risco" | "ar" | "distritos";

/** Abaixo desta largura os painéis não ficam ao lado do mapa (o lg do Tailwind). */
const NARROW_MAX = 1024;
/** Campo de visão vertical da câmara, em graus. */
const FOV = 32;

/** As vistas de cada secção, em unidades do mapa (o viewBox do boletim, centrado). */
const SHOTS: Record<SceneKey, View> = {
  hero: { x: 0, y: -20, distance: 1700, tilt: 42, turn: -8 },
  avisos: { x: -10, y: 60, distance: 1250, tilt: 50, turn: 10 },
  incendios: { x: 20, y: 270, distance: 950, tilt: 56, turn: 20 },
  sismos: { x: -470, y: 60, distance: 1050, tilt: 56, turn: -22 },
  risco: { x: -10, y: 0, distance: 1350, tilt: 28, turn: 4 },
  ar: { x: -20, y: -20, distance: 1400, tilt: 30, turn: -6 },
  distritos: { x: 60, y: 0, distance: 2200, tilt: 18, turn: 0 },
};

/** O que cada secção mostra em ecrãs estreitos: centro e tamanho (w × h) no mundo da cena. */
interface Subject {
  x: number;
  y: number;
  w: number;
  h: number;
  tilt: number;
  turn: number;
}

/*
 * Mundo da cena: o continente vai de x ≈ -75 a 400 e de y ≈ -480 a 480;
 * a caixa dos Açores está centrada em (-260, 40) e a da Madeira em (-245, -310).
 */
const SUBJECTS: Record<SceneKey, Subject> = {
  hero: { x: -10, y: 0, w: 860, h: 1000, tilt: 36, turn: -6 },
  avisos: { x: 160, y: 10, w: 500, h: 980, tilt: 44, turn: 8 },
  incendios: { x: 170, y: 250, w: 580, h: 520, tilt: 50, turn: 16 },
  sismos: { x: -250, y: 50, w: 440, h: 380, tilt: 50, turn: -18 },
  risco: { x: 160, y: 0, w: 500, h: 980, tilt: 26, turn: 4 },
  ar: { x: 160, y: 0, w: 500, h: 980, tilt: 30, turn: -6 },
  distritos: { x: -10, y: 0, w: 860, h: 1000, tilt: 18, turn: 0 },
};

/** Um espaço para o mapa, em fração da altura do ecrã: centro (c) e altura (b). */
interface Frame {
  c: number;
  b: number;
}

function frameOf(el: Element | null): Frame | undefined {
  if (!el) return undefined;
  const r = el.getBoundingClientRect();
  if (r.height === 0) return undefined;
  return { c: (r.top + r.height / 2) / innerHeight, b: r.height / innerHeight };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * A vista que põe o assunto dentro do espaço: longe o bastante para caber
 * na largura do ecrã e na altura do espaço, com o alvo no centro do espaço.
 * Quando o espaço sai do ecrã, o alvo fica no alto (fy ≥ 0.2) e o painel
 * passa por cima.
 */
function frameShot(s: Subject, frame: Frame | undefined, aspect: number): Shot {
  const f = frame ?? { c: 0.45, b: 0.5 };
  const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const b = clamp(f.b, 0.2, 0.6);
  const byWidth = s.w / 2 / (tan * aspect);
  const byHeight = (s.h * Math.cos(THREE.MathUtils.degToRad(s.tilt))) / 2 / (tan * b);
  return {
    x: s.x,
    y: s.y,
    distance: Math.max(byWidth, byHeight) * 1.1,
    tilt: s.tilt,
    turn: s.turn,
    fy: clamp(f.c, 0.2, 0.75),
  };
}

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
    // O mapa é espelhado em Y (o SVG cresce para baixo).
    side: THREE.DoubleSide,
  });
  return rings.map((ring) => {
    const geometry = new LineGeometry();
    geometry.setPositions([...ring, ring[0]!].flatMap((p) => [p.x, p.y, 0]));
    return new Line2(geometry, material);
  });
}

type Weights = Partial<Record<SceneKey, number>>;

/**
 * Pesos de cada secção visível (quanto mais perto do centro do ecrã, mais
 * pesa) e o espaço para o mapa de cada secção, quando o tem.
 */
function sectionWeights(): { weights: Weights; frames: Partial<Record<SceneKey, Frame>> } {
  const weights: Weights = {};
  const frames: Partial<Record<SceneKey, Frame>> = {};
  const mid = innerHeight / 2;
  let total = 0;
  for (const el of document.querySelectorAll<HTMLElement>("[data-scene]")) {
    const key = el.dataset.scene as SceneKey;
    const r = el.getBoundingClientRect();
    if (r.height === 0) continue;
    const frame = frameOf(el.querySelector("[data-scene-frame]"));
    if (frame) frames[key] = frame;
    const center = Math.min(
      Math.max(mid, r.top + 0.35 * innerHeight),
      r.bottom - 0.35 * innerHeight,
    );
    const w = Math.max(0, 1 - Math.abs(center - mid) / (innerHeight * 0.75));
    if (w <= 0) continue;
    weights[key] = (weights[key] ?? 0) + w;
    total += w;
  }
  if (total === 0) return { weights: { hero: 1 }, frames };
  for (const k of Object.keys(weights) as SceneKey[]) weights[k]! /= total;
  return { weights, frames };
}

function mix(parts: [Shot, number][]): Shot {
  const s: Shot = { x: 0, y: 0, distance: 0, tilt: 0, turn: 0, fy: 0 };
  for (const [shot, w] of parts)
    for (const key of ["x", "y", "distance", "tilt", "turn", "fy"] as const)
      s[key] += shot[key] * w;
  return s;
}

/** Ecrãs largos: o painel fica à esquerda e o assunto à direita do centro. */
function blendShots(weights: Weights, wide: boolean): Shot {
  const s = mix(
    (Object.entries(weights) as [SceneKey, number][]).map(([k, w]) => [
      { ...SHOTS[k], fy: 0.5 },
      w,
    ]),
  );
  // Largo mas ao alto (um tablet grande ao alto): o mapa vai ao centro e afasta-se.
  if (!wide) {
    s.x += 150;
    s.distance *= 1.55;
  }
  return s;
}

/** Ecrãs estreitos: cada assunto enquadrado no espaço da sua secção. */
function narrowShots(
  weights: Weights,
  frames: Partial<Record<SceneKey, Frame>>,
  aspect: number,
): Shot {
  return mix(
    (Object.entries(weights) as [SceneKey, number][]).map(([k, w]) => [
      frameShot(SUBJECTS[k], frames[k], aspect),
      w,
    ]),
  );
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
  /** Rato por cima de um distrito (ou de nenhum). */
  onHover: (slug: string | null) => void;
  /** Toque (dedo ou caneta) num distrito. */
  onTap: (slug: string) => void;
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
  onTap,
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
  // O último toque num distrito foi com o dedo ou caneta (e não com o rato)?
  const touch = useRef(false);
  const tmp = useMemo(() => new THREE.Color(), []);
  const tmp2 = useMemo(() => new THREE.Color(), []);
  const v = useMemo(() => new THREE.Vector3(), []);

  // A câmara olha de cima para baixo com o norte para cima: o "up" é o eixo z.
  useEffect(() => {
    const { camera, scene } = get();
    camera.up.set(0, 0, 1);
    scene.fog = new THREE.Fog(colors.bg, 1400, 5200);
    scene.background = null;
    invalidate();
  }, [get, invalidate, colors.bg]);

  // Scroll, rato e tamanho: a cena só desenha quando algo muda.
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

  // Chão: uma grelha fina que se perde no nevoeiro.
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

  const aspect = size.width / Math.max(1, size.height);
  const narrow = size.width < NARROW_MAX;
  const wide = aspect > 1.05;
  const focusAnchor = useMemo(() => {
    const d = districts.find((x) => x.slug === focus);
    return d ? toWorld(d.anchor[0], d.anchor[1]) : null;
  }, [districts, focus]);

  useFrame(({ camera, scene }, delta) => {
    const now = performance.now();
    if (born.current === null) born.current = now;
    let moving = false;
    const dt = Math.min(delta, 0.1);
    const k = reduced ? 1 : 1 - Math.exp(-dt * 3.2);

    // Pesos das secções e a vista que lhes corresponde.
    const { weights, frames } = focus
      ? { weights: { hero: 1 } as Weights, frames: {} }
      : sectionWeights();
    // Com "reduzir movimento", a câmara fica na vista geral.
    const shown: Weights = reduced ? { hero: 1 } : weights;
    const focusFrame = focusAnchor
      ? frameOf(document.querySelector("[data-scene-frame]"))
      : undefined;
    let goal: Shot;
    if (focusAnchor) {
      const [x, y] = focusAnchor;
      goal = narrow
        ? frameShot({ x, y, w: 380, h: 420, tilt: 48, turn: -12 }, focusFrame, aspect)
        : {
            x: x - (wide ? 120 : 0),
            y: y - 60,
            distance: wide ? 900 : 1300,
            tilt: 48,
            turn: -12,
            fy: 0.5,
          };
    } else goal = narrow ? narrowShots(shown, frames, aspect) : blendShots(shown, wide);
    if (!narrow) {
      // Ecrãs largos: o cabeçalho fica fixo no topo; o país centra-se no que sobra
      // por baixo dele e afasta-se um pouco, para o norte não ficar tapado.
      const header = document.querySelector("[data-site-header]")?.getBoundingClientRect();
      const covered = clamp((header?.bottom ?? 0) / size.height, 0, 0.4);
      goal.fy = 0.5 + covered / 2;
      goal.distance *= 1 + covered / 2;
    }
    // Ecrãs estreitos: até onde vai o espaço do mapa (as etiquetas das ilhas não descem
    // para baixo dos painéis).
    let bandBottom = Infinity;
    if (narrow) {
      const bottom = (f?: Frame) => (f ? f.c + f.b / 2 : 1);
      bandBottom = focusAnchor
        ? bottom(focusFrame)
        : (Object.entries(shown) as [SceneKey, number][]).reduce(
            (s, [key, w]) => s + w * bottom(frames[key]),
            0,
          );
    }
    const p = pointer.current;
    p.sx += (p.x - p.sx) * k;
    p.sy += (p.y - p.sy) * k;
    if (Math.abs(p.x - p.sx) + Math.abs(p.y - p.sy) > 0.002) moving = true;

    // A entrada: a câmara parte de cima e de longe, e desce até à primeira vista.
    if (!cam.current)
      cam.current = reduced
        ? { ...goal }
        : { ...goal, distance: goal.distance * 1.9, tilt: 6, turn: goal.turn - 40 };
    const c = cam.current;
    for (const key of ["x", "y", "distance", "tilt", "turn", "fy"] as const) {
      const d = goal[key] - c[key];
      if (Math.abs(d) > (key === "distance" ? 0.5 : key === "fy" ? 0.0005 : 0.02)) moving = true;
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
    // O alvo à altura fy do ecrã: desloca-se a imagem (como uma objetiva descentrada), sem mudar a perspetiva.
    const lens = camera as THREE.PerspectiveCamera;
    const shift = (0.5 - c.fy) * size.height;
    if (Math.abs(shift) > 0.5)
      lens.setViewOffset(size.width, size.height, 0, shift, size.width, size.height);
    else if (lens.view?.enabled) lens.clearViewOffset();
    // De mais longe (em ecrãs estreitos), o nevoeiro recua para o país não se apagar.
    if (scene.fog instanceof THREE.Fog) {
      const far = narrow ? Math.max(1, c.distance / 1900) : 1;
      scene.fog.near = 1400 * far;
      scene.fog.far = 5200 * far;
    }

    // Distritos: cor e altura entre o aviso e o risco; os outros esbatidos numa página de distrito.
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

    // Colunas de luz (incêndios) e anéis (sismos): mais vivos na sua secção.
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

    // Etiquetas em HTML: nomes das caixas das ilhas (só onde as ilhas são o assunto,
    // para não atravessarem os painéis) e o distrito apontado.
    const islandsShown = focus
      ? Number(focus === "acores" || focus === "madeira")
      : Math.min(1, (weights.sismos ?? 0) * 1.6);
    const root = labels.current;
    if (root) {
      for (const el of root.querySelectorAll<HTMLElement>("[data-x]")) {
        const [wx, wy] = toWorld(Number(el.dataset.x), Number(el.dataset.y));
        const z = el.dataset.slug ? (heights.current.get(el.dataset.slug) ?? 0) + 20 : 0;
        v.set(wx, wy, z).project(camera);
        const sx = ((v.x + 1) / 2) * size.width;
        const sy = ((1 - v.y) / 2) * size.height;
        const visible = v.z < 1;
        const inBand = sy <= bandBottom * size.height;
        el.style.opacity = !visible
          ? "0"
          : el.dataset.slug
            ? "1"
            : String(inBand ? islandsShown : 0);
        el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`;
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
              onPointerDown={(e: ThreeEvent<PointerEvent>) => {
                touch.current = e.pointerType !== "mouse";
              }}
              // Com o dedo não há "passar por cima": ao levantar o dedo viria logo o "sair".
              onPointerOver={(e: ThreeEvent<PointerEvent>) => {
                if (e.pointerType !== "mouse") return;
                e.stopPropagation();
                onHover(d.slug);
              }}
              onPointerOut={(e: ThreeEvent<PointerEvent>) => {
                if (e.pointerType === "mouse") onHover(null);
              }}
              onClick={(e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation();
                if (touch.current) onTap(d.slug);
                else onOpen(d.slug);
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
  /** Classe de risco de incêndio mais alta de hoje em cada distrito (0 sem dados). */
  risk: Record<string, number>;
  fires: SceneFire[];
  quakes: SceneQuake[];
  /** Página de um distrito: a câmara vai até ele e os outros ficam esbatidos. */
  focus?: string;
  pointed: string | null;
  onPoint: (slug: string | null) => void;
  onOpen: (slug: string) => void;
  onReady: () => void;
  onFailed: () => void;
  regionLabels: { acores: string; madeira: string };
  /**
   * Nome e nível do distrito apontado, para a etiqueta que flutua sobre ele;
   * "open" é o texto da ação que aparece quando foi apontado com o dedo.
   */
  pointedLabel?: { name: string; level: string; open: string };
}) {
  const theme = useResolvedTheme();
  const labels = useRef<HTMLDivElement>(null);
  const [reduced] = useState(() => prefersReducedMotion());
  const [hovering, setHovering] = useState(false);
  // O distrito apontado foi tocado com o dedo: a etiqueta leva a ação "Abrir".
  const [tapped, setTapped] = useState(false);
  const districts = useMemo(() => buildDistricts(), []);
  useEffect(() => () => districts.forEach((d) => d.geometry.dispose()), [districts]);
  const anchor = pointed ? districts.find((d) => d.slug === pointed)?.anchor : undefined;
  const tappedLabel = tapped && pointed !== null;

  return (
    <div className="absolute inset-0" style={{ cursor: hovering ? "pointer" : undefined }}>
      <Canvas
        frameloop="demand"
        flat
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ fov: FOV, near: 10, far: 9000, position: [0, -2000, 2000] }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", () => onFailed());
        }}
        // Um toque fora do país esquece o distrito tocado.
        onPointerMissed={() => {
          if (!tapped) return;
          setTapped(false);
          onPoint(null);
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
            setTapped(false);
            onPoint(slug);
          }}
          // Com o dedo, o primeiro toque mostra o distrito e o segundo abre-o.
          onTap={(slug) => {
            if (tapped && pointed === slug) return onOpen(slug);
            setTapped(true);
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
          // Tocada com o dedo, a etiqueta também abre o distrito (o segundo toque no mapa faz o mesmo).
          <span
            key={pointed}
            data-x={anchor[0]}
            data-y={anchor[1]}
            data-slug={pointed ?? undefined}
            className={cn(
              "caption-in absolute top-0 left-0 flex flex-col rounded-xl px-3 py-1.5 whitespace-nowrap glass-strong",
              tappedLabel && "pointer-events-auto min-h-11 cursor-pointer",
            )}
            style={{ translate: "-50% -110%" }}
            onClick={tappedLabel ? () => onOpen(pointed) : undefined}
          >
            <span className="font-display text-base font-semibold text-ink">
              {pointedLabel.name}
            </span>
            <span className="kicker">{pointedLabel.level}</span>
            {tappedLabel ? (
              <span className="mt-1 inline-flex items-center gap-1 font-display text-sm font-semibold text-accent">
                {pointedLabel.open} <ArrowRight className="size-3.5" />
              </span>
            ) : null}
          </span>
        ) : null}
      </div>
    </div>
  );
}
