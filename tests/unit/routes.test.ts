import { describe, expect, it } from "vitest";

import { isKnownPage, splitDistrictPath } from "@/lib/routes";

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

describe("isKnownPage", () => {
  it("aceita as páginas que existem", () => {
    for (const path of [
      "/",
      "/avisos",
      "/sobre",
      "/sismos/rss",
      "/opengraph-image",
      "/lisboa",
      "/lisboa/risco",
      "/lisboa/incendios/rss",
      "/lisboa/opengraph-image",
      "/lisboa/sintra",
      "/acores",
    ]) {
      expect(isKnownPage(path), path).toBe(true);
    }
  });

  it("recusa os endereços inventados (vão para a página 404 em cache)", () => {
    for (const path of [
      "/xyz",
      "/wp-login.php",
      "/.env",
      "/404",
      "/lisboa/xyz",
      "/lisboa/sintra/avisos",
      "/porto/sintra",
      "/lisboa/fontes",
      "/avisos/xyz",
    ]) {
      expect(isKnownPage(path), path).toBe(false);
    }
  });
});
