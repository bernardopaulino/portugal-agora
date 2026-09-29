"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect } from "react";

import { useStoredValue, writeStorage } from "@/lib/hooks/external";
import { cn } from "@/lib/utils";

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

const options: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "Automático", icon: Monitor },
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
];

export function ThemeSwitcher() {
  const choice = (useStoredValue(KEY) as ThemeChoice | null) ?? "system";

  // Em "Automático", acompanhar mudanças do sistema.
  useEffect(() => {
    if (choice !== "system") return;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [choice]);

  function select(value: ThemeChoice) {
    writeStorage(KEY, value);
    apply(value);
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-bold">Aspeto</legend>
      <div className="inline-flex flex-wrap gap-2">
        {options.map(({ value, label, icon: Icon }) => (
          <label
            key={value}
            className={cn(
              "inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-full border px-4 text-base has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
              choice === value ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink",
            )}
          >
            <input
              type="radio"
              name="tema"
              value={value}
              checked={choice === value}
              onChange={() => select(value)}
              className="sr-only"
            />
            <Icon aria-hidden className="size-5" />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
