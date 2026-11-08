/*
 * Service worker do Portugal Agora.
 * - Ficheiros estáticos (JS, CSS, fontes, limites geográficos): cache primeiro.
 * - Páginas e /api/state: rede primeiro; sem rede, a última versão guardada.
 * Os mosaicos do mapa (outro domínio) não são guardados.
 */
const VERSION = "pa-v1";
const STATIC_CACHE = `${VERSION}-static`;
const PAGES_CACHE = `${VERSION}-pages`;
const PRECACHE = ["/", "/geo/distritos.json", "/fontes"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

function isStatic(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/geo/") ||
    url.pathname.startsWith("/fontes/") ||
    url.pathname.startsWith("/icons/")
  );
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(STATIC_CACHE)).put(request, response.clone());
  return response;
}

async function networkFirst(request, fallbackUrl) {
  try {
    const response = await fetch(request);
    if (response.ok) (await caches.open(PAGES_CACHE)).put(request, response.clone());
    return response;
  } catch {
    const cached =
      (await caches.match(request)) ?? (fallbackUrl ? await caches.match(fallbackUrl) : undefined);
    if (cached) return cached;
    throw new Error("Sem ligação e sem cópia guardada");
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isStatic(url)) event.respondWith(cacheFirst(request));
  else if (url.pathname === "/api/state") event.respondWith(networkFirst(request));
  else if (request.mode === "navigate") event.respondWith(networkFirst(request, "/"));
});
