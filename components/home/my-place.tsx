"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { getConcelho } from "@/data/concelhos";
import { getDistrict } from "@/data/districts";
import { useStoredValue } from "@/lib/hooks/external";
import { useI18n } from "@/lib/i18n/client";
import type { CountryState } from "@/lib/state/aggregate";

import { MY_CONCELHO_KEY, MY_DISTRICT_KEY } from "../layout/near-me";
import { SeverityBadge } from "../status/severity";

/**
 * "O seu concelho": depois de usar o "Perto de mim", um atalho na página
 * inicial para o concelho (ou o distrito) encontrado, com o nível de aviso do
 * distrito. Fica só no browser; nada vai para o servidor.
 */
export function MyPlace({ state }: { state: CountryState | null }) {
  const { t, path } = useI18n();
  const districtSlug = useStoredValue(MY_DISTRICT_KEY);
  const concelhoPath = useStoredValue(MY_CONCELHO_KEY);
  const district = districtSlug ? getDistrict(districtSlug) : undefined;
  if (!district) return null;
  const [d, c] = concelhoPath?.split("/") ?? [];
  const concelho = d === district.slug && c ? getConcelho(d, c) : undefined;
  const name = concelho ? t.concelhoName(concelho.dico, concelho.name) : t.districtName(district);
  const href = path(concelho ? `/${district.slug}/${concelho.slug}` : `/${district.slug}`);
  const level = state?.levelKnown ? (state.districts[district.slug]?.level ?? "none") : "unknown";
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-4 text-base">
      <span className="text-ink-2">{concelho ? t.home.myConcelho : t.home.myDistrict}</span>
      <SeverityBadge level={level} />
      <Link href={href} className="inline-flex items-center gap-1.5 font-semibold">
        {name} <ArrowRight aria-hidden className="size-4" />
      </Link>
    </p>
  );
}
