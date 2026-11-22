import { describe, expect, it } from "vitest";

import {
  ipmaPdsiSchema,
  ipmaPdsiUrl,
  normalizePdsi,
  normalizePrecip,
  pdsiClass,
} from "@/lib/sources/ipma-climate";

const header =
  "time,zname,zid,mean_maxprate,std_maxprate,min_maxprate,max_maxprate,percentile_25_maxprate,median_maxprate,percentile_75_maxprate,mean_tp,std_tp,min_tp,max_tp,percentile_25_tp,median_tp,percentile_75_tp";
const row = (date: string, name: string, dico: string, mm: string) =>
  `${date} 00:00:00+00:00,${name},${dico},0,0,0,0,0,0,0,${mm},0,0,0,0,0,0`;

describe("chuva por concelho (IPMA)", () => {
  const csv = [
    header,
    row("2026-11-02", "Lisboa", "1106", "0.00"),
    row("2026-11-03", "Lisboa", "1106", "86.67"),
    row("2026-11-04", "Lisboa", "1106", "-99.0"),
    row("2026-11-02", "Águeda", "0101", "1.49"),
    row("2026-11-03", "Águeda", "0101", "3.87"),
    row("2026-11-04", "Águeda", "0101", "4.64"),
  ].join("\n");

  it("uma série por concelho, do dia mais antigo ao mais recente, em mm", () => {
    const rain = normalizePrecip(csv);
    expect(rain.start).toBe("2026-11-02");
    expect(rain.byDico["1106"]).toEqual([0, 86.7, 0]);
    expect(rain.byDico["0101"]).toEqual([1.5, 3.9, 4.6]);
  });

  it("falha se o IPMA mudar as colunas", () => {
    expect(() => normalizePrecip("a,b,c\n1,2,3")).toThrow();
  });
});

describe("índice de seca (PDSI)", () => {
  it.each([
    [-4.2, "Seca extrema"],
    [-3.7, "Seca severa"],
    [-2.1, "Seca moderada"],
    [-1, "Seca fraca"],
    [0.4, "Normal"],
    [1.2, "Chuva fraca"],
    [4.5, "Chuva extrema"],
  ])("%s é %s", (value, label) => {
    expect(pdsiClass(value).label).toBe(label);
  });

  it("fica com o mês mais recente da resposta do WMS", () => {
    const raw = ipmaPdsiSchema.parse([
      { data: { "2026-09-01T00:00:00Z": "-1.871", "2026-10-01T00:00:00Z": "-3.715" } },
    ]);
    expect(normalizePdsi(raw)).toEqual({
      month: "2026-10",
      value: -3.7,
      label: "Seca severa",
      level: -3,
    });
  });

  it("pede o ponto com a latitude primeiro (WMS 1.3.0)", () => {
    const url = new URL(ipmaPdsiUrl([-9.33, 38.73]));
    expect(url.searchParams.get("BBOX")).toBe("38.6800,-9.3800,38.7800,-9.2800");
  });
});
