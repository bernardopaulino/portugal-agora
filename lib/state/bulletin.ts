import { concelhoByDico } from "@/data/dico";
import { getDistrict } from "@/data/districts";
import { fireRiskLabels } from "@/lib/sources/ipma-rcm";
import { severityRank, type Severity, type WarningEvent } from "@/lib/sources/types";
import { formatNumber, formatRange } from "@/lib/time/format";

import type { CountryState } from "./aggregate";

/**
 * O "boletim": o estado do país reduzido ao que se lê num relance.
 * Funções puras, partilhadas pela página inicial e pelas dos distritos.
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

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function joinPt(items: string[]): string {
  return items.length <= 1
    ? (items[0] ?? "")
    : `${items.slice(0, -1).join(", ")} e ${items.at(-1)}`;
}

/** Tipos de aviso em minúsculas, sem repetições: "trovoada e precipitação". */
export function warningTypes(warnings: WarningEvent[]): string {
  return joinPt([...new Set(warnings.map((w) => w.type.toLowerCase()))]);
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

/** As quatro linhas do boletim nacional. */
export function nationalTopics(state: CountryState): Topic[] {
  const topics: Topic[] = [];

  const warnings = state.warnings.data;
  if (!warnings) {
    topics.push({
      id: "avisos",
      label: "Avisos",
      value: "Sem dados",
      detail: "IPMA indisponível",
      level: "unknown",
      unavailable: true,
    });
  } else {
    const warned = Object.values(state.districts)
      .filter((s) => s.level !== "none")
      .map((s) => getDistrict(s.slug))
      .filter((d) => d !== undefined);
    const mainland = warned.filter((d) => d.region === "continente").length;
    const islands = warned.filter((d) => d.region !== "continente").map((d) => d.name);
    topics.push({
      id: "avisos",
      label: "Avisos",
      value:
        warned.length === 0
          ? "Nenhum"
          : mainland > 0
            ? plural(mainland, "distrito", "distritos")
            : joinPt(islands),
      detail:
        warned.length === 0
          ? "em todo o país"
          : warningTypes(warnings) +
            (mainland > 0 && islands.length ? `; também ${joinPt(islands)}` : ""),
      level: state.level,
    });
  }

  const fires = state.fires.data;
  if (!fires) {
    topics.push({
      id: "incendios",
      label: "Incêndios",
      value: "Sem dados",
      detail: "consulte fogos.pt",
      level: "unknown",
      unavailable: true,
    });
  } else {
    const active = fires.filter((f) => f.active);
    const worst = active.reduce<Severity>(
      (m, f) => (severityRank[f.severity] > severityRank[m] ? f.severity : m),
      "none",
    );
    const places = [...new Set(active.map((f) => f.concelho ?? f.place.label))];
    topics.push({
      id: "incendios",
      label: "Incêndios",
      value: active.length === 0 ? "Nenhum" : `${active.length} em curso`,
      detail:
        active.length === 0
          ? "em curso"
          : places.length <= 2
            ? joinPt(places)
            : `${places.slice(0, 2).join(", ")} e mais ${places.length - 2}`,
      level: active.length === 0 ? "none" : worst === "none" ? "info" : worst,
    });
  }

  const quakes = state.earthquakes.data;
  if (quakes) {
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
      label: "Sismos em Portugal (7 dias)",
      value: notable.length === 0 ? "Nenhum" : plural(notable.length, "sismo", "sismos"),
      detail: strongest
        ? `${felt === 0 ? "nenhum sentido" : plural(felt, "sentido", "sentidos")}; o maior com magnitude ${formatNumber(strongest.magnitude)}`
        : "sentido ou em território português",
      level: felt === 0 ? "none" : "info",
    });
  } else {
    topics.push({
      id: "sismos",
      label: "Sismos em Portugal (7 dias)",
      value: "Sem dados",
      detail: "IPMA indisponível",
      level: "unknown",
      unavailable: true,
    });
  }

  const risk = state.fireRisk.data?.today.byDico;
  if (risk) {
    const values = Object.values(risk);
    const top = values.length ? Math.max(...values) : 0;
    const count = values.filter((v) => v === top).length;
    topics.push({
      id: "risco",
      label: "Risco de incêndio",
      value: top ? `Até ${fireRiskLabels[top]?.toLowerCase()}` : "Sem dados",
      detail: top ? `hoje, em ${plural(count, "concelho", "concelhos")}` : undefined,
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

const levelWord: Record<Severity, string> = {
  none: "verde",
  yellow: "amarelo",
  orange: "laranja",
  red: "vermelho",
};

/** A legenda que aparece quando se aponta para um distrito no mapa. */
export function districtCaption(state: CountryState, slug: string): DistrictCaption | null {
  const district = getDistrict(slug);
  if (!district) return null;
  const status = state.districts[slug];
  const level = state.levelKnown ? (status?.level ?? "none") : "unknown";
  const own = (state.warnings.data ?? []).filter(
    (w) => w.place.district === slug && w.severity === level,
  );
  const line =
    level === "unknown"
      ? "Sem dados de avisos do IPMA"
      : level === "none"
        ? "Sem avisos meteorológicos"
        : `Aviso ${levelWord[level]} de ${warningTypes(own)}`;
  return {
    slug,
    name: district.name,
    level,
    line,
    activeFires: status?.activeFires ?? 0,
  };
}

/** As linhas do boletim de um distrito ou região. */
export function districtTopics(state: CountryState, slug: string): Topic[] {
  const topics: Topic[] = [];

  const warnings = state.warnings.data;
  const own = (warnings ?? []).filter((w) => w.place.district === slug && w.severity !== "none");
  const groups = groupWarnings(own).length;
  topics.push(
    warnings
      ? {
          id: "avisos",
          label: "Avisos",
          value: groups === 0 ? "Nenhum" : plural(groups, "aviso", "avisos"),
          detail: groups === 0 ? "nos próximos três dias" : warningTypes(own),
          level: state.districts[slug]?.level ?? "none",
        }
      : {
          id: "avisos",
          label: "Avisos",
          value: "Sem dados",
          detail: "IPMA indisponível",
          level: "unknown",
          unavailable: true,
        },
  );

  const fires = state.fires.data;
  if (fires) {
    const active = fires.filter((f) => f.active && f.place.district === slug);
    const worst = active.reduce<Severity>(
      (m, f) => (severityRank[f.severity] > severityRank[m] ? f.severity : m),
      "none",
    );
    const places = [...new Set(active.map((f) => f.concelho ?? f.place.label))];
    topics.push({
      id: "incendios",
      label: "Incêndios",
      value: active.length === 0 ? "Nenhum" : `${active.length} em curso`,
      detail: active.length === 0 ? "em curso" : joinPt(places.slice(0, 3)),
      level: active.length === 0 ? "none" : worst === "none" ? "info" : worst,
    });
  } else {
    topics.push({
      id: "incendios",
      label: "Incêndios",
      value: "Sem dados",
      detail: "consulte fogos.pt",
      level: "unknown",
      unavailable: true,
    });
  }

  const quakes = state.earthquakes.data;
  if (quakes) {
    // Os mesmos sismos que a lista e o índice da página do distrito.
    const own = quakes.filter((q) => q.place.district === slug);
    const felt = own.filter((q) => q.felt).length;
    topics.push({
      id: "sismos",
      label: "Sismos (7 dias)",
      value: own.length === 0 ? "Nenhum" : plural(own.length, "sismo", "sismos"),
      detail:
        own.length === 0
          ? "de magnitude 2 ou superior"
          : `${felt === 0 ? "nenhum sentido" : plural(felt, "sentido", "sentidos")}; o maior com magnitude ${formatNumber(Math.max(...own.map((q) => q.magnitude)))}`,
      level: felt === 0 ? "none" : "info",
    });
  }

  const byDico = state.fireRisk.data?.today.byDico;
  if (byDico) {
    const values = Object.entries(byDico)
      .filter(([dico]) => concelhoByDico(dico)?.district === slug)
      .map(([, v]) => v);
    if (values.length > 0) {
      const top = Math.max(...values);
      const count = values.filter((v) => v === top).length;
      topics.push({
        id: "risco",
        label: "Risco de incêndio hoje",
        value: `Até ${fireRiskLabels[top]?.toLowerCase()}`,
        detail: `em ${plural(count, "concelho", "concelhos")}`,
        level: riskLevel(top),
      });
    }
  }

  const air = state.airQuality.data?.find((a) => a.district === slug);
  const uv = state.uv.data?.find((u) => u.district === slug);
  if (air || uv) {
    topics.push({
      id: "ar",
      label: "Ar e raios UV",
      value: air ? `Ar ${air.label.toLowerCase()}` : `UV ${formatNumber(uv!.index, 0)}`,
      detail: air && uv ? `UV ${formatNumber(uv.index, 0)}, ${uv.label.toLowerCase()}` : undefined,
      level: air ? air.severity : "info",
    });
  }

  return topics;
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
 * quando e onde. "Trovoada até às 22:00 de hoje em 15 distritos; amanhã,
 * das 13:00 às 22:00, em 6."
 */
export function nationalCaption(state: CountryState, now: Date): string {
  if (!state.levelKnown) return "Sem dados de avisos do IPMA. Consulte ipma.pt.";
  const groups = groupWarnings((state.warnings.data ?? []).filter((w) => w.severity !== "none"));
  const top = groups[0];
  if (!top) {
    const fires = (state.fires.data ?? []).filter((f) => f.active).length;
    return fires > 0
      ? `Sem avisos meteorológicos; ${plural(fires, "incêndio em curso", "incêndios em curso")}.`
      : "Sem avisos meteorológicos nem incêndios em curso.";
  }
  const parts: string[] = [];
  const seen = new Map<string, number>();
  for (const w of top.windows) {
    const label = formatRange(w.startsAt, w.endsAt, now, "continente");
    seen.set(label, (seen.get(label) ?? 0) + new Set(w.items.map((i) => i.area)).size);
  }
  [...seen.entries()].forEach(([label, n], i) =>
    parts.push(i === 0 ? `${label} em ${plural(n, "local", "locais")}` : `${label}, em ${n}`),
  );
  const others = groups.length - 1;
  return (
    `${top.type}: ${parts.join("; ")}.` +
    (others > 0 ? ` Mais ${plural(others, "aviso diferente", "avisos diferentes")} abaixo.` : "")
  );
}
