/*
 * Aquece a cache da Vercel (corre de 6 em 6 horas, ver
 * .github/workflows/warm-cache.yml).
 *
 * As páginas são renovadas (ISR) só quando alguém as visita depois de
 * passarem 15 min. Uma página que ninguém visitou durante muito tempo é
 * entregue pela CDN com a última versão gerada, que pode ter dias (às
 * vezes a do build: X-Vercel-Cache: PRERENDER). Este script visita cada
 * página do sitemap e a sua imagem de partilha: a visita dispara a
 * renovação em segundo plano e a pessoa seguinte recebe dados recentes.
 *
 * Uso: node scripts/warm-cache.mjs [https://portugalagora.pt]
 * Cada página renovada conta como uma "ISR write" (~300 por passagem).
 */

const base = (process.argv[2] ?? process.env.SITE_URL ?? "https://portugalagora.pt").replace(
  /\/$/,
  "",
);
// Devagar: cada renovação pode ir às fontes (o fogos.pt limita pedidos).
const CONCURRENCY = 2;
const headers = { "user-agent": "portugal-agora-warm-cache" };

async function get(url) {
  try {
    const response = await fetch(url, { headers });
    return {
      url,
      status: response.status,
      cache: response.headers.get("x-vercel-cache"),
      response,
    };
  } catch (error) {
    return { url, status: 0, cache: null, error: String(error) };
  }
}

async function pool(items, worker) {
  const results = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < items.length) {
        const item = items[next++];
        results.push(await worker(item));
      }
    }),
  );
  return results;
}

const sitemap = await (await fetch(`${base}/sitemap.xml`, { headers })).text();
const pages = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (pages.length === 0) {
  throw new Error("Sitemap vazio.");
}

const images = new Set();
const pageResults = await pool(pages, async (url) => {
  const result = await get(url);
  if (result.response?.ok) {
    const html = await result.response.text();
    for (const m of html.matchAll(/property="og:image" content="([^"]+)"/g)) images.add(m[1]);
  }
  return result;
});
const imageResults = await pool([...images], async (url) => {
  const result = await get(url);
  await result.response?.arrayBuffer().catch(() => {});
  return result;
});

const all = [...pageResults, ...imageResults];
const failed = all.filter((r) => r.status === 0 || r.status >= 500);
const byCache = {};
for (const r of all) byCache[r.cache ?? "?"] = (byCache[r.cache ?? "?"] ?? 0) + 1;
console.log(`${pages.length} páginas e ${images.size} imagens visitadas.`, byCache);
for (const r of failed) console.error(`Falhou: ${r.url} (${r.status || r.error})`);
process.exitCode = failed.length > 0 ? 1 : 0;
