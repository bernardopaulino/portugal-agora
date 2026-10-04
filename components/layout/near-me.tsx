"use client";

import { LocateFixed } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { districtAt, type DistrictFeature } from "@/lib/geo/geometry";
import { writeStorage } from "@/lib/hooks/external";

export const MY_DISTRICT_KEY = "pa:distrito";

type Status = "idle" | "locating" | "error";

/**
 * Descobre o distrito a partir da localização do browser. O cálculo é
 * feito aqui, no dispositivo: a localização nunca é enviada ao servidor.
 */
export function NearMeButton() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function locate() {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setMessage("Este dispositivo não permite obter a localização. Escolha o distrito na lista.");
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
            setMessage("Parece estar fora de Portugal. Escolha o distrito na lista.");
            return;
          }
          writeStorage(MY_DISTRICT_KEY, slug);
          setStatus("idle");
          router.push(`/${slug}`);
        } catch {
          setStatus("error");
          setMessage("Não foi possível identificar o distrito. Escolha-o na lista.");
        }
      },
      () => {
        setStatus("error");
        setMessage("Sem acesso à localização. Pode escolher o distrito na lista.");
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
        className="inline-flex h-12 items-center gap-2 rounded-sm bg-stage px-3 font-display text-base font-semibold whitespace-nowrap text-stage-ink hover:bg-stage-2 disabled:opacity-70 sm:px-4 sm:text-lg"
      >
        <LocateFixed aria-hidden className="size-5" />
        <span>{status === "locating" ? "A localizar…" : "Perto de mim"}</span>
      </button>
      <div role="status" aria-live="polite">
        {message ? (
          <p className="mt-2 max-w-xs text-sm text-ink sm:absolute sm:top-14 sm:right-0 sm:z-30 sm:mt-0 sm:w-72 sm:rounded-lg sm:border sm:border-line sm:bg-surface sm:p-3 sm:shadow-lg">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
