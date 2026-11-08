/*
 * Service worker do Portugal Agora.
 * - /_next/static/: cache primeiro (o nome muda a cada versão, nunca envelhece).
 * - Limites geográficos (/geo/): rede primeiro; sem rede, a cópia guardada.
 *   Antes eram "cache primeiro" e não tinham o nome versionado: quem visitou o
 *   site ficava para sempre com o ficheiro antigo (os concelhos das ilhas, que
 *   vieram depois, não apareciam). A Vercel responde 304 quando não mudou.
 * - Logótipos e ícones (/fontes/, /icons/): a cópia guardada logo, e atualiza-se
 *   por trás para a próxima vez.
 * - Páginas e /api/state: rede primeiro; sem rede, a última versão guardada.
 * - Notificações de avisos (push), no fim do ficheiro.
 * Os mosaicos do mapa (outro domínio) não são guardados.
 *
 * Mudar VERSION apaga as caches antigas na ativação.
 */
const VERSION = "pa-v2";
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

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(STATIC_CACHE)).put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const update = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);
  return cached ?? (await update) ?? Response.error();
}

async function networkFirst(request, cacheName, fallbackUrl) {
  try {
    const response = await fetch(request);
    if (response.ok) (await caches.open(cacheName)).put(request, response.clone());
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
  const path = url.pathname;

  if (path.startsWith("/_next/static/")) event.respondWith(cacheFirst(request));
  else if (path.startsWith("/geo/")) event.respondWith(networkFirst(request, STATIC_CACHE));
  else if (path.startsWith("/fontes/") || path.startsWith("/icons/"))
    event.respondWith(staleWhileRevalidate(request));
  else if (path === "/api/state") event.respondWith(networkFirst(request, PAGES_CACHE));
  else if (request.mode === "navigate") event.respondWith(networkFirst(request, PAGES_CACHE, "/"));
});

/*
 * Notificações de avisos (ver app/api/cron/tick). O servidor envia
 * { title, body, url, tag }; tocar na notificação abre a página do aviso.
 */
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || "Portugal Agora", {
      body: payload.body || "",
      tag: payload.tag,
      renotify: Boolean(payload.tag),
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      lang: payload.url && payload.url.startsWith("/en") ? "en-GB" : "pt-PT",
      data: { url: payload.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url === target);
      return open ? open.focus() : self.clients.openWindow(target);
    }),
  );
});
