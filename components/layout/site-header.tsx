import { getPageState } from "@/lib/state/get-state";

import { DistrictPicker } from "./district-picker";
import { HomeLink, LanguageSwitch, MainNav } from "./header-parts";
import { LogoMark } from "./logo";
import { NearMeButton } from "./near-me";
import { ThemeToggle } from "./theme";

/**
 * Cabeçalho flutuante de vidro, fixo no topo. Em ecrãs largos tudo cabe
 * numa linha (logótipo, separadores em pílula, distrito e controlos); em
 * telemóveis e tablets o distrito e o "Perto de mim" têm a sua linha e os
 * separadores a seguinte (ver .header-grid em globals.css).
 */
export async function SiteHeader() {
  const state = await getPageState();
  return (
    <header
      // A cena 3D lê a altura do cabeçalho para não pôr o país por baixo dele.
      data-site-header
      className="relative z-40 rounded-none border-x-0 border-t-0 shadow-none glass-strong lg:sticky lg:top-0"
    >
      <div className="header-grid mx-auto max-w-7xl px-4 py-2.5 sm:px-6">
        <div className="[grid-area:logo]">
          <HomeLink>
            <LogoMark level={state.levelKnown ? state.level : "unknown"} className="h-8 sm:h-9" />
            {/* Abaixo de 360 px só cabe o logótipo; o nome fica para leitores de ecrã. */}
            <span className="truncate font-display text-lg leading-normal font-semibold tracking-[-0.02em] whitespace-nowrap max-[359px]:sr-only sm:text-xl">
              Portugal Agora
            </span>
          </HomeLink>
        </div>
        <div className="min-w-0 [grid-area:nav] min-[90rem]:flex min-[90rem]:justify-center">
          <MainNav />
        </div>
        <div className="flex shrink-0 items-center justify-end gap-1.5 [grid-area:tools] sm:gap-2">
          <div className="hidden lg:block">
            <DistrictPicker />
          </div>
          <NearMeButton className="hidden lg:block" />
          <ThemeToggle />
          <LanguageSwitch />
        </div>
        {/*
         * Em telemóveis e tablets, a escolha do distrito e o "Perto de mim"
         * têm a sua linha: assim o botão leva sempre o texto, que não cabe
         * na linha do logótipo a 360 px.
         */}
        <div className="flex gap-2 [grid-area:picker] lg:hidden">
          <div className="min-w-0 flex-1">
            <DistrictPicker />
          </div>
          <NearMeButton />
        </div>
      </div>
    </header>
  );
}
