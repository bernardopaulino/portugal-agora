/**
 * Geometria mínima, sem dependências: ponto-em-polígono (ray casting)
 * e distância geodésica. Usado no servidor (sismos → distrito) e no
 * browser ("perto de mim").
 */
type Ring = number[][];
type Polygon = Ring[];

export interface DistrictFeature {
  properties: { slug: string; name: string; region: string };
  geometry:
    { type: "Polygon"; coordinates: Polygon } | { type: "MultiPolygon"; coordinates: Polygon[] };
}

function inRing([x, y]: [number, number], ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i] as [number, number];
    const [xj, yj] = ring[j] as [number, number];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inPolygon(point: [number, number], polygon: Polygon): boolean {
  const [outer, ...holes] = polygon;
  if (!outer || !inRing(point, outer)) return false;
  return !holes.some((hole) => inRing(point, hole));
}

export function pointInFeature(point: [number, number], feature: DistrictFeature): boolean {
  const g = feature.geometry;
  return g.type === "Polygon"
    ? inPolygon(point, g.coordinates)
    : g.coordinates.some((p) => inPolygon(point, p));
}

/** Slug do distrito/região que contém o ponto [lon, lat], ou undefined. */
export function districtAt(
  point: [number, number],
  features: DistrictFeature[],
): string | undefined {
  return features.find((f) => pointInFeature(point, f))?.properties.slug;
}

/** Distância em km entre dois pontos [lon, lat]. */
export function distanceKm([lon1, lat1]: [number, number], [lon2, lat2]: [number, number]): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}
