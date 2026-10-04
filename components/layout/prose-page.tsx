import type { ReactNode } from "react";

/** Página de texto: coluna estreita para linhas legíveis (< 75 caracteres). */
export function ProsePage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pt-10 sm:px-6">
      <h1 className="font-display text-display font-bold">{title}</h1>
      {intro ? <p className="text-xl text-ink-2">{intro}</p> : null}
      <div className="flex flex-col gap-5 text-lg [&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-3xl [&_h2]:font-bold [&_h3]:mt-2 [&_h3]:text-xl [&_h3]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2">
        {children}
      </div>
    </article>
  );
}
