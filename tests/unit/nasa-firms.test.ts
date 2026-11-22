import { describe, expect, it } from "vitest";

import { firmsUrls, normalizeHotspots } from "@/lib/sources/nasa-firms";

const header =
  "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,confidence,version,bright_ti5,frp,daynight";
const now = new Date("2026-08-10T16:00:00Z");

describe("pontos de calor (NASA FIRMS)", () => {
  const csv = [
    header,
    // Tondela (Viseu), confiança nominal
    "40.5163,-8.0812,340.1,0.4,0.4,2026-08-10,1324,N20,nominal,2.0NRT,295,18.47,D",
    // A mesma passagem repetida noutro ficheiro conta uma vez
    "40.5163,-8.0812,340.1,0.4,0.4,2026-08-10,1324,N20,nominal,2.0NRT,295,18.47,D",
    // Baixa confiança: fora
    "38.9,-8.5,300,0.4,0.4,2026-08-10,1324,N20,low,2.0NRT,290,1,D",
    // No mar, ao largo de Sines: fora
    "37.9,-9.3,330,0.4,0.4,2026-08-10,1324,N20,nominal,2.0NRT,290,5,D",
    // Espanha: fora
    "40.4,-3.7,330,0.4,0.4,2026-08-10,1324,N20,high,2.0NRT,290,5,D",
    // Há mais de 24 h: fora
    "40.5,-8.0,330,0.4,0.4,2026-08-09,0300,N21,high,2.0NRT,290,5,N",
  ].join("\n");

  it("fica com as deteções em terra portuguesa nas últimas 24 h, com o concelho", () => {
    const spots = normalizeHotspots([csv, csv], now);
    expect(spots).toHaveLength(1);
    expect(spots[0]).toMatchObject({
      detectedAt: "2026-08-10T13:24:00.000Z",
      satellite: "NOAA-20",
      frp: 18.5,
      confidence: "nominal",
      place: { district: "viseu", region: "continente", label: "Tondela" },
      dico: "1821",
    });
  });

  it("aceita a confiança abreviada da API com chave (h/n/l)", () => {
    const keyed = `${header}\n40.5163,-8.0812,340,0.4,0.4,2026-08-10,1324,N21,h,2.0NRT,295,30,D`;
    expect(normalizeHotspots([keyed], now)[0]?.confidence).toBe("high");
  });

  it("sem chave, os ficheiros públicos; com chave, a API com Portugal inteiro", () => {
    expect(firmsUrls()[0]).toContain("Europe_24h.csv");
    expect(firmsUrls("abc")[0]).toContain(
      "/api/area/csv/abc/VIIRS_NOAA20_NRT/-31.6,32.3,-6.1,42.2/1",
    );
  });
});
