/*
 * Service worker do Portugal Agora.
 * - Ficheiros estáticos (JS, CSS, fontes, limites geográficos): cache primeiro.
 * - Páginas e /api/state: rede primeiro; sem rede, a última versão guardada.
 * - Notificações de avisos (push), no fim do ficheiro.
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
