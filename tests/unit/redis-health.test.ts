import { beforeEach, describe, expect, it, vi } from "vitest";

import { checkRedis, REDIS_CHECK_TTL_MS, resetRedisCheck } from "@/lib/cache/redis-health";

describe("checkRedis", () => {
  beforeEach(() => resetRedisCheck());

  it("sem Redis configurado, não faz chamadas", async () => {
    expect(await checkRedis(null)).toBe("not-configured");
  });

  it("reutiliza o PING durante 30 s, para não gastar a quota do Upstash", async () => {
    const client = { ping: vi.fn().mockResolvedValue("PONG") };
    const t0 = 1_000_000;
    expect(await checkRedis(client, t0)).toBe("ok");
    for (let i = 0; i < 50; i++) await checkRedis(client, t0 + i * 100);
    expect(client.ping).toHaveBeenCalledTimes(1);

    await checkRedis(client, t0 + REDIS_CHECK_TTL_MS);
    expect(client.ping).toHaveBeenCalledTimes(2);
  });

  it("assinala o erro e também o guarda durante 30 s", async () => {
    const client = { ping: vi.fn().mockRejectedValue(new Error("quota")) };
    expect(await checkRedis(client, 0)).toBe("error");
    expect(await checkRedis(client, 10_000)).toBe("error");
    expect(client.ping).toHaveBeenCalledTimes(1);
  });
});
