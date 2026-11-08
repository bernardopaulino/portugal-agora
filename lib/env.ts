import "server-only";

import { z } from "zod";

/**
 * Variáveis de ambiente do servidor, validadas uma única vez.
 * Todas são opcionais para que `next build` e o desenvolvimento local
 * funcionem sem configuração; cada funcionalidade degrada de forma
 * explícita quando a sua variável falta (ver `features`).
 */
const schema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default("https://portugalagora.pt"),
  CONTACT_EMAIL: z.email().optional(),
  FOGOS_API_KEY: z.string().min(1).optional(),
  KV_REST_API_URL: z.url().optional(),
  KV_REST_API_TOKEN: z.string().min(1).optional(),
  UPSTASH_REDIS_REST_URL: z.url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof schema>;

/** Converte strings vazias em `undefined` (um `.env` com `CHAVE=` conta como ausente). */
type EnvSource = Record<string, string | undefined>;

function clean(source: EnvSource): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.keys(schema.shape).map((key) => {
      const value = source[key]?.trim();
      return [key, value ? value : undefined];
    }),
  );
}

export function parseEnv(source: EnvSource): ServerEnv {
  const result = schema.safeParse(clean(source));
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Variáveis de ambiente inválidas:\n${issues}`);
  }
  return result.data;
}

let cached: ServerEnv | undefined;

export function env(): ServerEnv {
  cached ??= parseEnv(process.env);
  return cached;
}

export function redisCredentials(e: ServerEnv = env()): { url: string; token: string } | null {
  const url = e.KV_REST_API_URL ?? e.UPSTASH_REDIS_REST_URL;
  const token = e.KV_REST_API_TOKEN ?? e.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

export function features(e: ServerEnv = env()) {
  return {
    fires: Boolean(e.FOGOS_API_KEY),
    redis: redisCredentials(e) !== null,
  };
}
