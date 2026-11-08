"use client";

import { cn } from "@/lib/utils";

/** Botão em pílula: escolhas do mapa, do histórico e das notificações. */
export function Chip({
  pressed,
  onClick,
  children,
  role,
  disabled,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
  role?: "radio";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role={role}
      disabled={disabled}
      aria-pressed={role ? undefined : pressed}
      aria-checked={role ? pressed : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-full border px-3 font-display text-base font-medium tracking-[-0.01em] transition-colors sm:px-4",
        pressed
          ? "border-[color-mix(in_srgb,var(--accent)_55%,transparent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-ink shadow-[0_0_24px_-8px_var(--glow)]"
          : "glass-button",
        "disabled:cursor-not-allowed disabled:border-dashed disabled:text-ink-2",
      )}
    >
      {children}
    </button>
  );
}
