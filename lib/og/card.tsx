import { ImageResponse } from "next/og";

import type { Severity } from "@/lib/sources/types";

export const ogSize = { width: 1200, height: 630 };

const tint: Record<Severity | "unknown", { bar: string; bg: string; label: string }> = {
  none: { bar: "#2e7d4f", bg: "#e2f1e7", label: "Sem avisos" },
  yellow: { bar: "#e8b000", bg: "#fff3c7", label: "Aviso amarelo" },
  orange: { bar: "#e0661b", bg: "#fde5d3", label: "Aviso laranja" },
  red: { bar: "#c62828", bg: "#fbe0e0", label: "Aviso vermelho" },
  unknown: { bar: "#7c8b94", bg: "#e6ebee", label: "Sem dados do IPMA" },
};

/** Imagem de partilha com o estado atual: é o que aparece no WhatsApp ou no LinkedIn. */
export function statusCard({
  level,
  place,
  headline,
}: {
  level: Severity | "unknown";
  place: string;
  headline: string;
}) {
  const t = tint[level];
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", background: t.bg }}>
      <div style={{ width: 28, height: "100%", background: t.bar }} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          flex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            color: "#0d2b3a",
            fontSize: 34,
            fontWeight: 800,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 44,
              background: "#0d2b3a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ width: 18, height: 18, borderRadius: 18, background: "#2e7d4f" }} />
          </div>
          <span>Portugal Agora</span>
          <span style={{ color: "#44596a", fontWeight: 400 }}>{place}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              background: "#ffffff",
              color: "#0d2b3a",
              borderRadius: 999,
              padding: "10px 26px",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            {t.label}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: headline.length > 90 ? 50 : 62,
              fontWeight: 800,
              color: "#0d2b3a",
              lineHeight: 1.12,
              letterSpacing: -1,
            }}
          >
            {headline}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#44596a" }}>
          portugalagora.pt. Dados do IPMA, Fogos.pt e Open-Meteo.
        </div>
      </div>
    </div>,
    ogSize,
  );
}
