import { describe, expect, it } from "vitest";

import type { ConcelhoFeature } from "@/lib/geo/geometry";
import { concelhoCandidates } from "@/lib/geo/near-me";
import geo from "@/public/geo/concelhos.json";

const features = (geo as { features: ConcelhoFeature[] }).features;
const names = (point: [number, number], accuracy: number) =>
  concelhoCandidates(point, accuracy, features).map((c) => c.name);

describe("Perto de mim", () => {
  const oeiras: [number, number] = [-9.3105, 38.6915];

  it("com GPS, só o concelho onde a pessoa está", () => {
    expect(names(oeiras, 30)).toEqual(["Oeiras"]);
    expect(names([-9.231, 38.702], 30)).toEqual(["Oeiras"]); // Algés
    expect(names([-9.335, 38.693], 30)).toEqual(["Cascais"]); // Carcavelos
  });

  it("com a posição aproximada, o concelho do ponto primeiro e os vizinhos que o erro toca", () => {
    const choices = names(oeiras, 8000);
    expect(choices[0]).toBe("Oeiras");
    expect(choices).toEqual(expect.arrayContaining(["Cascais", "Sintra", "Lisboa"]));
    expect(choices.length).toBeLessThanOrEqual(6);
  });
});
