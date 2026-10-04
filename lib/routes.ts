import { getDistrict } from "@/data/districts";

/**
 * Separa um caminho (sem idioma) no distrito e no tema:
 * "/lisboa/avisos" → { district: "lisboa", topic: "/avisos" };
 * "/avisos" → { district: undefined, topic: "/avisos" }; "/lisboa" → topic "".
 */
export function splitDistrictPath(path: string): { district?: string; topic: string } {
  const [, first = "", ...rest] = path.split("/");
  if (first && getDistrict(first)) {
    return { district: first, topic: rest.length ? `/${rest.join("/")}` : "" };
  }
  return { topic: path === "/" ? "" : path };
}
