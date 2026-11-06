/**
 * Revelação ao rolar, como ref callback: `<li ref={reveal}>`. Um item que
 * está abaixo do ecrã quando aparece entra uma vez, inclinado em
 * profundidade, quando chega à vista (os que já estão à vista não se
 * mexem). Corre depois de o React hidratar o elemento, por isso não mexe
 * no HTML do servidor. Sem IntersectionObserver ou com "reduzir
 * movimento", nada fica escondido. Ver .reveal-wait e .reveal-in em
 * app/globals.css.
 */
let observer: IntersectionObserver | null = null;

function getObserver() {
  observer ??= new IntersectionObserver(
    (entries) => {
      entries
        .filter((e) => e.isIntersecting)
        .forEach((e, i) => {
          const el = e.target as HTMLElement;
          observer?.unobserve(el);
          el.style.setProperty("--reveal-delay", `${Math.min(i, 8) * 60}ms`);
          el.classList.replace("reveal-wait", "reveal-in");
          el.addEventListener("animationend", () => el.classList.remove("reveal-in"), {
            once: true,
          });
        });
    },
    { rootMargin: "0px 0px -6% 0px" },
  );
  return observer;
}

export function reveal(el: HTMLElement | null) {
  if (
    !el ||
    typeof IntersectionObserver === "undefined" ||
    matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return;
  const r = el.getBoundingClientRect();
  if (r.width === 0 || (r.top < innerHeight && r.bottom > 0)) return;
  el.classList.add("reveal-wait");
  getObserver().observe(el);
  return () => {
    observer?.unobserve(el);
    el.classList.remove("reveal-wait", "reveal-in");
  };
}
