import { describe, expect, it } from "vitest";

import { splitDistrictPath } from "@/lib/routes";

describe("splitDistrictPath", () => {
  it("separa o distrito e o tema", () => {
    expect(splitDistrictPath("/lisboa/avisos")).toEqual({ district: "lisboa", topic: "/avisos" });
  });

  it("dá o tema vazio no resumo do distrito", () => {
    expect(splitDistrictPath("/lisboa")).toEqual({ district: "lisboa", topic: "" });
  });

  it("não confunde as páginas nacionais com distritos", () => {
    expect(splitDistrictPath("/avisos")).toEqual({ topic: "/avisos" });
    expect(splitDistrictPath("/fontes")).toEqual({ topic: "/fontes" });
    expect(splitDistrictPath("/")).toEqual({ topic: "" });
  });
});
