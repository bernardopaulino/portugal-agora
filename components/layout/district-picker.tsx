"use client";

import { ChevronDown } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { districts } from "@/data/districts";

/** Seletor nativo: o mais fácil de usar no telemóvel e com leitores de ecrã. */
export function DistrictPicker() {
  const router = useRouter();
  const pathname = usePathname();
  const current = districts.find((d) => pathname === `/${d.slug}`)?.slug ?? "";

  return (
    <label className="relative flex min-w-0 items-center">
      <span className="sr-only">Escolher distrito ou região</span>
      <select
        value={current}
        onChange={(e) => router.push(e.target.value ? `/${e.target.value}` : "/")}
        className="h-12 w-full min-w-0 cursor-pointer appearance-none rounded-full border border-line bg-surface pr-11 pl-4 text-base font-bold text-ink sm:w-64"
      >
        <option value="">Todo o país</option>
        <optgroup label="Continente">
          {districts
            .filter((d) => d.region === "continente")
            .map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.name}
              </option>
            ))}
        </optgroup>
        <optgroup label="Regiões autónomas">
          {districts
            .filter((d) => d.region !== "continente")
            .map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.name}
              </option>
            ))}
        </optgroup>
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-4 size-5 text-ink-2" />
    </label>
  );
}
