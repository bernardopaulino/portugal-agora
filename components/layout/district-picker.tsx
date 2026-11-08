"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";

import { concelhosOf } from "@/data/concelhos";
import { districts, getDistrict } from "@/data/districts";
import { useCurrentPath, useI18n } from "@/lib/i18n/client";
import { splitDistrictPath } from "@/lib/routes";

/**
 * Seletor nativo: o mais fácil de usar no telemóvel e com leitores de ecrã.
 * Muda de sítio sem mudar de tema: em /lisboa/avisos, escolher o Porto
 * leva a /porto/avisos e "Todo o país" leva a /avisos. Com um distrito à
 * vista, a lista mostra também os seus concelhos (escolher um leva a
 * /lisboa/sintra). Numa página de concelho, escolher um distrito leva ao
 * resumo desse distrito.
 */
export function DistrictPicker() {
  const router = useRouter();
  const { t, path } = useI18n();
  const pathname = useCurrentPath();
  const { district: current = "", concelho, topic } = splitDistrictPath(pathname);
  const district = getDistrict(current);
  const value = concelho ? `${current}/${concelho}` : current;

  return (
    <label className="relative flex min-w-0 items-center">
      <span className="sr-only">{t.header.pickDistrict}</span>
      <select
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          if (next.includes("/")) router.push(path(`/${next}`));
          else router.push(path(next ? `/${next}${topic}` : topic || "/"));
        }}
        // Abaixo de 360 px, menos margem dentro do botão, para "Todo o país" caber inteiro.
        className="h-11 w-full min-w-0 cursor-pointer appearance-none rounded-full glass-button pr-11 pl-4 font-display text-base font-medium max-[359px]:pr-8 max-[359px]:pl-3 lg:w-56"
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
        {district ? (
          <optgroup label={t.header.concelhosOf(t.inPlace(district))}>
            {concelhosOf(district.slug).map((c) => (
              <option key={c.dico} value={`${district.slug}/${c.slug}`}>
                {t.concelhoName(c.dico, c.name)}
              </option>
            ))}
          </optgroup>
        ) : null}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-4 size-5 text-ink-2 max-[359px]:right-2.5"
      />
    </label>
  );
}
