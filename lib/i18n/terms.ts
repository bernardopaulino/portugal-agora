/**
 * Tradução para inglês do vocabulário fixo que vem das fontes (tipos de
 * aviso do IPMA, estados e naturezas do Fogos.pt, classes de qualidade do
 * ar e de UV, tipos de tempo, vento, locais dos sismos). O que não estiver
 * aqui fica no original, em português.
 */
const words: Record<string, string> = {
  // Tipos de aviso do IPMA
  precipitação: "rain",
  vento: "wind",
  trovoada: "thunderstorm",
  "tempo quente": "hot weather",
  "tempo frio": "cold weather",
  nevoeiro: "fog",
  "agitação marítima": "rough seas",
  neve: "snow",
  // Estados (ANEPC, via Fogos.pt)
  despacho: "Dispatch",
  "despacho de 1º alerta": "First alert dispatch",
  "em curso": "In progress",
  "chegada ao to": "Crews on site",
  "em resolução": "Being resolved",
  conclusão: "Concluding",
  vigilância: "Under watch",
  encerrada: "Closed",
  "falso alarme": "False alarm",
  "falso alerta": "False alert",
  // Natureza da ocorrência
  mato: "Scrubland",
  "povoamento florestal": "Forest",
  florestal: "Forest",
  agrícola: "Farmland",
  "agrícola/florestal": "Farmland/forest",
  urbano: "Urban",
  industrial: "Industrial",
  incêndio: "Wildfire",
  // Qualidade do ar (classes do índice europeu)
  boa: "Good",
  razoável: "Fair",
  moderada: "Moderate",
  fraca: "Poor",
  "muito fraca": "Very poor",
  "extremamente fraca": "Extremely poor",
  ozono: "ozone",
  "dióxido de azoto": "nitrogen dioxide",
  "dióxido de enxofre": "sulphur dioxide",
  "partículas pm10": "PM10 particles",
  "partículas pm2,5": "PM2.5 particles",
  "partículas finas": "fine particles",
  partículas: "particles",
  // Índice UV e risco de incêndio
  baixo: "Low",
  moderado: "Moderate",
  elevado: "High",
  "muito elevado": "Very high",
  extremo: "Extreme",
  reduzido: "Low",
  máximo: "Maximum",
  // Tipos de tempo do IPMA
  "céu limpo": "Clear sky",
  "céu pouco nublado": "Mostly clear",
  "céu parcialmente nublado": "Partly cloudy",
  "céu muito nublado ou encoberto": "Very cloudy or overcast",
  "céu nublado por nuvens altas": "High cloud",
  "aguaceiros/chuva": "Showers/rain",
  "aguaceiros/chuva fracos": "Light showers/rain",
  "aguaceiros/chuva fortes": "Heavy showers/rain",
  "chuva/aguaceiros": "Rain/showers",
  "chuva fraca ou chuvisco": "Light rain or drizzle",
  "chuva/aguaceiros forte": "Heavy rain/showers",
  "períodos de chuva": "Spells of rain",
  "períodos de chuva fraca": "Spells of light rain",
  "períodos de chuva forte": "Spells of heavy rain",
  chuvisco: "Drizzle",
  neblina: "Mist",
  "nevoeiro ou nuvens baixas": "Fog or low cloud",
  granizo: "Hail",
  geada: "Frost",
  "aguaceiros e possibilidade de trovoada": "Showers, thunder possible",
  "chuva e possibilidade de trovoada": "Rain, thunder possible",
  "nebulosidade convectiva": "Convective cloud",
  "céu com períodos de muito nublado": "Spells of heavy cloud",
  "céu nublado": "Cloudy",
  "aguaceiros de neve": "Snow showers",
  "chuva e neve": "Rain and snow",
  "sem informação": "No information",
  // Regiões
  açores: "Azores",
  "açores, grupo ocidental": "Azores, Western Group",
  "açores, grupo central": "Azores, Central Group",
  "açores, grupo oriental": "Azores, Eastern Group",
};

const directions: Record<string, string> = {
  norte: "north",
  nordeste: "northeast",
  leste: "east",
  este: "east",
  sudeste: "southeast",
  sul: "south",
  sudoeste: "southwest",
  oeste: "west",
  noroeste: "northwest",
};

const windStrength: Record<string, string> = {
  fraco: "Light",
  moderado: "Moderate",
  forte: "Strong",
  "muito forte": "Very strong",
};

const countries: Record<string, string> = {
  espanha: "Spain",
  marrocos: "Morocco",
  argélia: "Algeria",
};

function matchCase(original: string, translated: string): string {
  const first = original.charAt(0);
  return first === first.toLocaleLowerCase("pt-PT")
    ? translated.charAt(0).toLowerCase() + translated.slice(1)
    : translated.charAt(0).toUpperCase() + translated.slice(1);
}

export function translateTerm(text: string): string {
  const key = text.trim().toLocaleLowerCase("pt-PT");
  const direct = words[key];
  if (direct) return matchCase(text.trim(), direct);

  // "Vento fraco de leste"
  const wind = /^vento (muito forte|fraco|moderado|forte) de (\w+)$/i.exec(text.trim());
  if (wind) {
    const strength = windStrength[wind[1]!.toLowerCase()];
    const dir = directions[wind[2]!.toLowerCase()];
    if (strength && dir) return `${strength} wind from the ${dir}`;
  }

  // "A sudeste de Tarragona (Espanha)", "A oeste de Matosinhos"
  const place = /^a (\w+) de (.+?)(?: \(([^)]+)\))?$/i.exec(text.trim());
  if (place) {
    const dir = directions[place[1]!.toLowerCase()];
    if (dir) {
      const country = place[3] ? ` (${countries[place[3].toLowerCase()] ?? place[3]})` : "";
      return `${dir.charAt(0).toUpperCase()}${dir.slice(1)} of ${place[2]}${country}`;
    }
  }

  return text;
}
