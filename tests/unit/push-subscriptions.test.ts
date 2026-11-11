import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendNotification, hdel } = vi.hoisted(() => ({ sendNotification: vi.fn(), hdel: vi.fn() }));

vi.mock("web-push", () => ({ default: { setVapidDetails: vi.fn(), sendNotification } }));
vi.mock("@/lib/cache/redis", () => ({ getRedis: () => ({ hdel }) }));

import type { PushPayload } from "@/lib/push/changes";
import { sendAll } from "@/lib/push/send";
import {
  isPushService,
  subscriptionSchema,
  type StoredSubscription,
} from "@/lib/push/subscriptions";

describe("isPushService", () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/abc:APA91b",
    "https://updates.push.services.mozilla.com/wpush/v2/gAAAAA",
    "https://web.push.apple.com/QGuQyavXutnMH",
    "https://wns2-par02p.notify.windows.com/w/?token=BQYAAAD",
  ])("aceita %s", (endpoint) => {
    expect(isPushService(endpoint)).toBe(true);
  });

  it.each([
    "https://exemplo.pt/push",
    "http://fcm.googleapis.com/fcm/send/abc",
    "https://fcm.googleapis.com:8443/fcm/send/abc",
    "https://user:pass@fcm.googleapis.com/fcm/send/abc",
    "https://fcm.googleapis.com.exemplo.pt/fcm/send/abc",
    "https://evilpush.apple.com.exemplo.pt/x",
    "https://notify.windows.com.exemplo.pt/x",
    "https://169.254.169.254/latest/meta-data",
    "não é um endereço",
  ])("recusa %s", (endpoint) => {
    expect(isPushService(endpoint)).toBe(false);
  });
});

const subscription = (endpoint: string) => ({
  subscription: { endpoint, keys: { p256dh: "p256dh", auth: "auth" } },
  districts: ["lisboa"],
  min: "yellow" as const,
  locale: "pt" as const,
});

describe("subscriptionSchema", () => {
  it("aceita uma subscrição de um serviço de push", () => {
    const input = subscription("https://fcm.googleapis.com/fcm/send/abc");
    expect(subscriptionSchema.safeParse(input).success).toBe(true);
  });

  it("recusa um endpoint https qualquer", () => {
    expect(subscriptionSchema.safeParse(subscription("https://exemplo.pt/1")).success).toBe(false);
  });
});

describe("sendAll", () => {
  const payload: PushPayload = { title: "t", body: "b", url: "/avisos", tag: "teste" };
  const stored = (endpoint: string): StoredSubscription => ({
    ...subscription(endpoint),
    createdAt: "2026-11-11T00:00:00.000Z",
  });

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "publica");
    vi.stubEnv("VAPID_PRIVATE_KEY", "privada");
    sendNotification.mockReset().mockResolvedValue({ statusCode: 201 });
    hdel.mockReset().mockResolvedValue(1);
  });

  it("envia com tempo máximo de espera", async () => {
    const result = await sendAll([
      { subscription: stored("https://fcm.googleapis.com/fcm/send/abc"), payload },
    ]);
    expect(result).toEqual({ sent: 1, removed: 0, failed: 0 });
    expect(sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: "https://fcm.googleapis.com/fcm/send/abc" }),
      JSON.stringify(payload),
      expect.objectContaining({ timeout: expect.any(Number) }),
    );
  });

  it("não envia para endpoints fora dos serviços de push e apaga-os", async () => {
    const result = await sendAll([{ subscription: stored("https://exemplo.pt/1"), payload }]);
    expect(result).toEqual({ sent: 0, removed: 1, failed: 0 });
    expect(sendNotification).not.toHaveBeenCalled();
    expect(hdel).toHaveBeenCalledTimes(1);
  });

  it("conta como falhada uma notificação que esgota o tempo", async () => {
    sendNotification.mockRejectedValue(new Error("Socket timeout"));
    const result = await sendAll([
      { subscription: stored("https://web.push.apple.com/abc"), payload },
    ]);
    expect(result).toEqual({ sent: 0, removed: 0, failed: 1 });
  });
});
