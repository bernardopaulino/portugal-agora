import type { ReactNode } from "react";

import type { SourceResult } from "@/lib/sources/types";

import { SourceLine } from "./source-line";

/** Secção de conteúdo com título, fonte obrigatória e corpo. */
export function Section({
  id,
  title,
  result,
  children,
  aside,
}: {
  id: string;
  title: string;
  result?: Pick<SourceResult<unknown>, "id" | "status" | "fetchedAt" | "message">;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-titulo`}
      className="flex flex-col gap-4 border-t border-line pt-8"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h2 id={`${id}-titulo`} className="text-2xl font-extrabold tracking-tight">
          {title}
        </h2>
        {aside}
      </div>
      {result ? <SourceLine result={result} /> : null}
      {children}
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-lg bg-surface px-4 py-4 text-lg">{children}</p>;
}
