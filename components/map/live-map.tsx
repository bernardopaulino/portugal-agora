"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import {
  Map as MapLibreMap,
  NavigationControl,
  type AddLayerObject,
  type GeoJSONSource,
  type MapMouseEvent,
  setWorkerUrl,
} from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";

import { getDistrict, regionBounds, type Region } from "@/data/districts";
import { useI18n } from "@/lib/i18n/client";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { MAP_3D_PITCH, quakeRadiusPx, RELIEF_EXAGGERATION, riskHeight } from "@/lib/geo/scales";
import { useWeather } from "@/lib/hooks/weather";
import { cameraDuration } from "@/lib/hooks/webgl";
import type { CountryState } from "@/lib/state/aggregate";
import { formatNumber } from "@/lib/time/format";

import { riskColors } from "../cards/fire-risk";
import { isSameSelection, type OnSelect, type Selection } from "../cards/types";
import { useResolvedTheme } from "@/lib/hooks/external";
import { mapColors } from "../status/severity";
import type { LayerId, RiskDay } from "./layers";
import { RELIEF_TILES, registerReliefProtocol } from "./relief";

type Feature = GeoJSON.Feature<GeoJSON.Geometry, Record<string, unknown>>;
type Collection = GeoJSON.FeatureCollection<GeoJSON.Geometry, Record<string, unknown>>;

// O worker do MapLibre v6 é servido a partir de public/maplibre/ (ver scripts/copy-maplibre-worker.mjs).
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

const STYLE = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
};

/** Textos dos controlos do MapLibre no idioma da página. */
function mapLocale(t: Dictionary) {
  return {
    "NavigationControl.ZoomIn": t.map.zoomIn,
    "NavigationControl.ZoomOut": t.map.zoomOut,
    "NavigationControl.ResetBearing": t.map.resetBearing,
    "AttributionControl.ToggleAttribution": t.map.attribution,
    "CooperativeGesturesHandler.WindowsHelpText": t.map.ctrlScroll,
    "CooperativeGesturesHandler.MacHelpText": t.map.cmdScroll,
    "CooperativeGesturesHandler.MobileHelpText": t.map.twoFingers,
  };
}

// O estilo do OpenFreeMap já credita OpenFreeMap, OpenMapTiles e OpenStreetMap.
const attribution = (t: Dictionary) =>
  `${t.map.boundaries} © <a href="https://www.dgterritorio.gov.pt" target="_blank" rel="noopener">DGT</a> (CAOP 2025)`;

const FIT_PADDING = { top: 24, right: 24, bottom: 44, left: 24 };

/**
 * Relevo da vista 3D dos incêndios: Mapterhorn (terrarium, sem chave), com
 * dados da DGT no continente, do IGP na Madeira e Copernicus GLO-30 no resto.
 * Só é pedido quando a pessoa escolhe 3D (ver relief.ts e a CSP em next.config.ts).
 */
registerReliefProtocol();

const reliefSource = (t: Dictionary) => ({
  type: "raster-dem" as const,
  tiles: [RELIEF_TILES],
  tileSize: 512,
  encoding: "terrarium" as const,
  maxzoom: 12,
  attribution: `${t.view3d.relief} <a href="https://mapterhorn.com/attribution" target="_blank" rel="noopener">© Mapterhorn</a>`,
});

/** A primeira entrada na vista 3D: duração e rotação final (graus). */
const ENTRY_MS = 1800;
const ENTRY_BEARING = -12;
const cubicInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

/**
 * Faz subir a extrusão do risco (de 0 à altura da classe). O MapLibre não
 * anima propriedades que dependem dos dados, por isso o fator muda a cada
 * fotograma, só durante a subida.
 */
function growExtrusion(map: MapLibreMap, duration: number, delay = 0) {
  const set = (f: number) => {
    if (map.getLayer("risk-extrusion"))
      map.setPaintProperty("risk-extrusion", "fill-extrusion-height", ["*", ["get", "height"], f]);
  };
  if (duration <= 0) return set(1);
  set(0);
  const start = performance.now() + delay;
  const step = (now: number) => {
    const k = Math.min(1, Math.max(0, (now - start) / duration));
    set(1 - Math.pow(1 - k, 3));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Os estilos do OpenFreeMap mostram nomes em inglês; preferimos o nome em português. */
function applyPortugueseLabels(map: MapLibreMap) {
  for (const layer of map.getStyle().layers) {
    if (layer.type !== "symbol") continue;
    const field = map.getLayoutProperty(layer.id, "text-field");
    if (field && JSON.stringify(field).includes("name_en")) {
      map.setLayoutProperty(layer.id, "text-field", [
        "coalesce",
        ["get", "name:pt"],
        ["get", "name"],
      ]);
    }
  }
}

const layerIds: Record<LayerId, string[]> = {
  warnings: ["warnings-fill", "warnings-line"],
  risk: ["risk-fill", "risk-line", "risk-extrusion"],
  air: ["air-circle"],
  quakes: ["quakes-circle"],
  fires: ["fires-halo", "fires-circle"],
  observed: ["observed-circle", "observed-label"],
  sea: ["sea-circle", "sea-label"],
};

function collection(features: Feature[]): Collection {
  return { type: "FeatureCollection", features };
}

function bboxOf(features: Feature[]): [[number, number], [number, number]] | null {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  const visit = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === "number") {
      const [x, y] = c as [number, number];
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    } else if (Array.isArray(c)) c.forEach(visit);
  };
  features.forEach((f) => visit((f.geometry as { coordinates: unknown }).coordinates));
  return Number.isFinite(minX)
    ? [
        [minX, minY],
        [maxX, maxY],
      ]
    : null;
}

export default function LiveMap({
  state,
  layer,
  riskDay = "today",
  selection,
  onSelect,
  onClear,
  focus,
  region,
  view3d = false,
  onWebglLost,
}: {
  state: CountryState;
  layer: LayerId;
  /** Na camada de risco: hoje ou amanhã. */
  riskDay?: RiskDay;
  selection: Selection | null;
  onSelect: OnSelect;
  /** Tira a seleção (segundo toque no mesmo distrito ou evento). */
  onClear: () => void;
  /**
   * Slug do distrito da página (páginas de distrito): o mapa abre
   * enquadrado nele, só mostra o que é dele e esbate o resto do país.
   */
  focus?: string;
  region: Region;
  /**
   * Vista 3D: relevo nos incêndios, risco de incêndio em altura. A câmara
   * inclina e a rotação (com o compasso) só fica ligada nesta vista.
   */
  view3d?: boolean;
  /** O contexto WebGL perdeu-se: a vista 3D deixa de estar disponível. */
  onWebglLost?: () => void;
}) {
  const { t, locale } = useI18n();
  // Tempo e mar só são pedidos quando a camada aparece.
  const weather = useWeather(layer === "observed" || layer === "sea");
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onSelectRef = useRef(onSelect);
  const [styleVersion, setStyleVersion] = useState(0);
  // Falso entre um setStyle() e o "style.load" seguinte: nesse intervalo o
  // estilo não está pronto (getStyle() devolve undefined, addLayer falha).
  const styleReady = useRef(false);
  const [districtGeo, setDistrictGeo] = useState<Collection | null>(null);
  const [concelhoGeo, setConcelhoGeo] = useState<Collection | null>(null);
  // Enquadramento atual (região ou distrito) e se a pessoa já mexeu no mapa:
  // enquanto não mexer, o mapa volta a enquadrar quando muda de tamanho.
  const fitTarget = useRef<((duration: number) => void) | null>(null);
  const userMoved = useRef(false);
  // Para o clique (registado uma vez) saber o que está selecionado agora.
  const selectionRef = useRef(selection);
  const onClearRef = useRef(onClear);
  // Havia uma seleção? Quando sai, o mapa volta ao enquadramento inicial.
  const hadSelection = useRef(false);
  const theme = useResolvedTheme();
  const colors = mapColors[theme];
  // Os reenquadramentos (fitBounds) mantêm a inclinação e a orientação da vista atual.
  const tilt = (map: MapLibreMap) => ({ pitch: map.getPitch(), bearing: map.getBearing() });
  const navRef = useRef<NavigationControl | null>(null);
  const onWebglLostRef = useRef(onWebglLost);
  const removed = useRef(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
    onClearRef.current = onClear;
    selectionRef.current = selection;
    onWebglLostRef.current = onWebglLost;
  }, [onSelect, onClear, selection, onWebglLost]);

  // Limites dos distritos (sempre) e dos concelhos (só na camada de risco).
  useEffect(() => {
    fetch("/geo/distritos.json")
      .then((r) => r.json())
      .then(setDistrictGeo)
      .catch(() => {});
  }, []);
  useEffect(() => {
    // Os concelhos: na camada do risco e nas páginas de distrito (contornos por dentro).
    if ((layer === "risk" || focus) && !concelhoGeo) {
      fetch("/geo/concelhos.json")
        .then((r) => r.json())
        .then(setConcelhoGeo)
        .catch(() => {});
    }
  }, [layer, concelhoGeo, focus]);

  // Criar o mapa uma vez.
  useEffect(() => {
    if (!container.current) return;
    const focusFeatureBounds = focus ? getDistrict(focus) : undefined;
    const map = new MapLibreMap({
      container: container.current,
      style: STYLE[document.documentElement.dataset.theme === "dark" ? "dark" : "light"],
      bounds: regionBounds[focusFeatureBounds?.region ?? region],
      fitBoundsOptions: { padding: FIT_PADDING },
      attributionControl: { compact: true, customAttribution: attribution(t) },
      cooperativeGestures: true,
      locale: mapLocale(t),
      dragRotate: false,
      pitchWithRotate: false,
      maxZoom: 13,
    });
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();
    navRef.current = new NavigationControl({ showCompass: false });
    map.addControl(navRef.current, "top-right");
    // Ao remover o mapa, o MapLibre liberta o contexto; isso não é uma falha.
    removed.current = false;
    map.on("webglcontextlost", () => {
      if (!removed.current) onWebglLostRef.current?.();
    });
    // O estilo do OpenFreeMap refere ícones que não estão no seu sprite
    // (ex.: "circle-11"); em vez de um aviso na consola, fica um ícone vazio.
    map.setMissingStyleImageResolver((id) => {
      if (!map.hasImage(id)) map.addImage(id, { width: 1, height: 1, data: new Uint8Array(4) });
    });
    map.on("style.load", () => {
      // Camadas de escudos de estrada do estilo com filtros inválidos: nunca
      // desenham nada e só enchem a consola de avisos.
      for (const id of ["highway-shield-non-us", "highway-shield-us-interstate", "road_shield_us"])
        if (map.getLayer(id)) map.removeLayer(id);
      styleReady.current = true;
      applyPortugueseLabels(map);
      setStyleVersion((v) => v + 1);
    });
    // Créditos fechados por defeito (continuam acessíveis no botão "i").
    map.once("load", () => {
      const attrib = container.current?.querySelector(".maplibregl-ctrl-attrib");
      attrib?.classList.remove("maplibregl-compact-show");
      attrib?.removeAttribute("open");
    });

    const clickable = [
      "fires-circle",
      "quakes-circle",
      "air-circle",
      "observed-circle",
      "observed-label",
      "sea-circle",
      "sea-label",
      "warnings-fill",
      "risk-fill",
      "risk-extrusion",
      "concelho-fill",
    ];
    for (const id of clickable) {
      map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", id, () => (map.getCanvas().style.cursor = ""));
    }
    map.on("click", (e: MapMouseEvent) => {
      const hit = map.queryRenderedFeatures(e.point, {
        layers: clickable.filter((id) => map.getLayer(id)),
      })[0];
      if (!hit) return;
      const p = hit.properties as Record<string, string>;
      let next: Selection | null = null;
      if (p.eventId && hit.geometry.type === "Point") {
        const [lon, lat] = hit.geometry.coordinates as [number, number];
        next = {
          type: "event",
          id: p.eventId,
          coordinates: [lon, lat],
          region: (p.region as Region) ?? "continente",
        };
      } else if (p.dico && p.district) {
        // Camada do risco: cada concelho.
        next = { type: "concelho", dico: p.dico, district: p.district };
      } else if (p.slug || p.district) {
        next = { type: "district", slug: p.slug || p.district! };
      }
      if (!next) return;
      // Segundo toque no que já está selecionado: tira a seleção (e o mapa afasta).
      if (isSameSelection(selectionRef.current, next)) onClearRef.current();
      else onSelectRef.current(next);
    });

    // O primeiro enquadramento pode acontecer antes de o contentor ter a
    // largura final (em ecrãs largos, Portugal ficava encostado à esquerda).
    // A cada mudança de tamanho, o mapa ajusta-se e volta a enquadrar, até a
    // pessoa arrastar ou ampliar (só esses movimentos trazem originalEvent).
    const initialBounds = regionBounds[focusFeatureBounds?.region ?? region];
    fitTarget.current = (duration) =>
      map.fitBounds(initialBounds, { padding: FIT_PADDING, duration, ...tilt(map) });
    map.on("movestart", (e) => {
      if ((e as { originalEvent?: Event }).originalEvent) userMoved.current = true;
    });
    const observer = new ResizeObserver(() => {
      map.resize();
      if (!userMoved.current) fitTarget.current?.(0);
    });
    observer.observe(container.current);

    mapRef.current = map;
    return () => {
      observer.disconnect();
      removed.current = true;
      map.remove();
      mapRef.current = null;
    };
    // O mapa é criado uma única vez; foco e região iniciais só contam na criação.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mudar o estilo base quando o tema muda.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || styleVersion === 0) return;
    styleReady.current = false;
    map.setStyle(STYLE[theme]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  // Dados derivados do estado. Numa página de distrito, só o que é do
  // distrito, para o mapa mostrar o mesmo que a lista.
  const data = useMemo(() => {
    const inFocus = (district: unknown) => !focus || district === focus;
    const levelBy = Object.fromEntries(
      Object.values(state.districts).map((d) => [d.slug, d.level]),
    );
    const districtsFc = districtGeo
      ? collection(
          districtGeo.features.map((f) => ({
            ...f,
            properties: {
              ...f.properties,
              level: state.levelKnown
                ? (levelBy[f.properties.slug as string] ?? "none")
                : "unknown",
            },
          })),
        )
      : collection([]);

    const risk = state.fireRisk.data?.[riskDay].byDico ?? {};
    const concelhosFc = concelhoGeo
      ? collection(
          concelhoGeo.features
            .filter((f) => inFocus(f.properties.district))
            .map((f) => ({
              ...f,
              properties: {
                ...f.properties,
                risk: risk[f.properties.dico as string] ?? 0,
                height: riskHeight(risk[f.properties.dico as string] ?? 0),
              },
            })),
        )
      : collection([]);

    const point = (
      id: string,
      coords: [number, number],
      props: Record<string, unknown>,
    ): Feature => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: coords },
      properties: { eventId: id, ...props },
    });

    const fires = collection(
      (state.fires.data ?? [])
        .filter((f) => f.coordinates && inFocus(f.place.district))
        .map((f) =>
          point(f.id, f.coordinates!, {
            level: f.severity,
            active: f.active,
            region: f.place.region,
            size: Math.min(6 + Math.sqrt(f.operatives) * 1.6, 22),
          }),
        ),
    );
    const quakes = collection(
      (state.earthquakes.data ?? [])
        .filter((q) => q.coordinates && inFocus(q.place.district))
        .map((q) =>
          point(q.id, q.coordinates!, {
            level: q.severity,
            region: q.place.region,
            size: quakeRadiusPx(q.magnitude),
            age: Date.parse(state.generatedAt) - Date.parse(q.occurredAt),
          }),
        ),
    );
    const air = collection(
      (state.airQuality.data ?? []).flatMap((a) => {
        const d = getDistrict(a.district);
        return d && inFocus(a.district)
          ? [
              {
                type: "Feature" as const,
                geometry: { type: "Point" as const, coordinates: [d.lon, d.lat] },
                properties: { district: a.district, level: a.severity, eaqi: a.eaqi },
              },
            ]
          : [];
      }),
    );
    // Tempo agora: a estação de cada distrito, com a temperatura por cima.
    const observed = collection(
      Object.entries(weather?.observations.data ?? {})
        .filter(([district]) => inFocus(district))
        .map(([district, o]) => ({
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: o.coordinates },
          properties: { district, label: `${Math.round(o.temperature)}°` },
        })),
    );
    // Mar: cada ponto de previsão, com a altura das ondas de hoje.
    const sea = collection(
      Object.entries(weather?.sea.data ?? {})
        .filter(([district]) => inFocus(district))
        .flatMap(([district, spots]) =>
          spots.map((spot) => {
            const today = spot.days[0];
            const values = [today?.seaMin, today?.seaMax].filter((v): v is number => v != null);
            const [a, b] = [...new Set(values.map((v) => formatNumber(v, 1, locale)))];
            return {
              type: "Feature" as const,
              geometry: { type: "Point" as const, coordinates: spot.coordinates },
              properties: { district, label: a ? `${b ? `${a}–${b}` : a} m` : "" },
            };
          }),
        ),
    );
    return { districtsFc, concelhosFc, fires, quakes, air, observed, sea };
  }, [state, weather, districtGeo, concelhoGeo, focus, riskDay, locale]);

  // (Re)criar fontes e camadas sempre que o estilo carrega.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady.current) return;
    const firstLabel = map.getStyle().layers.find((l) => l.type === "symbol")?.id;
    const levelColor = [
      "match",
      ["get", "level"],
      "yellow",
      colors.yellow,
      "orange",
      colors.orange,
      "red",
      colors.red,
      "unknown",
      colors.unknown,
      colors.none,
    ] as unknown as string;

    const addSource = (id: string, fc: Collection) => {
      if (!map.getSource(id)) map.addSource(id, { type: "geojson", data: fc });
    };
    addSource("districts", data.districtsFc);
    addSource("concelhos", data.concelhosFc);
    addSource("fires", data.fires);
    addSource("quakes", data.quakes);
    addSource("air", data.air);
    addSource("observed", data.observed);
    addSource("sea", data.sea);
    addSource("selected", collection([]));

    const add = (layer: AddLayerObject, below?: string) => {
      if (!map.getLayer(layer.id)) map.addLayer(layer, below);
    };
    add(
      {
        id: "risk-fill",
        type: "fill",
        source: "concelhos",
        paint: {
          "fill-color": [
            "match",
            ["get", "risk"],
            1,
            riskColors[1]!,
            2,
            riskColors[2]!,
            3,
            riskColors[3]!,
            4,
            riskColors[4]!,
            5,
            riskColors[5]!,
            "rgba(0,0,0,0)",
          ],
          "fill-opacity": 0.55,
        },
      },
      firstLabel,
    );
    add(
      {
        id: "risk-line",
        type: "line",
        source: "concelhos",
        paint: {
          "line-color": theme === "dark" ? "#0b1a23" : "#ffffff",
          "line-width": 0.5,
          "line-opacity": 0.8,
        },
      },
      firstLabel,
    );
    add(
      {
        id: "risk-extrusion",
        type: "fill-extrusion",
        source: "concelhos",
        filter: [">", ["get", "height"], 0],
        layout: { visibility: "none" },
        paint: {
          "fill-extrusion-color": [
            "match",
            ["get", "risk"],
            1,
            riskColors[1]!,
            2,
            riskColors[2]!,
            3,
            riskColors[3]!,
            4,
            riskColors[4]!,
            5,
            riskColors[5]!,
            "rgba(0,0,0,0)",
          ],
          "fill-extrusion-height": ["get", "height"],
          "fill-extrusion-base": 0,
          "fill-extrusion-opacity": 0.88,
        },
      },
      firstLabel,
    );
    add(
      {
        id: "warnings-fill",
        type: "fill",
        source: "districts",
        ...(focus ? { filter: ["==", ["get", "slug"], focus] } : {}),
        paint: {
          "fill-color": levelColor,
          "fill-opacity": ["match", ["get", "level"], "none", 0.08, "unknown", 0.15, 0.42],
        },
      },
      firstLabel,
    );
    add(
      {
        id: "warnings-line",
        type: "line",
        source: "districts",
        paint: {
          "line-color": theme === "dark" ? "#a3b5bf" : "#44596a",
          "line-width": 0.8,
          "line-opacity": 0.6,
        },
      },
      firstLabel,
    );
    if (focus) {
      // O resto do país fica esbatido e o distrito da página contornado.
      add(
        {
          id: "focus-mask",
          type: "fill",
          source: "districts",
          filter: ["!=", ["get", "slug"], focus],
          paint: {
            "fill-color": theme === "dark" ? "#06121d" : "#eef2f5",
            "fill-opacity": 0.65,
          },
        },
        firstLabel,
      );
      // Os concelhos do distrito, em todas as camadas: linhas finas por dentro
      // do contorno e uma área invisível para se tocar num concelho.
      add({
        id: "concelho-fill",
        type: "fill",
        source: "concelhos",
        filter: ["==", ["get", "district"], focus],
        paint: { "fill-color": "#000000", "fill-opacity": 0 },
      });
      add({
        id: "concelho-lines",
        type: "line",
        source: "concelhos",
        filter: ["==", ["get", "district"], focus],
        paint: {
          "line-color": theme === "dark" ? "#e3ecf0" : "#0d2b3a",
          "line-width": 0.8,
          "line-opacity": 0.45,
        },
      });
      add({
        id: "focus-line",
        type: "line",
        source: "districts",
        filter: ["==", ["get", "slug"], focus],
        paint: { "line-color": theme === "dark" ? "#e3ecf0" : "#0d2b3a", "line-width": 2.5 },
      });
    }
    add({
      id: "selected-concelho",
      type: "line",
      source: "concelhos",
      filter: ["==", ["get", "dico"], ""],
      paint: { "line-color": theme === "dark" ? "#7bc4ee" : "#185f8c", "line-width": 3 },
    });
    add({
      id: "selected-district",
      type: "line",
      source: "districts",
      filter: ["==", ["get", "slug"], ""],
      paint: { "line-color": theme === "dark" ? "#7bc4ee" : "#185f8c", "line-width": 3.5 },
    });
    add({
      id: "air-circle",
      type: "circle",
      source: "air",
      paint: {
        "circle-radius": 9,
        "circle-color": levelColor,
        "circle-stroke-color": theme === "dark" ? "#0b1a23" : "#ffffff",
        "circle-stroke-width": 2,
      },
    });
    // As etiquetas usam a letra do próprio estilo (o OpenFreeMap só serve as suas).
    const styleFont = map
      .getStyle()
      .layers.filter((l) => l.type === "symbol")
      .map((l) => map.getLayoutProperty(l.id, "text-font") as string[] | undefined)
      .find((font) => Array.isArray(font));
    const pointLabel = (id: string, source: string): AddLayerObject => ({
      id,
      type: "symbol",
      source,
      layout: {
        "text-field": ["get", "label"],
        "text-font": styleFont ?? ["Noto Sans Regular"],
        "text-size": 14,
        "text-offset": [0, -1.3],
        "text-anchor": "bottom",
        "text-allow-overlap": true,
      },
      paint: {
        "text-color": theme === "dark" ? "#e3ecf0" : "#0d2b3a",
        "text-halo-color": theme === "dark" ? "#0b1a23" : "#ffffff",
        "text-halo-width": 2,
      },
    });
    const pointCircle = (id: string, source: string, color: string): AddLayerObject => ({
      id,
      type: "circle",
      source,
      paint: {
        "circle-radius": 7,
        "circle-color": color,
        "circle-stroke-color": theme === "dark" ? "#0b1a23" : "#ffffff",
        "circle-stroke-width": 2,
      },
    });
    add(pointCircle("observed-circle", "observed", theme === "dark" ? "#7bc4ee" : "#185f8c"));
    add(pointLabel("observed-label", "observed"));
    add(pointCircle("sea-circle", "sea", theme === "dark" ? "#4fb3bf" : "#0e6f7a"));
    add(pointLabel("sea-label", "sea"));
    add({
      id: "quakes-circle",
      type: "circle",
      source: "quakes",
      paint: {
        "circle-radius": ["get", "size"],
        "circle-color": ["match", ["get", "level"], "none", mapColors[theme].info, levelColor],
        "circle-opacity": ["interpolate", ["linear"], ["get", "age"], 0, 0.85, 604800000, 0.3],
        "circle-stroke-color": theme === "dark" ? "#e3ecf0" : "#0d2b3a",
        "circle-stroke-width": 1,
      },
    });
    add({
      id: "fires-halo",
      type: "circle",
      source: "fires",
      filter: ["==", ["get", "active"], true],
      paint: {
        "circle-radius": ["+", ["get", "size"], 6],
        "circle-color": colors.orange,
        "circle-opacity": 0.25,
      },
    });
    add({
      id: "fires-circle",
      type: "circle",
      source: "fires",
      paint: {
        "circle-radius": ["get", "size"],
        "circle-color": [
          "match",
          ["get", "level"],
          "none",
          theme === "dark" ? "#8d9ba3" : "#7c8b94",
          levelColor,
        ],
        "circle-stroke-color": theme === "dark" ? "#0b1a23" : "#ffffff",
        "circle-stroke-width": 2,
      },
    });
    add({
      id: "selected-point",
      type: "circle",
      source: "selected",
      paint: {
        "circle-radius": 18,
        "circle-color": "rgba(0,0,0,0)",
        "circle-stroke-color": theme === "dark" ? "#7bc4ee" : "#185f8c",
        "circle-stroke-width": 4,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleVersion]);

  // Atualizar dados.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady.current) return;
    const set = (id: string, fc: Collection) =>
      (map.getSource(id) as GeoJSONSource | undefined)?.setData(fc);
    set("districts", data.districtsFc);
    set("concelhos", data.concelhosFc);
    set("fires", data.fires);
    set("quakes", data.quakes);
    set("air", data.air);
    set("observed", data.observed);
    set("sea", data.sea);
  }, [data, styleVersion]);

  // Visibilidade das camadas. No risco em 3D, a extrusão substitui o preenchimento.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady.current) return;
    const extruded = view3d && layer === "risk";
    const hiddenIn = (mapLayer: string) =>
      extruded ? mapLayer !== "risk-extrusion" : mapLayer === "risk-extrusion";
    for (const [id, ids] of Object.entries(layerIds) as [LayerId, string[]][]) {
      for (const mapLayer of ids) {
        if (map.getLayer(mapLayer))
          map.setLayoutProperty(
            mapLayer,
            "visibility",
            id === layer && !hiddenIn(mapLayer) ? "visible" : "none",
          );
      }
    }
  }, [layer, view3d, styleVersion]);

  // Vista 3D: relevo (incêndios) ou só inclinação (risco em altura); rotação
  // e compasso só aqui. A câmara move-se uma vez, quando a vista muda.
  const was3d = useRef(false);
  const entered = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady.current) return;
    const relief = view3d && layer === "fires";
    if (relief) {
      // Duas fontes iguais: o MapLibre desenha melhor o sombreado e o terreno separados.
      if (!map.getSource("relief-dem")) map.addSource("relief-dem", reliefSource(t));
      if (!map.getSource("relief-shade")) map.addSource("relief-shade", reliefSource(t));
      if (!map.getLayer("relief-hillshade"))
        map.addLayer(
          {
            id: "relief-hillshade",
            type: "hillshade",
            source: "relief-shade",
            paint: {
              "hillshade-exaggeration": theme === "dark" ? 0.4 : 0.3,
              "hillshade-shadow-color": theme === "dark" ? "#000000" : "#3d5262",
              "hillshade-highlight-color": theme === "dark" ? "#3a5168" : "#ffffff",
              "hillshade-accent-color": theme === "dark" ? "#000000" : "#3d5262",
            },
          },
          map.getLayer("risk-fill") ? "risk-fill" : undefined,
        );
      map.setLayoutProperty("relief-hillshade", "visibility", "visible");
      map.setTerrain({ source: "relief-dem", exaggeration: RELIEF_EXAGGERATION });
    } else {
      if (map.getLayer("relief-hillshade"))
        map.setLayoutProperty("relief-hillshade", "visibility", "none");
      if (map.getTerrain()) map.setTerrain(null);
    }

    if (view3d) {
      map.dragRotate.enable();
      map.touchZoomRotate.enableRotation();
      map.keyboard.enableRotation();
    } else {
      map.dragRotate.disable();
      map.touchZoomRotate.disableRotation();
      map.keyboard.disableRotation();
    }

    if (was3d.current === view3d) return;
    was3d.current = view3d;
    if (navRef.current) map.removeControl(navRef.current);
    navRef.current = new NavigationControl({ showCompass: view3d, visualizePitch: view3d });
    map.addControl(navRef.current, "top-right");
    // A primeira entrada em 3D (ao abrir a página) é a viagem longa: a câmara
    // inclina-se e roda um pouco. As trocas seguintes são curtas.
    const first = view3d && !entered.current;
    if (view3d) entered.current = true;
    const reduced = cameraDuration() === 0;
    const duration = reduced ? 0 : first ? ENTRY_MS : cameraDuration();
    if (container.current) container.current.dataset.cameraDuration = String(duration);
    map.easeTo(
      view3d
        ? {
            pitch: MAP_3D_PITCH,
            bearing: first ? ENTRY_BEARING : map.getBearing(),
            duration,
            // Só a primeira entrada leva curva própria. Não passar "easing: undefined":
            // apagava a curva por omissão do MapLibre, que rebentava a meio do desenho
            // ("easing is not a function") e o mapa deixava de se mexer.
            ...(first ? { easing: cubicInOut } : {}),
          }
        : { pitch: 0, bearing: 0, duration },
    );
    // No risco em altura, os concelhos sobem do chão até à altura da classe.
    if (view3d && layer === "risk")
      growExtrusion(map, reduced ? 0 : first ? 1300 : 600, first ? 400 : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view3d, layer, styleVersion]);

  // Seleção: realçar e enquadrar.
  useEffect(() => {
    const map = mapRef.current;
    // A camada só existe depois de o efeito de camadas correr para este estilo.
    if (!map || !styleReady.current || !map.getLayer("selected-district")) return;
    const selected = map.getSource("selected") as GeoJSONSource | undefined;
    if (!selection) {
      map.setFilter("selected-district", ["==", ["get", "slug"], ""]);
      if (map.getLayer("selected-concelho"))
        map.setFilter("selected-concelho", ["==", ["get", "dico"], ""]);
      selected?.setData(collection([]));
      // A seleção saiu (segundo toque ou o botão de fechar): volta à vista
      // inicial, o país (ou a região), ou o distrito numa página de distrito.
      if (hadSelection.current) {
        hadSelection.current = false;
        userMoved.current = false;
        fitTarget.current?.(700);
      }
      return;
    }
    hadSelection.current = true;
    // A pessoa pediu para ver este evento: mudar de tamanho já não reenquadra.
    userMoved.current = true;
    map.setFilter("selected-concelho", [
      "==",
      ["get", "dico"],
      selection.type === "concelho" ? selection.dico : "",
    ]);
    if (selection.type === "concelho") {
      map.setFilter("selected-district", ["==", ["get", "slug"], ""]);
      selected?.setData(collection([]));
      const features = (concelhoGeo?.features ?? []).filter(
        (f) => f.properties.dico === selection.dico,
      );
      const bounds = bboxOf(features);
      if (bounds) map.fitBounds(bounds, { padding: 60, maxZoom: 10, duration: 700, ...tilt(map) });
    } else if (selection.type === "district") {
      map.setFilter("selected-district", ["==", ["get", "slug"], selection.slug]);
      selected?.setData(collection([]));
      const features = (districtGeo?.features ?? []).filter(
        (f) => f.properties.slug === selection.slug,
      );
      const bounds = bboxOf(features);
      if (bounds) map.fitBounds(bounds, { padding: 40, maxZoom: 9, duration: 700, ...tilt(map) });
    } else {
      map.setFilter("selected-district", ["==", ["get", "slug"], ""]);
      selected?.setData(
        collection([
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: selection.coordinates },
            properties: {},
          },
        ]),
      );
      map.flyTo({ center: selection.coordinates, zoom: Math.max(map.getZoom(), 9), duration: 700 });
    }
  }, [selection, styleVersion, districtGeo, concelhoGeo]);

  // Mudar de região (Continente / Açores / Madeira).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || focus) return;
    userMoved.current = false;
    fitTarget.current = (duration) =>
      map.fitBounds(regionBounds[region], { padding: FIT_PADDING, duration, ...tilt(map) });
    fitTarget.current(600);
  }, [region, focus]);

  // Enquadrar o distrito em foco quando os limites chegam.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus || !districtGeo) return;
    const bounds = bboxOf(districtGeo.features.filter((f) => f.properties.slug === focus));
    if (!bounds) return;
    fitTarget.current = (duration) =>
      map.fitBounds(bounds, { padding: 32, duration, ...tilt(map) });
    if (!userMoved.current) fitTarget.current(0);
  }, [focus, districtGeo]);

  return (
    <div ref={container} role="region" aria-label={t.map.ariaLabel} className="h-full w-full" />
  );
}
