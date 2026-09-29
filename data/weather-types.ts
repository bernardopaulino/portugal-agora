/** Tipos de tempo do IPMA (https://api.ipma.pt/open-data/weather-type-classe.json). */
export const weatherTypes: Record<number, string> = {
  1: "Céu limpo",
  2: "Céu pouco nublado",
  3: "Céu parcialmente nublado",
  4: "Céu muito nublado ou encoberto",
  5: "Céu nublado por nuvens altas",
  6: "Aguaceiros/chuva",
  7: "Aguaceiros/chuva fracos",
  8: "Aguaceiros/chuva fortes",
  9: "Chuva/aguaceiros",
  10: "Chuva fraca ou chuvisco",
  11: "Chuva/aguaceiros forte",
  12: "Períodos de chuva",
  13: "Períodos de chuva fraca",
  14: "Períodos de chuva forte",
  15: "Chuvisco",
  16: "Neblina",
  17: "Nevoeiro ou nuvens baixas",
  18: "Neve",
  19: "Trovoada",
  20: "Aguaceiros e possibilidade de trovoada",
  21: "Granizo",
  22: "Geada",
  23: "Chuva e possibilidade de trovoada",
  24: "Nebulosidade convectiva",
  25: "Céu com períodos de muito nublado",
  26: "Nevoeiro",
  27: "Céu nublado",
  28: "Aguaceiros de neve",
  29: "Chuva e Neve",
  30: "Chuva e Neve",
};

export function weatherLabel(id: number): string {
  return weatherTypes[id] ?? "Sem informação";
}
