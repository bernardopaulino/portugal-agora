import type { ReactNode } from "react";

import type { SourceResult } from "@/lib/sources/types";
import { cn } from "@/lib/utils";

import { SourceLine } from "./source-line";

/** Secção de conteúdo com título, fonte obrigatória e corpo. */
export function Section({
  id,
  title,
  result,
  children,
  aside,
  size = "lg",
}: {
  id: string;
  title: string;
  result?: Pick<SourceResult<unknown>, "id" | "status" | "fetchedAt" | "message">;
  children: ReactNode;
  aside?: ReactNode;
  /** "md" para as secções da coluna lateral. */
  size?: "lg" | "md";
}) {
  return (
    <section aria-labelledby={`${id}-titulo`} id={id} className="flex scroll-mt-16 flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <h2
            id={`${id}-titulo`}
            className={cn(
              "font-display leading-tight font-bold",
              size === "lg" ? "text-4xl" : "text-2xl",
            )}
          >
            {title}
          </h2>
          {aside}
        </div>
        {result ? <SourceLine result={result} /> : null}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="border-y border-line py-4 text-lg text-ink-2">{children}</p>;
}
