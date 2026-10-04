"use client";

import { LocateFixed } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { districtAt, type DistrictFeature } from "@/lib/geo/geometry";
import { writeStorage } from "@/lib/hooks/external";
import { useI18n } from "@/lib/i18n/client";

export const MY_DISTRICT_KEY = "pa:distrito";

type Status = "idle" | "locating" | "error";

/**
 * Descobre o distrito a partir da localização do browser. O cálculo é
 * feito aqui, no dispositivo: a localização nunca é enviada ao servidor.
 */
export function NearMeButton() {
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
    <div className="relative">
      <button
        type="button"
        onClick={locate}
        disabled={status === "locating"}
        aria-label={t.header.nearMe}
        className="inline-flex h-12 min-w-12 items-center justify-center gap-2 rounded-sm bg-ink px-3 font-display text-lg font-semibold whitespace-nowrap text-bg hover:opacity-90 disabled:opacity-70 sm:px-4"
      >
        <LocateFixed aria-hidden className="size-5" />
        <span className="hidden sm:inline">
          {status === "locating" ? t.header.locating : t.header.nearMe}
        </span>
      </button>
      <div role="status" aria-live="polite">
        {message ? (
          <p className="mt-2 max-w-xs text-sm text-ink sm:absolute sm:top-14 sm:right-0 sm:z-30 sm:mt-0 sm:w-72 sm:rounded-sm sm:border sm:border-line sm:bg-surface sm:p-3 sm:shadow-[0_10px_30px_-12px_rgb(0_0_0/0.35)]">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
