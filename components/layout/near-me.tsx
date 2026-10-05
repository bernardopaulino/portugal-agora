"use client";

import { LocateFixed } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { districtAt, type DistrictFeature } from "@/lib/geo/geometry";
import { writeStorage } from "@/lib/hooks/external";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export const MY_DISTRICT_KEY = "pa:distrito";

type Status = "idle" | "locating" | "error";

/**
 * Descobre o distrito a partir da localização do browser. O cálculo é
 * feito aqui, no dispositivo: a localização nunca é enviada ao servidor.
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
          const geo = (await fetch("/geo/distritos.json").then((r) => r.json())) as {
            features: DistrictFeature[];
          };
          const slug = districtAt(
            [position.coords.longitude, position.coords.latitude],
            geo.features,
          );
          if (!slug) {
            setStatus("error");
            setMessage(t.header.geoOutside);
            return;
          }
          writeStorage(MY_DISTRICT_KEY, slug);
          setStatus("idle");
          router.push(path(`/${slug}`));
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
        className="inline-flex h-12 min-w-12 items-center justify-center gap-2 rounded-sm bg-ink px-4 font-display text-lg font-semibold whitespace-nowrap text-bg hover:opacity-90 disabled:opacity-70"
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
          <p className="absolute top-14 right-0 z-30 w-72 max-w-[calc(100vw-2rem)] rounded-sm border border-line bg-surface p-3 text-sm text-ink shadow-[0_10px_30px_-12px_rgb(0_0_0/0.35)]">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
