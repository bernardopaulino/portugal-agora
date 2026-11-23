"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

import { concelhoForDico, type Concelho } from "@/data/concelhos";
import { writeStorage } from "@/lib/hooks/external";
import { useI18n } from "@/lib/i18n/client";

import { CHOSEN_CONCELHO_KEY, MY_CONCELHO_KEY, MY_DISTRICT_KEY, NEAR_CHECK_KEY } from "./near-me";
import { startNavigationFeedback } from "./navigation-progress";

const noop = () => () => {};

/**
 * Depois do "Perto de mim": "Localizámos Sintra. É aqui?", com os concelhos
 * vizinhos. A posição de um computador (Wi-Fi, IP) pode cair no concelho do
 * lado; a escolha fica guardada e da próxima vez ganha à posição.
 */
export function NearMeCheck({ concelho }: { concelho: Concelho }) {
  const { t, path } = useI18n();
  const router = useRouter();
  const raw = useSyncExternalStore(
    noop,
    () => {
      try {
        return sessionStorage.getItem(NEAR_CHECK_KEY);
      } catch {
        return null;
      }
    },
    () => null,
  );
  const [dismissed, setDismissed] = useState(false);
  let alternatives: Concelho[] = [];
  try {
    const parsed = raw ? (JSON.parse(raw) as { dico: string; alternatives: string[] }) : null;
    if (parsed?.dico === concelho.dico)
      alternatives = parsed.alternatives
        .map((d) => concelhoForDico(d))
        .filter((c): c is Concelho => c !== undefined);
  } catch {}
  if (dismissed || alternatives.length === 0) return null;

  const close = () => {
    try {
      sessionStorage.removeItem(NEAR_CHECK_KEY);
    } catch {}
    setDismissed(true);
  };
  const confirm = () => {
    writeStorage(CHOSEN_CONCELHO_KEY, `${concelho.district}/${concelho.slug}`);
    close();
  };
  const choose = (c: Concelho) => {
    const key = `${c.district}/${c.slug}`;
    writeStorage(MY_DISTRICT_KEY, c.district);
    writeStorage(MY_CONCELHO_KEY, key);
    writeStorage(CHOSEN_CONCELHO_KEY, key);
    close();
    const href = path(`/${c.district}/${c.slug}`);
    startNavigationFeedback(href);
    router.push(href);
  };

  const name = t.concelhoName(concelho.dico, concelho.name);
  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
      <section
        aria-label={t.header.nearCheckLabel}
        className="flex flex-col gap-3 rounded-2xl border border-accent/40 p-4 glass sm:p-5"
      >
        <p className="text-base">{t.header.nearCheck(name)}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={confirm}
            className="min-h-11 rounded-full bg-accent px-4 font-semibold text-accent-ink"
          >
            {t.header.nearCheckYes}
          </button>
          <span className="text-sm text-ink-2">{t.header.nearCheckOther}</span>
          {alternatives.map((c) => (
            <button
              key={c.dico}
              type="button"
              onClick={() => choose(c)}
              className="min-h-11 rounded-full glass-button px-4 font-semibold"
            >
              {t.concelhoName(c.dico, c.name)}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
