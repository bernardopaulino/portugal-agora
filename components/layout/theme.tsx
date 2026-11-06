"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect } from "react";

import { useStoredValue, writeStorage } from "@/lib/hooks/external";
import { useI18n } from "@/lib/i18n/client";

export { useResolvedTheme } from "@/lib/hooks/external";

export type ThemeChoice = "system" | "light" | "dark";
const KEY = "pa:tema";

/** O tema da casa é o escuro (a cena 3D é a luz da página); claro e automático ficam à escolha. */
export const DEFAULT_THEME: ThemeChoice = "dark";

/**
 * Script executado antes da pintura para evitar o "flash" de tema
 * errado: lê a escolha guardada (ou o tema da casa) e define data-theme.
 */
export const themeScript = `(function(){try{var c=localStorage.getItem("${KEY}")||"${DEFAULT_THEME}";var d=c==="dark"||(c==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){}})();`;

function apply(choice: ThemeChoice) {
  const dark =
    choice === "dark" ||
    (choice === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

const icons: Record<ThemeChoice, typeof Sun> = { system: Monitor, light: Sun, dark: Moon };
const order: ThemeChoice[] = ["dark", "light", "system"];

/**
 * Botão do tema no cabeçalho: cada clique passa para o seguinte
 * (escuro → claro → automático). O ícone mostra o tema escolhido.
 */
export function ThemeToggle() {
  const { t } = useI18n();
  const choice = (useStoredValue(KEY) as ThemeChoice | null) ?? DEFAULT_THEME;

  // Em "Automático", acompanhar mudanças do sistema.
  useEffect(() => {
    if (choice !== "system") return;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [choice]);

  function cycle() {
    const next = order[(order.indexOf(choice) + 1) % order.length]!;
    writeStorage(KEY, next);
    apply(next);
  }

  const Icon = icons[choice];
  const label = t.header.themeButton(t.header.themeNames[choice]);
  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={label}
      title={label}
      className="flex size-11 shrink-0 items-center justify-center rounded-full glass-button"
    >
      <Icon aria-hidden className="size-5" />
    </button>
  );
}
