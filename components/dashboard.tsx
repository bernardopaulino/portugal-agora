"use client";

import { useI18n } from "@/lib/i18n/client";
import { useLiveState } from "@/lib/hooks/live-state";
import type { CountryState } from "@/lib/state/aggregate";

import { DistrictIndex } from "./boletim/district-index";
import { NationalStage } from "./boletim/national-stage";
import { Section } from "./status/section";

/**
 * A página inicial: só o boletim e a lista dos distritos. O detalhe de
 * cada tema (avisos, incêndios, sismos, risco e ar) tem a sua página,
 * a que se chega pelas linhas do boletim ou pelo menu.
 */
export function Dashboard({ initial }: { initial: CountryState }) {
  const { t } = useI18n();
  const state = useLiveState(initial);

  return (
    <>
      <NationalStage state={state} />
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        <Section id="distritos" title={t.sections.allDistricts}>
          <DistrictIndex state={state} />
        </Section>
      </div>
    </>
  );
}
