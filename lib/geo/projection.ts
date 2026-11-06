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
