import "server-only";

import webpush from "web-push";

import { env } from "@/lib/env";

import type { PushPayload } from "./changes";
import { removeSubscription, type StoredSubscription } from "./subscriptions";

let configured = false;

function configure(): boolean {
  const e = env();
  if (!e.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !e.VAPID_PRIVATE_KEY) return false;
  if (!configured) {
    webpush.setVapidDetails(
      `mailto:${e.CONTACT_EMAIL ?? "geral@portugalagora.pt"}`,
      e.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      e.VAPID_PRIVATE_KEY,
    );
    configured = true;
  }
  return true;
}

/**
 * Envia as notificações. Uma subscrição que o serviço de push dá como
 * desaparecida (404/410: a pessoa desligou as notificações ou limpou o
 * browser) é apagada.
 */
export async function sendAll(
  jobs: { subscription: StoredSubscription; payload: PushPayload }[],
): Promise<{ sent: number; removed: number; failed: number }> {
  if (!configure()) return { sent: 0, removed: 0, failed: jobs.length };
  let sent = 0;
  let removed = 0;
  let failed = 0;
  await Promise.all(
    jobs.map(async ({ subscription, payload }) => {
      try {
        await webpush.sendNotification(subscription.subscription, JSON.stringify(payload), {
          TTL: 6 * 3600,
          urgency: "high",
        });
        sent += 1;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await removeSubscription(subscription.subscription.endpoint);
          removed += 1;
        } else failed += 1;
      }
    }),
  );
  return { sent, removed, failed };
}
