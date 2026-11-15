import { afterEach, describe, expect, it, vi } from "vitest";

import { earlyStateScript, takeEarlyState } from "@/lib/state/early-fetch";

describe("estado do país pedido logo no <head>", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("o script pede o /api/state e o primeiro pedido do SWR usa essa resposta, uma só vez", () => {
    const fetch = vi.fn(() => Promise.resolve(new Response("{}")));
    vi.stubGlobal("window", globalThis);
    vi.stubGlobal("fetch", fetch);
    new Function(earlyStateScript)();
    expect(fetch).toHaveBeenCalledWith("/api/state");
    expect(takeEarlyState()).toBeInstanceOf(Promise);
    // Os pedidos seguintes (de minuto a minuto) vão à rede.
    expect(takeEarlyState()).toBeUndefined();
  });

  it("no servidor não há pedido antecipado", () => {
    expect(takeEarlyState()).toBeUndefined();
  });
});
