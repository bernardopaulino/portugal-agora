"use client";

import { Bell, BellOff } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import type { District } from "@/data/districts";
import { useStoredValue, writeStorage } from "@/lib/hooks/external";
import { useI18n } from "@/lib/i18n/client";

import { Chip } from "../status/chip";
import { Section } from "../status/section";

/*
 * Notificações de avisos de um distrito (web push). Uma subscrição por
 * browser, com a lista de distritos e o limiar; a escolha fica também no
 * localStorage para a página saber o estado sem perguntar ao servidor.
 * Sem chave VAPID no build, ou num browser sem push, não aparece o botão.
 */

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const STORAGE_KEY = "pa:push";
const THRESHOLDS = ["yellow", "orange", "red"] as const;
type Threshold = (typeof THRESHOLDS)[number];
interface Choice {
  districts: string[];
  min: Threshold;
}

const noop = () => () => {};
type Support = "yes" | "no" | "denied";
function useSupport(): Support | null {
  return useSyncExternalStore(
    noop,
    (): Support => {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      )
        return "no";
      return Notification.permission === "denied" ? "denied" : "yes";
    },
    () => null,
  );
}

function parse(value: string | null): Choice | null {
  try {
    const c = value ? (JSON.parse(value) as Choice) : null;
    return c && Array.isArray(c.districts) && THRESHOLDS.includes(c.min) ? c : null;
  } catch {
    return null;
  }
}

function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** Nem o service worker nem o serviço de push podem deixar o botão preso em "A tratar…". */
function withTimeout<T>(promise: Promise<T>, ms = 15_000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Tempo esgotado")), ms)),
  ]);
}

async function currentSubscription(create: boolean): Promise<PushSubscription | null> {
  // Sem service worker registado (ex.: em desenvolvimento), "ready" nunca resolve.
  const registration = await withTimeout(navigator.serviceWorker.ready);
  const existing = await registration.pushManager.getSubscription();
  if (existing || !create || !PUBLIC_KEY) return existing;
  return withTimeout(
    registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(PUBLIC_KEY),
    }),
  );
}

export function PushToggle({ district }: { district: District }) {
  const { t, locale } = useI18n();
  const support = useSupport();
  const choice = parse(useStoredValue(STORAGE_KEY));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [denied, setDenied] = useState(false);
  const on = choice?.districts.includes(district.slug) ?? false;
  const min: Threshold = choice?.min ?? "yellow";
  const inPlace = t.inPlace(district);

  if (!PUBLIC_KEY || support === null) return null;

  const save = async (next: Choice) => {
    setBusy(true);
    setError(false);
    try {
      if (next.districts.length === 0) {
        const subscription = await currentSubscription(false);
        if (subscription) {
          await fetch("/api/push", {
            method: "DELETE",
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
          await subscription.unsubscribe();
        }
        writeStorage(STORAGE_KEY, "");
        return;
      }
      if ((await Notification.requestPermission()) !== "granted") {
        setDenied(true);
        return;
      }
      const subscription = await currentSubscription(true);
      if (!subscription) throw new Error("Sem subscrição");
      const response = await fetch("/api/push", {
        method: "POST",
        body: JSON.stringify({ subscription: subscription.toJSON(), ...next, locale }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      writeStorage(STORAGE_KEY, JSON.stringify(next));
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const others = (choice?.districts ?? []).filter((s) => s !== district.slug);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-base text-ink-2">{on ? t.push.on(inPlace) : t.push.intro(inPlace)}</p>
      {support === "no" ? (
        <p className="text-base">{t.push.unsupported}</p>
      ) : support === "denied" || denied ? (
        <p className="text-base">{t.push.denied}</p>
      ) : (
        <>
          <div
            role="radiogroup"
            aria-label={t.push.threshold}
            className="flex flex-wrap items-center gap-2"
          >
            <span className="mr-1 text-base text-ink-2">{t.push.threshold}</span>
            {THRESHOLDS.map((level) => (
              <Chip
                key={level}
                role="radio"
                pressed={min === level}
                disabled={busy}
                onClick={() => {
                  if (!on)
                    writeStorage(STORAGE_KEY, JSON.stringify({ districts: others, min: level }));
                  else void save({ districts: [...others, district.slug], min: level });
                }}
              >
                {t.levels[level]}
              </Chip>
            ))}
          </div>
          <button
            type="button"
            disabled={busy}
            aria-pressed={on}
            onClick={() => void save({ districts: on ? others : [...others, district.slug], min })}
            className="inline-flex min-h-11 items-center gap-2 self-start rounded-full bg-ink px-5 font-display text-base font-semibold text-bg disabled:opacity-60"
          >
            {on ? (
              <BellOff aria-hidden className="size-4" />
            ) : (
              <Bell aria-hidden className="size-4" />
            )}
            {busy ? t.push.working : on ? t.push.disable : t.push.enable}
          </button>
          {error ? (
            <p role="alert" className="text-base">
              {t.push.error}
            </p>
          ) : null}
        </>
      )}
      <p className="text-sm text-ink-2">{t.push.privacy}</p>
    </div>
  );
}

/** A secção "Notificações" da página de avisos de um distrito (nada sem chave VAPID). */
export function PushSection({ district }: { district: District }) {
  const { t } = useI18n();
  if (!PUBLIC_KEY) return null;
  return (
    <Section id="notificacoes" title={t.push.heading} size="md">
      <PushToggle district={district} />
    </Section>
  );
}
