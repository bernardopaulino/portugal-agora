import { districts, type Region } from "@/data/districts";
import geo from "@/public/geo/distritos.json";

import { distanceKm, districtAt, type DistrictFeature } from "./geometry";

const features = (geo as { features: DistrictFeature[] }).features;

export function regionAt([lon, lat]: [number, number]): Region {
  if (lon < -20) return "acores";
  if (lat < 34.5 && lon < -14) return "madeira";
  return "continente";
}

/**
 * Distrito de um ponto: o polígono que o contém ou, para pontos no mar
 * junto à costa, a capital de distrito mais próxima num raio de `maxKm`.
 */
export function locateDistrict(point: [number, number], maxKm = 40): string | undefined {
  const inside = districtAt(point, features);
  if (inside) return inside;
  const region = regionAt(point);
  let best: { slug: string; km: number } | undefined;
  for (const d of districts) {
    if (d.region !== region) continue;
    const km = distanceKm(point, [d.lon, d.lat]);
    if (!best || km < best.km) best = { slug: d.slug, km };
  }
  return best && best.km <= maxKm ? best.slug : undefined;
}
