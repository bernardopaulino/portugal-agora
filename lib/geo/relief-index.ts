/**
 * Que tiles de relevo da Mapterhorn existem (public/geo/relief-tiles.json,
 * gerado por scripts/build-relief-index.mjs). O ficheiro guarda, ao zoom
 * máximo, cada linha de tiles como pares [início, comprimento]; um tile de
 * zoom mais baixo existe se algum dos seus descendentes existir.
 */
export interface ReliefIndexData {
  z: number;
  x0: number;
  y0: number;
  w: number;
  h: number;
  rows: number[][];
}

export interface ReliefIndex {
  /** O tile z/x/y tem relevo? Fora da área do índice, não. */
  has(z: number, x: number, y: number): boolean;
}

export function parseReliefIndex({ z: Z, x0, y0, w, h, rows }: ReliefIndexData): ReliefIndex {
  // Somas acumuladas 2D: quantos tiles existem num retângulo, em tempo constante.
  const sums = new Int32Array((w + 1) * (h + 1));
  const at = (c: number, r: number) => r * (w + 1) + c;
  for (let r = 0; r < h; r++) {
    const line = new Uint8Array(w);
    const runs = rows[r] ?? [];
    for (let i = 0; i + 1 < runs.length; i += 2) line.fill(1, runs[i], runs[i]! + runs[i + 1]!);
    let row = 0;
    for (let c = 0; c < w; c++) {
      row += line[c]!;
      sums[at(c + 1, r + 1)] = sums[at(c + 1, r)]! + row;
    }
  }
  return {
    has(z, x, y) {
      if (!Number.isInteger(z) || z < 0 || z > Z) return false;
      const scale = 2 ** (Z - z);
      const c1 = Math.max(x * scale - x0, 0);
      const r1 = Math.max(y * scale - y0, 0);
      const c2 = Math.min((x + 1) * scale - x0, w);
      const r2 = Math.min((y + 1) * scale - y0, h);
      if (c1 >= c2 || r1 >= r2) return false;
      return sums[at(c2, r2)]! - sums[at(c1, r2)]! - sums[at(c2, r1)]! + sums[at(c1, r1)]! > 0;
    },
  };
}
