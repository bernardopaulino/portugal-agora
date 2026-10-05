/**
 * Distrito/região de um concelho a partir dos dois primeiros dígitos do
 * código DICO, sem carregar a tabela dos concelhos (dico.json): serve o
 * código de cliente que só precisa de saber o distrito, não o nome.
 */
const byPrefix: Record<string, string> = {
  "01": "aveiro",
  "02": "beja",
  "03": "braga",
  "04": "braganca",
  "05": "castelo-branco",
  "06": "coimbra",
  "07": "evora",
  "08": "faro",
  "09": "guarda",
  "10": "leiria",
  "11": "lisboa",
  "12": "portalegre",
  "13": "porto",
  "14": "santarem",
  "15": "setubal",
  "16": "viana-do-castelo",
  "17": "vila-real",
  "18": "viseu",
  "31": "madeira",
  "32": "madeira",
  "41": "acores",
  "42": "acores",
  "43": "acores",
  "44": "acores",
  "45": "acores",
  "46": "acores",
  "47": "acores",
  "48": "acores",
  "49": "acores",
};

export function districtOfDico(dico: string): string | undefined {
  return byPrefix[dico.slice(0, 2)];
}
