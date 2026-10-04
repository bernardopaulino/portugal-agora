"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect } from "react";

import { useStoredValue, writeStorage } from "@/lib/hooks/external";
import { useI18n } from "@/lib/i18n/client";

export { useResolvedTheme } from "@/lib/hooks/external";

export type ThemeChoice = "system" | "light" | "dark";
const KEY = "pa:tema";

/**
 * Script executado antes da pintura para evitar o "flash" de tema
 * errado: lê a escolha guardada (ou o sistema) e define data-theme.
 */
export const themeScript = `(function(){try{var c=localStorage.getItem("${KEY}")||"system";var d=c==="dark"||(c==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){}})();`;

function apply(choice: ThemeChoice) {
  const dark =
    choice === "dark" ||
    (choice === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

const icons: Record<ThemeChoice, typeof Sun> = { system: Monitor, light: Sun, dark: Moon };
const order: ThemeChoice[] = ["system", "light", "dark"];

/**
 * Botão do tema no cabeçalho: cada clique passa para o seguinte
 * (automático → claro → escuro). O ícone mostra o tema escolhido.
 */
export function ThemeToggle() {
  const { t } = useI18n();
  const choice = (useStoredValue(KEY) as ThemeChoice | null) ?? "system";

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
      className="flex size-12 shrink-0 items-center justify-center rounded-sm border border-line text-ink hover:border-ink"
    >
      <Icon aria-hidden className="size-5" />
    </button>
  );
}
