import { z } from "zod";

import { features } from "@/lib/env";
import { getDistrict } from "@/data/districts";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { localePath } from "@/lib/i18n/locales";
import { sendAll } from "@/lib/push/send";
import { claimTestSlot, getSubscription } from "@/lib/push/subscriptions";

/**
 * Notificação de teste para o próprio browser (botão na secção
 * "Notificações"). Só envia a uma subscrição que já existe, no máximo uma
 * vez por minuto: 204 enviada, 404 sem subscrição, 429 espere, 502 falhou.
 */

const noStore = { "Cache-Control": "no-store" };
const schema = z.object({ endpoint: z.url().max(1000) });

export async function POST(request: Request) {
  if (!features().push) return new Response(null, { status: 503, headers: noStore });
  const text = await request.text();
  let body: unknown = null;
  try {
    body = text.length <= 2000 ? JSON.parse(text) : null;
  } catch {}
  const parsed = schema.safeParse(body);
  if (!parsed.success) return new Response(null, { status: 400, headers: noStore });

  const subscription = await getSubscription(parsed.data.endpoint);
  if (!subscription) return new Response(null, { status: 404, headers: noStore });
  if (!(await claimTestSlot(parsed.data.endpoint)))
    return new Response(null, { status: 429, headers: noStore });

  const t = getDictionary(subscription.locale);
  const district = getDistrict(subscription.districts[0] ?? "");
  const result = await sendAll([
    {
      subscription,
      payload: {
        title: t.push.testTitle,
        body: t.push.testBody(district ? t.inPlace(district) : ""),
        url: localePath(subscription.locale, district ? `/${district.slug}/avisos` : "/avisos"),
        tag: "teste",
      },
    },
  ]);
  return new Response(null, { status: result.sent > 0 ? 204 : 502, headers: noStore });
}
