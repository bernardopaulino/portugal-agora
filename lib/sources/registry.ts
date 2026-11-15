import "server-only";

import { after } from "next/server";

import { claim, readEntries, writeEntry, type Entry } from "@/lib/cache/source-store";
import { features } from "@/lib/env";

import {
  airQualitySource,
  earthquakesSource,
  fireRiskSource,
  firesSource,
  forecastSource,
  observationsSource,
  seaSource,
  uvSource,
  warningsSource,
  type ObservationsData,
  type SourceDef,
} from "./loaders";
import type { FireEvent, SourceId, SourceResult } from "./types";

export const sourceNames: Record<SourceId, string> = {
  "ipma-warnings": "IPMA",
  "ipma-seismic": "IPMA",
  "ipma-rcm": "IPMA",
  "ipma-uv": "IPMA",
  "ipma-forecast": "IPMA",
  "ipma-observations": "IPMA",
  "ipma-sea": "IPMA",
  fogos: "Fogos.pt",
  "openmeteo-aq": "Open-Meteo",
};

/*
 * Como se lê uma fonte:
 * 1. Um só MGET traz os dados e os metadados de todas as fontes do pedido.
 * 2. Com dados recentes, responde-se logo com eles. As fontes cuja hora de
 *    verificação chegou (`every`) são verificadas depois de responder
 *    (after()), por quem apanhar o cadeado: com 1 ou 10 000 pessoas no
 *    site, cada fonte é verificada o mesmo número de vezes.
 * 3. Só se espera pela fonte quando não há dados, ou quando são mais
 *    antigos do que `staleAfterMinutes` (ninguém abriu o site há muito).
 * Uma falha nunca apaga dados: ficam os últimos, marcados como desatualizados.
 */

/** Depois de uma falha, espera-se 1 min antes de voltar a perguntar. */
const RETRY_SECONDS = 60;
/** Tempo máximo de uma verificação (os pedidos às fontes têm 3 a 6 s). */
const LOCK_SECONDS = 30;

/**
 * - "after": responde com o que há e verifica as fontes em atraso depois (pedidos do site);
 * - "await": verifica primeiro as fontes em atraso (o tick, que corre sem ninguém à espera);
 * - "none": só lê, nunca pergunta às fontes (a monitorização, que quer ver o estado real).
 */
export type RefreshMode = "after" | "await" | "none";

const secondsSince = (iso: string | undefined, now: Date) =>
  iso ? (now.getTime() - Date.parse(iso)) / 1000 : Infinity;

function failedRecently(entry: Entry<unknown>, now: Date): boolean {
  return secondsSince(entry.meta?.failedAt, now) < RETRY_SECONDS;
}

/** Já passou a hora de voltar a perguntar à fonte. */
export function isDue(def: SourceDef<unknown>, entry: Entry<unknown>, now: Date): boolean {
  if (failedRecently(entry, now)) return false;
  return secondsSince(entry.meta?.checkedAt, now) >= def.every;
}

/** Os dados não servem sem perguntar primeiro à fonte. */
function mustWait(def: SourceDef<unknown>, entry: Entry<unknown>, now: Date): boolean {
  if (failedRecently(entry, now)) return false;
  return (
    entry.data === undefined ||
    secondsSince(entry.meta?.checkedAt, now) > def.staleAfterMinutes * 60
  );
}

/**
 * Pergunta à fonte e guarda o resultado. 304 ou conteúdo igual: só os
 * metadados (a hora da verificação). Conteúdo novo: os dados também.
 * Falha: guarda a falha e mantém os dados que havia.
 */
export async function refreshSource<T>(
  def: SourceDef<T>,
  entry: Entry<T>,
  { lock = true }: { lock?: boolean } = {},
): Promise<Entry<T>> {
  if (lock && !(await claim(`lock:${def.key}`, LOCK_SECONDS))) return entry;
  const hasData = entry.data !== undefined;
  try {
    const result = await def.fetch(hasData ? entry.meta?.validators : undefined);
    const at = new Date().toISOString();
    if (result.notModified) {
      const meta = { ...entry.meta, checkedAt: at, failedAt: undefined, error: undefined };
      await writeEntry(def.key, { meta });
      return { data: entry.data, meta };
    }
    const changed = !hasData || JSON.stringify(result.data) !== JSON.stringify(entry.data);
    const meta = {
      fetchedAt: changed ? at : (entry.meta?.fetchedAt ?? at),
      checkedAt: at,
      validators: result.validators,
    };
    await writeEntry(def.key, changed ? { data: result.data, meta } : { meta });
    return { data: result.data, meta };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[fonte ${def.key}]`, message);
    const meta = { ...entry.meta, failedAt: new Date().toISOString(), error: message };
    await writeEntry(def.key, { meta }).catch(() => undefined);
    return { data: entry.data, meta };
  }
}

/** after() fora de um pedido (testes, scripts) lança: aí corre-se logo, sem esperar. */
function later(task: () => Promise<unknown>) {
  try {
    after(task);
  } catch {
    void task().catch(() => undefined);
  }
}

function toResult<T>(def: SourceDef<T>, entry: Entry<T>, now: Date): SourceResult<T> {
  const name = sourceNames[def.id];
  if (entry.data === undefined) {
    return {
      id: def.id,
      status: "unavailable",
      data: null,
      message: `${name} sem resposta de momento. Tentamos de novo em breve.`,
    };
  }
  const data = def.prune ? def.prune(entry.data, now) : entry.data;
  const { checkedAt, failedAt } = entry.meta ?? {};
  // A hora mostrada é a da última confirmação: dados iguais há 2 h, confirmados agora, são de agora.
  const fetchedAt = checkedAt ?? entry.meta?.fetchedAt;
  if (failedAt && (!checkedAt || failedAt > checkedAt)) {
    return {
      id: def.id,
      status: "stale",
      data,
      fetchedAt,
      message: `${name} sem resposta. A mostrar os últimos dados obtidos.`,
    };
  }
  return { id: def.id, status: "ok", data, fetchedAt };
}

type Results<D extends readonly SourceDef<unknown>[]> = {
  -readonly [K in keyof D]: D[K] extends SourceDef<infer T> ? SourceResult<T> : never;
};

/**
 * Lê várias fontes de uma vez (ver o comentário acima). `peek`: chaves
 * simples lidas no mesmo comando, para quem precise (o cadeado do tick).
 */
export async function loadSources<const D extends readonly SourceDef<unknown>[]>(
  defs: D,
  { refresh = "after", peek = [] }: { refresh?: RefreshMode; peek?: readonly string[] } = {},
): Promise<{ results: Results<D>; peeked: Map<string, unknown> }> {
  const now = new Date();
  const { entries, peeked } = await readEntries(
    defs.map((d) => d.key),
    peek,
  );
  const current = defs.map((def) => entries.get(def.key) ?? {});

  if (refresh !== "none") {
    await Promise.all(
      defs.map(async (def, i) => {
        const entry = current[i]!;
        if (mustWait(def, entry, now)) {
          // Sem dados não há cadeado: ficar à espera de outra instância daria "indisponível".
          current[i] = await refreshSource(def, entry, { lock: entry.data !== undefined });
        } else if (refresh === "await" && isDue(def, entry, now)) {
          current[i] = await refreshSource(def, entry);
        }
      }),
    );
    if (refresh === "after") {
      const due = defs.flatMap((def, i) => (isDue(def, current[i]!, now) ? [i] : []));
      if (due.length > 0) {
        later(() => Promise.all(due.map((i) => refreshSource(defs[i]!, current[i]!))));
      }
    }
  }

  const results = defs.map((def, i) => toResult(def, current[i]!, now));
  return { results: results as Results<D>, peeked };
}

async function one<T>(def: SourceDef<T>, refresh?: RefreshMode): Promise<SourceResult<T>> {
  const { results } = await loadSources([def] as const, { refresh });
  return results[0] as SourceResult<T>;
}

const firesDisabled: SourceResult<FireEvent[]> = {
  id: "fogos",
  status: "disabled",
  data: null,
  message: "Dados de incêndios indisponíveis neste momento. Consulte fogos.pt.",
};

/** As fontes do estado do país, pela ordem do StateInputs. */
export async function loadStateSources(options: { refresh?: RefreshMode; peek?: string[] } = {}) {
  const firesOn = features().fires;
  const { results, peeked } = await loadSources(
    [warningsSource, earthquakesSource, firesSource, fireRiskSource, uvSource, airQualitySource],
    options,
  );
  const [warnings, earthquakes, firesResult, fireRisk, uv, airQuality] = results;
  const fires = firesOn ? firesResult : firesDisabled;
  return { inputs: { warnings, earthquakes, fires, fireRisk, uv, airQuality }, peeked };
}

export const getWarnings = (refresh?: RefreshMode) => one(warningsSource, refresh);
export const getEarthquakes = (refresh?: RefreshMode) => one(earthquakesSource, refresh);
export const getFireRisk = (refresh?: RefreshMode) => one(fireRiskSource, refresh);
export const getUv = (refresh?: RefreshMode) => one(uvSource, refresh);
export const getAirQuality = (refresh?: RefreshMode) => one(airQualitySource, refresh);
export const getSea = (refresh?: RefreshMode) => one(seaSource, refresh);
export const getForecast = (globalIdLocal: number) => one(forecastSource(globalIdLocal));

export async function getFires(refresh?: RefreshMode): Promise<SourceResult<FireEvent[]>> {
  if (!features().fires) return firesDisabled;
  return one(firesSource, refresh);
}

/** Observações por distrito e de todas as estações, a partir do mesmo ficheiro. */
export async function getObservationsAndStations(refresh?: RefreshMode) {
  const result = await one<ObservationsData>(observationsSource, refresh);
  return {
    observations: { ...result, data: result.data?.byDistrict ?? null },
    stations: { ...result, data: result.data?.stations ?? null },
  };
}
