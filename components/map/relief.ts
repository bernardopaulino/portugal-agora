import { addProtocol, type RequestParameters } from "maplibre-gl";

import { parseReliefIndex, type ReliefIndex } from "@/lib/geo/relief-index";

/*
 * Relevo da vista 3D dos incêndios: tiles terrarium da Mapterhorn, servidos
 * por um protocolo próprio ("relief://z/x/y"). A Mapterhorn responde 404 aos
 * tiles só de mar, e o browser mostra cada 404 como erro na consola; por
 * isso só se pedem os tiles que existem (public/geo/relief-tiles.json) e o
 * resto é um tile plano, ao nível do mar, desenhado aqui.
 */

const ORIGIN = "https://tiles.mapterhorn.com";
const TILE_SIZE = 512;
export const RELIEF_TILES = "relief://{z}/{x}/{y}";

let index: Promise<ReliefIndex | null> | undefined;
const loadIndex = () =>
  (index ??= fetch("/geo/relief-tiles.json")
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => (data ? parseReliefIndex(data) : null))
    .catch(() => null));

/** Terrarium: elevação = R × 256 + G + B / 256 − 32768; (128, 0, 0) é 0 m. */
let flat: Promise<OffscreenCanvas | HTMLCanvasElement> | undefined;
// O MapLibre transfere a imagem para o worker: cada pedido leva uma cópia nova.
const flatTile = async () =>
  createImageBitmap(
    await (flat ??= (async () => {
      const canvas =
        typeof OffscreenCanvas === "function"
          ? new OffscreenCanvas(TILE_SIZE, TILE_SIZE)
          : Object.assign(document.createElement("canvas"), {
              width: TILE_SIZE,
              height: TILE_SIZE,
            });
      const ctx = canvas.getContext("2d") as
        CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
      ctx.fillStyle = "rgb(128, 0, 0)";
      ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
      return canvas;
    })()),
  );

async function loadTile(params: RequestParameters, abort: AbortController) {
  const [z, x, y] = params.url.replace("relief://", "").split("/").map(Number) as [
    number,
    number,
    number,
  ];
  const known = await loadIndex();
  // Sem o índice (falhou o pedido), não se arrisca: o relevo fica plano.
  if (known?.has(z, x, y)) {
    const response = await fetch(`${ORIGIN}/${z}/${x}/${y}.webp`, { signal: abort.signal });
    if (response.ok) return { data: await response.arrayBuffer() };
  }
  return { data: await flatTile() };
}

let registered = false;
export function registerReliefProtocol() {
  if (registered) return;
  registered = true;
  addProtocol("relief", loadTile);
}
