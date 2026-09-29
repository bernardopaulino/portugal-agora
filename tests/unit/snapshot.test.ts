import { describe, expect, it } from "vitest";

import { readSnapshot, saveSnapshot } from "@/lib/cache/snapshot";

describe("snapshot (memória, sem Redis configurado)", () => {
  it("guarda e lê o último resultado bom com a hora", async () => {
    const now = new Date("2026-09-29T14:20:00Z");
    await saveSnapshot("ipma-warnings", [{ id: 1 }], now);
    expect(await readSnapshot("ipma-warnings")).toEqual({
      data: [{ id: 1 }],
      savedAt: "2026-09-29T14:20:00.000Z",
    });
  });

  it("devolve null para fontes sem snapshot", async () => {
    expect(await readSnapshot("inexistente")).toBeNull();
  });
});
