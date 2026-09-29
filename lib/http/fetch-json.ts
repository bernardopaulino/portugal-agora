import "server-only";

import type { z } from "zod";

import { env } from "@/lib/env";
import { buildUserAgent } from "@/lib/http/user-agent";

export class SourceError extends Error {
  constructor(
    message: string,
    readonly kind: "timeout" | "http" | "network" | "parse" | "schema",
    readonly status?: number,
  ) {
    super(message);
    this.name = "SourceError";
  }
}

export interface FetchJsonOptions<T> {
  /** Esquema Zod que valida a resposta; falha com `kind: "schema"`. */
  schema: z.ZodType<T>;
  /** Tempo máximo em ms antes de abortar (por defeito 3000). */
  timeoutMs?: number;
  /** Cabeçalhos adicionais (ex.: X-API-Key do Fogos.pt). */
  headers?: Record<string, string>;
  /** Injeção para testes. */
  fetchImpl?: typeof fetch;
}

/**
 * GET JSON com timeout, User-Agent identificável e validação Zod.
 * Todos os adaptadores de fontes passam por aqui: um único sítio para
 * tratar falhas de rede, respostas HTTP de erro e mudanças de formato.
 * A cache é responsabilidade de cada adaptador (`"use cache"` + `cacheLife`).
 */
export async function fetchJson<T>(url: string, options: FetchJsonOptions<T>): Promise<T> {
  const { schema, timeoutMs = 3000, headers = {}, fetchImpl = fetch } = options;
  const e = env();

  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": buildUserAgent({
          siteUrl: e.NEXT_PUBLIC_SITE_URL,
          contactEmail: e.CONTACT_EMAIL,
        }),
        ...headers,
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      throw new SourceError(`Sem resposta em ${timeoutMs} ms: ${url}`, "timeout");
    }
    throw new SourceError(`Falha de rede: ${url}`, "network");
  }

  if (!response.ok) {
    throw new SourceError(`HTTP ${response.status}: ${url}`, "http", response.status);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new SourceError(`Resposta não é JSON válido: ${url}`, "parse");
  }

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new SourceError(
      `Formato inesperado em ${url}: ${parsed.error.issues[0]?.message ?? "erro desconhecido"}`,
      "schema",
    );
  }
  return parsed.data;
}
