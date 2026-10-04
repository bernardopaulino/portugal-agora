"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";

import { districts } from "@/data/districts";
import { useCurrentPath, useI18n } from "@/lib/i18n/client";
import { splitDistrictPath } from "@/lib/routes";

/**
 * Seletor nativo: o mais fácil de usar no telemóvel e com leitores de ecrã.
 * Muda de sítio sem mudar de tema: em /lisboa/avisos, escolher o Porto
 * leva a /porto/avisos e "Todo o país" leva a /avisos.
 */
export function DistrictPicker() {
  const router = useRouter();
  const { t, path } = useI18n();
  const pathname = useCurrentPath();
  const { district: current = "", topic } = splitDistrictPath(pathname);

  return (
    <label className="relative flex min-w-0 items-center">
      <span className="sr-only">{t.header.pickDistrict}</span>
      <select
        value={current}
        onChange={(e) =>
          router.push(path(e.target.value ? `/${e.target.value}${topic}` : topic || "/"))
        }
        className="h-12 w-full min-w-0 cursor-pointer appearance-none rounded-sm border border-line bg-surface pr-11 pl-4 font-display text-lg font-semibold text-ink hover:border-ink lg:w-60"
      >
        <option value="">{t.header.wholeCountry}</option>
        <optgroup label={t.header.mainland}>
          {districts
            .filter((d) => d.region === "continente")
            .map((d) => (
              <option key={d.slug} value={d.slug}>
                {t.districtName(d)}
              </option>
            ))}
        </optgroup>
        <optgroup label={t.header.autonomous}>
          {districts
            .filter((d) => d.region !== "continente")
            .map((d) => (
              <option key={d.slug} value={d.slug}>
                {t.districtName(d)}
              </option>
            ))}
        </optgroup>
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-4 size-5 text-ink-2" />
    </label>
  );
}
