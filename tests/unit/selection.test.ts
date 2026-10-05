import { describe, expect, it } from "vitest";

import { isSameSelection, type Selection } from "@/components/cards/types";

const lisboa: Selection = { type: "district", slug: "lisboa" };
const porto: Selection = { type: "district", slug: "porto" };
const fire = (id: string): Selection => ({
  type: "event",
  id,
  coordinates: [-9.1, 38.7],
  region: "continente",
});

describe("isSameSelection (segundo toque tira a seleção)", () => {
  it("o mesmo distrito ou o mesmo evento", () => {
    expect(isSameSelection(lisboa, { type: "district", slug: "lisboa" })).toBe(true);
    expect(isSameSelection(fire("fogo-1"), fire("fogo-1"))).toBe(true);
  });

  it("outro distrito, outro evento ou outro tipo não contam", () => {
    expect(isSameSelection(lisboa, porto)).toBe(false);
    expect(isSameSelection(fire("fogo-1"), fire("fogo-2"))).toBe(false);
    expect(isSameSelection(lisboa, fire("fogo-1"))).toBe(false);
  });

  it("sem seleção, um toque seleciona", () => {
    expect(isSameSelection(null, lisboa)).toBe(false);
  });
});
