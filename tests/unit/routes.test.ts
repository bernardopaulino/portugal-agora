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

describe("splitDistrictPath com concelhos", () => {
  it("reconhece a página de um concelho (não é um tema)", () => {
    expect(splitDistrictPath("/lisboa/sintra")).toEqual({
      district: "lisboa",
      concelho: "sintra",
      topic: "",
    });
  });

  it("um concelho de outro distrito não conta", () => {
    expect(splitDistrictPath("/porto/sintra")).toEqual({ district: "porto", topic: "/sintra" });
  });
});
