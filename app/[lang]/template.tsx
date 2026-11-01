import type { ReactNode } from "react";

import { PageTransition } from "@/components/motion/page-transition";

/**
 * Um template (e não o layout) porque é montado de novo em cada página:
 * é isso que faz a página sair e a nova entrar.
 */
export default function Template({ children }: { children: ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
