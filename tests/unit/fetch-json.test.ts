import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { fetchJson, SourceError } from "@/lib/http/fetch-json";

const schema = z.object({ owner: z.literal("IPMA"), data: z.array(z.unknown()) });

function mockFetch(response: Response | Error) {
  return vi.fn<typeof fetch>(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
}

describe("fetchJson", () => {
  it("devolve os dados validados e envia um User-Agent identificável", async () => {
    const fetchImpl = mockFetch(Response.json({ owner: "IPMA", data: [] }));
    const result = await fetchJson("https://api.ipma.pt/x.json", { schema, fetchImpl });

    expect(result).toEqual({ owner: "IPMA", data: [] });
    const init = fetchImpl.mock.calls[0]?.[1];
    const headers = init?.headers as Record<string, string>;
    expect(headers["User-Agent"]).toMatch(/^PortugalAgora\/1\.0 \(\+/);
    expect(headers.Accept).toBe("application/json");
  });

  it("junta cabeçalhos extra (ex.: X-API-Key)", async () => {
    const fetchImpl = mockFetch(Response.json({ owner: "IPMA", data: [] }));
    await fetchJson("https://api.fogos.pt/x", { schema, fetchImpl, headers: { "X-API-Key": "k" } });
    const headers = fetchImpl.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers["X-API-Key"]).toBe("k");
  });

  it("falha com kind=http em respostas de erro", async () => {
    const fetchImpl = mockFetch(new Response("slow down", { status: 429 }));
    await expect(fetchJson("https://a/b", { schema, fetchImpl })).rejects.toMatchObject({
      kind: "http",
      status: 429,
    });
  });

  it("falha com kind=parse se a resposta não for JSON", async () => {
    const fetchImpl = mockFetch(new Response("<html>", { status: 200 }));
    await expect(fetchJson("https://a/b", { schema, fetchImpl })).rejects.toMatchObject({
      kind: "parse",
    });
  });

  it("falha com kind=schema se o formato mudar", async () => {
    const fetchImpl = mockFetch(Response.json({ owner: "Outro", data: [] }));
    await expect(fetchJson("https://a/b", { schema, fetchImpl })).rejects.toMatchObject({
      kind: "schema",
    });
  });

  it("falha com kind=timeout quando a fonte não responde", async () => {
    const fetchImpl = mockFetch(new DOMException("timeout", "TimeoutError"));
    const error = await fetchJson("https://a/b", { schema, fetchImpl, timeoutMs: 10 }).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(SourceError);
    expect(error).toMatchObject({ kind: "timeout" });
  });

  it("falha com kind=network em erros de rede", async () => {
    const fetchImpl = mockFetch(new TypeError("fetch failed"));
    await expect(fetchJson("https://a/b", { schema, fetchImpl })).rejects.toMatchObject({
      kind: "network",
    });
  });
});
