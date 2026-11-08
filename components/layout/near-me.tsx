"use client";

import { LocateFixed } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { concelhoForDico } from "@/data/concelhos";
import {
  districtAt,
  pointInFeature,
  type ConcelhoFeature,
  type DistrictFeature,
} from "@/lib/geo/geometry";
import { writeStorage } from "@/lib/hooks/external";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export const MY_DISTRICT_KEY = "pa:distrito";

type Status = "idle" | "locating" | "error";

/**
 * Descobre o concelho (e o distrito) a partir da localização do browser e
 * leva à página do concelho. O cálculo é feito aqui, no dispositivo: a
 * localização nunca é enviada ao servidor. Fora de qualquer concelho (no
 * mar, junto à costa), fica o distrito.
 */
export function NearMeButton({ className }: { className?: string }) {
  const router = useRouter();
  const { t, path } = useI18n();
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function locate() {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setMessage(t.header.geoUnsupported);
      return;
    }
    setStatus("locating");
    setMessage("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const point: [number, number] = [position.coords.longitude, position.coords.latitude];
          const [districtGeo, concelhoGeo] = await Promise.all([
            fetch("/geo/distritos.json").then(
              (r) => r.json() as Promise<{ features: DistrictFeature[] }>,
            ),
            fetch("/geo/concelhos.json").then(
              (r) => r.json() as Promise<{ features: ConcelhoFeature[] }>,
            ),
          ]);
          const slug = districtAt(point, districtGeo.features);
          if (!slug) {
            setStatus("error");
            setMessage(t.header.geoOutside);
            return;
          }
          const feature = concelhoGeo.features.find(
            (f) => f.properties.district === slug && pointInFeature(point, f),
          );
          const concelho = feature ? concelhoForDico(feature.properties.dico) : undefined;
          writeStorage(MY_DISTRICT_KEY, slug);
          setStatus("idle");
          router.push(path(concelho ? `/${slug}/${concelho.slug}` : `/${slug}`));
        } catch {
          setStatus("error");
          setMessage(t.header.geoFailed);
        }
      },
      () => {
        setStatus("error");
        setMessage(t.header.geoDenied);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 },
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/*
       * O texto está sempre visível (o ícone sozinho não se percebe). Abaixo
       * de 400 px fica "Perto", para o nome do distrito caber ao lado; o
       * nome acessível é sempre "Perto de mim".
       */}
      <button
        type="button"
        onClick={locate}
        disabled={status === "locating"}
        aria-busy={status === "locating"}
        className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full bg-accent px-4 font-display text-base font-semibold whitespace-nowrap text-accent-ink shadow-[0_0_28px_-6px_var(--glow)] hover:brightness-110 disabled:opacity-70"
      >
        <LocateFixed aria-hidden className="size-5" />
        {status === "locating" ? (
          t.header.locating
        ) : t.header.nearMeShort === t.header.nearMe ? (
          t.header.nearMe
        ) : (
          <>
            <span aria-hidden className="min-[400px]:hidden">
              {t.header.nearMeShort}
            </span>
            <span className="max-[399px]:sr-only">{t.header.nearMe}</span>
          </>
        )}
      </button>
      <div role="status" aria-live="polite">
        {message ? (
          <p className="absolute top-14 right-0 z-30 w-72 max-w-[calc(100vw-2rem)] rounded-lg p-3 text-sm text-ink glass-strong">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
