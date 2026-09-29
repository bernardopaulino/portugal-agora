"use client";

import { WifiOff } from "lucide-react";

import { useOnline } from "@/lib/hooks/external";

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="bg-sev-unknown-bg text-sev-unknown-ink">
      <p className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2 text-base font-bold sm:px-6">
        <WifiOff aria-hidden className="size-5 shrink-0" />
        Sem ligação à internet. Está a ver os últimos dados guardados neste dispositivo.
      </p>
    </div>
  );
}
