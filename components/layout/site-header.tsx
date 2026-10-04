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
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2.5 sm:gap-3 sm:px-6">
          <HomeLink>
            <LogoMark level={state.levelKnown ? state.level : "unknown"} />
            <span className="font-display text-xl leading-none font-bold whitespace-nowrap sm:text-2xl">
              Portugal Agora
            </span>
          </HomeLink>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden md:block">
              <DistrictPicker />
            </div>
            <NearMeButton />
            <ThemeToggle />
            <LanguageSwitch />
          </div>
        </div>
        <div className="px-4 pb-3 md:hidden">
          <DistrictPicker />
        </div>
      </header>
      <MainNav />
    </>
  );
}
