/* =====================================================================
   Service worker do Sistema Mega (app instalado no celular)
   - Não guarda o sistema em cache: cada abertura busca a versão nova
     (assim as atualizações publicadas aparecem na hora).
   - Sem internet, mostra uma tela simples avisando.
   - Já preparado para receber notificações (push) na próxima etapa.
   ===================================================================== */
const VERSAO = "mega-app-20261113j";
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
  /* sempre a página nova (sem cache do navegador), para as atualizações aparecerem na hora no celular */
  ev.respondWith(fetch(r.url, { cache: "no-store", credentials: "same-origin" }).catch(() => fetch(r)).catch(() => caches.match(OFFLINE)));
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
  const d = ev.notification.data || {},
    abrir = d.abrir || "",
    url = new URL(d.url || (abrir ? "./?abrir=" + encodeURIComponent(abrir) : "./"), self.registration.scope).href;
  ev.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ws) => {
      /* sistema aberto: traz para a frente e pede para abrir a tela do aviso */
      const w = ws.find((x) => x.url.startsWith(self.registration.scope) && !/\/modulos\//.test(x.url)) || ws.find((x) => x.url.startsWith(self.registration.scope));
      if (w) {
        if (abrir) w.postMessage({ tipo: "abrir", abrir });
        return w.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
