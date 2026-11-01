import { ViewTransition, type ReactNode } from "react";

/**
 * Mudança de página: a página antiga sai depressa e a nova entra com um
 * fade e uma subida curta. O cabeçalho, os separadores e o rodapé ficam
 * fora (estão nos layouts), por isso não se mexem.
 * Só anima navegações dentro do site (são Transitions do React); o
 * primeiro carregamento e o "voltar" do browser não têm animação.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="page-in" exit="page-out" default="none">
      {children}
    </ViewTransition>
  );
}
