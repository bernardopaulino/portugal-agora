/**
 * Índice das secções, fixo no topo ao descer a página. Cada entrada mostra
 * quantos itens tem, para se ver a extensão da página antes de a percorrer.
 */
export function SectionNav({ items }: { items: { id: string; label: string; count?: number }[] }) {
  return (
    <nav aria-label="Secções da página" className="sticky top-0 z-20 border-b border-line bg-bg">
      <ul className="mx-auto flex max-w-7xl [scrollbar-width:none] gap-1 overflow-x-auto px-4 sm:px-6">
        {items.map((item) => (
          <li key={item.id} className="shrink-0">
            <a
              href={`#${item.id}`}
              className="inline-flex h-12 items-center gap-2 border-b-2 border-transparent px-3 font-display text-lg font-semibold text-ink no-underline hover:border-ink"
            >
              {item.label}
              {item.count !== undefined ? (
                <span className="min-w-6 rounded-sm bg-surface-2 px-1.5 text-center text-base font-bold text-ink-2 tabular-nums">
                  {item.count}
                </span>
              ) : null}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
