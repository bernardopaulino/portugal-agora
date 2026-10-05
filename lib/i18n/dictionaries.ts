import type { District } from "@/data/districts";

import type { Locale } from "./locales";
import { translateTerm } from "./terms";

type LevelKey = "none" | "yellow" | "orange" | "red";
type BadgeKey = LevelKey | "info" | "unknown";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function joinWith(and: string) {
  return (items: string[]) =>
    items.length <= 1
      ? (items[0] ?? "")
      : `${items.slice(0, -1).join(", ")} ${and} ${items.at(-1)}`;
}

/**
 * Todo o texto que o site escreve, em português e em inglês. As frases
 * que dependem de números são funções. O texto que vem das fontes (IPMA,
 * Fogos.pt) passa por `term`, que traduz o vocabulário conhecido e deixa
 * o resto como está.
 */
const pt = {
  locale: "pt" as Locale,
  site: {
    tagline: "O estado do país, agora.",
    description:
      "Avisos meteorológicos, sismos, incêndios e qualidade do ar em Portugal, num só sítio, a partir de fontes oficiais.",
    ogAlt: "Estado atual de Portugal: avisos, incêndios e sismos",
    wholeCountry: "Todo o país",
    /** Imagem de partilha: a hora dos dados e a linha das fontes. */
    ogDataFrom: (day: string, month: string, time: string) =>
      `Dados de ${day} de ${month}, às ${time}`,
    ogSources: "portugalagora.pt. Dados do IPMA, Fogos.pt e Open-Meteo.",
  },
  nav: {
    label: "Secções",
    overview: "Resumo",
    warnings: "Avisos",
    fires: "Incêndios",
    quakes: "Sismos",
    riskAir: "Risco e ar",
    /** Nomes curtos dos separadores em telemóveis, para os cinco caberem a 360 px. */
    short: {
      overview: "Resumo",
      warnings: "Avisos",
      fires: "Incêndios",
      quakes: "Sismos",
      riskAir: "Risco",
    },
    skip: "Saltar para o conteúdo",
    home: "Portugal Agora, página inicial",
    pageSections: "Secções da página",
  },
  header: {
    pickDistrict: "Escolher distrito ou região",
    wholeCountry: "Todo o país",
    mainland: "Continente",
    autonomous: "Regiões autónomas",
    nearMe: "Perto de mim",
    locating: "A localizar…",
    geoUnsupported:
      "Este dispositivo não permite obter a localização. Escolha o distrito na lista.",
    geoOutside: "Parece estar fora de Portugal. Escolha o distrito na lista.",
    geoFailed: "Não foi possível identificar o distrito. Escolha-o na lista.",
    geoDenied: "Sem acesso à localização. Pode escolher o distrito na lista.",
    theme: "Tema",
    themeNames: { system: "automático", light: "claro", dark: "escuro" },
    themeButton: (current: string) => `Tema: ${current}. Mudar tema`,
    language: "Idioma",
    otherLanguage: "English",
    otherLanguageShort: "EN",
    offline: "Sem ligação à internet. Está a ver os últimos dados guardados.",
  },
  emergency: {
    before: "Em emergência, ligue",
    after: ". Este site é informativo e não substitui as autoridades.",
  },
  footer: {
    about:
      "Informação oficial reunida num só sítio. Não é uma fonte oficial nem substitui a Proteção Civil. Em emergência, ligue 112.",
    data: "Dados",
    links: "Rodapé",
    sources: "Fontes e como lemos os dados",
    privacy: "Privacidade",
    project: "Sobre o projeto",
  },
  levels: {
    none: "Sem aviso",
    yellow: "Amarelo",
    orange: "Laranja",
    red: "Vermelho",
    info: "Informação",
    unknown: "Sem dados",
  } satisfies Record<BadgeKey, string>,
  levelAdjective: {
    none: "verde",
    yellow: "amarelo",
    orange: "laranja",
    red: "vermelho",
  } satisfies Record<LevelKey, string>,
  /** Nome de um distrito ou região, como aparece no texto. */
  districtName: (d: District) => d.name,
  /** "em Lisboa", "no Porto", "nos Açores". */
  inPlace: (d: District) => d.inName,
  join: joinWith("e"),
  and: "e",
  plural,
  headline: {
    noData: "Não foi possível obter os avisos meteorológicos do IPMA.",
    calm: "Sem avisos meteorológicos em Portugal.",
    level: (level: LevelKey, places: string) => `Aviso ${pt.levelAdjective[level]} ${places}.`,
    inDistricts: (n: number) => `em ${n} distritos`,
    districtNoData: (name: string) => `Não foi possível obter os avisos do IPMA para ${name}.`,
    districtCalm: (inPlace: string) => `Sem avisos meteorológicos ${inPlace}.`,
    districtLevel: (level: LevelKey, types: string, inPlace: string) =>
      `Aviso ${pt.levelAdjective[level]} de ${types}${inPlace ? ` ${inPlace}` : ""}.`,
  },
  topics: {
    warnings: "Avisos",
    fires: "Incêndios",
    quakesNational: "Sismos em Portugal (7 dias)",
    quakesDistrict: "Sismos (7 dias)",
    riskToday: "Risco de incêndio",
    riskTodayDistrict: "Risco de incêndio hoje",
    air: "Ar e raios UV",
    none: "Nenhum",
    noData: "Sem dados",
    ipmaDown: "IPMA indisponível",
    fogosDown: "consulte fogos.pt",
    wholeCountry: "em todo o país",
    nextDays: "nos próximos três dias",
    districts: (n: number) => plural(n, "distrito", "distritos"),
    alsoIn: (places: string) => `; também ${places}`,
    warningsCount: (n: number) => plural(n, "aviso", "avisos"),
    inProgress: (n: number) => `${n} em curso`,
    inProgressDetail: "em curso",
    andMore: (first: string, n: number) => `${first} e mais ${n}`,
    quakes: (n: number) => plural(n, "sismo", "sismos"),
    quakeDetail: (felt: number, magnitude: string) =>
      `${felt === 0 ? "nenhum sentido" : plural(felt, "sentido", "sentidos")}; o maior com magnitude ${magnitude}`,
    quakeNoneNational: "sentido ou em território português",
    quakeNoneDistrict: "de magnitude 2 ou superior",
    riskUpTo: (label: string) => `Até ${label.toLowerCase()}`,
    riskWhere: (n: number) => `hoje, em ${plural(n, "concelho", "concelhos")}`,
    riskWhereDistrict: (n: number) => `em ${plural(n, "concelho", "concelhos")}`,
    airValue: (label: string) => `Ar ${label.toLowerCase()}`,
    uv: (index: string, label?: string) => `UV ${index}${label ? `, ${label.toLowerCase()}` : ""}`,
  },
  caption: {
    noWarningData: "Sem dados de avisos do IPMA",
    calm: "Sem avisos meteorológicos",
    level: (level: LevelKey, types: string) => `Aviso ${pt.levelAdjective[level]} de ${types}`,
    fires: (n: number) => `; ${plural(n, "incêndio", "incêndios")} em curso`,
    open: (name: string) => `Abrir ${name}`,
    country: "Portugal",
    nationalNoData: "Sem dados de avisos do IPMA. Consulte ipma.pt.",
    nationalCalmFires: (n: number) =>
      `Sem avisos meteorológicos; ${plural(n, "incêndio em curso", "incêndios em curso")}.`,
    nationalCalm: "Sem avisos meteorológicos nem incêndios em curso.",
    firstWindow: (when: string, n: number) => `${when} em ${plural(n, "local", "locais")}`,
    nextWindow: (when: string, n: number) => `${when}, em ${n}`,
    others: (n: number) => ` Há mais ${plural(n, "aviso diferente", "avisos diferentes")}.`,
  },
  stage: {
    mapLabel: "Mapa de Portugal com o nível de aviso de cada distrito",
    acores: "Açores",
    madeira: "Madeira",
    howWeRead: "Como lemos os dados",
    levelRule: "O nível segue o aviso mais alto do IPMA em vigor ou previsto.",
    pickHint: "Escolha um distrito no mapa para o resumo.",
    dataFrom: "Dados do IPMA e do Fogos.pt.",
    updated: "atualizado",
    stamp: (date: string, time: string) => `${date} · ${time}`,
    legendFire: "Incêndio em curso",
    legendQuake: "Sismo sentido",
    back: "Todo o país",
    forecastFor: (capital: string) => `Previsão para ${capital}`,
    forecastNote: "Máxima e mínima; percentagem é a probabilidade de chuva. Fonte: IPMA.",
    forecastNone: "Sem previsão de momento. Consulte",
    rainChance: "Probabilidade de chuva: ",
    today: "Hoje",
    tomorrow: "Amanhã",
    seeAll: "Ver tudo",
  },
  sections: {
    warnings: "Avisos meteorológicos",
    fires: "Incêndios",
    quakes: "Sismos nos últimos 7 dias",
    riskToday: "Risco de incêndio hoje",
    riskByConcelho: "Risco de incêndio",
    air: "Qualidade do ar",
    airUv: "Ar e raios UV",
    allDistricts: "Todos os distritos",
    map: "Mapa",
    mapOf: (name: string) => `Mapa de ${name}`,
    mapIntro: "Aproxime para ver cada evento e toque num deles para ver o detalhe.",
    mapIntroDistrict: (inPlace: string) =>
      `Mostra só o que acontece ${inPlace}. Aproxime para ver cada evento e toque num deles para ver o detalhe.`,
  },
  pages: {
    warningsList: "Em vigor e previstos",
    firesList: "Ocorrências",
    quakesList: "Últimos 7 dias",
    warningsTitle: "Avisos meteorológicos",
    warningsIntro:
      "Os avisos do IPMA para os próximos três dias. Cada aviso aparece uma vez, com o horário e os locais.",
    firesTitle: "Incêndios",
    firesIntro: "Ocorrências registadas pela Proteção Civil (ANEPC), via Fogos.pt.",
    quakesTitle: "Sismos",
    quakesIntro: "Sismos registados pelo IPMA nos últimos 7 dias, em Portugal e perto da costa.",
    riskTitle: "Risco de incêndio e qualidade do ar",
    riskIntro:
      "O risco de incêndio rural por concelho (IPMA) e a qualidade do ar estimada para as capitais de distrito.",
  },
  /** Páginas de cada tema dentro de um distrito (/lisboa/avisos…). */
  districtPages: {
    menu: (name: string) => `Temas: ${name}`,
    warningsTitle: (inPlace: string) => `Avisos ${inPlace}`,
    warningsIntro: (inPlace: string) =>
      `Os avisos do IPMA ${inPlace} para os próximos três dias, com o horário de cada um.`,
    firesTitle: (inPlace: string) => `Incêndios ${inPlace}`,
    firesIntro: (inPlace: string) =>
      `Ocorrências registadas pela Proteção Civil (ANEPC) ${inPlace}, via Fogos.pt.`,
    quakesTitle: (inPlace: string) => `Sismos ${inPlace}`,
    quakesIntro: (inPlace: string) =>
      `Sismos de magnitude 2 ou superior registados pelo IPMA ${inPlace} nos últimos 7 dias.`,
    riskTitle: (inPlace: string) => `Risco de incêndio, ar e UV ${inPlace}`,
    airTitle: (inPlace: string) => `Ar e raios UV ${inPlace}`,
    riskIntro: (capital: string) =>
      `O risco de incêndio rural por concelho, hoje e amanhã (IPMA), e a qualidade do ar e o índice UV em ${capital}.`,
    airIntro: (capital: string) => `A qualidade do ar e o índice UV em ${capital}.`,
  },
  empty: {
    warnings: "Não há avisos meteorológicos em vigor nem previstos para os próximos três dias.",
    warningsDistrict: (inPlace: string) =>
      `Não há avisos meteorológicos ${inPlace} para os próximos três dias.`,
    warningsDown: "Consulte os avisos em ipma.pt enquanto a ligação ao IPMA não é restabelecida.",
    firesDown:
      "Informação sobre incêndios indisponível neste momento. Consulte os incêndios ativos em",
    firesNone: "Não há incêndios registados neste momento.",
    firesNoneActive: "Nenhum incêndio em curso ou em resolução.",
    quakesDown: "Sem dados de sismos de momento.",
    quakesNone: "Nenhum sismo de magnitude 2 ou superior nos últimos 7 dias.",
    quakesNoneDistrict: (inPlace: string) =>
      `Nenhum sismo de magnitude 2 ou superior ${inPlace} nos últimos 7 dias.`,
    quakesNoneNotable: "Nenhum sismo sentido nem em território português nos últimos 7 dias.",
    riskDown: "Sem previsão de risco de incêndio de momento.",
    riskLow: "Risco reduzido em todos os concelhos, hoje e amanhã.",
    airDown: "Sem dados de qualidade do ar de momento.",
    airNone: "Sem leituras de qualidade do ar de momento.",
    airAllGood: (n: number) =>
      `Qualidade do ar boa ou razoável em todas as ${n} capitais de distrito e regiões.`,
  },
  lists: {
    showMap: "Ver no mapa",
    windowPlaces: (n: number) => (n === 1 ? "em " : `${n} locais: `),
    azoresTime: " (hora dos Açores)",
    mainlandTime: " (hora do continente)",
    fireMeta: (nature: string, start: string) => `${nature}. Início ${start}.`,
    fireMeans: (people: number, ground: number, air: number) =>
      `${plural(people, "operacional", "operacionais")}, ${plural(ground, "meio terrestre", "meios terrestres")}, ${plural(air, "meio aéreo", "meios aéreos")}.`,
    showActiveOnly: "Mostrar só os ativos",
    showOthers: (n: number) => `Mostrar também ${n} em conclusão ou vigilância`,
    magnitude: (m: string) => `Magnitude ${m}`,
    felt: "Sentido pela população. ",
    quakeMeta: (when: string, depth: number, intensity?: string) =>
      `${when}, a ${depth} km de profundidade${intensity ? `, intensidade ${intensity}` : ""}.`,
    showLess: "Mostrar menos",
    showAllQuakes: (n: number) => `Mostrar os ${n} sismos dos últimos 7 dias`,
    riskOnMap: "Ver por concelho no mapa",
    riskLevels: (label: string, n: number) => [label, plural(n, "concelho", "concelhos")] as const,
    riskOnlyNotable: "Mostrar só risco moderado ou superior",
    riskAll: (n: number) => `Mostrar os ${n} concelhos`,
    concelho: "Concelho",
    today: "Hoje",
    tomorrow: "Amanhã",
    riskTable: "Risco de incêndio por concelho, hoje e amanhã",
    airIndex: (eaqi: number, pollutant: string) =>
      `Índice ${eaqi}${pollutant ? `, sobretudo ${pollutant}` : ""}.`,
    airNow: "Qualidade do ar agora",
    airEuropean: (eaqi: number, pollutant: string) =>
      `Índice europeu ${eaqi}${pollutant ? `, sobretudo ${pollutant}` : ""}.`,
    noReading: "Sem leitura de momento.",
    uvToday: "Índice UV máximo hoje",
    uvAdvice: ". Use proteção solar entre as 11h e as 17h.",
    noForecast: "Sem previsão de momento.",
    airNote:
      "Estimativa de modelo (Copernicus CAMS) para as capitais de distrito, não medição de estação.",
    airNoteDistrict: (capital: string) =>
      `Qualidade do ar: estimativa de modelo (Copernicus CAMS via Open-Meteo) para ${capital}. Índice UV: previsão do IPMA.`,
  },
  source: {
    source: "Fonte",
    updated: "Atualizado",
    ipmaLogo: "IPMA (abre o site do IPMA)",
  },
  map: {
    loading: "A carregar o mapa…",
    zone: "Zona do mapa",
    show: "Mostrar no mapa",
    layers: {
      warnings: "Avisos",
      fires: "Incêndios",
      quakes: "Sismos",
      risk: "Risco de incêndio",
      air: "Qualidade do ar",
    },
    risk: "Risco:",
    quakeLegend: "Círculo maior, magnitude maior; mais transparente, mais antigo.",
    fireLegend: {
      red: "Importante",
      orange: "Em curso",
      yellow: "Em resolução",
      none: "Em vigilância ou concluído",
    },
    quakeLevels: {
      red: "Magnitude 5,5 ou mais",
      orange: "4,5 a 5,4",
      yellow: "3,5 a 4,4 ou sentido",
      none: "Abaixo de 3,5",
    },
    airLegend: {
      none: "Boa ou razoável",
      yellow: "Moderada",
      orange: "Fraca",
      red: "Muito fraca",
    },
    riskMainlandOnly:
      "O risco de incêndio do IPMA só existe para o continente. Veja a qualidade do ar nas ilhas.",
    seeCountry: {
      warnings: "Ver os avisos em todo o país",
      fires: "Ver os incêndios em todo o país",
      quakes: "Ver os sismos em todo o país",
      risk: "Ver o risco de incêndio em todo o país",
      air: "Ver a qualidade do ar em todo o país",
    },
    close: "Fechar detalhe",
    noWarnings: "Sem avisos meteorológicos.",
    firesInProgress: (n: number) => ` ${plural(n, "incêndio", "incêndios")} em curso.`,
    airShort: (label: string) => ` Qualidade do ar: ${label.toLowerCase()}.`,
    seeAllAbout: (name: string) => `Ver tudo sobre ${name}`,
    fireDetail: (nature: string, start: string, people: number, air: number) =>
      `${nature}. Início ${start}. ${people} operacionais, ${air} meios aéreos.`,
    quakeDetail: (when: string, depth: number) => `${when}, a ${depth} km de profundidade.`,
    regions: { continente: "Continente", acores: "Açores", madeira: "Madeira" },
    zoomIn: "Aproximar",
    zoomOut: "Afastar",
    resetBearing: "Repor orientação",
    attribution: "Mostrar créditos",
    ctrlScroll: "Use Ctrl + roda do rato para ampliar o mapa",
    cmdScroll: "Use ⌘ + roda do rato para ampliar o mapa",
    twoFingers: "Use dois dedos para mover o mapa",
    ariaLabel: "Mapa interativo. A mesma informação está nas listas desta página.",
    boundaries: "Limites",
  },
  notFound: {
    title: "Esta página não existe.",
    body: "Pode ter sido um erro no endereço. Escolha um distrito no topo da página ou veja o estado de todo o país.",
    link: "Ver o estado do país",
  },
  dataNote: "",
  term: (text: string) => text,
  districtMeta: (name: string, headline: string, inPlace: string) => ({
    title: `${name}: avisos, incêndios e sismos agora`,
    description: `${headline} Previsão, risco de incêndio, qualidade do ar e UV ${inPlace}.`,
  }),
};

export type Dictionary = typeof pt;

const enDistrictName = (d: District) => (d.slug === "acores" ? "the Azores" : d.name);

const en: Dictionary = {
  locale: "en",
  site: {
    tagline: "The state of the country, now.",
    description:
      "Weather warnings, earthquakes, wildfires and air quality in Portugal, in one place, from official sources.",
    ogAlt: "Current state of Portugal: warnings, wildfires and earthquakes",
    wholeCountry: "Whole country",
    ogDataFrom: (day, month, time) => `Data as of ${day} ${month}, ${time}`,
    ogSources: "portugalagora.pt. Data from IPMA, Fogos.pt and Open-Meteo.",
  },
  nav: {
    label: "Sections",
    overview: "Overview",
    warnings: "Warnings",
    fires: "Wildfires",
    quakes: "Earthquakes",
    riskAir: "Risk and air",
    short: {
      overview: "Overview",
      warnings: "Warnings",
      fires: "Wildfires",
      quakes: "Quakes",
      riskAir: "Risk",
    },
    skip: "Skip to content",
    home: "Portugal Agora, home page",
    pageSections: "Sections on this page",
  },
  header: {
    pickDistrict: "Choose a district or region",
    wholeCountry: "Whole country",
    mainland: "Mainland",
    autonomous: "Autonomous regions",
    nearMe: "Near me",
    locating: "Locating…",
    geoUnsupported: "This device can't share its location. Choose your district from the list.",
    geoOutside: "You seem to be outside Portugal. Choose a district from the list.",
    geoFailed: "We couldn't work out your district. Choose it from the list.",
    geoDenied: "No access to your location. You can choose the district from the list.",
    theme: "Theme",
    themeNames: { system: "automatic", light: "light", dark: "dark" },
    themeButton: (current: string) => `Theme: ${current}. Change theme`,
    language: "Language",
    otherLanguage: "Português",
    otherLanguageShort: "PT",
    offline: "No internet connection. You are seeing the last saved data.",
  },
  emergency: {
    before: "In an emergency, call",
    after: ". This site is for information only and does not replace the authorities.",
  },
  footer: {
    about:
      "Official information gathered in one place. It is not an official source and does not replace Civil Protection. In an emergency, call 112.",
    data: "Data",
    links: "Footer",
    sources: "Sources and how we read the data",
    privacy: "Privacy",
    project: "About the project",
  },
  levels: {
    none: "No warning",
    yellow: "Yellow",
    orange: "Orange",
    red: "Red",
    info: "Information",
    unknown: "No data",
  },
  levelAdjective: { none: "green", yellow: "yellow", orange: "orange", red: "red" },
  districtName: (d) => (d.slug === "acores" ? "Azores" : d.name),
  inPlace: (d) => `in ${enDistrictName(d)}`,
  join: joinWith("and"),
  and: "and",
  plural,
  headline: {
    noData: "We couldn't get the IPMA weather warnings.",
    calm: "No weather warnings in Portugal.",
    level: (level, places) => `${capitalizeEn(en.levelAdjective[level])} warning ${places}.`,
    inDistricts: (n) => `in ${n} districts`,
    districtNoData: (name) => `We couldn't get the IPMA warnings for ${name}.`,
    districtCalm: (inPlace) => `No weather warnings ${inPlace}.`,
    districtLevel: (level, types, inPlace) =>
      `${capitalizeEn(en.levelAdjective[level])} ${types} warning${inPlace ? ` ${inPlace}` : ""}.`,
  },
  topics: {
    warnings: "Warnings",
    fires: "Wildfires",
    quakesNational: "Earthquakes in Portugal (7 days)",
    quakesDistrict: "Earthquakes (7 days)",
    riskToday: "Wildfire risk",
    riskTodayDistrict: "Wildfire risk today",
    air: "Air and UV",
    none: "None",
    noData: "No data",
    ipmaDown: "IPMA unavailable",
    fogosDown: "see fogos.pt",
    wholeCountry: "across the country",
    nextDays: "in the next three days",
    districts: (n) => plural(n, "district", "districts"),
    alsoIn: (places) => `; also ${places}`,
    warningsCount: (n) => plural(n, "warning", "warnings"),
    inProgress: (n) => `${n} active`,
    inProgressDetail: "right now",
    andMore: (first, n) => `${first} and ${n} more`,
    quakes: (n) => plural(n, "earthquake", "earthquakes"),
    quakeDetail: (felt, magnitude) =>
      `${felt === 0 ? "none felt" : `${felt} felt`}; largest magnitude ${magnitude}`,
    quakeNoneNational: "felt or in Portuguese territory",
    quakeNoneDistrict: "of magnitude 2 or more",
    riskUpTo: (label) => `Up to ${label.toLowerCase()}`,
    riskWhere: (n) => `today, in ${plural(n, "municipality", "municipalities")}`,
    riskWhereDistrict: (n) => `in ${plural(n, "municipality", "municipalities")}`,
    airValue: (label) => `Air ${label.toLowerCase()}`,
    uv: (index, label) => `UV ${index}${label ? `, ${label.toLowerCase()}` : ""}`,
  },
  caption: {
    noWarningData: "No IPMA warning data",
    calm: "No weather warnings",
    level: (level, types) => `${capitalizeEn(en.levelAdjective[level])} ${types} warning`,
    fires: (n) => `; ${plural(n, "wildfire", "wildfires")} active`,
    open: (name) => `Open ${name}`,
    country: "Portugal",
    nationalNoData: "No IPMA warning data. See ipma.pt.",
    nationalCalmFires: (n) => `No weather warnings; ${plural(n, "wildfire", "wildfires")} active.`,
    nationalCalm: "No weather warnings and no active wildfires.",
    firstWindow: (when, n) => `${when} in ${plural(n, "area", "areas")}`,
    nextWindow: (when, n) => `${when}, in ${n}`,
    others: (n) => ` ${plural(n, "other warning", "other warnings")} in force.`,
  },
  stage: {
    mapLabel: "Map of Portugal with the warning level of each district",
    acores: "Azores",
    madeira: "Madeira",
    howWeRead: "How we read the data",
    levelRule: "The level follows the highest IPMA warning in force or forecast.",
    pickHint: "Choose a district on the map for a summary.",
    dataFrom: "Data from IPMA and Fogos.pt.",
    updated: "updated",
    stamp: (date, time) => `${date} · ${time}`,
    legendFire: "Active wildfire",
    legendQuake: "Felt earthquake",
    back: "Whole country",
    forecastFor: (capital) => `Forecast for ${capital}`,
    forecastNote: "High and low; percentage is the chance of rain. Source: IPMA.",
    forecastNone: "No forecast right now. See",
    rainChance: "Chance of rain: ",
    today: "Today",
    tomorrow: "Tomorrow",
    seeAll: "See all",
  },
  sections: {
    warnings: "Weather warnings",
    fires: "Wildfires",
    quakes: "Earthquakes in the last 7 days",
    riskToday: "Wildfire risk today",
    riskByConcelho: "Wildfire risk",
    air: "Air quality",
    airUv: "Air and UV",
    allDistricts: "All districts",
    map: "Map",
    mapOf: (name) => `Map of ${name}`,
    mapIntro: "Zoom in to see each event and tap one for details.",
    mapIntroDistrict: (inPlace) =>
      `Shows only what is happening ${inPlace}. Zoom in to see each event and tap one for details.`,
  },
  pages: {
    warningsList: "In force and forecast",
    firesList: "Incidents",
    quakesList: "Last 7 days",
    warningsTitle: "Weather warnings",
    warningsIntro:
      "IPMA warnings for the next three days. Each warning appears once, with its times and places.",
    firesTitle: "Wildfires",
    firesIntro: "Incidents recorded by Civil Protection (ANEPC), via Fogos.pt.",
    quakesTitle: "Earthquakes",
    quakesIntro: "Earthquakes recorded by IPMA in the last 7 days, in Portugal and off its coast.",
    riskTitle: "Wildfire risk and air quality",
    riskIntro:
      "Rural wildfire risk by municipality (IPMA) and estimated air quality for the district capitals.",
  },
  districtPages: {
    menu: (name) => `Topics: ${name}`,
    warningsTitle: (inPlace) => `Warnings ${inPlace}`,
    warningsIntro: (inPlace) =>
      `IPMA warnings ${inPlace} for the next three days, with the times of each one.`,
    firesTitle: (inPlace) => `Wildfires ${inPlace}`,
    firesIntro: (inPlace) =>
      `Incidents recorded by Civil Protection (ANEPC) ${inPlace}, via Fogos.pt.`,
    quakesTitle: (inPlace) => `Earthquakes ${inPlace}`,
    quakesIntro: (inPlace) =>
      `Earthquakes of magnitude 2 or more recorded by IPMA ${inPlace} in the last 7 days.`,
    riskTitle: (inPlace) => `Wildfire risk, air and UV ${inPlace}`,
    airTitle: (inPlace) => `Air and UV ${inPlace}`,
    riskIntro: (capital) =>
      `Rural wildfire risk by municipality for today and tomorrow (IPMA), and air quality and UV index in ${capital}.`,
    airIntro: (capital) => `Air quality and UV index in ${capital}.`,
  },
  empty: {
    warnings: "No weather warnings in force or forecast for the next three days.",
    warningsDistrict: (inPlace) => `No weather warnings ${inPlace} for the next three days.`,
    warningsDown: "See the warnings at ipma.pt while the connection to IPMA is restored.",
    firesDown: "Wildfire information is unavailable right now. See active wildfires at",
    firesNone: "No wildfires recorded right now.",
    firesNoneActive: "No wildfires in progress or being resolved.",
    quakesDown: "No earthquake data right now.",
    quakesNone: "No earthquakes of magnitude 2 or more in the last 7 days.",
    quakesNoneDistrict: (inPlace) =>
      `No earthquakes of magnitude 2 or more ${inPlace} in the last 7 days.`,
    quakesNoneNotable: "No felt earthquakes and none in Portuguese territory in the last 7 days.",
    riskDown: "No wildfire risk forecast right now.",
    riskLow: "Low risk in every municipality, today and tomorrow.",
    airDown: "No air quality data right now.",
    airNone: "No air quality readings right now.",
    airAllGood: (n) => `Air quality good or fair in all ${n} district capitals and regions.`,
  },
  lists: {
    showMap: "Show on map",
    windowPlaces: (n) => (n === 1 ? "in " : `${n} areas: `),
    azoresTime: " (Azores time)",
    mainlandTime: " (mainland time)",
    fireMeta: (nature, start) => `${nature}. Started ${start}.`,
    fireMeans: (people, ground, air) =>
      `${plural(people, "firefighter", "firefighters")}, ${plural(ground, "ground unit", "ground units")}, ${plural(air, "aircraft", "aircraft")}.`,
    showActiveOnly: "Show active only",
    showOthers: (n) => `Also show ${n} ending or under watch`,
    magnitude: (m) => `Magnitude ${m}`,
    felt: "Felt by the population. ",
    quakeMeta: (when, depth, intensity) =>
      `${when}, ${depth} km deep${intensity ? `, intensity ${intensity}` : ""}.`,
    showLess: "Show less",
    showAllQuakes: (n) => `Show all ${n} earthquakes from the last 7 days`,
    riskOnMap: "See by municipality on the map",
    riskLevels: (label, n) => [label, plural(n, "municipality", "municipalities")] as const,
    riskOnlyNotable: "Show only moderate risk or higher",
    riskAll: (n) => `Show all ${n} municipalities`,
    concelho: "Municipality",
    today: "Today",
    tomorrow: "Tomorrow",
    riskTable: "Wildfire risk by municipality, today and tomorrow",
    airIndex: (eaqi, pollutant) => `Index ${eaqi}${pollutant ? `, mainly ${pollutant}` : ""}.`,
    airNow: "Air quality now",
    airEuropean: (eaqi, pollutant) =>
      `European index ${eaqi}${pollutant ? `, mainly ${pollutant}` : ""}.`,
    noReading: "No reading right now.",
    uvToday: "Highest UV index today",
    uvAdvice: ". Use sun protection between 11:00 and 17:00.",
    noForecast: "No forecast right now.",
    airNote:
      "Model estimate (Copernicus CAMS) for the district capitals, not a station measurement.",
    airNoteDistrict: (capital) =>
      `Air quality: model estimate (Copernicus CAMS via Open-Meteo) for ${capital}. UV index: IPMA forecast.`,
  },
  source: {
    source: "Source",
    updated: "Updated",
    ipmaLogo: "IPMA (opens the IPMA website)",
  },
  map: {
    loading: "Loading the map…",
    zone: "Map area",
    show: "Show on the map",
    layers: {
      warnings: "Warnings",
      fires: "Wildfires",
      quakes: "Earthquakes",
      risk: "Wildfire risk",
      air: "Air quality",
    },
    risk: "Risk:",
    quakeLegend: "Bigger circle, bigger magnitude; more transparent, older.",
    fireLegend: {
      red: "Major",
      orange: "Active",
      yellow: "Being resolved",
      none: "Under watch or over",
    },
    quakeLevels: {
      red: "Magnitude 5.5 or more",
      orange: "4.5 to 5.4",
      yellow: "3.5 to 4.4 or felt",
      none: "Below 3.5",
    },
    airLegend: {
      none: "Good or fair",
      yellow: "Moderate",
      orange: "Poor",
      red: "Very poor",
    },
    riskMainlandOnly:
      "IPMA's wildfire risk only covers the mainland. See air quality for the islands.",
    seeCountry: {
      warnings: "See warnings across the country",
      fires: "See wildfires across the country",
      quakes: "See earthquakes across the country",
      risk: "See wildfire risk across the country",
      air: "See air quality across the country",
    },
    close: "Close details",
    noWarnings: "No weather warnings.",
    firesInProgress: (n) => ` ${plural(n, "wildfire", "wildfires")} active.`,
    airShort: (label) => ` Air quality: ${label.toLowerCase()}.`,
    seeAllAbout: (name) => `See everything about ${name}`,
    fireDetail: (nature, start, people, air) =>
      `${nature}. Started ${start}. ${people} firefighters, ${air} aircraft.`,
    quakeDetail: (when, depth) => `${when}, ${depth} km deep.`,
    regions: { continente: "Mainland", acores: "Azores", madeira: "Madeira" },
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    resetBearing: "Reset bearing",
    attribution: "Show credits",
    ctrlScroll: "Use Ctrl + scroll to zoom the map",
    cmdScroll: "Use ⌘ + scroll to zoom the map",
    twoFingers: "Use two fingers to move the map",
    ariaLabel: "Interactive map. The same information is in the lists on this page.",
    boundaries: "Boundaries",
  },
  notFound: {
    title: "This page doesn't exist.",
    body: "There may be a mistake in the address. Choose a district at the top of the page or see the state of the whole country.",
    link: "See the state of the country",
  },
  dataNote:
    "Official texts from IPMA and Fogos.pt (warning descriptions, place names) are shown in Portuguese, as published.",
  term: translateTerm,
  districtMeta: (name, headline, inPlace) => ({
    title: `${name}: warnings, wildfires and earthquakes now`,
    description: `${headline} Forecast, wildfire risk, air quality and UV ${inPlace}.`,
  }),
};

function capitalizeEn(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const dictionaries: Record<Locale, Dictionary> = { pt, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
