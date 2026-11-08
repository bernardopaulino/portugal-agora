"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ChevronsDown, ChevronsUp, Minus, Plus, RotateCcw, RotateCw, Undo2 } from "lucide-react";
import {
  Component,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import * as THREE from "three";

import { getDistrict, type Region } from "@/data/districts";
import { boundsCenter, depthBoundsFor, inBounds, localProjection } from "@/lib/geo/projection";
import { DEPTH_EXAGGERATION, depthGrid, quakeRadiusPx } from "@/lib/geo/scales";
import { useResolvedTheme } from "@/lib/hooks/external";
import { cameraDuration, prefersReducedMotion } from "@/lib/hooks/webgl";
import { useI18n } from "@/lib/i18n/client";
import type { EarthquakeEvent } from "@/lib/sources/types";

import { isSameSelection, type OnSelect, type Selection } from "../cards/types";
import { mapColors } from "../status/severity";

/*
 * Vista "Profundidade" do mapa dos sismos: um bloco de crosta da região,
 * com o nível do mar como plano translúcido, os limites dos distritos por
 * cima e cada sismo à sua profundidade, por baixo do epicentro. Só desenha
 * quando algo muda (frameloop="demand"); a câmara só se move quando a
 * pessoa a move ou escolhe um sismo. Carregada só quando se escolhe 3D,
 * para o three nunca entrar nas outras páginas.
 */

type Ring = number[][];
type DistrictCollection = GeoJSON.FeatureCollection<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  { slug: string; region: string }
>;

const DAY_MS = 86_400_000;

/** Corta o segmento (x1,z1)–(x2,z2) ao retângulo |x| ≤ hw, |z| ≤ hd (Liang–Barsky). */
function clipSegment(
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  hw: number,
  hd: number,
): [number, number, number, number] | null {
  const dx = x2 - x1;
  const dz = z2 - z1;
  let t0 = 0;
  let t1 = 1;
  const edges: [number, number][] = [
    [-dx, x1 + hw],
    [dx, hw - x1],
    [-dz, z1 + hd],
    [dz, hd - z1],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return null;
      continue;
    }
    const r = q / p;
    if (p < 0) {
      if (r > t1) return null;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return null;
      if (r < t1) t1 = r;
    }
  }
  return [x1 + t0 * dx, z1 + t0 * dz, x1 + t1 * dx, z1 + t1 * dz];
}
const FOV = 35;
const POLAR_MIN = THREE.MathUtils.degToRad(8);
const POLAR_MAX = THREE.MathUtils.degToRad(80);
const ROTATE_STEP = THREE.MathUtils.degToRad(15);
const TILT_STEP = THREE.MathUtils.degToRad(8);
const ZOOM_STEP = 1.25;
const DEFAULT_AZIMUTH = THREE.MathUtils.degToRad(-20);
const DEFAULT_POLAR = THREE.MathUtils.degToRad(55);

/** Cores da cena por tema (as dos níveis vêm de mapColors, como no 2D). */
const palettes = {
  light: {
    sea: "#5d9fd0",
    seaOpacity: 0.28,
    line: "#44596a",
    lineSoft: "#7d8f9e",
    focus: "#0d2b3a",
    ink: "#0a1d2e",
    accent: "#0b5cad",
  },
  dark: {
    sea: "#3a7fbf",
    seaOpacity: 0.3,
    line: "#a3b5bf",
    lineSoft: "#6f8594",
    focus: "#e3ecf0",
    ink: "#e3ecf0",
    accent: "#7fc7ff",
  },
} as const;

interface View {
  target: THREE.Vector3;
  distance: number;
  azimuth: number;
  polar: number;
}

interface RigApi {
  orbit(dAzimuth: number, dPolar: number): void;
  zoom(factor: number): void;
  reset(duration: number): void;
}

/** Linhas a partir de uma lista de segmentos [x1,y1,z1,x2,y2,z2,…]. */
function segments(points: number[]): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  return g;
}

/** Geometria que se liberta quando muda ou quando a cena sai. */
function useGeometry(build: () => THREE.BufferGeometry, key: unknown): THREE.BufferGeometry {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const geometry = useMemo(() => build(), [key]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

function circle(): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)));
  }
  return new THREE.BufferGeometry().setFromPoints(points);
}

const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);
const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

/** A entrada da cena: a câmara desce de cima até à vista inicial. */
const ENTRY_MS = 1800;
/** Cada sismo afunda da superfície até à sua profundidade (depois de a câmara começar a descer). */
const SINK_DELAY_MS = 450;
const SINK_MS = 1200;

/** Câmara em órbita à volta de um alvo, com limites (nunca por baixo nem de pernas para o ar). */
function Rig({
  entryKey,
  apiRef,
  home,
  radius,
  focusPoint,
  onMove,
}: {
  /** Região (e distrito) da cena: a entrada da câmara toca uma vez por cada. */
  entryKey: string;
  apiRef: RefObject<RigApi | null>;
  /** Alvo da vista inicial. */
  home: THREE.Vector3;
  /** Raio da esfera que contém o bloco: dá a distância inicial e os limites do zoom. */
  radius: number;
  focusPoint: THREE.Vector3 | null;
  onMove: (duration: number) => void;
}) {
  // A câmara lê-se do estado na altura (get), não no render: é um objeto do three que se altera.
  const get = useThree((s) => s.get);
  const size = useThree((s) => s.size);
  const view = useRef<View | null>(null);
  const frame = useRef<number | null>(null);
  const touched = useRef(false);
  // Com um sismo escolhido, a imagem sobe: o painel de detalhe ocupa o fundo do mapa.
  const lift = useRef(0);

  const fitDistance = () => {
    const { width, height } = get().size;
    const aspect = width / Math.max(1, height);
    const vfov = THREE.MathUtils.degToRad(FOV);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    return (radius / Math.sin(Math.min(vfov, hfov) / 2)) * 1.02;
  };
  const homeView = (): View => ({
    target: home.clone(),
    distance: fitDistance(),
    azimuth: DEFAULT_AZIMUTH,
    polar: DEFAULT_POLAR,
  });

  const apply = () => {
    const v = view.current;
    if (!v) return;
    const { camera, invalidate } = get();
    const s = Math.sin(v.polar);
    camera.position.set(
      v.target.x + v.distance * s * Math.sin(v.azimuth),
      // Nunca abaixo do nível do mar.
      Math.max(radius * 0.02, v.target.y + v.distance * Math.cos(v.polar)),
      v.target.z + v.distance * s * Math.cos(v.azimuth),
    );
    const { width, height } = get().size;
    if (lift.current > 0)
      camera.setViewOffset(width, height, 0, height * lift.current, width, height);
    else camera.clearViewOffset();
    camera.near = radius / 200;
    camera.far = radius * 20;
    camera.updateProjectionMatrix();
    camera.lookAt(v.target);
    invalidate();
  };

  const stop = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  };

  const animateTo = (to: Partial<View>, duration: number, ease = easeOut) => {
    stop();
    const from = view.current ?? homeView();
    const goal: View = { ...from, ...to, target: (to.target ?? from.target).clone() };
    onMove(duration);
    if (duration <= 0) {
      view.current = goal;
      apply();
      return;
    }
    const start = performance.now();
    const startTarget = from.target.clone();
    const step = (now: number) => {
      const k = ease(Math.min(1, (now - start) / duration));
      view.current = {
        target: startTarget.clone().lerp(goal.target, k),
        distance: THREE.MathUtils.lerp(from.distance, goal.distance, k),
        azimuth: THREE.MathUtils.lerp(from.azimuth, goal.azimuth, k),
        polar: THREE.MathUtils.lerp(from.polar, goal.polar, k),
      };
      apply();
      frame.current = k < 1 ? requestAnimationFrame(step) : null;
    };
    frame.current = requestAnimationFrame(step);
  };

  // Vista inicial; volta a ela quando a região muda. Enquanto a pessoa não
  // mexer, acompanha o tamanho do mapa.
  useEffect(() => {
    // Durante uma viagem da câmara, ela própria acompanha o tamanho a cada fotograma.
    if (frame.current === null && (!view.current || !touched.current)) view.current = homeView();
    // Sempre: o desvio da imagem (lift) depende do tamanho.
    apply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height]);
  // A entrada: ao abrir (e ao mudar de região), a câmara parte de cima, mais
  // longe e rodada, e desce até à vista inicial; depois fica quieta.
  // Dois casos que não são "abrir":
  // - o bloco muda de tamanho com a cena à vista (chegam dados novos com outro
  //   sismo mais fundo): ajusta-se com uma viagem curta, sem voltar ao topo;
  // - a página volta a aparecer (o Next guarda escondidas as páginas já
  //   visitadas e mostra-as outra vez ao regressar): o efeito corre de novo
  //   com o mesmo bloco, e aí é uma entrada como as outras.
  const enteredKey = useRef<string | null>(null);
  const lastLayout = useRef<{ home: THREE.Vector3; radius: number } | null>(null);
  useEffect(() => {
    const layoutChanged =
      lastLayout.current !== null &&
      (lastLayout.current.home !== home || lastLayout.current.radius !== radius);
    lastLayout.current = { home, radius };
    if (enteredKey.current === entryKey && layoutChanged) {
      if (!touched.current) animateTo(homeView(), cameraDuration());
      return;
    }
    enteredKey.current = entryKey;
    touched.current = false;
    const h = homeView();
    if (prefersReducedMotion()) {
      view.current = h;
      apply();
      onMove(0);
      return;
    }
    view.current = {
      ...h,
      distance: h.distance * 1.7,
      azimuth: h.azimuth + THREE.MathUtils.degToRad(50),
      polar: POLAR_MIN,
    };
    apply();
    animateTo(h, ENTRY_MS, easeInOut);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [home, radius, entryKey]);

  // Escolher um sismo leva a câmara até ele; tirar a seleção volta à vista geral.
  const hadFocus = useRef(false);
  useEffect(() => {
    if (focusPoint) {
      hadFocus.current = true;
      lift.current = 0.2;
      touched.current = true;
      animateTo({ target: focusPoint, distance: radius * 0.9 }, cameraDuration());
    } else if (hadFocus.current) {
      hadFocus.current = false;
      lift.current = 0;
      const h = homeView();
      animateTo({ target: h.target, distance: h.distance }, cameraDuration());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusPoint]);

  useEffect(() => {
    apiRef.current = {
      orbit(dAzimuth, dPolar) {
        stop();
        touched.current = true;
        const v = view.current ?? homeView();
        view.current = {
          ...v,
          azimuth: v.azimuth + dAzimuth,
          polar: THREE.MathUtils.clamp(v.polar + dPolar, POLAR_MIN, POLAR_MAX),
        };
        apply();
      },
      zoom(factor) {
        stop();
        touched.current = true;
        const v = view.current ?? homeView();
        view.current = {
          ...v,
          distance: THREE.MathUtils.clamp(v.distance * factor, radius * 0.15, radius * 4),
        };
        apply();
      },
      reset(duration) {
        touched.current = false;
        animateTo(homeView(), duration);
      },
    };
    return () => {
      stop();
      apiRef.current = null;
    };
  });

  return null;
}

/** As etiquetas da grelha de profundidade são HTML: aqui só se calcula onde ficam. */
function LabelAnchors({
  labels,
  depths,
  halfW,
  halfD,
}: {
  labels: RefObject<(HTMLSpanElement | null)[]>;
  depths: number[];
  halfW: number;
  halfD: number;
}) {
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    // A aresta vertical do bloco mais perto da câmara (a da frente): as
    // etiquetas ficam à esquerda dela, sem se juntarem ao fundo.
    let best: [number, number] = [-halfW, halfD];
    let bestDistance = Infinity;
    for (const [x, z] of [
      [-halfW, -halfD],
      [halfW, -halfD],
      [-halfW, halfD],
      [halfW, halfD],
    ] as const) {
      const d = camera.position.distanceToSquared(v.set(x, 0, z));
      if (d < bestDistance) {
        bestDistance = d;
        best = [x, z];
      }
    }
    // Etiquetas que ficariam por cima da anterior escondem-se (a de 0 km fica sempre).
    let lastBottom = -Infinity;
    depths.forEach((depth, i) => {
      const el = labels.current[i];
      if (!el) return;
      v.set(best[0], -depth * DEPTH_EXAGGERATION, best[1]).project(camera);
      if (v.z > 1 || v.z < -1) {
        el.style.visibility = "hidden";
        return;
      }
      const sx = ((v.x + 1) / 2) * size.width;
      const sy = ((1 - v.y) / 2) * size.height;
      const x = Math.max(4, Math.min(sx - el.offsetWidth - 6, size.width - el.offsetWidth - 4));
      const top = sy - el.offsetHeight / 2;
      const visible = sy >= 0 && sy <= size.height && top >= lastBottom + 2;
      if (visible) lastBottom = top + el.offsetHeight;
      el.style.visibility = visible ? "visible" : "hidden";
      el.style.transform = `translate(${Math.round(x)}px, ${Math.round(sy - el.offsetHeight / 2)}px)`;
    });
  });
  return null;
}

interface Mark {
  id: string;
  position: THREE.Vector3;
  surface: THREE.Vector3;
  radius: number;
  color: string;
  opacity: number;
  felt: boolean;
  noDepth: boolean;
}

function Marks({
  marks,
  selectedId,
  hitRadius,
  ink,
  accent,
  onPick,
  onHover,
}: {
  marks: Mark[];
  selectedId: string | null;
  hitRadius: number;
  ink: string;
  accent: string;
  onPick: (id: string) => void;
  onHover: (hovering: boolean) => void;
}) {
  const sphere = useGeometry(() => new THREE.SphereGeometry(1, 24, 16), "sphere");
  const torus = useGeometry(() => new THREE.TorusGeometry(1, 0.09, 8, 48), "torus");
  const ring = useGeometry(circle, "circle");
  // Quando cada sismo apareceu (para afundar da superfície até à profundidade).
  const born = useRef(new Map<string, number>());
  const groups = useRef(new Map<string, THREE.Group>());
  const animate = useMemo(() => !prefersReducedMotion(), []);
  useFrame(({ invalidate }) => {
    const now = performance.now();
    let moving = false;
    for (const m of marks) {
      const g = groups.current.get(m.id);
      if (!g) continue;
      if (!born.current.has(m.id)) born.current.set(m.id, now);
      const k = animate
        ? Math.min(1, Math.max(0, (now - born.current.get(m.id)! - SINK_DELAY_MS) / SINK_MS))
        : 1;
      if (k < 1) moving = true;
      g.position.set(m.position.x, m.position.y * easeOut(k), m.position.z);
    }
    if (moving) invalidate();
  });
  const drops = useGeometry(
    () =>
      segments(
        marks
          .filter((m) => !m.noDepth)
          .flatMap((m) => [...m.surface.toArray(), ...m.position.toArray()]),
      ),
    marks,
  );

  return (
    <>
      <lineSegments geometry={drops}>
        <lineBasicMaterial color={ink} transparent opacity={0.3} />
      </lineSegments>
      {marks.map((m) => {
        const selected = m.id === selectedId;
        return (
          <group
            key={m.id}
            ref={(g) => {
              if (g) groups.current.set(m.id, g);
              else groups.current.delete(m.id);
            }}
          >
            <mesh geometry={sphere} scale={m.radius} renderOrder={2}>
              <meshLambertMaterial
                color={m.color}
                transparent
                opacity={selected ? 1 : m.opacity}
                depthWrite={false}
              />
            </mesh>
            {selected ? (
              <mesh geometry={sphere} scale={m.radius * 1.25}>
                <meshBasicMaterial color={accent} side={THREE.BackSide} />
              </mesh>
            ) : null}
            {m.felt ? (
              <mesh geometry={torus} scale={m.radius * 1.7} rotation-x={Math.PI / 2}>
                <meshBasicMaterial color={ink} />
              </mesh>
            ) : null}
            {m.noDepth ? (
              <lineLoop
                geometry={ring}
                scale={m.radius * 1.35}
                onUpdate={(line) => line.computeLineDistances()}
              >
                <lineDashedMaterial color={ink} dashSize={0.3} gapSize={0.22} />
              </lineLoop>
            ) : null}
            {/* Área de toque maior do que a esfera, invisível. */}
            <mesh
              geometry={sphere}
              scale={Math.max(m.radius * 1.3, hitRadius)}
              onClick={(e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation();
                onPick(m.id);
              }}
              onPointerOver={(e: ThreeEvent<PointerEvent>) => {
                e.stopPropagation();
                onHover(true);
              }}
              onPointerOut={() => onHover(false)}
            >
              <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

/** Sem WebGL a meio (erro ao criar o contexto ou ao desenhar): volta ao mapa. */
class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function QuakeDepth({
  quakes,
  region,
  focus,
  selection,
  onSelect,
  onClear,
  generatedAt,
  onFailed,
}: {
  /** Os sismos da página (num distrito, só os dele). */
  quakes: EarthquakeEvent[];
  region: Region;
  /** Distrito da página: o seu contorno fica mais forte. */
  focus?: string;
  selection: Selection | null;
  onSelect: OnSelect;
  onClear: () => void;
  generatedAt: string;
  /** O WebGL falhou ou perdeu o contexto: o mapa 2D volta. */
  onFailed: () => void;
}) {
  const { t } = useI18n();
  const theme = useResolvedTheme();
  const palette = palettes[theme];
  const levelColors = mapColors[theme];
  const hintId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const rig = useRef<RigApi | null>(null);
  const labels = useRef<(HTMLSpanElement | null)[]>([]);
  const [districts, setDistricts] = useState<DistrictCollection | null>(null);
  const [hovering, setHovering] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    fetch("/geo/distritos.json")
      .then((r) => r.json())
      .then((g: DistrictCollection) => mounted.current && setDistricts(g))
      .catch(() => {});
    return () => {
      mounted.current = false;
    };
  }, []);

  // Numa página de distrito, o bloco é o do distrito, não o da região inteira.
  const bounds = depthBoundsFor(region, focus);
  const projection = useMemo(
    () => localProjection(boundsCenter(bounds), DEPTH_EXAGGERATION),
    [bounds],
  );
  const toScene = (lonLat: [number, number], depth?: number | null) => {
    const p = projection.project(lonLat, depth);
    return new THREE.Vector3(p.east, p.up, -p.north);
  };

  const corner = projection.project(bounds[1]);
  const halfW = corner.east;
  const halfD = corner.north;
  const span = Math.max(halfW, halfD) * 2;
  const kmPerPx = span / 800;

  const shown = quakes.filter(
    (q) => q.coordinates && q.place.region === region && inBounds(q.coordinates, bounds),
  );
  const depths = shown.flatMap((q) => (q.depthKm === null ? [] : [q.depthKm]));
  const deepest = depths.length > 0 ? Math.max(...depths) : null;
  const grid = depthGrid(deepest ?? 0);
  const bottom = grid[grid.length - 1]! * DEPTH_EXAGGERATION;
  const radius = 0.5 * Math.hypot(halfW * 2, halfD * 2, bottom);

  const now = Date.parse(generatedAt);
  const marks: Mark[] = shown.map((q) => {
    const age = Math.min(1, Math.max(0, (now - Date.parse(q.occurredAt)) / (7 * DAY_MS)));
    return {
      id: q.id,
      position: toScene(q.coordinates!, q.depthKm),
      surface: toScene(q.coordinates!),
      radius: quakeRadiusPx(q.magnitude) * kmPerPx,
      color: q.severity === "none" ? levelColors.info : levelColors[q.severity],
      opacity: 0.95 - age * 0.5,
      felt: q.felt,
      noDepth: q.depthKm === null,
    };
  });
  const marksKey = JSON.stringify(marks.map((m) => [m.id, m.position.toArray()]));
  const stableMarks = useMemo(
    () => marks,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [marksKey, theme],
  );

  const selectedId = selection?.type === "event" ? selection.id : null;
  const selectedMark = marks.find((m) => m.id === selectedId);
  const focusKey = selectedMark ? selectedMark.position.toArray().join(",") : "";
  const focusPoint = useMemo(
    () => (selectedMark ? selectedMark.position.clone() : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [focusKey],
  );
  const home = useMemo(() => new THREE.Vector3(0, -bottom * 0.35, 0), [bottom]);

  // Limites dos distritos da região, à superfície.
  const boundaryKey = `${region}|${districts ? "geo" : ""}|${focus ?? ""}`;
  const [boundaryLines, focusLines] = useMemo(() => {
    const all: number[] = [];
    const focused: number[] = [];
    for (const f of districts?.features ?? []) {
      if (f.properties.region !== region) continue;
      const out = f.properties.slug === focus ? focused : all;
      const polygons: Ring[][] =
        f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
      for (const polygon of polygons)
        for (const ring of polygon)
          for (let i = 1; i < ring.length; i++) {
            const a = toScene(ring[i - 1] as [number, number]);
            const b = toScene(ring[i] as [number, number]);
            // Os distritos vizinhos são cortados à borda do bloco.
            const seg = clipSegment(a.x, a.z, b.x, b.z, halfW, halfD);
            if (seg) out.push(seg[0], 0, seg[1], seg[2], 0, seg[3]);
          }
    }
    return [all, focused];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundaryKey]);
  const boundaries = useGeometry(() => segments(boundaryLines), boundaryLines);
  const focusBoundary = useGeometry(() => segments(focusLines), focusLines);

  // Arestas do bloco e linhas da grelha de profundidade à volta dele.
  const blockKey = `${halfW}|${halfD}|${grid.join(",")}`;
  const block = useGeometry(() => {
    const p: number[] = [];
    const corners = [
      [-halfW, -halfD],
      [halfW, -halfD],
      [halfW, halfD],
      [-halfW, halfD],
    ] as const;
    for (const depth of grid) {
      const y = -depth * DEPTH_EXAGGERATION;
      for (let i = 0; i < 4; i++) {
        const [x1, z1] = corners[i]!;
        const [x2, z2] = corners[(i + 1) % 4]!;
        p.push(x1, y, z1, x2, y, z2);
      }
    }
    for (const [x, z] of corners) p.push(x, 0, z, x, -bottom, z);
    return segments(p);
  }, blockKey);

  // O contexto WebGL perdeu-se (driver, memória): volta ao mapa 2D. Ao
  // desmontar, o R3F força a perda do contexto; isso não conta como falha.
  const onCreated = ({ gl }: { gl: THREE.WebGLRenderer }) => {
    gl.domElement.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      setTimeout(() => {
        if (mounted.current) onFailed();
      }, 0);
    });
  };

  // Roda do rato: só com Ctrl/⌘, como no mapa 2D; sem tecla, a página desce e aparece a dica.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const mac = /Mac|iPhone|iPad/.test(navigator.platform);
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        rig.current?.zoom(Math.exp(e.deltaY * 0.002));
        setHint(null);
        return;
      }
      setHint(mac ? t.map.cmdScroll : t.map.ctrlScroll);
      clearTimeout(timer);
      timer = setTimeout(() => setHint(null), 1500);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      clearTimeout(timer);
    };
  }, [t]);

  // Arrastar orbita. Com o dedo, só na horizontal (na vertical a página
  // desce); com dois dedos, afastar e aproximar e inclinar.
  const pointers = useRef(new Map<number, { x: number; y: number; type: string }>());
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
    const move = (ev: PointerEvent) => {
      const all = pointers.current;
      const prev = all.get(ev.pointerId);
      if (!prev) return;
      const dx = ev.clientX - prev.x;
      const dy = ev.clientY - prev.y;
      if (all.size === 2) {
        const [a, b] = [...all.values()];
        const before = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        prev.x = ev.clientX;
        prev.y = ev.clientY;
        const after = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        if (before > 0 && after > 0) rig.current?.zoom(before / after);
        rig.current?.orbit(0, (-dy * 0.004) / 2);
      } else if (all.size === 1) {
        prev.x = ev.clientX;
        prev.y = ev.clientY;
        if (prev.type === "mouse") rig.current?.orbit(-dx * 0.006, -dy * 0.005);
        else rig.current?.orbit(-dx * 0.006, 0);
      }
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      pointers.current.delete(ev.pointerId);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const r = rig.current;
    if (!r) return;
    const actions: Record<string, () => void> = {
      ArrowLeft: () => r.orbit(ROTATE_STEP, 0),
      ArrowRight: () => r.orbit(-ROTATE_STEP, 0),
      ArrowUp: () => r.orbit(0, TILT_STEP),
      ArrowDown: () => r.orbit(0, -TILT_STEP),
      "+": () => r.zoom(1 / ZOOM_STEP),
      "=": () => r.zoom(1 / ZOOM_STEP),
      "-": () => r.zoom(ZOOM_STEP),
      _: () => r.zoom(ZOOM_STEP),
    };
    const action = actions[e.key];
    if (!action || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    action();
  };

  const pick = (id: string) => {
    const q = shown.find((x) => x.id === id);
    if (!q?.coordinates) return;
    const next: Selection = { type: "event", id, coordinates: q.coordinates, region };
    if (isSameSelection(selection, next)) onClear();
    else onSelect(next);
  };

  const onMove = (duration: number) => {
    if (wrap.current) wrap.current.dataset.cameraDuration = String(duration);
  };

  const focusDistrict = focus ? getDistrict(focus) : undefined;
  const label = t.view3d.depthAria(
    focusDistrict ? t.districtName(focusDistrict) : t.map.regions[region],
    shown.length,
    deepest === null ? null : Math.round(deepest),
  );

  const buttons: { label: string; icon: typeof Plus; run: (r: RigApi) => void }[] = [
    { label: t.map.zoomIn, icon: Plus, run: (r) => r.zoom(1 / ZOOM_STEP) },
    { label: t.map.zoomOut, icon: Minus, run: (r) => r.zoom(ZOOM_STEP) },
    { label: t.view3d.rotateLeft, icon: RotateCcw, run: (r) => r.orbit(ROTATE_STEP, 0) },
    { label: t.view3d.rotateRight, icon: RotateCw, run: (r) => r.orbit(-ROTATE_STEP, 0) },
    { label: t.view3d.tiltMore, icon: ChevronsDown, run: (r) => r.orbit(0, TILT_STEP) },
    { label: t.view3d.tiltLess, icon: ChevronsUp, run: (r) => r.orbit(0, -TILT_STEP) },
    { label: t.view3d.reset, icon: Undo2, run: (r) => r.reset(cameraDuration()) },
  ];

  return (
    <div className="relative h-full w-full">
      <div
        ref={wrap}
        role="img"
        aria-label={label}
        aria-describedby={hintId}
        tabIndex={0}
        data-testid="quake-depth"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        className="h-full w-full touch-pan-y select-none focus-visible:-outline-offset-4"
        style={{ cursor: hovering ? "pointer" : "grab" }}
      >
        <SceneBoundary onError={onFailed}>
          <Canvas
            frameloop="demand"
            flat
            dpr={[1, 2]}
            gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
            camera={{ fov: FOV, near: 1, far: 100_000, position: [0, 600, 600] }}
            onCreated={onCreated}
          >
            <ambientLight intensity={2.2} />
            <directionalLight position={[-radius, radius * 2, radius]} intensity={1.4} />
            <Rig
              entryKey={`${region}|${focus ?? ""}`}
              apiRef={rig}
              home={home}
              radius={radius}
              focusPoint={focusPoint}
              onMove={onMove}
            />
            <LabelAnchors labels={labels} depths={grid} halfW={halfW} halfD={halfD} />
            <mesh rotation-x={-Math.PI / 2} renderOrder={1}>
              <planeGeometry args={[halfW * 2, halfD * 2]} />
              <meshBasicMaterial
                color={palette.sea}
                transparent
                opacity={palette.seaOpacity}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>
            <lineSegments geometry={block}>
              <lineBasicMaterial color={palette.lineSoft} transparent opacity={0.55} />
            </lineSegments>
            <lineSegments geometry={boundaries}>
              <lineBasicMaterial color={palette.line} transparent opacity={0.8} />
            </lineSegments>
            <lineSegments geometry={focusBoundary}>
              <lineBasicMaterial color={palette.focus} />
            </lineSegments>
            <Marks
              marks={stableMarks}
              selectedId={selectedId}
              hitRadius={kmPerPx * 14}
              ink={palette.ink}
              accent={palette.accent}
              onPick={pick}
              onHover={setHovering}
            />
          </Canvas>
        </SceneBoundary>
      </div>
      <p id={hintId} className="sr-only">
        {t.view3d.keysHint}
      </p>
      {/* Escala de profundidade: texto real por cima do canvas, não desenhado em WebGL. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {grid.map((depth, i) => (
          <span
            key={depth}
            ref={(el) => {
              labels.current[i] = el;
            }}
            className="invisible absolute top-0 left-0 rounded-sm bg-surface px-1.5 text-sm whitespace-nowrap text-ink-2"
          >
            {depth === 0 ? t.view3d.seaLevel : t.view3d.km(depth)}
          </span>
        ))}
      </div>
      {/* Duas filas no canto: o painel de detalhe, em baixo, não as tapa nem num telemóvel. */}
      <div className="absolute top-3 right-3 z-10 grid grid-cols-4 gap-1">
        {buttons.map((b) => (
          <button
            key={b.label}
            type="button"
            aria-label={b.label}
            title={b.label}
            onClick={() => rig.current && b.run(rig.current)}
            className="flex size-11 items-center justify-center rounded-full glass-button"
          >
            <b.icon aria-hidden className="size-5" />
          </button>
        ))}
      </div>
      {hint ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-ink/60 p-6 text-center font-display text-lg font-semibold text-bg">
          {hint}
        </div>
      ) : null}
    </div>
  );
}
