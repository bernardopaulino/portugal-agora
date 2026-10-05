import "server-only";

import { z } from "zod";

import type { FireRisk } from "./types";

export const IPMA_RCM_URLS = {
  today: "https://api.ipma.pt/open-data/forecast/meteorology/rcm/rcm-d0.json",
  tomorrow: "https://api.ipma.pt/open-data/forecast/meteorology/rcm/rcm-d1.json",
};

export const ipmaRcmSchema = z.object({
  dataPrev: z.string(),
  local: z.record(z.string(), z.object({ data: z.object({ rcm: z.coerce.number() }) })),
});

export type IpmaRcmRaw = z.infer<typeof ipmaRcmSchema>;

function byDico(raw: IpmaRcmRaw): Record<string, number> {
  return Object.fromEntries(
    Object.entries(raw.local)
      .filter(([, v]) => v.data.rcm >= 1 && v.data.rcm <= 5)
      .map(([dico, v]) => [dico, v.data.rcm]),
  );
}

export function normalizeFireRisk(today: IpmaRcmRaw, tomorrow: IpmaRcmRaw): FireRisk {
  return {
    today: { date: today.dataPrev, byDico: byDico(today) },
    tomorrow: { date: tomorrow.dataPrev, byDico: byDico(tomorrow) },
  };
}
