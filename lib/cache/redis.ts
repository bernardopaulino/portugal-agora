import "server-only";

import { Redis } from "@upstash/redis";

import { redisCredentials } from "@/lib/env";

let client: Redis | null | undefined;

/** Cliente Redis partilhado, ou `null` se não estiver configurado. */
export function getRedis(): Redis | null {
  if (client !== undefined) return client;
  const credentials = redisCredentials();
  client = credentials ? new Redis(credentials) : null;
  return client;
}
