"use client";

import { useState } from "react";

import { useI18n } from "@/lib/i18n/client";

import { Section } from "../status/section";
import { FireHistory } from "./fire-history";
import { LevelHistory, useHistory, type HistoryRange } from "./level-history";

/*
 * Secções de histórico nas páginas de avisos e de incêndios. Sem histórico
 * guardado (Redis por configurar, ou antes do primeiro tick), não aparecem.
 */

export function WarningsHistorySection({
  slugs,
  linkDistricts = false,
}: {
  slugs: string[];
  linkDistricts?: boolean;
}) {
  const { t } = useI18n();
  const points = useHistory();
  const [range, setRange] = useState<HistoryRange>("week");
  if (!points || points.length === 0) return null;
  return (
    <Section id="historico" title={range === "week" ? t.history.heading : t.history.headingDay}>
      <LevelHistory slugs={slugs} range={range} onRange={setRange} linkDistricts={linkDistricts} />
    </Section>
  );
}

export function FiresHistorySection() {
  const { t } = useI18n();
  const points = useHistory();
  if (!points || points.length === 0) return null;
  return (
    <Section id="historico" title={t.history.firesHeading}>
      <FireHistory />
    </Section>
  );
}
