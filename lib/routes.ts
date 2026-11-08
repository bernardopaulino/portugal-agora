import { getConcelho } from "@/data/concelhos";
import { getDistrict } from "@/data/districts";

/**
 * Separa um caminho (sem idioma) no distrito, no concelho e no tema:
 * "/lisboa/avisos" → { district: "lisboa", topic: "/avisos" };
 * "/lisboa/sintra" → { district: "lisboa", concelho: "sintra", topic: "" };
 * "/avisos" → { district: undefined, topic: "/avisos" }; "/lisboa" → topic "".
 */
export function splitDistrictPath(path: string): {
  district?: string;
  concelho?: string;
  topic: string;
} {
  const [, first = "", second, ...rest] = path.split("/");
  if (first && getDistrict(first)) {
    if (second && !rest.length && getConcelho(first, second)) {
      return { district: first, concelho: second, topic: "" };
    }
    const parts = [second, ...rest].filter((p) => p !== undefined);
    return { district: first, topic: parts.length ? `/${parts.join("/")}` : "" };
  }
  return { topic: path === "/" ? "" : path };
}
