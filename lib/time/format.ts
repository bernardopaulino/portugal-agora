import type { Region } from "@/data/districts";

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

/** "16:15" na hora local da região. */
export function formatTime(iso: string, region?: Region): string {
  return parts(iso, region).time;
}

/** "hoje às 16:15", "amanhã às 06:00", "ontem às 21:00" ou "3 out. às 12:00". */
export function formatDayTime(iso: string, now: Date, region?: Region): string {
  const { day, time } = dayAndTime(iso, now, region);
  return `${day} às ${time}`;
}

/**
 * Intervalo de um aviso em linguagem corrente:
 * "em vigor até às 22:00 de hoje", "hoje, das 13:00 às 22:00",
 * "das 19:00 de hoje às 04:00 de amanhã".
 */
export function formatRange(startIso: string, endIso: string, now: Date, region?: Region): string {
  const start = dayAndTime(startIso, now, region);
  const end = dayAndTime(endIso, now, region);
  if (new Date(startIso) <= now) return `em vigor até às ${end.time} de ${end.day}`;
  if (start.day === end.day) return `${start.day}, das ${start.time} às ${end.time}`;
  return `das ${start.time} de ${start.day} às ${end.time} de ${end.day}`;
}

function dayAndTime(iso: string, now: Date, region?: Region): { day: string; time: string } {
  const target = parts(iso, region);
  const today = parts(now.toISOString(), region).date;
  const dayMs = 86_400_000;
  const tomorrow = parts(new Date(now.getTime() + dayMs).toISOString(), region).date;
  const yesterday = parts(new Date(now.getTime() - dayMs).toISOString(), region).date;

  let day: string;
  if (target.date === today) day = "hoje";
  else if (target.date === tomorrow) day = "amanhã";
  else if (target.date === yesterday) day = "ontem";
  else
    day = new Intl.DateTimeFormat("pt-PT", {
      timeZone: zoneFor(region),
      day: "numeric",
      month: "short",
    }).format(new Date(iso));
  return { day, time: target.time };
}

/** "há 3 min", "há 2 h", "agora mesmo". */
export function formatRelative(iso: string, now: Date): string {
  const seconds = Math.round((now.getTime() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "agora mesmo";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "há 1 dia" : `há ${days} dias`;
}

/** Data local (AAAA-MM-DD) de um instante, na região indicada. */
export function localDate(iso: string, region?: Region): string {
  return parts(iso, region).date;
}

/** "terça-feira, 29 de setembro" a partir de AAAA-MM-DD. */
export function formatLongDate(date: string): string {
  return new Intl.DateTimeFormat("pt-PT", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T12:00:00Z`));
}

/** Primeira letra maiúscula (para títulos a partir de texto corrido). */
export function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase("pt-PT") + text.slice(1);
}

export function formatNumber(value: number, digits = 1): string {
  return new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}
