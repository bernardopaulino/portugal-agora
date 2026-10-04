"use client";

import Link from "next/link";

import { attributions, site } from "@/lib/config/site";
import { useI18n } from "@/lib/i18n/client";

/** Alvo de toque de 44 px, sem mudar o aspeto do texto. */
const footerLink = "inline-flex min-h-11 items-center self-start";

export function SiteFooter() {
  const { t, path } = useI18n();
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-3">
          <p className="font-display text-xl font-bold">{site.name}</p>
          <p className="max-w-md text-ink-2">{t.footer.about}</p>
          <p className="text-sm text-ink-2">
            {t.footer.data}:{" "}
            {[attributions.ipma, attributions.fogos, attributions.openMeteo, attributions.dgt].map(
              (s, i, all) => (
                <span key={s.url}>
                  <a href={s.url} rel="noopener">
                    {s.label.replace(/^Fonte: /, "")}
                  </a>
                  {i < all.length - 1 ? ", " : "."}
                </span>
              ),
            )}
          </p>
          {t.dataNote ? <p className="max-w-md text-sm text-ink-2">{t.dataNote}</p> : null}
        </div>
        <nav aria-label={t.footer.links} className="flex flex-col text-base">
          <Link href={path("/fontes")} className={footerLink}>
            {t.footer.sources}
          </Link>
          <Link href={path("/privacidade")} className={footerLink}>
            {t.footer.privacy}
          </Link>
          <Link href={path("/sobre")} className={footerLink}>
            {t.footer.project}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
