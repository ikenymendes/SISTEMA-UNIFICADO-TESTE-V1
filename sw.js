/* =====================================================================
   Service worker do Sistema Mega (app instalado no celular)
   - Não guarda o sistema em cache: cada abertura busca a versão nova
     (assim as atualizações publicadas aparecem na hora).
   - Sem internet, mostra uma tela simples avisando.
   - Já preparado para receber notificações (push) na próxima etapa.
   ===================================================================== */
const VERSAO = "mega-app-20261110a";
const OFFLINE = "offline.html";

self.addEventListener("install", (ev) => {
  ev.waitUntil(
    caches.open(VERSAO).then((c) => c.addAll([OFFLINE, "core/assets/app/icone-192.png"])).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (ev) => {
  ev.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/* Só cuida da abertura das páginas: tenta a internet; se não der, tela "sem conexão". */
self.addEventListener("fetch", (ev) => {
  const r = ev.request;
  if (r.mode !== "navigate") return;
  ev.respondWith(fetch(r).catch(() => caches.match(OFFLINE)));
});

/* ---- notificações (usadas na etapa 2) ---- */
self.addEventListener("push", (ev) => {
  let d = {};
  try {
    d = ev.data ? ev.data.json() : {};
  } catch (_) {
    d = { titulo: "Mega", texto: ev.data ? ev.data.text() : "" };
  }
  ev.waitUntil(
    self.registration.showNotification(d.titulo || "Mega", {
      body: d.texto || "",
      icon: "core/assets/app/icone-192.png",
      badge: "core/assets/app/icone-192.png",
      tag: d.tag || undefined,
      data: { url: d.url || "./" },
    }),
  );
});

self.addEventListener("notificationclick", (ev) => {
  ev.notification.close();
  const url = new URL((ev.notification.data && ev.notification.data.url) || "./", self.registration.scope).href;
  ev.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ws) => {
      for (const w of ws) if (w.url.startsWith(self.registration.scope)) return w.focus();
      return self.clients.openWindow(url);
    }),
  );
});
