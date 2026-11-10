/* =====================================================================
   Módulo operacional · Perto de mim (tela do motoboy)
   Usa o GPS do celular e mostra só os pontos com foto pendente dentro do
   raio escolhido. "Fiz as fotos" marca a foto como feita, com o nome de
   quem fez; a validação continua no escritório (Fotos por ponto/Gestão).
   ===================================================================== */
let PM = { pos: null, err: "", watch: null, raio: 1000, modo: "lista", sim: "" };
try {
  const r = +localStorage.getItem("pm_raio");
  if ([500, 1000, 3000, 5000].includes(r)) PM.raio = r;
  const m = localStorage.getItem("pm_modo");
  if (m === "lista" || m === "prox") PM.modo = m;
} catch (_) {}
const pmRad = (x) => (x * Math.PI) / 180;
function pmDist(a, b) {
  const R = 6371000,
    dLa = pmRad(b[0] - a[0]),
    dLo = pmRad(b[1] - a[1]),
    s = Math.sin(dLa / 2) ** 2 + Math.cos(pmRad(a[0])) * Math.cos(pmRad(b[0])) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
const pmKm = (m) => (m < 1000 ? Math.round(m / 10) * 10 + " m" : (m / 1000).toFixed(1).replace(".", ",") + " km");
const pmMin = (m) => Math.max(1, Math.round(m / 1000 / 0.35)); /* moto na cidade ~21 km/h */
function pmGps() {
  if (PM.watch != null || !navigator.geolocation) {
    if (!navigator.geolocation) PM.err = "Este aparelho não informa a localização.";
    return;
  }
  PM.watch = navigator.geolocation.watchPosition(
    (p) => {
      const novo = [p.coords.latitude, p.coords.longitude],
        mudou = !PM.pos || pmDist(PM.pos, novo) > 25;
      PM.pos = novo;
      PM.err = "";
      if (mudou && view === "pm" && !PM.sim) pmPinta();
    },
    (e2) => {
      PM.err =
        e2.code === 1
          ? "Permita o acesso à localização no navegador para ver os pontos perto de você."
          : "Não consegui pegar a sua localização agora. Tente de novo em instantes.";
      if (view === "pm") pmPinta();
    },
    { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 },
  );
}
/* pontos com foto pendente (pendente/refazer) de clientes no ar hoje */
function pmPontos(onde) {
  const m = new Map();
  tasks().forEach((t) => {
    if (!vig(t.vt) || !(t.status === "pendente" || t.status === "refazer")) return;
    let g = m.get(t.p.id);
    if (!g) m.set(t.p.id, (g = { p: t.p, L: [] }));
    g.L.push(t);
  });
  const arr = [...m.values()],
    sem = arr.filter((g) => !g.p.ll),
    com = arr
      .filter((g) => g.p.ll)
      .map((g) => ((g.d = onde ? pmDist(onde, g.p.ll) : null), g))
      .sort((a, b) => (a.d || 0) - (b.d || 0));
  com.forEach((g) => g.L.sort((a, b) => (a.vt.ini || "9").localeCompare(b.vt.ini || "9")));
  return { com, sem };
}
const pmIr = (p) => "https://www.google.com/maps/dir/?api=1&destination=" + p.ll[0] + "," + p.ll[1] + "&travelmode=driving";
const pmWaze = (p) => "https://waze.com/ul?ll=" + p.ll[0] + "," + p.ll[1] + "&navigate=yes";
function pmCli(t) {
  const dn = typeof fpDiasNoAr === "function" ? fpDiasNoAr(t.vt) : 0;
  return `<div class="pm-cl"><span><b>${e(t.vt.cliente)}</b><small>${e((t.vt.ev && t.vt.ev.nome) || "")}${t.status === "refazer" && t.nota ? (t.vt.ev && t.vt.ev.nome ? " · " : "") + "refazer: " + e(t.nota) : ""}${dn >= 3 ? ` <i class="pm-atr">⚠ ${dn} dias no ar</i>` : ""}</small></span><span class="pm-st ${t.status === "refazer" ? "rf" : ""}">${t.status === "refazer" ? "Refazer" : "Pendente"}</span></div>`;
}
const pmBtns = (g) =>
  `<div class="pm-bt"><a class="pm-b" href="${pmIr(g.p)}" target="_blank" rel="noopener">🧭 Ir até lá</a><a class="pm-b w" href="${pmWaze(g.p)}" target="_blank" rel="noopener" title="Abrir no Waze">Waze</a><button type="button" class="pm-b pri" data-a="pmfez" data-v="${g.p.id}">📷 Fiz as fotos</button></div>`;
function pmCorpo() {
  const sim = PM.sim ? PMf(PM.sim) : null,
    onde = sim && sim.ll ? sim.ll : PM.pos;
  const { com, sem } = pmPontos(onde);
  const total = com.length + sem.length;
  let gps;
  if (sim) gps = `<span class="pm-pu sim"></span><span>Simulando que você está em <b>${e(sim.nome)}</b></span>`;
  else if (PM.pos) gps = `<span class="pm-pu"></span><span>Localização ativa · <b>${total} ${total === 1 ? "ponto pendente" : "pontos pendentes"}</b> no total</span>`;
  else if (PM.err) gps = `<span class="pm-pu off"></span><span>${e(PM.err)}</span>`;
  else gps = `<span class="pm-pu wait"></span><span>Procurando a sua localização…</span>`;
  let h = `<div class="pm-gps">${gps}</div>`;
  if (!onde) return h + `<div class="pm-vazio">Assim que o GPS responder, os pontos perto de você aparecem aqui.</div>`;
  const perto = com.filter((g) => g.d <= PM.raio),
    fora = com.filter((g) => g.d > PM.raio);
  if (!perto.length)
    h += `<div class="pm-vazio">Nenhuma foto pendente até ${pmKm(PM.raio)}.${fora.length ? `<br>O ponto pendente mais perto é <b>${e(fora[0].p.nome)}</b>, a ${pmKm(fora[0].d)}.` : total ? "" : "<br>Tudo em dia! 🎉"}</div>`;
  else if (PM.modo === "prox") {
    const g = perto[0];
    h += `<div class="pm-big"><small>MAIS PERTO AGORA</small><div class="pm-km">${pmKm(g.d).replace(/ (m|km)$/, "<span> $1</span>")}</div><div class="pm-min">≈ ${pmMin(g.d)} min</div><h3>${e(g.p.nome)}</h3><div class="pm-end">${e(g.p.end || "")}</div><div class="pm-cls">${g.L.map(pmCli).join("")}</div>${pmBtns(g)}</div>`;
    if (perto.length > 1)
      h +=
        `<div class="pm-sub">Depois desse</div>` +
        perto
          .slice(1)
          .map((x) => `<div class="pm-mini"><b>${e(x.p.nome)}<small>${x.L.map((t) => e(t.vt.cliente)).join(" · ")}</small></b><em>${pmKm(x.d)}</em></div>`)
          .join("");
  } else
    h += perto
      .map(
        (g) =>
          `<div class="pm-card"><div class="pm-dist"><b>${pmKm(g.d)}</b><small>≈ ${pmMin(g.d)} min</small></div><h4>${e(g.p.nome)}</h4><div class="pm-end">${e(g.p.end || "")}${g.p.tp ? " · " + e(g.p.tp) : ""}</div>${g.L.map(pmCli).join("")}${pmBtns(g)}</div>`,
      )
      .join("");
  if (perto.length && fora.length)
    h += `<div class="pm-fora">Mais ${fora.length} ${fora.length === 1 ? "ponto pendente" : "pontos pendentes"} fora do raio · o mais perto é <b>${e(fora[0].p.nome)}</b>, a ${pmKm(fora[0].d)}</div>`;
  if (sem.length)
    h += `<div class="pm-fora">${sem.length} ${sem.length === 1 ? "ponto pendente não tem" : "pontos pendentes não têm"} coordenada cadastrada e não ${sem.length === 1 ? "aparece" : "aparecem"} aqui: ${sem.map((g) => e(g.p.nome)).join(", ")}.</div>`;
  return h;
}
function pmPinta() {
  const c = $("pmc");
  if (c) c.innerHTML = pmCorpo();
}
function pertoDeMim() {
  pmGps();
  const R = [500, 1000, 3000, 5000];
  const quem = `<select data-a="msel" class="pm-sel">${MOTOS.map((m) => `<option ${m === moto ? "selected" : ""}>${e(m)}</option>`).join("")}</select>`;
  const simSel = `<select data-a="pmsim" class="pm-sel"><option value="">Minha localização real (GPS)</option>${ALL()
    .filter((p) => p.ll)
    .map((p) => `<option value="${p.id}" ${PM.sim === p.id ? "selected" : ""}>Simular: ${e(p.nome)}</option>`)
    .join("")}</select>`;
  return `<div class="fpw pmw"><div class="fp-blob a"></div><div class="fp-blob b"></div><div class="fp-in">
<div class="pm-top"><div><small>Tela do motoboy</small><h1>📸 Fotos <i>perto de você</i></h1></div><div class="pm-quem"><span>Fotos feitas por</span>${quem}</div></div>
<div class="pm-modo"><button class="${PM.modo === "lista" ? "on" : ""}" data-a="pmmodo" data-v="lista">📋 Lista</button><button class="${PM.modo === "prox" ? "on" : ""}" data-a="pmmodo" data-v="prox">🎯 Próximo ponto</button></div>
<div class="pm-raio">${R.map((r) => `<button class="${PM.raio === r ? "on" : ""}" data-a="pmraio" data-v="${r}">${r < 1000 ? r + " m" : r / 1000 + " km"}</button>`).join("")}</div>
<div id="pmc">${pmCorpo()}</div>
<div class="pm-teste"><span>🧪 Teste no escritório</span>${simSel}</div></div></div>`;
}
