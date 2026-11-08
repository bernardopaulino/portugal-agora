"use client";

import Link from "next/link";

import { concelhosOf } from "@/data/concelhos";
import type { District } from "@/data/districts";
import { useI18n } from "@/lib/i18n/client";

/** Os concelhos de um distrito, cada um com ligação para a sua página. */
export function ConcelhoLinks({ district }: { district: District }) {
  const { t, path } = useI18n();
  const items = concelhosOf(district.slug);
  return (
    <section
      aria-labelledby="concelhos-titulo"
      className="flex flex-col gap-3 rounded-2xl p-6 glass"
    >
      <h2 id="concelhos-titulo" className="font-display text-2xl font-bold">
        {t.concelho.listTitle}
      </h2>
      <p className="text-base text-stage-ink-2">{t.concelho.listIntro(t.inPlace(district))}</p>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] sm:gap-x-6">
        {items.map((c) => (
          <li key={c.dico}>
            <Link
              href={path(`/${district.slug}/${c.slug}`)}
              className="inline-flex min-h-11 items-center py-1 text-base leading-snug"
            >
              {t.concelhoName(c.dico, c.name)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
