import Link from "next/link";

import { DistrictPicker } from "./district-picker";
import { NearMeButton } from "./near-me";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto] items-center gap-3 px-4 py-2.5 sm:flex sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 text-ink no-underline sm:mr-auto">
          <svg aria-hidden viewBox="0 0 32 32" className="size-8 shrink-0">
            <rect x="1" y="1" width="30" height="30" rx="4" fill="var(--stage)" />
            <path
              d="M18.5 5.5 22 8l-1 4 1.5 3-1 5 1 3.5L19 27l-4.5-1 1-4-1.5-3.5 1-5-1-3.5 2-2.5Z"
              fill="var(--land-none)"
              stroke="#fff"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>
          <span className="font-display text-xl leading-none font-bold whitespace-nowrap sm:text-2xl">
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
