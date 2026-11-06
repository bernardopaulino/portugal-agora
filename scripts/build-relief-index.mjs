/**
 * Gera public/geo/relief-tiles.json: os tiles de relevo da Mapterhorn que
 * existem à volta de Portugal (continente, Açores, Madeira), ao zoom 12.
 *
 * A Mapterhorn responde 404 aos tiles só de mar, e o browser mostra cada
 * 404 como um erro na consola. Com este mapa, o mapa da página só pede
 * tiles que existem e usa um tile plano (nível do mar) para o resto.
 *
 * Fonte: o índice de cobertura público da Mapterhorn
 * (https://download.mapterhorn.com/coverage-index.pmtiles), que lista as
 * fontes de cada tile do zoom 4 ao 12. Um tile com entrada no índice
 * existe; um tile sem entrada pode existir (mar junto à costa) ou não.
 *
 * Correr quando a Mapterhorn acrescentar fontes:
 *   npm install --no-save pmtiles && node scripts/build-relief-index.mjs
 */
import { writeFileSync } from "node:fs";

import { PMTiles } from "pmtiles";

const INDEX = "https://download.mapterhorn.com/coverage-index.pmtiles";

/** O índice tem ~1,5 MB: lê-se de uma vez e consulta-se em memória. */
class MemorySource {
  constructor(buffer) {
    this.buffer = buffer;
  }
  getKey() {
    return INDEX;
  }
  async getBytes(offset, length) {
    return { data: this.buffer.slice(offset, offset + length) };
  }
}
const Z = 12;
/** Oeste, sul, leste, norte: o Atlântico das ilhas até ao interior da Península. */
const BBOX = [-33, 30, 1, 45];

const lonToX = (lon, z) => Math.floor(((lon + 180) / 360) * 2 ** z);
const latToY = (lat, z) => {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.asinh(Math.tan(r)) / Math.PI) / 2) * 2 ** z);
};

const response = await fetch(INDEX);
if (!response.ok) throw new Error(`Índice indisponível: HTTP ${response.status}`);
const archive = new PMTiles(new MemorySource(await response.arrayBuffer()));
const x0 = lonToX(BBOX[0], Z);
const x1 = lonToX(BBOX[2], Z);
const y0 = latToY(BBOX[3], Z);
const y1 = latToY(BBOX[1], Z);
const w = x1 - x0 + 1;
const h = y1 - y0 + 1;

const present = async (z, x, y) => (await archive.getZxy(z, x, y)) !== undefined;

// Percorre a árvore a partir do zoom 4: só desce onde o pai tem entrada.
const bits = new Uint8Array(w * h);
async function visit(z, x, y) {
  const scale = 2 ** (Z - z);
  if ((x + 1) * scale - 1 < x0 || x * scale > x1 || (y + 1) * scale - 1 < y0 || y * scale > y1)
    return;
  if (!(await present(z, x, y))) return;
  if (z === Z) {
    bits[(y - y0) * w + (x - x0)] = 1;
    return;
  }
  for (const [dx, dy] of [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ])
    await visit(z + 1, x * 2 + dx, y * 2 + dy);
}
for (let x = x0 >> (Z - 4); x <= x1 >> (Z - 4); x++)
  for (let y = y0 >> (Z - 4); y <= y1 >> (Z - 4); y++) await visit(4, x, y);

// Cada linha como pares [início, comprimento] (run-length).
const rows = [];
let count = 0;
for (let r = 0; r < h; r++) {
  const runs = [];
  for (let c = 0; c < w; c++) {
    if (!bits[r * w + c]) continue;
    const start = c;
    while (c < w && bits[r * w + c]) c++;
    runs.push(start, c - start);
    count += c - start;
  }
  rows.push(runs);
}

writeFileSync(
  "public/geo/relief-tiles.json",
  JSON.stringify({
    source: INDEX,
    generated: new Date().toISOString().slice(0, 10),
    z: Z,
    x0,
    y0,
    w,
    h,
    rows,
  }),
);
console.log(`${count} tiles com relevo em ${w}×${h} ao zoom ${Z}.`);
