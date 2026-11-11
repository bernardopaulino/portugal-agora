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

/** Páginas e rotas do país (sem idioma; "" é a página inicial). */
const NATIONAL = new Set([
  "",
  "/avisos",
  "/incendios",
  "/sismos",
  "/risco",
  "/fontes",
  "/privacidade",
  "/sobre",
  "/avisos/rss",
  "/incendios/rss",
  "/sismos/rss",
  "/opengraph-image",
]);

/** Páginas e rotas de cada distrito, depois de /<distrito>. */
const IN_DISTRICT = new Set([
  "",
  "/avisos",
  "/incendios",
  "/sismos",
  "/risco",
  "/avisos/rss",
  "/incendios/rss",
  "/sismos/rss",
  "/opengraph-image",
]);

/**
 * Se um caminho (sem idioma) é uma página que existe. O proxy manda os
 * outros para a página 404, sempre a mesma: com o Cache Components não há
 * `dynamicParams = false`, e cada endereço desconhecido (/wp-login.php,
 * /lisboa/xyz…) era gerado a pedido e guardado como ISR, uma "ISR write"
 * por cada endereço que um bot inventasse.
 */
export function isKnownPage(path: string): boolean {
  const clean = path === "/" ? "" : path;
  if (NATIONAL.has(clean)) return true;
  const { district, concelho, topic } = splitDistrictPath(clean || "/");
  if (!district) return false;
  if (concelho) return true;
  return IN_DISTRICT.has(topic);
}
