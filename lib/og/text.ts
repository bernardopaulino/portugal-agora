import type { Dictionary } from "@/lib/i18n/dictionaries";
import { intlLocale, type Locale } from "@/lib/i18n/locales";

/**
 * Tamanho do título da imagem de partilha (1200 × 630): desce com o
 * comprimento, para os títulos longos dos distritos caberem em quatro
 * linhas sem sair da imagem.
 */
export function headlineSize(headline: string): number {
  const n = headline.length;
  if (n <= 50) return 72;
  if (n <= 90) return 60;
  if (n <= 140) return 50;
  return 42;
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
