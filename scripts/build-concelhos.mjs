/*
 * Gera data/concelhos-geo.ts: para cada concelho (DICO), o slug do endereço
 * (/lisboa/sintra) e um ponto central [lon, lat].
 *
 * - Continente: o centroide da forma em public/geo/concelhos.json (CAOP).
 *   Se o centroide cair fora (formas côncavas), usa-se o vértice mais
 *   próximo dele, que está sempre na forma.
 * - Açores e Madeira: a CAOP simplificada do site só tinha o continente; o
 *   contorno de cada município vem do OpenStreetMap (Nominatim, ODbL), um
 *   pedido por segundo como pedem as regras, confirma-se que cai na região
 *   certa e junta-se a public/geo/concelhos.json. Nas corridas seguintes já
 *   lá está e não se pede outra vez.
 *
 * Uso: node scripts/build-concelhos.mjs   (só é preciso quando mudar a CAOP)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dico = JSON.parse(readFileSync(join(root, "data/dico.json"), "utf8"));
const geo = JSON.parse(readFileSync(join(root, "public/geo/concelhos.json"), "utf8"));

const slugify = (name) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function rings(geometry) {
  return geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
}

function inside([x, y], ring) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

function center(geometry) {
  // Centroide pesado pela área do polígono maior.
  const polygons = rings(geometry);
  let best = null;
  for (const polygon of polygons) {
    const ring = polygon[0];
    let a = 0,
      cx = 0,
      cy = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
      a += f;
      cx += (ring[j][0] + ring[i][0]) * f;
      cy += (ring[j][1] + ring[i][1]) * f;
    }
    if (!best || Math.abs(a) > Math.abs(best.a))
      best = { a, c: [cx / (3 * a), cy / (3 * a)], ring };
  }
  if (inside(best.c, best.ring)) return best.c;
  return best.ring.reduce((p, q) =>
    Math.hypot(q[0] - best.c[0], q[1] - best.c[1]) < Math.hypot(p[0] - best.c[0], p[1] - best.c[1])
      ? q
      : p,
  );
}

const shapes = new Map(geo.features.map((f) => [f.properties.dico, f.geometry]));
const regionOf = (district) =>
  district === "acores" || district === "madeira" ? district : "continente";
const inRegion = ([lon, lat], region) =>
  region === "acores"
    ? lon < -24 && lon > -32 && lat > 36.5 && lat < 40
    : lon < -15.9 && lon > -17.4 && lat > 32.3 && lat < 33.2;

/** Nomes como estão no OpenStreetMap, quando diferem da CAOP. */
const osmNames = { "Calheta de São Jorge": "Calheta" };

async function nominatim(name, region) {
  const q = `${osmNames[name] ?? name}, ${region === "acores" ? "Azores" : "Madeira"}`;
  // polygon_threshold: simplificação do contorno em graus (~50 m), como a CAOP simplificada.
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=8&polygon_geojson=1&polygon_threshold=0.0005&q=${encodeURIComponent(q)}`;
  const response = await fetch(url, {
    headers: {
      "user-agent": "portugal-agora-build-script (github.com/bernardopaulino/portugal-agora)",
    },
  });
  const results = await response.json();
  // O contorno do município (não o da freguesia com o mesmo nome).
  const ok = results.filter((r) => inRegion([+r.lon, +r.lat], region));
  const pick =
    ok.find((r) => r.addresstype === "municipality" && /Polygon/.test(r.geojson?.type)) ??
    ok.find((r) => r.type === "administrative" && /Polygon/.test(r.geojson?.type));
  if (!pick) throw new Error(`Sem contorno do município para ${q}`);
  const round = (c) =>
    typeof c[0] === "number"
      ? [Math.round(c[0] * 1e4) / 1e4, Math.round(c[1] * 1e4) / 1e4]
      : c.map(round);
  return { type: pick.geojson.type, coordinates: round(pick.geojson.coordinates) };
}

const out = [];
const seen = new Map();
const islandFeatures = [];
for (const [code, name, district] of dico) {
  const slug = slugify(name);
  const key = `${district}/${slug}`;
  if (seen.has(key)) throw new Error(`Slug repetido no distrito: ${key}`);
  seen.set(key, code);
  const region = regionOf(district);
  let point;
  if (shapes.has(code)) {
    const [lon, lat] = center(shapes.get(code));
    point = [Math.round(lon * 1e4) / 1e4, Math.round(lat * 1e4) / 1e4];
  } else {
    if (region === "continente")
      throw new Error(`Concelho do continente sem forma: ${code} ${name}`);
    const geometry = await nominatim(name, region);
    await new Promise((r) => setTimeout(r, 1100));
    shapes.set(code, geometry);
    islandFeatures.push({ type: "Feature", properties: { dico: code, name, district }, geometry });
    const [lon, lat] = center(geometry);
    point = [Math.round(lon * 1e4) / 1e4, Math.round(lat * 1e4) / 1e4];
  }
  out.push([code, slug, point[0], point[1]]);
  if (region !== "continente") console.log(code, name, point.join(", "));
}

const body = out
  .map((r) => `  [${JSON.stringify(r[0])}, ${JSON.stringify(r[1])}, ${r[2]}, ${r[3]}],`)
  .join("\n");
if (islandFeatures.length > 0) {
  geo.features.push(...islandFeatures);
  writeFileSync(join(root, "public/geo/concelhos.json"), JSON.stringify(geo));
  console.log(`${islandFeatures.length} contornos das ilhas juntos a public/geo/concelhos.json`);
}

writeFileSync(
  join(root, "data/concelhos-geo.ts"),
  `/*
 * Gerado por scripts/build-concelhos.mjs: [DICO, slug, lon, lat] de cada
 * concelho. Continente: centro da forma da CAOP; ilhas: OpenStreetMap.
 */
export const concelhoPoints: [string, string, number, number][] = [
${body}
];
`,
);
console.log(`${out.length} concelhos escritos em data/concelhos-geo.ts`);
