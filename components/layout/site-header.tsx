import { getState } from "@/lib/state/get-state";

import { DistrictPicker } from "./district-picker";
import { HomeLink, LanguageSwitch, MainNav } from "./header-parts";
import { LogoMark } from "./logo";
import { NearMeButton } from "./near-me";
import { ThemeToggle } from "./theme";

export async function SiteHeader() {
  const state = await getState();
  return (
    <>
      <header className="bg-surface">
        <div className="mx-auto flex max-w-7xl items-center gap-1.5 px-4 py-2.5 sm:gap-3 sm:px-6">
          <HomeLink>
            <LogoMark level={state.levelKnown ? state.level : "unknown"} className="h-9 sm:h-10" />
            {/* Abaixo de 360 px só cabe o logótipo; o nome fica para leitores de ecrã. */}
            <span className="truncate font-display text-base leading-normal font-bold whitespace-nowrap max-[359px]:sr-only sm:text-2xl">
              Portugal Agora
            </span>
          </HomeLink>
          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <div className="hidden lg:block">
              <DistrictPicker />
            </div>
            <NearMeButton className="hidden lg:block" />
            <ThemeToggle />
            <LanguageSwitch />
          </div>
        </div>
        {/*
         * Em telemóveis e tablets, a escolha do distrito e o "Perto de mim"
         * têm a sua linha: assim o botão leva sempre o texto, que não cabe
         * na linha do logótipo a 360 px.
         */}
        <div className="mx-auto flex max-w-7xl gap-2 px-4 pb-3 sm:px-6 lg:hidden">
          <div className="min-w-0 flex-1">
            <DistrictPicker />
          </div>
          <NearMeButton />
        </div>
      </header>
      <MainNav />
    </>
  );
}
