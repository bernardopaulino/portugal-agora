import { z } from "zod";

import { features } from "@/lib/env";
import { removeSubscription, saveSubscription, subscriptionSchema } from "@/lib/push/subscriptions";

/** Guardar (POST) ou apagar (DELETE) a subscrição de notificações deste browser. */

const noStore = { "Cache-Control": "no-store" };

async function body(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.length > 4000) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!features().push) return new Response(null, { status: 503, headers: noStore });
  const parsed = subscriptionSchema.safeParse(await body(request));
  if (!parsed.success) return new Response(null, { status: 400, headers: noStore });
  const result = await saveSubscription(parsed.data);
  const status = result === "saved" ? 204 : 503;
  return new Response(null, { status, headers: noStore });
}

const removeSchema = z.object({ endpoint: z.url().max(1000) });

export async function DELETE(request: Request) {
  const parsed = removeSchema.safeParse(await body(request));
  if (!parsed.success) return new Response(null, { status: 400, headers: noStore });
  await removeSubscription(parsed.data.endpoint);
  return new Response(null, { status: 204, headers: noStore });
}
