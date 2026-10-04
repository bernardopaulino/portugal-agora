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
import type { CountryState } from "@/lib/state/aggregate";

import { riskColors } from "../cards/fire-risk";
import type { OnSelect, Selection } from "../cards/types";
import { useResolvedTheme } from "@/lib/hooks/external";
import { mapColors } from "../status/severity";
import type { LayerId } from "./layers";

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
  risk: ["risk-fill", "risk-line"],
  air: ["air-circle"],
  quakes: ["quakes-circle"],
  fires: ["fires-halo", "fires-circle"],
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
  layers,
  selection,
  onSelect,
  focus,
  region,
}: {
  state: CountryState;
  layers: LayerId[];
  selection: Selection | null;
  onSelect: OnSelect;
  /** Slug do distrito a enquadrar ao abrir (páginas de distrito). */
  focus?: string;
  region: Region;
}) {
  const { t } = useI18n();
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onSelectRef = useRef(onSelect);
  const [styleVersion, setStyleVersion] = useState(0);
  // Falso entre um setStyle() e o "style.load" seguinte: nesse intervalo o
  // estilo não está pronto (getStyle() devolve undefined, addLayer falha).
  const styleReady = useRef(false);
  const [districtGeo, setDistrictGeo] = useState<Collection | null>(null);
  const [concelhoGeo, setConcelhoGeo] = useState<Collection | null>(null);
  const theme = useResolvedTheme();
  const colors = mapColors[theme];

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Limites dos distritos (sempre) e dos concelhos (só quando a camada de risco é ligada).
  useEffect(() => {
    fetch("/geo/distritos.json")
      .then((r) => r.json())
      .then(setDistrictGeo)
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (layers.includes("risk") && !concelhoGeo) {
      fetch("/geo/concelhos.json")
        .then((r) => r.json())
        .then(setConcelhoGeo)
        .catch(() => {});
    }
  }, [layers, concelhoGeo]);

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
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
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

    const clickable = ["fires-circle", "quakes-circle", "air-circle", "warnings-fill", "risk-fill"];
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
      if (p.eventId && hit.geometry.type === "Point") {
        const [lon, lat] = hit.geometry.coordinates as [number, number];
        onSelectRef.current({
          type: "event",
          id: p.eventId,
          coordinates: [lon, lat],
          region: (p.region as Region) ?? "continente",
        });
      } else if (p.slug) {
        onSelectRef.current({ type: "district", slug: p.slug });
      } else if (p.district) {
        onSelectRef.current({ type: "district", slug: p.district });
      }
    });

    mapRef.current = map;
    return () => {
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

  // Dados derivados do estado.
  const data = useMemo(() => {
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

    const risk = state.fireRisk.data?.today.byDico ?? {};
    const concelhosFc = concelhoGeo
      ? collection(
          concelhoGeo.features.map((f) => ({
            ...f,
            properties: { ...f.properties, risk: risk[f.properties.dico as string] ?? 0 },
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
        .filter((f) => f.coordinates)
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
        .filter((q) => q.coordinates)
        .map((q) =>
          point(q.id, q.coordinates!, {
            level: q.severity,
            region: q.place.region,
            size: 4 + q.magnitude * 3,
            age: Date.parse(state.generatedAt) - Date.parse(q.occurredAt),
          }),
        ),
    );
    const air = collection(
      (state.airQuality.data ?? []).flatMap((a) => {
        const d = getDistrict(a.district);
        return d
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
    return { districtsFc, concelhosFc, fires, quakes, air };
  }, [state, districtGeo, concelhoGeo]);

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
        id: "warnings-fill",
        type: "fill",
        source: "districts",
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
  }, [data, styleVersion]);

  // Visibilidade das camadas.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady.current) return;
    for (const [layer, ids] of Object.entries(layerIds) as [LayerId, string[]][]) {
      for (const id of ids) {
        if (map.getLayer(id))
          map.setLayoutProperty(id, "visibility", layers.includes(layer) ? "visible" : "none");
      }
    }
  }, [layers, styleVersion]);

  // Seleção: realçar e enquadrar.
  useEffect(() => {
    const map = mapRef.current;
    // A camada só existe depois de o efeito de camadas correr para este estilo.
    if (!map || !styleReady.current || !map.getLayer("selected-district")) return;
    const selected = map.getSource("selected") as GeoJSONSource | undefined;
    if (!selection) {
      map.setFilter("selected-district", ["==", ["get", "slug"], ""]);
      selected?.setData(collection([]));
      return;
    }
    if (selection.type === "district") {
      map.setFilter("selected-district", ["==", ["get", "slug"], selection.slug]);
      selected?.setData(collection([]));
      const features = (districtGeo?.features ?? []).filter(
        (f) => f.properties.slug === selection.slug,
      );
      const bounds = bboxOf(features);
      if (bounds) map.fitBounds(bounds, { padding: 40, maxZoom: 9, duration: 700 });
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
  }, [selection, styleVersion, districtGeo]);

  // Mudar de região (Continente / Açores / Madeira).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || focus) return;
    map.fitBounds(regionBounds[region], { padding: FIT_PADDING, duration: 600 });
  }, [region, focus]);

  // Enquadrar o distrito em foco quando os limites chegam.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus || !districtGeo) return;
    const bounds = bboxOf(districtGeo.features.filter((f) => f.properties.slug === focus));
    if (bounds) map.fitBounds(bounds, { padding: 32, duration: 0 });
  }, [focus, districtGeo]);

  return (
    <div ref={container} role="region" aria-label={t.map.ariaLabel} className="h-full w-full" />
  );
}
