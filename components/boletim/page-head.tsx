"use client";

import type { ReactNode } from "react";

import { BulletinStamp } from "./national-stage";

/**
 * Cabeçalho das páginas de cada tema: uma faixa do palco, mais baixa do
 * que o boletim, com o título, uma frase sobre o que a página mostra e
 * a hora dos dados.
 */
export function PageHead({
  title,
  intro,
  generatedAt,
  children,
}: {
  title: string;
  intro: string;
  generatedAt: string;
  children?: ReactNode;
}) {
  return (
    <section aria-labelledby="pagina-titulo" className="on-stage bg-stage text-stage-ink">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 pt-8 pb-8 sm:px-6 lg:pt-10">
        <h1 id="pagina-titulo" className="font-display text-display font-bold text-balance">
          {title}
        </h1>
        <p className="max-w-[60ch] text-lg">{intro}</p>
        <BulletinStamp iso={generatedAt} />
        {children}
      </div>
    </section>
  );
}
