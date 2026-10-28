/* Service worker: guarda la app en el dispositivo para usarla sin conexión.
   Para publicar una actualización, cambiá el número de VERSION (v2 -> v3 -> ...). */
var VERSION = "v2";
var CACHE = "bingo-disfraces-" + VERSION;
var FILES = [
  "./", "./index.html", "./manifest.webmanifest",
  "./icon-180.png", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png"
];

self.addEventListener("install", function (e) {
  // cache:"reload" evita guardar una copia vieja que tenga el navegador
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(FILES.map(function (f) {
      return fetch(new Request(f, { cache: "reload" })).then(function (r) {
        if (!r.ok) throw new Error("No se pudo descargar " + f);
        return c.put(f, r);
      });
    }));
  }));
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// Responde al instante desde el dispositivo (sin internet funciona igual)
// y, si hay internet, actualiza la copia guardada en segundo plano.
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(req, { ignoreSearch: true }).then(function (hit) {
        var net = fetch(req).then(function (res) {
          if (res && res.ok && res.type === "basic") cache.put(req, res.clone());
          return res;
        }).catch(function () { return null; });
        if (hit) { e.waitUntil(net); return hit; }
        return net.then(function (res) { return res || cache.match("./index.html"); });
      });
    })
  );
});
