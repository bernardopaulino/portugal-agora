import Link from "next/link";

import { DistrictPicker } from "./district-picker";
import { NearMeButton } from "./near-me";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 sm:flex sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 text-ink no-underline sm:mr-auto">
          <svg aria-hidden viewBox="0 0 32 32" className="size-8 shrink-0">
            <circle cx="16" cy="16" r="15" fill="var(--ink)" />
            <circle cx="16" cy="16" r="6" fill="var(--sev-none)" />
          </svg>
          <span className="text-lg font-extrabold tracking-tight whitespace-nowrap sm:text-xl">
            Portugal Agora
          </span>
        </Link>
        {/* No telemóvel, o seletor ocupa uma linha inteira para o nome do distrito caber. */}
        <div className="col-span-2 row-start-2 sm:order-1">
          <DistrictPicker />
        </div>
        <div className="sm:order-2">
          <NearMeButton />
        </div>
      </div>
    </header>
  );
}
