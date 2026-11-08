import { concelhoNameEn } from "@/data/concelho-names-en";
import {
  districtForIpmaArea,
  ipmaAreaLabel,
  ipmaAreaNamesEn,
  type District,
} from "@/data/districts";

import type { Locale } from "./locales";
import { translateTerm } from "./terms";

/** Capitais de distrito que levam artigo: "no Porto", "na Guarda", "no Funchal". */
const capitalArticle: Record<string, "o" | "a"> = { Porto: "o", Guarda: "a", Funchal: "o" };

/** "em Lisboa" / "no Porto", "para Lisboa" / "para o Porto". */
function ptCapital(prep: "em" | "para", name: string): string {
  const a = capitalArticle[name];
  if (!a) return `${prep} ${name}`;
  return prep === "em" ? `${a === "o" ? "no" : "na"} ${name}` : `para ${a} ${name}`;
}

/** "em" com o artigo que a zona de aviso pede: "nos Açores, Grupo Central", "na Madeira, costa norte", "no Porto". */
function ptInArea(label: string): string {
  if (label.startsWith("Açores")) return "nos ";
  if (label.startsWith("Madeira")) return "na ";
  if (label === "Porto") return "no ";
  if (label === "Guarda") return "na ";
  return "em ";
}

/** "em Lisboa" → "de Lisboa", "no Porto" → "do Porto", "nos Açores" → "dos Açores". */
const ofPlace = (inName: string) =>
  inName.replace(
    /^(em|no|na|nos|nas) /,
    (_, p: string) => ({ em: "de ", no: "do ", na: "da ", nos: "dos ", nas: "das " })[p] ?? "de ",
  );

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
    /** Abaixo de 400 px, para a escolha do distrito caber ao lado. */
    nearMeShort: "Perto",
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
  /** Observações da estação do IPMA mais próxima da capital (página do distrito). */
  observed: {
    heading: "Tempo agora",
    station: (name: string, time: string) => `Estação ${name}, observado às ${time}.`,
    temperature: "Temperatura",
    wind: "Vento",
    humidity: "Humidade",
    rain: "Chuva na última hora",
    windFrom: (kmh: string, dir: string) => `${kmh}\u00a0km/h de ${dir}`,
    calm: "Calmo",
  },
  /** Previsão do estado do mar do IPMA (distritos com costa). */
  sea: {
    heading: "Estado do mar",
    day: "Dia",
    waves: "Ondas",
    swell: "Ondulação",
    water: (temperature: string) => `água a ${temperature}`,
    swellFrom: (dir: string) => `de ${dir}`,
    note: "Previsão do IPMA para a costa: altura significativa das ondas, direção e período da ondulação e temperatura da água do mar.",
  },
  /** Direções do IPMA (N, NE…) por extenso. */
  compass: {
    N: "norte",
    NE: "nordeste",
    E: "leste",
    SE: "sudeste",
    S: "sul",
    SW: "sudoeste",
    W: "oeste",
    NW: "noroeste",
  } as Record<string, string>,
  /** Feed RSS dos avisos (/avisos/rss, /lisboa/avisos/rss). */
  feed: {
    national: "em Portugal",
    title: (where: string) => `Avisos ${where} · Portugal Agora`,
    description: (where: string) =>
      `Avisos meteorológicos do IPMA ${where}. Informativo: não substitui as autoridades. Em emergência, ligue 112.`,
    item: (level: string, type: string) => `Aviso ${level} de ${type}`,
    range: (from: string, to: string) => `De ${from} a ${to}`,
    places: "Locais",
    subscribe: {
      avisos: "Subscrever estes avisos por RSS",
      incendios: "Subscrever estes incêndios por RSS",
      sismos: "Subscrever estes sismos por RSS",
    } as Record<"avisos" | "incendios" | "sismos", string>,
    firesTitle: (where: string) => `Incêndios ${where} · Portugal Agora`,
    firesDescription: (where: string) =>
      `Incêndios em curso ${where}, com dados do Fogos.pt (ANEPC). Informativo: não substitui as autoridades. Em emergência, ligue 112.`,
    fireStart: (when: string) => `Início: ${when}.`,
    quakesTitle: (where: string) => `Sismos ${where} · Portugal Agora`,
    quakesDescription: (where: string) =>
      `Sismos dos últimos 7 dias ${where}, com dados do IPMA. Informativo: não substitui as autoridades. Em emergência, ligue 112.`,
    felt: "sentido",
  },
  /** Nome de um distrito ou região, como aparece no texto. */
  districtName: (d: District) => d.name,
  /** "em Lisboa", "no Porto", "nos Açores". */
  inPlace: (d: District) => d.inName,
  /** Capital do distrito (previsão, ar e UV). */
  capitalName: (d: District) => d.capital,
  /** Área de aviso do IPMA: o distrito, ou a zona das ilhas ("Açores, Grupo Central"). */
  areaName: (area: string) => ipmaAreaLabel(area),
  /** Nome de um concelho (tabela do risco de incêndio). */
  concelhoName: (_dico: string, name: string) => name,
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
    riskEverywhere: (n: number) => `hoje, em todos os ${n} concelhos`,
    riskEverywhereDistrict: (n: number) => `em todos os ${n} concelhos`,
    airValue: (label: string) => `Qualidade ${label.toLowerCase()}`,
    /** Linha dos incêndios num sítio sem dados do Fogos.pt. */
    firesNotCovered: (inPlace: string) => `o Fogos.pt não tem dados ${inPlace}`,
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
    /** `places` vem de placesPhrase: "no Porto e em Braga", "em 6 distritos e nos Açores". */
    firstWindow: (when: string, places: string) => `${when} ${places}`,
    nextWindow: (when: string, places: string) => `${when}, ${places}`,
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
    refreshing: "A atualizar os dados…",
    stamp: (date: string, time: string) => `${date} · ${time}`,
    legendFire: "Incêndio em curso",
    legendQuake: "Sismo sentido",
    back: "Todo o país",
    forecastFor: (capital: string) => `Previsão ${ptCapital("para", capital)}`,
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
    mapOf: (d: District) => `Mapa ${ofPlace(d.inName)}`,
    mapIntro: "Aproxime e toque num evento para ver o detalhe.",
    mapIntroDistrict: (inPlace: string) =>
      `Só o que acontece ${inPlace}. Aproxime e toque num evento para ver o detalhe.`,
    skipMap: "Saltar o mapa",
  },
  pages: {
    warningsList: "Em vigor e previstos",
    firesList: "Ocorrências",
    quakesList: "Últimos 7 dias",
    warningsTitle: "Avisos meteorológicos",
    warningsIntro:
      "Os avisos do IPMA para os próximos três dias. Cada aviso aparece uma vez, com o horário e os locais.",
    firesTitle: "Incêndios",
    firesIntro:
      "Ocorrências no continente e na Madeira, registadas pela Proteção Civil e publicadas no Fogos.pt.",
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
    firesIntro: (d: District) =>
      d.region === "continente"
        ? `Ocorrências registadas pela Proteção Civil (ANEPC) ${d.inName}, via Fogos.pt.`
        : d.region === "madeira"
          ? `Ocorrências registadas pela proteção civil regional ${d.inName}, via Fogos.pt.`
          : `O Fogos.pt não tem dados de incêndios ${d.inName}.`,
    quakesTitle: (inPlace: string) => `Sismos ${inPlace}`,
    quakesIntro: (inPlace: string) =>
      `Sismos de magnitude 2 ou superior registados pelo IPMA ${inPlace} nos últimos 7 dias.`,
    riskTitle: (inPlace: string) => `Risco de incêndio, ar e UV ${inPlace}`,
    airTitle: (inPlace: string) => `Ar e raios UV ${inPlace}`,
    riskIntro: (capital: string) =>
      `O risco de incêndio rural por concelho, hoje e amanhã (IPMA), e a qualidade do ar e o índice UV ${ptCapital("em", capital)}.`,
    airIntro: (capital: string) => `A qualidade do ar e o índice UV ${ptCapital("em", capital)}.`,
  },
  empty: {
    warnings: "Não há avisos meteorológicos em vigor nem previstos para os próximos três dias.",
    warningsDistrict: (inPlace: string) =>
      `Não há avisos meteorológicos ${inPlace} para os próximos três dias.`,
    warningsDown: "Consulte os avisos em ipma.pt enquanto a ligação ao IPMA não é restabelecida.",
    firesDown:
      "Informação sobre incêndios indisponível neste momento. Consulte os incêndios ativos em",
    firesNone: "Não há incêndios registados neste momento.",
    /** Nos Açores: o Fogos.pt não cobre a região; a proteção civil regional sim. */
    firesNotCovered: (inPlace: string) =>
      `O Fogos.pt só tem dados do continente e da Madeira; não há informação de incêndios ${inPlace}. Consulte`,
    firesRegional: "o Serviço Regional de Proteção Civil",
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
    windowPlaces: (n: number, first = "") => (n === 1 ? ptInArea(first) : `${n} locais: `),
    azoresTime: " (hora dos Açores)",
    mainlandTime: " (hora do continente)",
    fireMeta: (nature: string, start: string) => `${nature}. Início ${start}.`,
    fireMeans: (people: number, ground: number, air: number) =>
      `${plural(people, "operacional", "operacionais")}, ${plural(ground, "meio terrestre", "meios terrestres")}, ${plural(air, "meio aéreo", "meios aéreos")}.`,
    showActiveOnly: "Mostrar só os ativos",
    showOthers: (n: number) => `Mostrar também ${n} em conclusão ou vigilância`,
    magnitude: (m: string) => `Magnitude ${m}`,
    felt: "Sentido pela população. ",
    quakeMeta: (when: string, depth: number | null, intensity?: string) =>
      `${when}, ${depth === null ? "profundidade não indicada" : `a ${depth} km de profundidade`}${intensity ? `, intensidade ${intensity}` : ""}.`,
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
      `Qualidade do ar: estimativa de modelo (Copernicus CAMS via Open-Meteo) ${ptCapital("para", capital)}. Índice UV: previsão do IPMA.`,
  },
  source: {
    source: "Fonte",
    updated: "Atualizado",
    ipmaLogo: "IPMA (abre o site do IPMA)",
  },
  map: {
    loading: "A carregar o mapa…",
    zone: "Zona do mapa",
    riskDay: "Dia do risco de incêndio",
    show: "Mostrar no mapa",
    layers: {
      warnings: "Avisos",
      fires: "Incêndios",
      quakes: "Sismos",
      risk: "Risco de incêndio",
      air: "Qualidade do ar",
      observed: "Tempo agora",
      sea: "Mar",
    },
    observedLegend:
      "Temperatura agora na estação do IPMA mais próxima da capital de cada distrito. Toque numa estação para o resto.",
    seaLegend:
      "Altura das ondas hoje, previsão do IPMA para a costa. Toque num ponto para os próximos dias.",
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
      observed: "Ver o tempo em todo o país",
      sea: "Ver o mar em todo o país",
    },
    close: "Fechar detalhe",
    noWarnings: "Sem avisos meteorológicos.",
    firesInProgress: (n: number) => ` ${plural(n, "incêndio", "incêndios")} em curso.`,
    airShort: (label: string) => ` Qualidade do ar: ${label.toLowerCase()}.`,
    seeAllAbout: (name: string) => `Ver tudo sobre ${name}`,
    fireDetail: (nature: string, start: string, people: number, air: number) =>
      `${nature}. Início ${start}. ${people} operacionais, ${air} meios aéreos.`,
    quakeDetail: (when: string, depth: number | null) =>
      `${when}, ${depth === null ? "profundidade não indicada" : `a ${depth} km de profundidade`}.`,
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
  /** A página inicial imersiva: o país em 3D e um painel por tema, ao longo do scroll. */
  home: {
    kicker: "Boletim nacional · ao vivo",
    scroll: "Desça para percorrer o país",
    step: (i: number, n: number) => `${String(i).padStart(2, "0")} / ${String(n).padStart(2, "0")}`,
    cta: {
      avisos: "Abrir os avisos",
      incendios: "Abrir os incêndios",
      sismos: "Abrir os sismos",
      risco: "Abrir o risco de incêndio",
      ar: "Abrir a qualidade do ar",
    },
    legend: {
      avisos: "No mapa, a cor e a altura de cada distrito repetem o nível do aviso.",
      incendios: "Cada coluna de luz é um incêndio em curso: quanto mais alta, mais operacionais.",
      sismos: "Cada anel é um sismo sentido nos últimos 7 dias: quanto maior, maior a magnitude.",
      risco:
        "No mapa, cada distrito do continente toma a cor e a altura do risco de incêndio mais alto de hoje num dos seus concelhos; as ilhas ficam apagadas, porque o IPMA não publica este risco para elas.",
      ar: "Estimativa de modelo para a capital de cada distrito (Copernicus CAMS).",
    },
    warnedNone: "Nenhum distrito com aviso.",
    firesNone: "Nenhum incêndio em curso.",
    quakesNone: "Nenhum sismo de destaque esta semana.",
    people: (n: number) => plural(n, "operacional", "operacionais"),
    more: (n: number) => `e mais ${n}`,
  },
  /** Vista 3D opcional dos mapas de tema (sismos, incêndios, risco de incêndio). */
  view3d: {
    group: "Vista do mapa",
    map: "Mapa",
    threeD: "3D",
    unavailable:
      "A vista 3D precisa de WebGL, que este browser não tem. O mapa continua disponível.",
    lost: "A vista 3D deixou de funcionar neste browser. Voltámos ao mapa.",
    depthLegend: (x: number) =>
      `Cada sismo está à sua profundidade, por baixo do epicentro. Profundidade exagerada ${x}×.`,
    depthMarks:
      "Esfera maior, magnitude maior; mais transparente, mais antigo; anel, sentido pela população.",
    depthMissing: "Os sismos sem profundidade indicada ficam à superfície, com contorno tracejado.",
    outside: (n: number) =>
      `${plural(n, "sismo fora deste bloco está", "sismos fora deste bloco estão")} só na lista.`,
    seaLevel: "Nível do mar",
    km: (n: number) => `${n} km`,
    depthAria: (region: string, n: number, deepest: number | null) =>
      n === 0
        ? `Vista 3D dos sismos em profundidade, ${region}: sem sismos nos últimos 7 dias.`
        : `Vista 3D dos sismos em profundidade, ${region}: ${plural(n, "sismo", "sismos")}${deepest === null ? "" : `; o mais profundo a ${deepest} km`}.`,
    keysHint: "Use as setas para rodar e inclinar a vista, e + ou − para aproximar.",
    rotateLeft: "Rodar para a esquerda",
    rotateRight: "Rodar para a direita",
    tiltMore: "Inclinar a vista",
    tiltLess: "Ver mais de cima",
    reset: "Repor vista",
    reliefLegend: (x: number) => `Relevo exagerado ${x}×. Os incêndios ficam assentes no terreno.`,
    relief: "Relevo",
    heightLegend:
      "A altura de cada concelho repete a classe de risco (1 a 5), tal como a cor. Não é relevo.",
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
  /**
   * Títulos para o Google (<title> e partilha), com as palavras que as pessoas
   * pesquisam ("hoje", "em tempo real", "IPMA"). Os títulos visíveis das páginas
   * (pages, districtPages) ficam como estão.
   */
  meta: {
    homeTitle: "Portugal Agora: avisos, incêndios e sismos em tempo real",
    /** Linha por cima do título da página inicial, que muda com o estado do país. */
    homeKicker: "Avisos, incêndios e sismos em Portugal, em tempo real",
    warningsTitle: "Avisos meteorológicos do IPMA hoje",
    firesTitle: "Incêndios hoje em Portugal, em tempo real",
    quakesTitle: "Sismos em Portugal: últimos 7 dias",
    riskTitle: "Risco de incêndio e qualidade do ar hoje",
    districtWarningsTitle: (inPlace: string) => `Avisos meteorológicos ${inPlace} hoje`,
    districtFiresTitle: (inPlace: string) => `Incêndios ${inPlace} hoje, em tempo real`,
    districtQuakesTitle: (inPlace: string) => `Sismos ${inPlace}: últimos 7 dias`,
    districtRiskTitle: (inPlace: string) => `Risco de incêndio, ar e UV ${inPlace} hoje`,
    districtAirTitle: (inPlace: string) => `Qualidade do ar e UV ${inPlace} hoje`,
    sourcesTitle: "Fontes e como lemos os dados",
    sourcesDescription:
      "De onde vêm os dados do Portugal Agora, de quanto em quanto tempo são atualizados e como são classificados.",
    privacyTitle: "Privacidade",
    privacyDescription:
      "O Portugal Agora não recolhe dados pessoais: não há contas, publicidade nem cookies, e a localização nunca sai do seu dispositivo.",
    aboutTitle: "Sobre o projeto",
    aboutDescription:
      "Um projeto pessoal, sem fins lucrativos e de código aberto, que junta num só sítio os avisos e os sismos do IPMA, os incêndios do Fogos.pt e a qualidade do ar.",
    /** Primeiro nível das migalhas (BreadcrumbList). */
    breadcrumbHome: "Portugal",
  },
};

export type Dictionary = typeof pt;

/** Em inglês, os exónimos estabelecidos (Lisbon, the Azores) vêm de data/districts.ts. */
const enDistrictName = (d: District) => d.en?.name ?? d.name;

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
    nearMeShort: "Near me",
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
  observed: {
    heading: "Weather now",
    station: (name, time) => `${name} station, observed at ${time}.`,
    temperature: "Temperature",
    wind: "Wind",
    humidity: "Humidity",
    rain: "Rain in the last hour",
    windFrom: (kmh, dir) => `${kmh}\u00a0km/h from the ${dir}`,
    calm: "Calm",
  },
  sea: {
    heading: "Sea conditions",
    day: "Day",
    waves: "Waves",
    swell: "Swell",
    water: (temperature) => `water at ${temperature}`,
    swellFrom: (dir) => `from the ${dir}`,
    note: "IPMA coastal forecast: significant wave height, swell direction and period, and sea temperature.",
  },
  compass: {
    N: "north",
    NE: "northeast",
    E: "east",
    SE: "southeast",
    S: "south",
    SW: "southwest",
    W: "west",
    NW: "northwest",
  },
  feed: {
    national: "in Portugal",
    title: (where) => `Warnings ${where} · Portugal Agora`,
    description: (where) =>
      `IPMA weather warnings ${where}. For information only: it does not replace the authorities. In an emergency, call 112.`,
    item: (level, type) => `${level} warning: ${type}`,
    range: (from, to) => `From ${from} to ${to}`,
    places: "Places",
    subscribe: {
      avisos: "Subscribe to these warnings by RSS",
      incendios: "Subscribe to these wildfires by RSS",
      sismos: "Subscribe to these earthquakes by RSS",
    },
    firesTitle: (where) => `Wildfires ${where} · Portugal Agora`,
    firesDescription: (where) =>
      `Active wildfires ${where}, with data from Fogos.pt (ANEPC). For information only: it does not replace the authorities. In an emergency, call 112.`,
    fireStart: (when) => `Started: ${when}.`,
    quakesTitle: (where) => `Earthquakes ${where} · Portugal Agora`,
    quakesDescription: (where) =>
      `Earthquakes from the last 7 days ${where}, with data from IPMA. For information only: it does not replace the authorities. In an emergency, call 112.`,
    felt: "felt",
  },
  districtName: enDistrictName,
  inPlace: (d) => d.en?.inName ?? `in ${enDistrictName(d)}`,
  capitalName: (d) => d.en?.capital ?? d.capital,
  areaName: (area) => {
    const district = districtForIpmaArea(area);
    return ipmaAreaNamesEn[area] ?? (district ? enDistrictName(district) : area);
  },
  concelhoName: concelhoNameEn,
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
    riskEverywhere: (n) => `today, in all ${n} municipalities`,
    riskEverywhereDistrict: (n) => `in all ${n} municipalities`,
    airValue: (label) => `${capitalizeEn(label.toLowerCase())} air`,
    firesNotCovered: (inPlace) => `Fogos.pt has no data ${inPlace}`,
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
    firstWindow: (when, places) => `${when} ${places}`,
    nextWindow: (when, places) => `${when}, ${places}`,
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
    refreshing: "Updating the data…",
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
    mapOf: (d) => `Map of ${d.en?.inName?.replace(/^in /, "") ?? enDistrictName(d)}`,
    mapIntro: "Zoom in and tap an event for details.",
    mapIntroDistrict: (inPlace) =>
      `Only what is happening ${inPlace}. Zoom in and tap an event for details.`,
    skipMap: "Skip the map",
  },
  pages: {
    warningsList: "In force and forecast",
    firesList: "Incidents",
    quakesList: "Last 7 days",
    warningsTitle: "Weather warnings",
    warningsIntro:
      "IPMA warnings for the next three days. Each warning appears once, with its times and places.",
    firesTitle: "Wildfires",
    firesIntro:
      "Incidents on the mainland and in Madeira, recorded by Civil Protection and published on Fogos.pt.",
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
    firesIntro: (d) => {
      const inPlace = d.en?.inName ?? `in ${enDistrictName(d)}`;
      return d.region === "continente"
        ? `Incidents recorded by Civil Protection (ANEPC) ${inPlace}, via Fogos.pt.`
        : d.region === "madeira"
          ? `Incidents recorded by regional civil protection ${inPlace}, via Fogos.pt.`
          : `Fogos.pt has no wildfire data ${inPlace}.`;
    },
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
    firesNotCovered: (inPlace) =>
      `Fogos.pt only has data for the mainland and Madeira; there is no wildfire information ${inPlace}. See`,
    firesRegional: "the Regional Civil Protection Service",
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
    windowPlaces: (n, first = "") =>
      n === 1 ? (first.startsWith("Azores") ? "in the " : "in ") : `${n} areas: `,
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
      `${when}, ${depth === null ? "depth not given" : `${depth} km deep`}${intensity ? `, intensity ${intensity}` : ""}.`,
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
    riskDay: "Wildfire risk day",
    show: "Show on the map",
    layers: {
      warnings: "Warnings",
      fires: "Wildfires",
      quakes: "Earthquakes",
      risk: "Wildfire risk",
      air: "Air quality",
      observed: "Weather now",
      sea: "Sea",
    },
    observedLegend:
      "Current temperature at the IPMA station closest to each district capital. Tap a station for the rest.",
    seaLegend: "Wave height today, IPMA coastal forecast. Tap a point for the next days.",
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
      observed: "See the weather across the country",
      sea: "See the sea across the country",
    },
    close: "Close details",
    noWarnings: "No weather warnings.",
    firesInProgress: (n) => ` ${plural(n, "wildfire", "wildfires")} active.`,
    airShort: (label) => ` Air quality: ${label.toLowerCase()}.`,
    seeAllAbout: (name) => `See everything about ${name}`,
    fireDetail: (nature, start, people, air) =>
      `${nature}. Started ${start}. ${people} firefighters, ${air} aircraft.`,
    quakeDetail: (when, depth) =>
      `${when}, ${depth === null ? "depth not given" : `${depth} km deep`}.`,
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
  home: {
    kicker: "National bulletin · live",
    scroll: "Scroll to travel the country",
    step: (i, n) => `${String(i).padStart(2, "0")} / ${String(n).padStart(2, "0")}`,
    cta: {
      avisos: "Open warnings",
      incendios: "Open wildfires",
      sismos: "Open earthquakes",
      risco: "Open wildfire risk",
      ar: "Open air quality",
    },
    legend: {
      avisos: "On the map, each district's colour and height repeat its warning level.",
      incendios: "Each column of light is an active wildfire: the taller, the more firefighters.",
      sismos: "Each ring is an earthquake felt in the last 7 days: the bigger, the stronger.",
      risco:
        "On the map, each mainland district takes the colour and height of today's highest wildfire risk in any of its municipalities; the islands are dimmed, as IPMA does not publish this risk for them.",
      ar: "Model estimate for each district capital (Copernicus CAMS).",
    },
    warnedNone: "No district under a warning.",
    firesNone: "No active wildfires.",
    quakesNone: "No notable earthquakes this week.",
    people: (n) => plural(n, "firefighter", "firefighters"),
    more: (n) => `and ${n} more`,
  },
  view3d: {
    group: "Map view",
    map: "Map",
    threeD: "3D",
    unavailable:
      "The 3D view needs WebGL, which this browser doesn't have. The map is still available.",
    lost: "The 3D view stopped working in this browser. We've gone back to the map.",
    depthLegend: (x) =>
      `Each earthquake sits at its depth, below the epicentre. Depth exaggerated ${x}×.`,
    depthMarks:
      "Bigger sphere, bigger magnitude; more transparent, older; ring, felt by the population.",
    depthMissing: "Earthquakes with no depth given stay at the surface, with a dashed outline.",
    outside: (n) =>
      `${plural(n, "earthquake outside this block is", "earthquakes outside this block are")} only in the list.`,
    seaLevel: "Sea level",
    km: (n) => `${n} km`,
    depthAria: (region, n, deepest) =>
      n === 0
        ? `3D view of earthquake depths, ${region}: no earthquakes in the last 7 days.`
        : `3D view of earthquake depths, ${region}: ${plural(n, "earthquake", "earthquakes")}${deepest === null ? "" : `; the deepest at ${deepest} km`}.`,
    keysHint: "Use the arrow keys to rotate and tilt the view, and + or − to zoom.",
    rotateLeft: "Rotate left",
    rotateRight: "Rotate right",
    tiltMore: "Tilt the view",
    tiltLess: "View from above",
    reset: "Reset view",
    reliefLegend: (x) => `Relief exaggerated ${x}×. Wildfires sit on the terrain.`,
    relief: "Relief",
    heightLegend:
      "Each municipality's height repeats its risk class (1 to 5), as does the colour. It is not relief.",
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
  meta: {
    homeTitle: "Portugal Agora: weather warnings, wildfires and earthquakes live",
    homeKicker: "Weather warnings, wildfires and earthquakes in Portugal, live",
    warningsTitle: "IPMA weather warnings in Portugal today",
    firesTitle: "Wildfires in Portugal today, live",
    quakesTitle: "Earthquakes in Portugal: last 7 days",
    riskTitle: "Wildfire risk and air quality in Portugal today",
    districtWarningsTitle: (inPlace) => `Weather warnings ${inPlace} today`,
    districtFiresTitle: (inPlace) => `Wildfires ${inPlace} today, live`,
    districtQuakesTitle: (inPlace) => `Earthquakes ${inPlace}: last 7 days`,
    districtRiskTitle: (inPlace) => `Wildfire risk, air and UV ${inPlace} today`,
    districtAirTitle: (inPlace) => `Air quality and UV ${inPlace} today`,
    sourcesTitle: "Sources and how we read the data",
    sourcesDescription:
      "Where Portugal Agora gets its data, how often it is updated and how it is classified.",
    privacyTitle: "Privacy",
    privacyDescription:
      "Portugal Agora collects no personal data: there are no accounts, ads or cookies, and your location never leaves your device.",
    aboutTitle: "About the project",
    aboutDescription:
      "A personal, non-profit, open-source project that brings IPMA warnings and earthquakes, Fogos.pt wildfires and air quality together in one place.",
    breadcrumbHome: "Portugal",
  },
};

function capitalizeEn(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const dictionaries: Record<Locale, Dictionary> = { pt, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
