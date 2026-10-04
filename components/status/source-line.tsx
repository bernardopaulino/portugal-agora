import { CloudOff } from "lucide-react";

import { attributions } from "@/lib/config/site";
import { useI18n } from "@/lib/i18n/client";
import type { SourceId, SourceResult } from "@/lib/sources/types";

import { RelativeTime } from "./relative-time";

const credit: Record<SourceId, { label: string; url: string; logo?: string }> = {
  "ipma-warnings": { ...attributions.ipma, logo: "/fontes/ipma.svg" },
  "ipma-seismic": { ...attributions.ipma, logo: "/fontes/ipma.svg" },
  "ipma-rcm": { ...attributions.ipma, logo: "/fontes/ipma.svg" },
  "ipma-uv": { ...attributions.ipma, logo: "/fontes/ipma.svg" },
  "ipma-forecast": { ...attributions.ipma, logo: "/fontes/ipma.svg" },
  fogos: attributions.fogos,
  "openmeteo-aq": attributions.openMeteo,
};

/**
 * Atribuição obrigatória junto aos dados, com a hora da última
 * atualização e, se for o caso, o aviso de dados desatualizados.
 */
export function SourceLine({
  result,
}: {
  result: Pick<SourceResult<unknown>, "id" | "status" | "fetchedAt" | "message">;
}) {
  const { t } = useI18n();
  const source = credit[result.id];
  return (
    <div className="flex flex-col gap-2 text-sm text-ink-2">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {source.logo ? (
          <a
            href={source.url}
            rel="noopener"
            className="inline-flex items-center"
            aria-label={t.source.ipmaLogo}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- SVG oficial, sem otimização */}
            <img
              src={source.logo}
              alt=""
              width={72}
              height={16}
              className="h-4 w-auto dark:brightness-0 dark:invert"
            />
          </a>
        ) : null}
        <span>
          {t.source.source}:{" "}
          <a href={source.url} rel="noopener">
            {source.label.replace(/^Fonte: /, "")}
          </a>
          {result.fetchedAt ? (
            <>
              . {t.source.updated} <RelativeTime iso={result.fetchedAt} />.
            </>
          ) : (
            "."
          )}
        </span>
      </p>
      {result.status === "stale" && result.message ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-md bg-sev-unknown-bg px-3 py-2 text-sev-unknown-ink"
        >
          <CloudOff aria-hidden className="mt-0.5 size-4 shrink-0" />
          {result.message}
        </p>
      ) : null}
    </div>
  );
}
