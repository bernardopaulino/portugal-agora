/**
 * O MapLibre GL v6 carrega o seu web worker a partir de ficheiros
 * separados, que o bundler do Next não copia. Este script (corre no
 * postinstall) coloca-os em public/maplibre/, na versão instalada.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules", "maplibre-gl", "dist");
const target = join(root, "public", "maplibre");

if (!existsSync(source)) {
  console.warn("[maplibre] node_modules/maplibre-gl não encontrado; a saltar a cópia do worker.");
  process.exit(0);
}
mkdirSync(target, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(join(source, file), join(target, file));
}
console.log("[maplibre] worker copiado para public/maplibre/");
