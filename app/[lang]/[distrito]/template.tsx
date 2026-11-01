import type { ReactNode } from "react";

import { PageTransition } from "@/components/motion/page-transition";

/** Entre os separadores de um distrito (/lisboa → /lisboa/avisos) só muda este segmento. */
export default function Template({ children }: { children: ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
