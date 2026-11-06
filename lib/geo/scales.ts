/**
 * Escalas das vistas 3D dos mapas de tema. Cada uma exagera um eixo, e a
 * legenda diz quanto: a profundidade dos sismos e o relevo dos incêndios
 * por um fator, a altura do risco de incêndio repete a classe.
 */

/** Profundidade dos sismos: um só fator, para comparar regiões. */
export const DEPTH_EXAGGERATION = 3;

/** Relevo na vista dos incêndios (o continente é baixo; a 1× quase não se vê). */
export const RELIEF_EXAGGERATION = 2;

/** Inclinação da câmara do MapLibre nas vistas 3D, em graus. */
export const MAP_3D_PITCH = 55;

const DEPTH_STEPS = [0, 10, 20, 50, 100];

/**
 * Linhas da grelha de profundidade (km) que os dados justificam: até à
 * primeira que fica abaixo do sismo mais profundo, nunca menos de 0 e 10.
 * Abaixo de 100 km, de 100 em 100.
 */
export function depthGrid(maxDepthKm: number): number[] {
  const max = Number.isFinite(maxDepthKm) ? Math.max(0, maxDepthKm) : 0;
  const grid: number[] = [];
  for (const step of DEPTH_STEPS) {
    grid.push(step);
    if (step >= max && grid.length >= 2) return grid;
  }
  let step = 200;
  while (grid[grid.length - 1]! < max) {
    grid.push(step);
    step += 100;
  }
  return grid;
}

/** Raio do sismo em px no mapa 2D; a vista 3D usa a mesma escala. */
export function quakeRadiusPx(magnitude: number): number {
  return 4 + Math.max(0, magnitude) * 3;
}

/** Metros por classe de risco de incêndio na vista "Risco em altura". */
export const RISK_METERS_PER_CLASS = 3000;

/**
 * Altura da extrusão de um concelho: a classe de risco do IPMA (1 a 5)
 * vezes um passo fixo. Sem classe válida, sem altura.
 */
export function riskHeight(riskClass: number): number {
  return Number.isInteger(riskClass) && riskClass >= 1 && riskClass <= 5
    ? riskClass * RISK_METERS_PER_CLASS
    : 0;
}
