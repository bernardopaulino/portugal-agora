import Link from "next/link";

import { attributions, site } from "@/lib/config/site";

import { ThemeSwitcher } from "./theme";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="flex flex-col gap-3">
          <p className="text-lg font-extrabold">{site.name}</p>
          <p className="max-w-md text-ink-2">
            Informação oficial reunida num só sítio. Não é uma fonte oficial nem substitui a
            Proteção Civil. Em emergência, ligue 112.
          </p>
          <p className="text-sm text-ink-2">
            Dados:{" "}
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
        </div>
        <nav aria-label="Rodapé" className="flex flex-col gap-3 text-base">
          <Link href="/fontes">Fontes e como lemos os dados</Link>
          <Link href="/privacidade">Privacidade</Link>
          <Link href="/sobre">Sobre o projeto</Link>
        </nav>
        <ThemeSwitcher />
      </div>
    </footer>
  );
}
