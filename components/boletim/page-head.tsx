"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { BulletinStamp } from "./national-stage";

/**
 * Cabeçalho das páginas de cada tema: uma faixa do palco, mais baixa do
 * que o boletim, com o título, uma frase sobre o que a página mostra e
 * a hora dos dados. Nas páginas de um distrito, `back` leva ao resumo
 * do distrito.
 */
export function PageHead({
  title,
  intro,
  generatedAt,
  back,
  children,
}: {
  title: string;
  intro: string;
  generatedAt: string;
  back?: { href: string; label: string };
  children?: ReactNode;
}) {
  return (
    <section aria-labelledby="pagina-titulo" className="on-stage bg-stage text-stage-ink">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 pt-6 pb-8 sm:px-6 lg:pt-8">
        {back ? (
          <Link
            href={back.href}
            className="inline-flex min-h-11 items-center gap-2 self-start text-base font-bold no-underline hover:underline"
          >
            <ArrowLeft aria-hidden className="size-4" /> {back.label}
          </Link>
        ) : null}
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
