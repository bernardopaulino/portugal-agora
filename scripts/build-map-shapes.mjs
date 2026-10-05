/**
 * Gera data/map-shapes.ts a partir de public/geo/distritos.json (CAOP 2025, DGT):
 * caminhos SVG simplificados para o mapa do boletim (continente em grande,
 * Açores e Madeira em caixas no mar, como no boletim da televisão).
 *
 * Correr depois de atualizar os limites: node scripts/build-map-shapes.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

const geo = JSON.parse(readFileSync("public/geo/distritos.json", "utf8"));

/**
 * Molduras: extensão geográfica e caixa de destino no viewBox (unidades SVG).
 * `gaps`: troços de mar [de, até, nova largura] (em graus de longitude) que
 * encolhem. Nos Açores, os três grupos ficam mais perto uns dos outros,
 * como nos mapas da televisão: cada ilha mantém a forma, mas o arquipélago
 * cabe na caixa com as ilhas maiores. Os limites dos troços caem no mar.
 */
const frames = {
  continente: { lon: [-9.6, -6.1], lat: [36.9, 42.2], box: [330, 0, 500, 1000] },
  acores: {
    lon: [-31.32, -24.98],
    lat: [36.9, 39.76],
    box: [0, 300, 320, 320],
    pad: 8,
    gaps: [
      [-30.95, -28.95, 0.3],
      [-26.95, -25.95, 0.3],
    ],
  },
  madeira: { lon: [-17.3, -16.25], lat: [32.37, 33.13], box: [30, 690, 290, 240], pad: 14 },
};

/** Longitude com os troços de mar encolhidos (contínua e crescente). */
function squeeze(lon, gaps = []) {
  let shift = 0;
  for (const [a, b, w] of gaps) {
    if (lon <= a) break;
    if (lon < b) return lon - shift - (lon - a) * (1 - w / (b - a));
    shift += b - a - w;
  }
  return lon - shift;
}

/**
 * Equirretangular com correção do cosseno da latitude média; centrada na
 * caixa, com margem interior (pad) para as ilhas não tocarem na moldura.
 */
function projector({ lon, lat, box, pad = 0, gaps = [] }) {
  const k = Math.cos((((lat[0] + lat[1]) / 2) * Math.PI) / 180);
  const lon0 = squeeze(lon[0], gaps);
  const w = (squeeze(lon[1], gaps) - lon0) * k;
  const h = lat[1] - lat[0];
  const s = Math.min((box[2] - 2 * pad) / w, (box[3] - 2 * pad) / h);
  const ox = box[0] + (box[2] - w * s) / 2;
  const oy = box[1] + (box[3] - h * s) / 2;
  return { k, s, ox, oy, lon0, lat1: lat[1], gaps };
}

const proj = Object.fromEntries(Object.entries(frames).map(([r, f]) => [r, projector(f)]));

function project(p, [lon, lat]) {
  return [p.ox + (squeeze(lon, p.gaps) - p.lon0) * p.k * p.s, p.oy + (p.lat1 - lat) * p.s];
}

function perpendicular(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len;
}

function simplify(points, tolerance) {
  if (points.length < 4) return points;
  let max = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicular(points[i], points[0], points.at(-1));
    if (d > max) {
      max = d;
      index = i;
    }
  }
  if (max <= tolerance) return [points[0], points.at(-1)];
  return [
    ...simplify(points.slice(0, index + 1), tolerance).slice(0, -1),
    ...simplify(points.slice(index), tolerance),
  ];
}

const round = (n) => Math.round(n * 10) / 10;

function ringPath(ring) {
  return ring.map(([x, y], i) => `${i === 0 ? "M" : "L"}${round(x)} ${round(y)}`).join("") + "Z";
}

function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++)
    a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  return a / 2;
}

function ringCentroid(ring) {
  let x = 0;
  let y = 0;
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    x += (ring[j][0] + ring[i][0]) * f;
    y += (ring[j][1] + ring[i][1]) * f;
    a += f;
  }
  return [x / (3 * a), y / (3 * a)];
}

const shapes = new Map();
for (const feature of geo.features) {
  const { slug, region } = feature.properties;
  const p = proj[region];
  const polygons =
    feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
  const entry = shapes.get(slug) ?? { slug, region, d: "", rings: [] };
  for (const polygon of polygons) {
    for (const ring of polygon) {
      const projected = ring.map((c) => project(p, c));
      // Os ilhéus muito pequenos desaparecem à escala do mapa.
      if (Math.abs(ringArea(projected)) < 1.5) continue;
      const simple = simplify(projected, region === "continente" ? 0.9 : 0.5);
      if (simple.length < 4) continue;
      entry.d += ringPath(simple);
      entry.rings.push(simple);
    }
  }
  shapes.set(slug, entry);
}

/**
 * Contorno do continente para o logótipo: os segmentos que pertencem a um
 * só distrito são a fronteira exterior; encadeados, dão o contorno do país.
 */
function mainlandOutline() {
  const key = ([x, y]) => `${x.toFixed(6)},${y.toFixed(6)}`;
  const count = new Map();
  const edges = [];
  for (const feature of geo.features) {
    if (feature.properties.region !== "continente") continue;
    const polygons =
      feature.geometry.type === "Polygon"
        ? [feature.geometry.coordinates]
        : feature.geometry.coordinates;
    for (const polygon of polygons)
      for (const ring of polygon)
        for (let i = 0; i < ring.length - 1; i++) {
          const a = key(ring[i]);
          const b = key(ring[i + 1]);
          const k = a < b ? `${a}|${b}` : `${b}|${a}`;
          count.set(k, (count.get(k) ?? 0) + 1);
          edges.push([a, b, ring[i], ring[i + 1]]);
        }
  }
  const next = new Map();
  const point = new Map();
  for (const [a, b, pa, pb] of edges) {
    const k = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (count.get(k) !== 1) continue;
    next.set(a, b);
    point.set(a, pa);
    point.set(b, pb);
  }
  const rings = [];
  const seen = new Set();
  for (const start of next.keys()) {
    if (seen.has(start)) continue;
    const ring = [];
    let cur = start;
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      ring.push(point.get(cur));
      cur = next.get(cur);
    }
    rings.push(ring);
  }
  const p = proj.continente;
  const largest = rings
    .map((r) => r.map((c) => project(p, c)))
    .reduce((a, b) => (Math.abs(ringArea(b)) > Math.abs(ringArea(a)) ? b : a));
  const simple = simplify([...largest, largest[0]], 6);
  const xs = simple.map((q) => q[0]);
  const ys = simple.map((q) => q[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const scale = 100 / (Math.max(...ys) - minY);
  const norm = simple.map(([x, y]) => [(x - minX) * scale, (y - minY) * scale]);
  return {
    d: ringPath(norm),
    width: round((Math.max(...xs) - minX) * scale),
  };
}

const outline = mainlandOutline();

const out = [...shapes.values()].map(({ slug, region, d, rings }) => {
  const largest = rings.reduce((a, b) => (Math.abs(ringArea(b)) > Math.abs(ringArea(a)) ? b : a));
  const [cx, cy] = ringCentroid(largest);
  return { slug, region, d, anchor: [round(cx), round(cy)] };
});

const ts = `// Gerado por scripts/build-map-shapes.mjs a partir de public/geo/distritos.json (CAOP 2025, DGT). Não editar à mão.
import type { Region } from "./districts";

export interface MapShape {
  slug: string;
  region: Region;
  /** Caminho SVG no viewBox do mapa do boletim. */
  d: string;
  /** Ponto para o pictograma do distrito (centróide do maior polígono). */
  anchor: [number, number];
}

export const MAP_VIEWBOX = "0 0 840 1000";

/** Caixas das regiões no viewBox (x, y, largura, altura). */
export const mapFrames: Record<Region, [number, number, number, number]> = ${JSON.stringify(
  Object.fromEntries(Object.entries(frames).map(([r, f]) => [r, f.box])),
)};

type Gap = [number, number, number];

const projections: Record<
  Region,
  { k: number; s: number; ox: number; oy: number; lon0: number; lat1: number; gaps: Gap[] }
> = ${JSON.stringify(proj)};

/** Longitude com os troços de mar encolhidos (nos Açores, os grupos ficam mais perto). */
export function squeeze(lon: number, gaps: Gap[]): number {
  let shift = 0;
  for (const [a, b, w] of gaps) {
    if (lon <= a) break;
    if (lon < b) return lon - shift - (lon - a) * (1 - w / (b - a));
    shift += b - a - w;
  }
  return lon - shift;
}

/** Converte [longitude, latitude] para coordenadas do mapa do boletim. */
export function projectPoint([lon, lat]: [number, number], region: Region): [number, number] {
  const p = projections[region];
  return [p.ox + (squeeze(lon, p.gaps) - p.lon0) * p.k * p.s, p.oy + (p.lat1 - lat) * p.s];
}

export const mapShapes: MapShape[] = ${JSON.stringify(out)};

/** Contorno simplificado do continente para o logótipo (altura 100). */
export const logoOutline = { d: ${JSON.stringify(outline.d)}, width: ${outline.width}, height: 100 };
`;

writeFileSync("data/map-shapes.ts", ts);
console.log(`data/map-shapes.ts: ${out.length} formas, ${(ts.length / 1024).toFixed(1)} KB`);
