import "server-only";

import { loadStateSources, type RefreshMode } from "@/lib/sources/registry";

import { aggregate, type CountryState } from "./aggregate";

/**
 * Estado do país "ao minuto", para /api/state (que o browser consulta de
 * minuto a minuto, com cache na CDN), para as imagens de partilha, para os
 * feeds e para o tick. Nenhuma página o usa no servidor: as páginas são
 * estáticas e os dados chegam pelo browser (ver useLiveState).
 *
 * Lê as fontes do Redis num só comando e não espera por elas enquanto
 * houver dados recentes (ver lib/sources/registry.ts). A agregação corre a
 * cada pedido, com a hora atual: é barata e assim nada fica "parado no tempo".
 */
export async function readState(
  options: { refresh?: RefreshMode; peek?: string[] } = {},
): Promise<{ state: CountryState; peeked: Map<string, unknown> }> {
  const { inputs, peeked } = await loadStateSources(options);
  return { state: aggregate(inputs, new Date()), peeked };
}

export async function getState(refresh?: RefreshMode): Promise<CountryState> {
  return (await readState({ refresh })).state;
}
