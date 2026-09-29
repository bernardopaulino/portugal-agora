import { CloudRain, Wind } from "lucide-react";

import type { ForecastDay } from "@/lib/sources/ipma-forecast";
import { capitalize, formatLongDate, localDate } from "@/lib/time/format";

export function ForecastList({ days, reference }: { days: ForecastDay[]; reference: Date }) {
  const today = localDate(reference.toISOString());
  const tomorrow = localDate(new Date(reference.getTime() + 86_400_000).toISOString());
  const name = (date: string) =>
    date === today ? "Hoje" : date === tomorrow ? "Amanhã" : formatLongDate(date).split(",")[0];

  return (
    <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {days.slice(0, 5).map((d) => (
        <li key={d.date} className="flex flex-col gap-2 rounded-lg bg-surface p-4">
          <p className="text-base">
            <span className="font-extrabold">{capitalize(name(d.date) ?? "")}</span>
            <span className="text-ink-2">, {formatLongDate(d.date).split(", ")[1]}</span>
          </p>
          <p className="text-lg">{d.weather}</p>
          <p className="text-2xl font-extrabold">
            {d.max}°<span className="text-lg font-bold text-ink-2"> / {d.min}°</span>
          </p>
          <p className="flex items-center gap-2 text-base text-ink-2">
            <CloudRain aria-hidden className="size-4 shrink-0" /> Probabilidade de chuva:{" "}
            {d.rainChance}%
          </p>
          <p className="flex items-center gap-2 text-base text-ink-2">
            <Wind aria-hidden className="size-4 shrink-0" /> {d.wind}
          </p>
        </li>
      ))}
    </ol>
  );
}
