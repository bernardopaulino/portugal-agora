import { z } from "zod";

import { districts } from "@/data/districts";

import type { UvReading } from "./types";

export const IPMA_UV_URL = "https://api.ipma.pt/open-data/forecast/meteorology/uv/uv.json";

export const ipmaUvSchema = z.array(
  z.object({
    idPeriodo: z.number(),
    data: z.string(),
    globalIdLocal: z.number(),
    iUv: z.coerce.number(),
  }),
);

export type IpmaUvRaw = z.infer<typeof ipmaUvSchema>;

export function uvLabel(index: number): string {
  if (index < 3) return "Baixo";
  if (index < 6) return "Moderado";
  if (index < 8) return "Elevado";
  if (index < 11) return "Muito elevado";
  return "Extremo";
}

/**
 * Índice UV máximo de cada dia para cada capital. O IPMA publica uma
 * entrada por local e dia; `idPeriodo` indica a janela horária do pico
 * (varia de local para local), por isso não se filtra por ele.
 */
export function normalizeUv(raw: IpmaUvRaw): UvReading[] {
  const byLocal = new Map(districts.map((d) => [d.globalIdLocal, d.slug]));
  const peaks = new Map<string, UvReading>();
  for (const r of raw) {
    const district = byLocal.get(r.globalIdLocal);
    if (!district || !Number.isFinite(r.iUv)) continue;
    const key = `${district}|${r.data}`;
    const current = peaks.get(key);
    if (!current || r.iUv > current.index) {
      peaks.set(key, { district, date: r.data, index: r.iUv, label: uvLabel(r.iUv) });
    }
  }
  return [...peaks.values()].sort(
    (a, b) => a.date.localeCompare(b.date) || a.district.localeCompare(b.district),
  );
}
