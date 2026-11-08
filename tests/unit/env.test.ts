import { describe, expect, it } from "vitest";

import { features, parseEnv, redisCredentials } from "@/lib/env";

describe("parseEnv", () => {
  it("aceita um ambiente vazio e aplica o URL por defeito", () => {
    const env = parseEnv({});
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("https://portugalagora.pt");
    expect(env.FOGOS_API_KEY).toBeUndefined();
  });

  it("trata strings vazias como ausentes", () => {
    const env = parseEnv({ FOGOS_API_KEY: "", KV_REST_API_URL: "   " });
    expect(env.FOGOS_API_KEY).toBeUndefined();
    expect(env.KV_REST_API_URL).toBeUndefined();
  });

  it("rejeita valores inválidos com uma mensagem clara", () => {
    expect(() => parseEnv({ CONTACT_EMAIL: "não-é-email" })).toThrow(/CONTACT_EMAIL/);
  });
});

describe("redisCredentials", () => {
  it("usa os nomes da integração Vercel (KV_REST_API_*)", () => {
    const env = parseEnv({
      KV_REST_API_URL: "https://kv.upstash.io",
      KV_REST_API_TOKEN: "t",
    });
    expect(redisCredentials(env)).toEqual({ url: "https://kv.upstash.io", token: "t" });
  });

  it("aceita os nomes Upstash (UPSTASH_REDIS_REST_*)", () => {
    const env = parseEnv({
      UPSTASH_REDIS_REST_URL: "https://x.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "u",
    });
    expect(redisCredentials(env)).toEqual({ url: "https://x.upstash.io", token: "u" });
  });

  it("devolve null se faltar o token", () => {
    const env = parseEnv({ KV_REST_API_URL: "https://kv.upstash.io" });
    expect(redisCredentials(env)).toBeNull();
  });
});

describe("features", () => {
  it("desliga incêndios sem chave do Fogos.pt", () => {
    expect(features(parseEnv({}))).toEqual({ fires: false, redis: false });
  });

  it("liga incêndios com chave", () => {
    const env = parseEnv({ FOGOS_API_KEY: "abc" });
    expect(features(env).fires).toBe(true);
  });
});
