import type { Region } from "@/data/districts";
import { intlLocale, type Locale } from "@/lib/i18n/locales";

const zoneFor = (region: Region = "continente") =>
  region === "acores"
    ? "Atlantic/Azores"
    : region === "madeira"
      ? "Atlantic/Madeira"
      : "Europe/Lisbon";

/** Converte as horas "sem fuso" do IPMA (que são UTC) em ISO completo. */
export function ipmaUtc(value: string): string {
  const withZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`;
  return new Date(withZone).toISOString();
}

function parts(iso: string, region?: Region) {
  const f = new Intl.DateTimeFormat("pt-PT", {
    timeZone: zoneFor(region),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const p = Object.fromEntries(f.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

/** Palavras de cada idioma para as frases de tempo. */
const words = {
  pt: {
    today: "hoje",
    tomorrow: "amanhã",
    yesterday: "ontem",
    dayTime: (day: string, time: string) => `${day} às ${time}`,
    inForce: (end: { day: string; time: string }) => `em vigor até às ${end.time} de ${end.day}`,
    sameDay: (day: string, from: string, to: string) => `${day}, das ${from} às ${to}`,
    span: (s: { day: string; time: string }, e: { day: string; time: string }) =>
      `das ${s.time} de ${s.day} às ${e.time} de ${e.day}`,
    justNow: "agora mesmo",
    minutes: (n: number) => `há ${n} min`,
    hours: (n: number) => `há ${n} h`,
    days: (n: number) => (n === 1 ? "há 1 dia" : `há ${n} dias`),
  },
  en: {
    today: "today",
    tomorrow: "tomorrow",
    yesterday: "yesterday",
    dayTime: (day: string, time: string) => `${day} at ${time}`,
    inForce: (end: { day: string; time: string }) => `in force until ${end.time} ${end.day}`,
    sameDay: (day: string, from: string, to: string) => `${day}, ${from} to ${to}`,
    span: (s: { day: string; time: string }, e: { day: string; time: string }) =>
      `from ${s.time} ${s.day} to ${e.time} ${e.day}`,
    justNow: "just now",
    minutes: (n: number) => `${n} min ago`,
    hours: (n: number) => `${n} h ago`,
    days: (n: number) => (n === 1 ? "1 day ago" : `${n} days ago`),
  },
} satisfies Record<Locale, unknown>;

/** "16:15" na hora local da região. */
export function formatTime(iso: string, region?: Region): string {
  return parts(iso, region).time;
}

/** "hoje às 16:15", "amanhã às 06:00", "ontem às 21:00" ou "3 out. às 12:00". */
export function formatDayTime(
  iso: string,
  now: Date,
  region?: Region,
  locale: Locale = "pt",
): string {
  const { day, time } = dayAndTime(iso, now, region, locale);
  return words[locale].dayTime(day, time);
}

/**
 * Intervalo de um aviso em linguagem corrente:
 * "em vigor até às 22:00 de hoje", "hoje, das 13:00 às 22:00",
 * "das 19:00 de hoje às 04:00 de amanhã".
 */
export function formatRange(
  startIso: string,
  endIso: string,
  now: Date,
  region?: Region,
  locale: Locale = "pt",
): string {
  const w = words[locale];
  const start = dayAndTime(startIso, now, region, locale);
  const end = dayAndTime(endIso, now, region, locale);
  if (new Date(startIso) <= now) return w.inForce(end);
  if (start.day === end.day) return w.sameDay(start.day, start.time, end.time);
  return w.span(start, end);
}

function dayAndTime(
  iso: string,
  now: Date,
  region: Region | undefined,
  locale: Locale,
): { day: string; time: string } {
  const w = words[locale];
  const target = parts(iso, region);
  const today = parts(now.toISOString(), region).date;
  const dayMs = 86_400_000;
  const tomorrow = parts(new Date(now.getTime() + dayMs).toISOString(), region).date;
  const yesterday = parts(new Date(now.getTime() - dayMs).toISOString(), region).date;

  let day: string;
  if (target.date === today) day = w.today;
  else if (target.date === tomorrow) day = w.tomorrow;
  else if (target.date === yesterday) day = w.yesterday;
  else
    day = new Intl.DateTimeFormat(intlLocale[locale], {
      timeZone: zoneFor(region),
      day: "numeric",
      month: "short",
    }).format(new Date(iso));
  return { day, time: target.time };
}

/** "há 3 min", "há 2 h", "agora mesmo". */
export function formatRelative(iso: string, now: Date, locale: Locale = "pt"): string {
  const w = words[locale];
  const seconds = Math.round((now.getTime() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return w.justNow;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return w.minutes(minutes);
  const hours = Math.round(minutes / 60);
  if (hours < 24) return w.hours(hours);
  return w.days(Math.round(hours / 24));
}

/** Data local (AAAA-MM-DD) de um instante, na região indicada. */
export function localDate(iso: string, region?: Region): string {
  return parts(iso, region).date;
}

/** "terça-feira, 29 de setembro" (ou "Tuesday 29 September") a partir de AAAA-MM-DD. */
export function formatLongDate(date: string, locale: Locale = "pt"): string {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T12:00:00Z`));
}

/** Dia da semana curto para a faixa de previsão: "Terça" / "Tue". */
export function formatWeekday(date: string, locale: Locale = "pt"): string {
  const name = new Intl.DateTimeFormat(intlLocale[locale], {
    timeZone: "UTC",
    weekday: locale === "pt" ? "long" : "short",
  }).format(new Date(`${date}T12:00:00Z`));
  return capitalize(name.replace("-feira", ""));
}

/** Primeira letra maiúscula (para títulos a partir de texto corrido). */
export function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase("pt-PT") + text.slice(1);
}

export function formatNumber(value: number, digits = 1, locale: Locale = "pt"): string {
  return new Intl.NumberFormat(intlLocale[locale], {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}
