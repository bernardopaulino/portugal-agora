import "server-only";

import { z } from "zod";

/*
 * Chuva e seca por concelho (só continente), do IPMA, nos mesmos termos dos
 * outros dados do IPMA (uso sem fins lucrativos, com a fonte indicada).
 *
 * - Chuva: precipitação diária dos últimos 20 dias por concelho, estimada a
 *   partir das observações (a média da grelha no concelho, em mm). Um só
 *   ficheiro CSV para os 278 concelhos, renovado uma vez por dia.
 * - Seca: o índice PDSI (Palmer) mensal, no serviço de mapas do IPMA (WMS),
 *   pedido no ponto central de cada concelho. Muda uma vez por mês.
 */

export const IPMA_PRECIP_URL =
  "https://api.ipma.pt/open-data/observation/climate/precipitation/prec-p1d-continental-obssup-idw-concelhos-20d.csv";

export interface ConcelhoRain {
  /** Primeiro dia da série (AAAA-MM-DD). */
  start: string;
  /** mm por dia, do mais antigo ao mais recente. */
  byDico: Record<string, number[]>;
}

export function normalizePrecip(csv: string): ConcelhoRain {
  const [header, ...lines] = csv.trim().split(/\r?\n/);
  const cols = (header ?? "").split(",");
  const iTime = cols.indexOf("time");
  const iDico = cols.indexOf("zid");
  const iMm = cols.indexOf("mean_tp");
  if (iTime < 0 || iDico < 0 || iMm < 0) throw new Error("Colunas inesperadas no CSV da chuva");
  const rows = lines
    .map((line) => line.split(","))
    .map((c) => ({ date: c[iTime]!.slice(0, 10), dico: c[iDico]!, mm: Number(c[iMm]) }))
    .filter((r) => /^\d{4}$/.test(r.dico) && /^\d{4}-\d{2}-\d{2}$/.test(r.date));
  const dates = [...new Set(rows.map((r) => r.date))].sort();
  const index = new Map(dates.map((d, i) => [d, i]));
  const byDico: Record<string, number[]> = {};
  for (const r of rows) {
    const series = (byDico[r.dico] ??= dates.map(() => 0));
    // Valores em falta ou negativos contam como sem chuva.
    series[index.get(r.date)!] = Number.isFinite(r.mm) && r.mm > 0 ? Math.round(r.mm * 10) / 10 : 0;
  }
  return { start: dates[0] ?? "", byDico };
}

/** Um ponto [lon, lat] no WMS do IPMA (GetFeatureInfo num quadrado pequeno à volta). */
export function ipmaPdsiUrl([lon, lat]: [number, number]): string {
  const layer = "PT:IPMA:CDG:LAYER:pdsi-p1m-continental-apuraobssup-idw";
  const d = 0.05;
  const params = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.3.0",
    REQUEST: "GetFeatureInfo",
    DATASET: "pdsi-p1m-continental-apuraobssup-idw",
    LAYERS: layer,
    QUERY_LAYERS: layer,
    CRS: "EPSG:4326",
    // WMS 1.3.0 com EPSG:4326: latitude primeiro.
    BBOX: [lat - d, lon - d, lat + d, lon + d].map((n) => n.toFixed(4)).join(","),
    WIDTH: "3",
    HEIGHT: "3",
    I: "1",
    J: "1",
    INFO_FORMAT: "application/json",
  });
  return `https://cs2.ipma.pt/wms?${params}`;
}

export const ipmaPdsiSchema = z.array(z.object({ data: z.record(z.string(), z.string()) })).min(1);

export interface Drought {
  /** Mês do índice (AAAA-MM). */
  month: string;
  value: number;
  /** Classe do IPMA: "Seca severa", "Normal", "Chuva fraca"… */
  label: string;
  /** 0 normal; negativo, seca (-1 a -4); positivo, chuva (1 a 4). */
  level: number;
}

/** Classes do PDSI usadas pelo IPMA. */
export function pdsiClass(value: number): { label: string; level: number } {
  if (value <= -4) return { label: "Seca extrema", level: -4 };
  if (value <= -3) return { label: "Seca severa", level: -3 };
  if (value <= -2) return { label: "Seca moderada", level: -2 };
  if (value <= -1) return { label: "Seca fraca", level: -1 };
  if (value < 1) return { label: "Normal", level: 0 };
  if (value < 2) return { label: "Chuva fraca", level: 1 };
  if (value < 3) return { label: "Chuva moderada", level: 2 };
  if (value < 4) return { label: "Chuva severa", level: 3 };
  return { label: "Chuva extrema", level: 4 };
}

export function normalizePdsi(raw: z.infer<typeof ipmaPdsiSchema>): Drought | null {
  const latest = Object.entries(raw[0]!.data)
    .map(([time, v]) => ({ month: time.slice(0, 7), value: Number(v) }))
    .filter((e) => Number.isFinite(e.value) && e.value > -90)
    .sort((a, b) => a.month.localeCompare(b.month))
    .at(-1);
  if (!latest) return null;
  const value = Math.round(latest.value * 10) / 10;
  return { month: latest.month, value, ...pdsiClass(value) };
}
