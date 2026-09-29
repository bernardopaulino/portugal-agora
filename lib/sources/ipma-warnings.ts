import { z } from "zod";

import { districtForIpmaArea, ipmaAreaLabel } from "@/data/districts";
import { ipmaUtc } from "@/lib/time/format";

import type { Severity, WarningEvent } from "./types";

export const IPMA_WARNINGS_URL =
  "https://api.ipma.pt/open-data/forecast/warnings/warnings_www.json";

export const ipmaWarningsSchema = z.array(
  z.object({
    text: z.string().nullish(),
    awarenessTypeName: z.string(),
    idAreaAviso: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    awarenessLevelID: z.enum(["green", "yellow", "orange", "red"]),
  }),
);

export type IpmaWarningsRaw = z.infer<typeof ipmaWarningsSchema>;

const levelToSeverity: Record<string, Severity> = {
  green: "none",
  yellow: "yellow",
  orange: "orange",
  red: "red",
};

const levelWord: Record<Severity, string> = {
  none: "verde",
  yellow: "amarelo",
  orange: "laranja",
  red: "vermelho",
};

/**
 * Converte a lista do IPMA em avisos: ignora os verdes (não são avisos)
 * e os que já terminaram. As horas do IPMA estão em UTC sem sufixo —
 * o próprio site do IPMA acrescenta "Z" antes de as interpretar.
 */
export function normalizeWarnings(raw: IpmaWarningsRaw, now: Date): WarningEvent[] {
  return raw
    .filter((w) => w.awarenessLevelID !== "green")
    .map((w) => ({ ...w, start: ipmaUtc(w.startTime), end: ipmaUtc(w.endTime) }))
    .filter((w) => new Date(w.end) > now)
    .map((w): WarningEvent => {
      const severity = levelToSeverity[w.awarenessLevelID] ?? "none";
      const district = districtForIpmaArea(w.idAreaAviso);
      return {
        kind: "warning",
        id: `ipma-${w.idAreaAviso}-${w.awarenessTypeName}-${w.start}`,
        severity,
        type: w.awarenessTypeName,
        title: `Aviso ${levelWord[severity]} de ${w.awarenessTypeName.toLowerCase()}`,
        description: w.text?.trim() || undefined,
        area: w.idAreaAviso,
        place: {
          district: district?.slug,
          region: district?.region ?? "continente",
          label: ipmaAreaLabel(w.idAreaAviso),
        },
        startsAt: w.start,
        endsAt: w.end,
      };
    })
    .sort(
      (a, b) =>
        ["red", "orange", "yellow", "none"].indexOf(a.severity) -
          ["red", "orange", "yellow", "none"].indexOf(b.severity) ||
        a.startsAt.localeCompare(b.startsAt) ||
        a.place.label.localeCompare(b.place.label, "pt"),
    );
}
