import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetMemoryStore } from "@/lib/cache/source-store";
import { fetchJsonIfChanged } from "@/lib/http/fetch-json";
import { warningsSource } from "@/lib/sources/loaders";
import { getWarnings } from "@/lib/sources/registry";
import { IPMA_WARNINGS_URL, ipmaWarningsSchema } from "@/lib/sources/ipma-warnings";

/*
 * O armazém das fontes em memória (sem Redis): a primeira leitura vai à
 * fonte; as seguintes só leem até chegar a hora de verificar; aí pergunta-se
 * "mudou?" com o ETag, e um 304 não descarrega nada.
 */

const warning = (end: string) => ({
  text: "Chuva forte",
  awarenessTypeName: "Precipitação",
  idAreaAviso: "PTO",
  startTime: "2026-11-15T06:00:00",
  endTime: end,
  awarenessLevelID: "yellow",
});

let calls: { url: string; headers: Record<string, string> }[] = [];
let respond: () => Response;

beforeEach(() => {
  resetMemoryStore();
  calls = [];
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-15T08:00:00Z"));
  respond = () => Response.json([warning("2026-11-15T18:00:00")], { headers: { ETag: '"v1"' } });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
      return respond();
    }),
  );
});

afterEach(() => {
  vi.useRealTimers();
});

describe("fetchJsonIfChanged", () => {
  it("envia o ETag anterior e devolve notModified num 304", async () => {
    respond = () => new Response(null, { status: 304 });
    const result = await fetchJsonIfChanged(IPMA_WARNINGS_URL, {
      schema: ipmaWarningsSchema,
      validators: { etag: '"v1"', lastModified: "Sat, 15 Nov 2026 07:00:00 GMT" },
    });
    expect(result).toEqual({ notModified: true });
    expect(calls[0]?.headers["If-None-Match"]).toBe('"v1"');
    expect(calls[0]?.headers["If-Modified-Since"]).toBe("Sat, 15 Nov 2026 07:00:00 GMT");
  });
});

describe("leitura das fontes", () => {
  it("sem dados vai à fonte; depois lê sem perguntar até à hora de verificar", async () => {
    const first = await getWarnings("await");
    expect(first.status).toBe("ok");
    expect(first.data).toHaveLength(1);
    expect(calls).toHaveLength(1);

    vi.setSystemTime(new Date(Date.now() + 60_000));
    const second = await getWarnings("await");
    expect(second.data).toHaveLength(1);
    expect(calls).toHaveLength(1);
  });

  it("à hora de verificar pergunta com o ETag; um 304 mantém os dados e renova a hora", async () => {
    await getWarnings("await");
    respond = () => new Response(null, { status: 304 });
    vi.setSystemTime(new Date(Date.now() + warningsSource.every * 1000));

    const result = await getWarnings("await");
    expect(calls).toHaveLength(2);
    expect(calls[1]?.headers["If-None-Match"]).toBe('"v1"');
    expect(result.status).toBe("ok");
    expect(result.data).toHaveLength(1);
    expect(result.fetchedAt).toBe(new Date().toISOString());
  });

  it("uma falha mantém os últimos dados, marcados como desatualizados", async () => {
    await getWarnings("await");
    respond = () => new Response("erro", { status: 503 });
    vi.setSystemTime(new Date(Date.now() + warningsSource.every * 1000));

    const result = await getWarnings("await");
    expect(result.status).toBe("stale");
    expect(result.data).toHaveLength(1);
    expect(result.message).toMatch(/últimos dados/);

    // Logo a seguir não volta a insistir com a fonte (espera 1 min).
    await getWarnings("await");
    expect(calls).toHaveLength(2);
  });

  it("sem dados e com a fonte em baixo, fica indisponível", async () => {
    respond = () => new Response("erro", { status: 503 });
    const result = await getWarnings("await");
    expect(result).toMatchObject({ status: "unavailable", data: null });
  });

  it("os avisos que terminam deixam de aparecer sem ser preciso voltar à fonte", async () => {
    await getWarnings("await");
    vi.setSystemTime(new Date("2026-11-15T18:01:00Z"));
    const result = await getWarnings("none");
    expect(result.data).toEqual([]);
  });

  it("'none' nunca pergunta à fonte", async () => {
    const result = await getWarnings("none");
    expect(result.status).toBe("unavailable");
    expect(calls).toHaveLength(0);
  });
});
