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

/** Validadores HTTP da última resposta, para perguntar "mudou?" na seguinte. */
export interface Validators {
  etag?: string;
  lastModified?: string;
}

export type Conditional<T> =
  { notModified: true } | { notModified: false; data: T; validators: Validators };

/**
 * GET JSON com timeout, User-Agent identificável e validação Zod.
 * Todos os adaptadores de fontes passam por aqui: um único sítio para
 * tratar falhas de rede, respostas HTTP de erro e mudanças de formato.
 * A cache é do Redis (lib/cache/source-store.ts), não do Next.
 */
export async function fetchJson<T>(url: string, options: FetchJsonOptions<T>): Promise<T> {
  const result = await fetchJsonIfChanged(url, options);
  // Sem validadores no pedido, o servidor nunca responde 304.
  if (result.notModified) throw new SourceError(`304 inesperado: ${url}`, "http", 304);
  return result.data;
}

/**
 * Como fetchJson, mas com If-None-Match / If-Modified-Since quando há
 * validadores da resposta anterior: o IPMA responde 304, sem corpo, em
 * ~70 ms quando o ficheiro não mudou, e assim não se descarrega nem valida nada.
 */
export async function fetchJsonIfChanged<T>(
  url: string,
  options: FetchJsonOptions<T> & { validators?: Validators },
): Promise<Conditional<T>> {
  const { schema, timeoutMs = 3000, headers = {}, fetchImpl = fetch, validators } = options;
  const e = env();
  const conditional: Record<string, string> = {};
  if (validators?.etag) conditional["If-None-Match"] = validators.etag;
  if (validators?.lastModified) conditional["If-Modified-Since"] = validators.lastModified;

  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": buildUserAgent({
          siteUrl: e.NEXT_PUBLIC_SITE_URL,
          contactEmail: e.CONTACT_EMAIL,
        }),
        ...conditional,
        ...headers,
      },
      // Sempre à fonte: a cache é o Redis, e um 304 só serve se o pedido lá chegar.
      cache: "no-store",
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

  if (response.status === 304 && (validators?.etag || validators?.lastModified)) {
    return { notModified: true };
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
  return {
    notModified: false,
    data: parsed.data,
    validators: {
      etag: response.headers.get("etag") ?? undefined,
      lastModified: response.headers.get("last-modified") ?? undefined,
    },
  };
}
