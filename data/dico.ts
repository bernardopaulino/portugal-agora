import table from "./dico.json";

/** Código DICO (4 dígitos) → [nome do concelho, slug do distrito/região]. Fonte: CAOP 2025. */
const byDico = new Map<string, { name: string; district: string }>(
  (table as [string, string, string][]).map(([dico, name, district]) => [dico, { name, district }]),
);

export function concelhoByDico(dico: string) {
  return byDico.get(dico);
}

export function allConcelhos() {
  return [...byDico.entries()].map(([dico, v]) => ({ dico, ...v }));
}
