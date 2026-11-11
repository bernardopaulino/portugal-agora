import "server-only";

import { createHash } from "node:crypto";

import { z } from "zod";

import { districts } from "@/data/districts";
import { getRedis } from "@/lib/cache/redis";
import { locales } from "@/lib/i18n/locales";

/*
 * Subscrições de notificações: num hash do Redis, uma entrada por browser
 * (a chave é o hash do endpoint). Guarda-se só o que é preciso para enviar:
 * o endpoint e as chaves que o browser deu, os distritos, o limiar e o
 * idioma. Nada que identifique a pessoa.
 */

const KEY = "push:subs";
/** Teto de segurança contra quem encha o Redis com subscrições falsas. */
export const MAX_SUBSCRIPTIONS = 10_000;

const slugs = districts.map((d) => d.slug) as [string, ...string[]];

/*
 * Os serviços de push dos browsers: Chrome e derivados (FCM), Firefox,
 * Safari e Edge (WNS). Sem esta lista, qualquer endereço https servia de
 * "endpoint": dava para encher as subscrições com endereços inventados e
 * pôr o servidor a enviar milhares de POSTs para um site alheio.
 */
const PUSH_HOSTS = new Set(["fcm.googleapis.com", "updates.push.services.mozilla.com"]);
const PUSH_HOST_SUFFIXES = [".push.apple.com", ".notify.windows.com"];

export function isPushService(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.port !== "" || url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  return PUSH_HOSTS.has(host) || PUSH_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

export const subscriptionSchema = z.object({
  subscription: z.object({
    endpoint: z
      .url()
      .max(1000)
      .refine(isPushService, "O endpoint tem de ser de um serviço de push conhecido"),
    keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
  }),
  districts: z.array(z.enum(slugs)).min(1).max(slugs.length),
  min: z.enum(["yellow", "orange", "red"]),
  locale: z.enum(locales),
});

export type StoredSubscription = z.infer<typeof subscriptionSchema> & { createdAt: string };

const idOf = (endpoint: string) => createHash("sha256").update(endpoint).digest("hex");

export type SaveResult = "saved" | "full" | "unavailable";

export async function saveSubscription(
  input: z.infer<typeof subscriptionSchema>,
): Promise<SaveResult> {
  const redis = getRedis();
  if (!redis) return "unavailable";
  const id = idOf(input.subscription.endpoint);
  const exists = await redis.hexists(KEY, id);
  if (!exists && (await redis.hlen(KEY)) >= MAX_SUBSCRIPTIONS) return "full";
  const record: StoredSubscription = {
    ...input,
    districts: [...new Set(input.districts)],
    createdAt: new Date().toISOString(),
  };
  await redis.hset(KEY, { [id]: record });
  return "saved";
}

export async function removeSubscription(endpoint: string): Promise<void> {
  await getRedis()?.hdel(KEY, idOf(endpoint));
}

export async function allSubscriptions(): Promise<StoredSubscription[]> {
  const all = await getRedis()?.hgetall<Record<string, StoredSubscription>>(KEY);
  return all ? Object.values(all) : [];
}

export async function getSubscription(endpoint: string): Promise<StoredSubscription | null> {
  return (await getRedis()?.hget<StoredSubscription>(KEY, idOf(endpoint))) ?? null;
}

/**
 * Uma notificação de teste por browser e por minuto: o pedido é público e
 * só pode chegar ao próprio browser, mas não deve servir para martelar o
 * serviço de push. true se este pedido pode avançar.
 */
export async function claimTestSlot(endpoint: string): Promise<boolean> {
  const result = await getRedis()?.set(`push:test:${idOf(endpoint)}`, 1, { nx: true, ex: 60 });
  return result === "OK";
}
