/*
 * Gera data/forecast-locations.ts: para cada concelho (DICO), o local de
 * previsão do IPMA (globalIdLocal) e o nome que o IPMA lhe dá.
 *
 * O IPMA tem um local de previsão por concelho no continente (o globalIdLocal
 * é 1 + DICO + 00). Nos Açores e na Madeira há menos locais do que concelhos
 * e com outros códigos: usa-se o do próprio concelho (de preferência o que
 * acaba em 00) e, sem nenhum, o mais próximo do centro do concelho na mesma
 * ilha (o mesmo idDistrito do IPMA). Ficam de fora os picos e as Selvagens.
 *
 * Uso: node scripts/build-forecast-locations.mjs   (só é preciso se o IPMA
 * mudar a lista de locais ou a CAOP mudar)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dico = JSON.parse(readFileSync(join(root, "data/dico.json"), "utf8"));
const points = new Map(
  [
    ...readFileSync(join(root, "data/concelhos-geo.ts"), "utf8").matchAll(
      /\["(\d{4})", "[^"]+", (-?[\d.]+), (-?[\d.]+)\]/g,
    ),
  ].map((m) => [m[1], [Number(m[2]), Number(m[3])]]),
);

const response = await fetch("https://api.ipma.pt/public-data/forecast/locations.json");
if (!response.ok) throw new Error(`IPMA ${response.status}`);
// Picos da Madeira e ilhas desabitadas: não descrevem o tempo de quem vive no concelho.
const notForPeople = new Set(["Bica da Cana", "Areeiro", "Ilhas Selvagens"]);
const all = await response.json();
const locations = all
  .filter((l) => !notForPeople.has(l.local))
  .map((l) => ({
    id: l.globalIdLocal,
    name: l.local,
    dico: `${String(l.idDistrito).padStart(2, "0")}${String(l.idConcelho).padStart(2, "0")}`,
    district: l.idDistrito,
    point: [Number(l.longitude), Number(l.latitude)],
  }));

const km = ([lon1, lat1], [lon2, lat2]) => {
  const rad = Math.PI / 180;
  const x = (lon2 - lon1) * rad * Math.cos(((lat1 + lat2) / 2) * rad);
  const y = (lat2 - lat1) * rad;
  return Math.hypot(x, y) * 6371;
};

const rows = [];
for (const [code, name] of dico) {
  const point = points.get(code);
  if (!point) throw new Error(`Sem ponto para ${code} ${name}`);
  const own = locations.filter((l) => l.dico === code).sort((a, b) => a.id - b.id);
  const pick =
    own.find((l) => l.id % 100 === 0) ??
    own[0] ??
    locations
      .filter((l) => l.district === Number(code.slice(0, 2)))
      .sort((a, b) => km(a.point, point) - km(b.point, point))[0];
  if (!pick) throw new Error(`Sem local de previsão para ${code} ${name}`);
  rows.push([code, pick.id, pick.name]);
}

const body = rows.map(([code, id, name]) => `  ["${code}", ${id}, ${JSON.stringify(name)}],`);
writeFileSync(
  join(root, "data/forecast-locations.ts"),
  `/*
 * Gerado por scripts/build-forecast-locations.mjs: [DICO, globalIdLocal do
 * IPMA, nome do local de previsão]. Nas ilhas, alguns concelhos usam o local
 * mais próximo (outro nome).
 */
export const forecastLocations: [string, number, string][] = [
${body.join("\n")}
];
`,
);
console.log(`${rows.length} concelhos`);
