"use client";

import { useCallback, useRef, useState } from "react";
import useSWR from "swr";

import type { Region } from "@/data/districts";
import { getDistrict } from "@/data/districts";
import type { Selection } from "@/components/cards/types";
import type { LayerId } from "@/components/map/layers";
import type { CountryState } from "@/lib/state/aggregate";

const fetcher = async (url: string): Promise<CountryState> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

/** O estado do país, renovado a cada minuto a partir do que veio do servidor. */
export function useLiveState(initial: CountryState): CountryState {
  const { data } = useSWR("/api/state", fetcher, {
    fallbackData: initial,
    refreshInterval: 60_000,
    revalidateOnFocus: true,
    revalidateOnMount: false,
    keepPreviousData: true,
  });
  return data ?? initial;
}

/**
 * Estado do mapa detalhado de uma página: a camada mostrada (uma de cada
 * vez, a do tema da página), o que está selecionado e a zona. `showOnMap`
 * seleciona e desce até ao mapa.
 * O ref da secção do mapa vem à parte: o React Compiler não deixa passar
 * um objeto com um ref durante o render.
 */
export function useMapControls(initialLayer: LayerId, initialRegion: Region = "continente") {
  const [layer, setLayer] = useState<LayerId>(initialLayer);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [region, setRegion] = useState<Region>(initialRegion);
  const mapRef = useRef<HTMLElement>(null);

  // Em ecrãs largos o mapa está ao lado da lista e já à vista: aí não se desce.
  const scrollToMap = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const { top, bottom } = map.getBoundingClientRect();
    if (top >= 0 && bottom <= window.innerHeight) return;
    map.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const showOnMap = useCallback(
    (s: Selection) => {
      setSelection(s);
      if (s.type === "event") setRegion(s.region);
      else {
        const d = getDistrict(s.slug);
        if (d) setRegion(d.region);
      }
      scrollToMap();
    },
    [scrollToMap],
  );

  return {
    mapRef,
    map: {
      layer,
      setLayer,
      selection,
      setSelection,
      region,
      setRegion,
      showOnMap,
      scrollToMap,
    },
  };
}
