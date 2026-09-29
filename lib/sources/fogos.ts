import { z } from "zod";

import { concelhoByDico } from "@/data/dico";
import { districts } from "@/data/districts";
import { regionAt } from "@/lib/geo/locate";

import type { FireEvent, Severity } from "./types";

export const FOGOS_ACTIVE_URL = "https://api.fogos.pt/v2/incidents/active";

export const fogosSchema = z.object({
  success: z.boolean(),
  data: z.array(
    z.object({
      id: z.string(),
      dateTime: z.object({ sec: z.number() }),
      district: z.string().nullish(),
      concelho: z.string().nullish(),
      freguesia: z.string().nullish(),
      dico: z.string().nullish(),
      lat: z.number().nullish(),
      lng: z.number().nullish(),
      natureza: z.string().nullish(),
      statusCode: z.number(),
      status: z.string(),
      man: z.number().nullish(),
      terrain: z.number().nullish(),
      aerial: z.number().nullish(),
      important: z.boolean().nullish(),
      isFire: z.boolean().nullish(),
    }),
  ),
});

export type FogosRaw = z.infer<typeof fogosSchema>;

/**
 * Estados da ANEPC tal como o Fogos.pt os expõe. "Em curso" inclui o
 * despacho e a chegada ao teatro de operações; resolução, conclusão e
 * vigilância já não são combate ativo.
 */
const ACTIVE_CODES = new Set([3, 4, 5, 6]);

export function fireSeverity(statusCode: number, important: boolean): Severity {
  if (important) return "red";
  if (ACTIVE_CODES.has(statusCode)) return "orange";
  if (statusCode === 7) return "yellow";
  return "none";
}

const districtByName = new Map(
  districts.map((d) => [
    d.name
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase(),
    d.slug,
  ]),
);

function districtSlug(name?: string | null, dico?: string | null): string | undefined {
  const fromDico = dico ? concelhoByDico(dico)?.district : undefined;
  if (fromDico) return fromDico;
  if (!name) return undefined;
  return districtByName.get(
    name
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase(),
  );
}

export function normalizeFires(raw: FogosRaw): FireEvent[] {
  return raw.data
    .filter((f) => f.isFire !== false)
    .map((f): FireEvent => {
      const coordinates: [number, number] | undefined =
        f.lat != null && f.lng != null ? [f.lng, f.lat] : undefined;
      const place = [f.concelho, f.freguesia].filter(Boolean).join(", ");
      const severity = fireSeverity(f.statusCode, f.important === true);
      return {
        kind: "fire",
        id: `fogo-${f.id}`,
        severity,
        title: f.natureza ? `Incêndio: ${f.natureza.toLowerCase()}` : "Incêndio",
        status: f.status,
        statusCode: f.statusCode,
        active: ACTIVE_CODES.has(f.statusCode),
        startedAt: new Date(f.dateTime.sec * 1000).toISOString(),
        operatives: f.man ?? 0,
        groundUnits: f.terrain ?? 0,
        aerialUnits: f.aerial ?? 0,
        nature: f.natureza ?? "Incêndio",
        concelho: f.concelho ?? undefined,
        coordinates,
        place: {
          district: districtSlug(f.district, f.dico),
          region: coordinates ? regionAt(coordinates) : "continente",
          label: place || f.district || "Local por confirmar",
        },
      };
    })
    .sort(
      (a, b) =>
        Number(b.active) - Number(a.active) ||
        b.operatives - a.operatives ||
        b.startedAt.localeCompare(a.startedAt),
    );
}
