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

export const subscriptionSchema = z.object({
  subscription: z.object({
    endpoint: z
      .url()
      .max(1000)
      .refine((u) => u.startsWith("https://"), "O endpoint tem de ser https"),
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
