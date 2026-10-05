/**
 * Etiquetas e constantes puras das fontes, sem Zod nem acesso à rede:
 * podem ser importadas por componentes de cliente. Os adaptadores
 * (ipma-*.ts, fogos.ts…) são "server-only" e não devem ser importados
 * do cliente.
 */

/** Níveis do IPMA para o risco de incêndio rural. */
export const fireRiskLabels: Record<number, string> = {
  1: "Reduzido",
  2: "Moderado",
  3: "Elevado",
  4: "Muito elevado",
  5: "Máximo",
};
