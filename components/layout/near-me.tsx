"use client";

import { LocateFixed } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Concelho } from "@/data/concelhos";
import { districtAt, type ConcelhoFeature, type DistrictFeature } from "@/lib/geo/geometry";
import { ACCURATE_ENOUGH_M, concelhoCandidates } from "@/lib/geo/near-me";
import { writeStorage } from "@/lib/hooks/external";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

import { startNavigationFeedback } from "./navigation-progress";

export const MY_DISTRICT_KEY = "pa:distrito";
/** "lisboa/sintra": o concelho encontrado da última vez (atalho na página inicial). */
export const MY_CONCELHO_KEY = "pa:concelho";

type Status = "idle" | "locating" | "error" | "choose";

/** A posição: primeiro com GPS (se houver); se falhar ou demorar, a aproximada do browser. */
function position(): Promise<GeolocationPosition> {
  const ask = (options: PositionOptions) =>
    new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, options),
    );
  return ask({ enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 }).catch(
    (error: GeolocationPositionError) => {
      if (error.code === error.PERMISSION_DENIED) throw error;
      return ask({ enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 });
    },
  );
}

/**
 * Descobre o concelho (e o distrito) a partir da localização do browser e
 * leva à página do concelho. O cálculo é feito aqui, no dispositivo: a
 * localização nunca é enviada ao servidor. Fora de qualquer concelho (no
 * mar, junto à costa), fica o distrito. Com uma posição aproximada (sem GPS,
 * pelo Wi-Fi ou IP), mostra os concelhos possíveis em vez de adivinhar.
 */
export function NearMeButton({ className }: { className?: string }) {
  const router = useRouter();
  const { t, path } = useI18n();
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [choices, setChoices] = useState<Concelho[]>([]);

  const go = (district: string, concelho?: Concelho) => {
    writeStorage(MY_DISTRICT_KEY, district);
    writeStorage(MY_CONCELHO_KEY, concelho ? `${district}/${concelho.slug}` : "");
    setStatus("idle");
    setMessage("");
    setChoices([]);
    const href = path(concelho ? `/${district}/${concelho.slug}` : `/${district}`);
    startNavigationFeedback(href);
    router.push(href);
  };

  async function locate() {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setMessage(t.header.geoUnsupported);
      return;
    }
    setStatus("locating");
    setMessage("");
    setChoices([]);
    let found: GeolocationPosition;
    try {
      found = await position();
    } catch (error) {
      const denied = (error as GeolocationPositionError).code === 1;
      setStatus("error");
      setMessage(denied ? t.header.geoDenied : t.header.geoFailed);
      return;
    }
    try {
      const point: [number, number] = [found.coords.longitude, found.coords.latitude];
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
      const candidates = concelhoCandidates(point, found.coords.accuracy, concelhoGeo.features);
      if (found.coords.accuracy <= ACCURATE_ENOUGH_M || candidates.length <= 1) {
        const here = candidates[0]?.district === slug ? candidates[0] : undefined;
        go(slug, here);
        return;
      }
      // Posição aproximada: a pessoa escolhe (o mais provável primeiro).
      setChoices(candidates);
      setMessage(t.header.geoApprox(Math.max(1, Math.round(found.coords.accuracy / 1000))));
      setStatus("choose");
    } catch {
      setStatus("error");
      setMessage(t.header.geoFailed);
    }
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
          <div className="absolute top-14 right-0 z-30 flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-2 rounded-lg p-3 text-sm text-ink glass-strong">
            <p>{message}</p>
            {status === "choose" ? (
              <>
                <ul className="flex flex-col gap-1">
                  {choices.map((c) => (
                    <li key={c.dico}>
                      <button
                        type="button"
                        onClick={() => go(c.district, c)}
                        className="min-h-11 w-full rounded-md px-3 text-left text-base font-semibold hover:bg-ink/10"
                      >
                        {t.concelhoName(c.dico, c.name)}
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => {
                    setStatus("idle");
                    setMessage("");
                    setChoices([]);
                  }}
                  className="self-end text-sm text-ink-2 underline"
                >
                  {t.header.geoCancel}
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
