import { Phone } from "lucide-react";

export function EmergencyBar() {
  return (
    <div className="bg-ink text-bg dark:bg-surface-2 dark:text-ink">
      <p className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2 text-base sm:px-6">
        <Phone aria-hidden className="size-4 shrink-0" />
        <span>
          Em emergência, ligue{" "}
          <a
            href="tel:112"
            className="font-extrabold text-bg decoration-bg/60 dark:text-ink dark:decoration-ink/60"
          >
            112
          </a>
          . Este site é informativo e não substitui as autoridades.
        </span>
      </p>
    </div>
  );
}
