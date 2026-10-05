import { concelhoByDico } from "@/data/dico";
import { getDistrict, type District } from "@/data/districts";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { fireRiskLabels } from "@/lib/sources/ipma-rcm";
import { severityRank, type Severity, type WarningEvent } from "@/lib/sources/types";
import { formatNumber, formatRange } from "@/lib/time/format";

import type { CountryState, DistrictStatus } from "./aggregate";

/**
 * O "boletim": o estado do país reduzido ao que se lê num relance.
 * Funções puras, partilhadas pela página inicial, pelas páginas de cada
 * tema e pelas dos distritos. O texto vem do dicionário do idioma.
 */

export interface WarningWindow {
  startsAt: string;
  endsAt: string;
  /** Avisos desta janela (um por área), por ordem alfabética do local. */
  items: WarningEvent[];
}

export interface WarningGroup {
  key: string;
  severity: Severity;
  type: string;
  description?: string;
  /** Janelas de tempo, por ordem de início. */
  windows: WarningWindow[];
  /** Todos os avisos do grupo. */
  items: WarningEvent[];
}

/**
 * Agrupa avisos com o mesmo tipo, nível e texto. O IPMA emite o mesmo
 * aviso para muitos distritos e para vários dias; mostramos o texto uma
 * vez, com cada janela de tempo e os seus locais.
 */
export function groupWarnings(warnings: WarningEvent[]): WarningGroup[] {
  const groups = new Map<string, WarningGroup>();
  for (const w of warnings) {
    const key = [w.type, w.severity, w.description ?? ""].join("|");
    const group = groups.get(key) ?? {
      key,
      severity: w.severity,
      type: w.type,
      description: w.description,
      windows: [],
      items: [],
    };
    group.items.push(w);
    const window = group.windows.find((x) => x.startsAt === w.startsAt && x.endsAt === w.endsAt);
    if (window) window.items.push(w);
    else group.windows.push({ startsAt: w.startsAt, endsAt: w.endsAt, items: [w] });
    groups.set(key, group);
  }
  for (const g of groups.values()) {
    g.windows.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    for (const x of g.windows)
      x.items.sort((a, b) => a.place.label.localeCompare(b.place.label, "pt"));
  }
  return [...groups.values()].sort(
    (a, b) =>
      severityRank[b.severity] - severityRank[a.severity] ||
      a.windows[0]!.startsAt.localeCompare(b.windows[0]!.startsAt) ||
      b.items.length - a.items.length,
  );
}

/** Tipos de aviso em minúsculas, sem repetições: "trovoada e precipitação". */
export function warningTypes(warnings: WarningEvent[], t: Dictionary): string {
  return t.join([...new Set(warnings.map((w) => t.term(w.type.toLowerCase())))]);
}

/** "no Porto e em Viana do Castelo", "em 9 distritos e nos Açores". */
export function placesPhrase(slugs: string[], t: Dictionary): string {
  const items = slugs.map((s) => getDistrict(s)).filter((d) => d !== undefined);
  if (items.length <= 2) return t.join(items.map((d) => t.inPlace(d)));
  const mainland = items.filter((d) => d.region === "continente");
  const islands = items.filter((d) => d.region !== "continente");
  const parts: string[] = [];
  if (mainland.length === 1) parts.push(t.inPlace(mainland[0]!));
  else if (mainland.length > 1) parts.push(t.headline.inDistricts(mainland.length));
  parts.push(...islands.map((d) => t.inPlace(d)));
  return t.join(parts);
}

/** O título do país: "Aviso laranja em Beja. Aviso amarelo em 13 distritos." */
export function countryHeadline(
  levelKnown: boolean,
  statuses: Record<string, DistrictStatus>,
  t: Dictionary,
): string {
  if (!levelKnown) return t.headline.noData;
  const byLevel = (["red", "orange", "yellow"] as const)
    .map((level) => ({
      level,
      slugs: Object.values(statuses)
        .filter((s) => s.level === level)
        .map((s) => s.slug),
    }))
    .filter((g) => g.slugs.length > 0);
  if (byLevel.length === 0) return t.headline.calm;
  return byLevel.map((g) => t.headline.level(g.level, placesPhrase(g.slugs, t))).join(" ");
}

/** "Aviso laranja de vento em Lisboa. Aviso amarelo de precipitação." */
export function districtHeadline(
  district: District,
  warnings: WarningEvent[],
  known: boolean,
  t: Dictionary,
): string {
  if (!known) return t.headline.districtNoData(t.districtName(district));
  const own = warnings.filter((w) => w.place.district === district.slug);
  if (own.length === 0) return t.headline.districtCalm(t.inPlace(district));
  return (["red", "orange", "yellow"] as const)
    .map((level) => {
      const types = own.filter((w) => w.severity === level);
      return types.length ? { level, types: warningTypes(types, t) } : null;
    })
    .filter((x) => x !== null)
    .map((g, i) => t.headline.districtLevel(g.level, g.types, i === 0 ? t.inPlace(district) : ""))
    .join(" ");
}

export type TopicId = "avisos" | "incendios" | "sismos" | "risco" | "ar";

export interface Topic {
  id: TopicId;
  label: string;
  /** O valor em destaque: "15 distritos", "1 em curso", "Nenhum". */
  value: string;
  /** Complemento curto: tipos de aviso, local do incêndio… */
  detail?: string;
  /** Nível para a marca de cor; "info" quando não é um aviso. */
  level: Severity | "unknown" | "info";
  /** Fonte indisponível: o valor não é um "tudo bem". */
  unavailable?: boolean;
}

function unavailable(id: TopicId, label: string, detail: string, t: Dictionary): Topic {
  return { id, label, value: t.topics.noData, detail, level: "unknown", unavailable: true };
}

function worstFire(active: { severity: Severity }[]): Severity | "info" | "none" {
  if (active.length === 0) return "none";
  const worst = active.reduce<Severity>(
    (m, f) => (severityRank[f.severity] > severityRank[m] ? f.severity : m),
    "none",
  );
  return worst === "none" ? "info" : worst;
}

/** As quatro linhas do boletim nacional. */
export function nationalTopics(state: CountryState, t: Dictionary): Topic[] {
  const topics: Topic[] = [];
  const T = t.topics;

  const warnings = state.warnings.data;
  if (!warnings) topics.push(unavailable("avisos", T.warnings, T.ipmaDown, t));
  else {
    const warned = Object.values(state.districts)
      .filter((s) => s.level !== "none")
      .map((s) => getDistrict(s.slug))
      .filter((d) => d !== undefined);
    const mainland = warned.filter((d) => d.region === "continente").length;
    const islands = warned.filter((d) => d.region !== "continente").map((d) => t.districtName(d));
    topics.push({
      id: "avisos",
      label: T.warnings,
      value: warned.length === 0 ? T.none : mainland > 0 ? T.districts(mainland) : t.join(islands),
      detail:
        warned.length === 0
          ? T.wholeCountry
          : warningTypes(warnings, t) +
            (mainland > 0 && islands.length ? T.alsoIn(t.join(islands)) : ""),
      level: state.level,
    });
  }

  const fires = state.fires.data;
  if (!fires) topics.push(unavailable("incendios", T.fires, T.fogosDown, t));
  else {
    const active = fires.filter((f) => f.active);
    const places = [...new Set(active.map((f) => f.concelho ?? f.place.label))];
    topics.push({
      id: "incendios",
      label: T.fires,
      value: active.length === 0 ? T.none : T.inProgress(active.length),
      detail:
        active.length === 0
          ? T.inProgressDetail
          : places.length <= 2
            ? t.join(places)
            : T.andMore(places.slice(0, 2).join(", "), places.length - 2),
      level: worstFire(active),
    });
  }

  const quakes = state.earthquakes.data;
  if (!quakes) topics.push(unavailable("sismos", T.quakesNational, T.ipmaDown, t));
  else {
    // Os mesmos sismos que a lista mostra por omissão e que o índice conta:
    // sentidos ou em território português (os dados do IPMA cobrem 7 dias).
    const notable = quakes.filter(isNotableQuake);
    const felt = notable.filter((q) => q.felt).length;
    const strongest = notable.reduce<(typeof notable)[number] | undefined>(
      (a, b) => (!a || b.magnitude > a.magnitude ? b : a),
      undefined,
    );
    topics.push({
      id: "sismos",
      label: T.quakesNational,
      value: notable.length === 0 ? T.none : T.quakes(notable.length),
      detail: strongest
        ? T.quakeDetail(felt, formatNumber(strongest.magnitude, 1, t.locale))
        : T.quakeNoneNational,
      level: felt === 0 ? "none" : "info",
    });
  }

  const risk = state.fireRisk.data?.today.byDico;
  if (risk) {
    const values = Object.values(risk);
    const top = values.length ? Math.max(...values) : 0;
    topics.push({
      id: "risco",
      label: T.riskToday,
      ...(top ? riskSummary(values, t, "country") : { value: T.noData }),
      level: riskLevel(top),
    });
  }

  return topics;
}

export interface DistrictCaption {
  slug: string;
  name: string;
  level: Severity | "unknown";
  /** "Aviso laranja de tempo quente e trovoada" ou "Sem avisos". */
  line: string;
  activeFires: number;
}

/** A legenda que aparece quando se aponta para um distrito no mapa. */
export function districtCaption(
  state: CountryState,
  slug: string,
  t: Dictionary,
): DistrictCaption | null {
  const district = getDistrict(slug);
  if (!district) return null;
  const status = state.districts[slug];
  const level = state.levelKnown ? (status?.level ?? "none") : "unknown";
  const own = (state.warnings.data ?? []).filter(
    (w) => w.place.district === slug && w.severity === level,
  );
  const line =
    level === "unknown"
      ? t.caption.noWarningData
      : level === "none"
        ? t.caption.calm
        : t.caption.level(level, warningTypes(own, t));
  return {
    slug,
    name: t.districtName(district),
    level,
    line,
    activeFires: status?.activeFires ?? 0,
  };
}

/** As linhas do boletim de um distrito ou região. */
export function districtTopics(state: CountryState, slug: string, t: Dictionary): Topic[] {
  const topics: Topic[] = [];
  const T = t.topics;

  const warnings = state.warnings.data;
  const own = (warnings ?? []).filter((w) => w.place.district === slug && w.severity !== "none");
  const groups = groupWarnings(own).length;
  topics.push(
    warnings
      ? {
          id: "avisos",
          label: T.warnings,
          value: groups === 0 ? T.none : T.warningsCount(groups),
          detail: groups === 0 ? T.nextDays : warningTypes(own, t),
          level: state.districts[slug]?.level ?? "none",
        }
      : unavailable("avisos", T.warnings, T.ipmaDown, t),
  );

  const fires = state.fires.data;
  if (fires) {
    const active = fires.filter((f) => f.active && f.place.district === slug);
    const places = [...new Set(active.map((f) => f.concelho ?? f.place.label))];
    topics.push({
      id: "incendios",
      label: T.fires,
      value: active.length === 0 ? T.none : T.inProgress(active.length),
      detail: active.length === 0 ? T.inProgressDetail : t.join(places.slice(0, 3)),
      level: worstFire(active),
    });
  } else topics.push(unavailable("incendios", T.fires, T.fogosDown, t));

  const quakes = state.earthquakes.data;
  if (quakes) {
    // Os mesmos sismos que a lista e o índice da página do distrito.
    const ownQuakes = quakes.filter((q) => q.place.district === slug);
    const felt = ownQuakes.filter((q) => q.felt).length;
    topics.push({
      id: "sismos",
      label: T.quakesDistrict,
      value: ownQuakes.length === 0 ? T.none : T.quakes(ownQuakes.length),
      detail:
        ownQuakes.length === 0
          ? T.quakeNoneDistrict
          : T.quakeDetail(
              felt,
              formatNumber(Math.max(...ownQuakes.map((q) => q.magnitude)), 1, t.locale),
            ),
      level: felt === 0 ? "none" : "info",
    });
  }

  const byDico = state.fireRisk.data?.today.byDico;
  if (byDico) {
    const values = Object.entries(byDico)
      .filter(([dico]) => concelhoByDico(dico)?.district === slug)
      .map(([, v]) => v);
    if (values.length > 0) {
      topics.push({
        id: "risco",
        label: T.riskTodayDistrict,
        ...riskSummary(values, t, "district"),
        level: riskLevel(Math.max(...values)),
      });
    }
  }

  const air = state.airQuality.data?.find((a) => a.district === slug);
  const uv = state.uv.data?.find((u) => u.district === slug);
  if (air || uv) {
    const uvIndex = uv ? formatNumber(uv.index, 0, t.locale) : "";
    topics.push({
      id: "ar",
      label: T.air,
      value: air ? T.airValue(t.term(air.label)) : T.uv(uvIndex),
      detail: air && uv ? T.uv(uvIndex, t.term(uv.label)) : undefined,
      level: air ? air.severity : "info",
    });
  }

  return topics;
}

/**
 * A linha do risco de incêndio. Com níveis diferentes, o mais alto e em
 * quantos concelhos: "Até elevado, em 3 concelhos". Com todos iguais,
 * "Reduzido em todos os 16 concelhos" ("Até reduzido" lia-se mal).
 */
export function riskSummary(
  values: number[],
  t: Dictionary,
  scope: "country" | "district",
): { value: string; detail: string } {
  const T = t.topics;
  const top = Math.max(...values);
  const label = t.term(fireRiskLabels[top] ?? "");
  if (values.every((v) => v === top)) {
    const n = values.length;
    return {
      value: label,
      detail: scope === "country" ? T.riskEverywhere(n) : T.riskEverywhereDistrict(n),
    };
  }
  const count = values.filter((v) => v === top).length;
  return {
    value: T.riskUpTo(label),
    detail: scope === "country" ? T.riskWhere(count) : T.riskWhereDistrict(count),
  };
}

/**
 * Risco de incêndio (1 a 5) → nível da escala comum, com as mesmas cores
 * da tabela e da barra: reduzido verde, moderado amarelo, elevado e muito
 * elevado laranja, máximo vermelho.
 */
export function riskLevel(value: number): Severity {
  if (value >= 5) return "red";
  if (value >= 3) return "orange";
  if (value === 2) return "yellow";
  return "none";
}

/** Sismos que interessam por omissão: sentidos ou em território português. */
export function isNotableQuake(q: { felt: boolean; place: { district?: string } }): boolean {
  return q.felt || q.place.district !== undefined;
}

/**
 * A frase do "apresentador" para a barra do rodapé: o aviso mais grave,
 * quando e onde. "Trovoada: em vigor até às 22:00 de hoje em 15 locais;
 * amanhã, das 13:00 às 22:00, em 6."
 */
export function nationalCaption(state: CountryState, now: Date, t: Dictionary): string {
  const C = t.caption;
  if (!state.levelKnown) return C.nationalNoData;
  const groups = groupWarnings((state.warnings.data ?? []).filter((w) => w.severity !== "none"));
  const top = groups[0];
  if (!top) {
    const fires = (state.fires.data ?? []).filter((f) => f.active).length;
    return fires > 0 ? C.nationalCalmFires(fires) : C.nationalCalm;
  }
  const seen = new Map<string, number>();
  for (const w of top.windows) {
    const label = formatRange(w.startsAt, w.endsAt, now, "continente", t.locale);
    seen.set(label, (seen.get(label) ?? 0) + new Set(w.items.map((i) => i.area)).size);
  }
  const parts = [...seen.entries()].map(([label, n], i) =>
    i === 0 ? C.firstWindow(label, n) : C.nextWindow(label, n),
  );
  const type = t.term(top.type);
  const others = groups.length - 1;
  return (
    `${type.charAt(0).toUpperCase()}${type.slice(1)}: ${parts.join("; ")}.` +
    (others > 0 ? C.others(others) : "")
  );
}
