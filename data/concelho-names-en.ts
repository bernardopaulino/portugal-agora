/**
 * Concelhos com nome inglês estabelecido (exónimo); os outros ficam em
 * português, com acentos. À parte de dico.ts para o dicionário (que vai
 * para todas as páginas) não arrastar a tabela dos concelhos.
 */
const englishNames: Record<string, string> = { "1106": "Lisbon" };

export function concelhoNameEn(dico: string, name: string): string {
  return englishNames[dico] ?? name;
}
