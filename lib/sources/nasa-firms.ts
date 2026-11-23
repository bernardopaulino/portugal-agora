import "server-only";

import { z } from "zod";

import { concelhoForDico } from "@/data/concelhos";
import { pointInFeature, type ConcelhoFeature } from "@/lib/geo/geometry";
import { locateDistrict, regionAt } from "@/lib/geo/locate";
import concelhoGeo from "@/public/geo/concelhos.json";

import type { Place } from "./types";

/*
 * Pontos de calor detetados por satélite (NASA FIRMS, VIIRS dos satélites
 * NOAA-20 e NOAA-21, resolução de 375 m, ~3 h depois da passagem). São
 * deteções, não incêndios confirmados: também apanham queimadas, fábricas e
 * outras fontes de calor. Dados abertos da NASA, com a fonte indicada.
 *
 * Sem chave: os ficheiros públicos da Europa (últimas 24 h), que só cobrem o
 * continente. Com FIRMS_MAP_KEY (gratuita): a API por área, com os Açores e
 * a Madeira, onde o Fogos.pt não chega.
 */

/** Portugal inteiro (Açores, Madeira e continente): oeste, sul, este, norte. */
const PORTUGAL_BBOX = "-31.6,32.3,-6.1,42.2";

export function firmsUrls(mapKey?: string): string[] {
  if (mapKey)
    return ["VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT"].map(
      (product) =>
        // 2 dias: "1" é só o dia UTC corrente (vazio logo a seguir à meia-noite); o corte das 24 h é feito aqui.
        `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/${product}/${PORTUGAL_BBOX}/2`,
    );
  const base = "https://firms.modaps.eosdis.nasa.gov/data/active_fire";
  return [
    `${base}/noaa-20-viirs-c2/csv/J1_VIIRS_C2_Europe_24h.csv`,
    `${base}/noaa-21-viirs-c2/csv/J2_VIIRS_C2_Europe_24h.csv`,
  ];
}

export const firmsSchema = z.string();

export interface Hotspot {
  id: string;
  coordinates: [number, number];
  /** Hora da passagem do satélite (ISO, UTC). */
  detectedAt: string;
  satellite: string;
  /** Potência radiativa do fogo (MW): mais alta, mais intenso o calor. */
  frp: number;
  confidence: "nominal" | "high";
  place: Place;
  dico?: string;
}

const satellites: Record<string, string> = { N20: "NOAA-20", N21: "NOAA-21", "1": "NOAA-20" };
const features = (concelhoGeo as { features: ConcelhoFeature[] }).features;

function concelhoAt(point: [number, number]) {
  const f = features.find((x) => pointInFeature(point, x));
  return f ? concelhoForDico(f.properties.dico) : undefined;
}

/** As deteções em território português (em terra), sem as de baixa confiança. */
export function normalizeHotspots(files: string[], now: Date): Hotspot[] {
  const since = now.getTime() - 24 * 3_600_000;
  const out = new Map<string, Hotspot>();
  let validFiles = 0;
  for (const csv of files) {
    const [header, ...lines] = csv.trim().split(/\r?\n/);
    const cols = (header ?? "").split(",");
    const col = (name: string) => cols.indexOf(name);
    const [iLat, iLon, iDate, iTime, iSat, iConf, iFrp] = [
      "latitude",
      "longitude",
      "acq_date",
      "acq_time",
      "satellite",
      "confidence",
      "frp",
    ].map(col);
    if ([iLat, iLon, iDate, iTime].some((i) => i! < 0)) continue;
    validFiles++;
    for (const line of lines) {
      const c = line.split(",");
      const lat = Number(c[iLat!]);
      const lon = Number(c[iLon!]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      if (lon < -31.6 || lon > -6.1 || lat < 32.3 || lat > 42.2) continue;
      const conf = (c[iConf!] ?? "").toLowerCase();
      if (conf.startsWith("l")) continue;
      const hhmm = (c[iTime!] ?? "").padStart(4, "0");
      const detectedAt = `${c[iDate!]}T${hhmm.slice(0, 2)}:${hhmm.slice(2)}:00.000Z`;
      if (Number.isNaN(Date.parse(detectedAt)) || Date.parse(detectedAt) < since) continue;
      const point: [number, number] = [lon, lat];
      // Só em terra (dentro de um distrito): no mar são plataformas e navios.
      const district = locateDistrict(point, 0);
      if (!district) continue;
      const concelho = concelhoAt(point);
      const id = `firms-${c[iSat!] ?? ""}-${detectedAt}-${lat.toFixed(4)}-${lon.toFixed(4)}`;
      out.set(id, {
        id,
        coordinates: point,
        detectedAt,
        satellite: satellites[c[iSat!] ?? ""] ?? (c[iSat!] || "VIIRS"),
        frp: Math.round(Number(c[iFrp!]) * 10) / 10 || 0,
        confidence: conf.startsWith("h") ? "high" : "nominal",
        place: { district, region: regionAt(point), label: concelho?.name ?? "" },
        dico: concelho?.dico,
      });
    }
  }
  // Uma chave inválida responde com texto ("Invalid MAP_KEY."), não com CSV: é uma falha,
  // não "zero deteções".
  if (files.length > 0 && validFiles === 0)
    throw new Error(`Resposta inesperada da NASA FIRMS: ${(files[0] ?? "").trim().slice(0, 80)}`);
  return [...out.values()].sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
}
