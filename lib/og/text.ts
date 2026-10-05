import type { Dictionary } from "@/lib/i18n/dictionaries";
import { intlLocale, type Locale } from "@/lib/i18n/locales";
import type { Severity } from "@/lib/sources/types";
import type { CountryState } from "@/lib/state/aggregate";

/**
 * Tamanho do título da imagem de partilha (1200 × 630): desce com o
 * comprimento, para os títulos longos dos distritos caberem em cinco
 * linhas na coluna do texto (o mapa ocupa a direita).
 */
export function headlineSize(headline: string): number {
  const n = headline.length;
  if (n <= 40) return 66;
  if (n <= 70) return 58;
  if (n <= 110) return 48;
  return 40;
}

/** "Dados de 5 de out., às 11:48" / "Data as of 5 Oct, 11:48", na hora de Lisboa. */
export function dataStamp(iso: string, locale: Locale, t: Dictionary): string {
  const date = new Date(iso);
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(intlLocale[locale], { timeZone: "Europe/Lisbon", ...options }).format(
      date,
    );
  // O mês à parte: em pt-PT, junto com a hora, o Intl escreve-o em número.
  return t.site.ogDataFrom(
    format({ day: "numeric" }),
    format({ month: "short" }),
    format({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
  );
}

/** Nível de cada distrito para o mapa da imagem ("unknown" sem dados do IPMA). */
export function levelsByDistrict(state: CountryState): Record<string, Severity | "unknown"> {
  return Object.fromEntries(
    Object.values(state.districts).map((d) => [d.slug, state.levelKnown ? d.level : "unknown"]),
  );
}
