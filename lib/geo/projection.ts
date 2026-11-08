import type { Region } from "@/data/districts";

/**
 * Projeção equiretangular local, em km, para a vista 3D dos sismos.
 * À escala de uma região (algumas centenas de km) o erro é pequeno e as
 * contas ficam simples: o centro vai para a origem, "east" cresce para
 * leste, "north" para norte e "up" para cima. A profundidade é negativa
 * em "up" e é o único eixo que leva exagero, para não deformar o mapa.
 */

/** Raio médio da Terra (IUGG), em km. */
const EARTH_RADIUS_KM = 6371.0088;
export const KM_PER_DEGREE = (Math.PI / 180) * EARTH_RADIUS_KM;

export interface LocalPoint {
  east: number;
  north: number;
  up: number;
}

export interface LocalProjection {
  center: [number, number];
  exaggeration: number;
  /** [lon, lat] e profundidade em km (positiva para baixo) → km locais. */
  project(point: [number, number], depthKm?: number | null): LocalPoint;
}

export function localProjection(center: [number, number], exaggeration = 1): LocalProjection {
  const [lon0, lat0] = center;
  const kmPerLon = KM_PER_DEGREE * Math.cos((lat0 * Math.PI) / 180);
  return {
    center,
    exaggeration,
    project([lon, lat], depthKm) {
      return {
        east: (lon - lon0) * kmPerLon,
        north: (lat - lat0) * KM_PER_DEGREE,
        // Sem profundidade conhecida, o ponto fica à superfície.
        up: depthKm ? -depthKm * exaggeration : 0,
      };
    },
  };
}

/**
 * O bloco de crosta de cada região: os limites do mapa 2D com margem de
 * mar, onde o IPMA regista muitos sismos (Banco de Gorringe, a sul do
 * Algarve, à volta das ilhas). Os sismos fora do bloco ficam só na lista.
 */
export const depthSceneBounds: Record<Region, [[number, number], [number, number]]> = {
  continente: [
    [-11.6, 36.0],
    [-5.6, 42.6],
  ],
  acores: [
    [-32.0, 36.4],
    [-24.4, 40.2],
  ],
  madeira: [
    [-18.0, 31.9],
    [-15.6, 33.6],
  ],
};

/**
 * O bloco de cada distrito do continente, para a página de sismos do
 * distrito: o contorno do distrito mais o mar a 40 km da capital (onde
 * `locateDistrict` ainda dá sismos ao distrito), com uma pequena margem.
 * Gerado a partir de public/geo/distritos.json. Açores e Madeira são um
 * distrito cada, por isso usam o bloco da região.
 */
const districtDepthBounds: Record<string, [[number, number], [number, number]]> = {
  aveiro: [
    [-9.25, 40.15],
    [-8, 41.2],
  ],
  beja: [
    [-8.9, 37.2],
    [-6.85, 38.5],
  ],
  braga: [
    [-9, 41.1],
    [-7.7, 42],
  ],
  braganca: [
    [-7.55, 40.9],
    [-6.1, 42.25],
  ],
  "castelo-branco": [
    [-8.4, 39.35],
    [-6.75, 40.5],
  ],
  coimbra: [
    [-9, 39.75],
    [-7.65, 40.65],
  ],
  evora: [
    [-8.75, 38.05],
    [-7, 39.15],
  ],
  faro: [
    [-9.1, 36.55],
    [-7.3, 37.65],
  ],
  guarda: [
    [-7.95, 40.05],
    [-6.7, 41.3],
  ],
  leiria: [
    [-9.6, 39.1],
    [-8, 40.2],
  ],
  lisboa: [
    [-9.7, 38.3],
    [-8.55, 39.4],
  ],
  portalegre: [
    [-8.45, 38.65],
    [-6.85, 39.75],
  ],
  porto: [
    [-9.2, 40.7],
    [-7.75, 41.6],
  ],
  santarem: [
    [-9.3, 38.65],
    [-7.7, 39.95],
  ],
  setubal: [
    [-9.45, 37.65],
    [-8, 39],
  ],
  "viana-do-castelo": [
    [-9.4, 41.25],
    [-8, 42.25],
  ],
  "vila-real": [
    [-8.35, 40.85],
    [-7.05, 42.05],
  ],
  viseu: [
    [-8.5, 40.2],
    [-7.2, 41.3],
  ],
};

/** O bloco da vista 3D: o do distrito, numa página de distrito, ou o da região. */
export function depthBoundsFor(
  region: Region,
  district?: string,
): [[number, number], [number, number]] {
  return (district && districtDepthBounds[district]) || depthSceneBounds[region];
}

export function boundsCenter([[w, s], [e, n]]: [[number, number], [number, number]]): [
  number,
  number,
] {
  return [(w + e) / 2, (s + n) / 2];
}

export function inBounds(
  [lon, lat]: [number, number],
  [[w, s], [e, n]]: [[number, number], [number, number]],
): boolean {
  return lon >= w && lon <= e && lat >= s && lat <= n;
}
