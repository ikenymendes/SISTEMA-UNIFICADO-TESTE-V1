/* =====================================================================
   Módulo operacional · Perto de mim (tela do motoboy)
   Usa o GPS do celular e mostra só os pontos com foto pendente dentro do
   raio escolhido. "Fiz as fotos" marca a foto como feita, com o nome de
   quem fez; a validação continua no escritório (Fotos por ponto/Gestão).
   ===================================================================== */
let PM = { pos: null, err: "", watch: null, modo: "lista", sim: "" };
/* usuário com perfil Motoboy: só enxerga esta tela */
const eMoto = () => typeof CLD !== "undefined" && CLD && ROLE === "motoboy";
const MOTO_OK = new Set(["pmmodo", "pmfez", "pmfez1", "pmdesf", "pmprob", "pmprobc", "pmprobok", "pmprobx", "pmmot", "pmundo", "sair"]);
/* nome do motoboy logado, igual ao da lista de motoboys (Thiago, Alan...) */
function motoLogado() {
  const n = String((PERFIL && (PERFIL.nome || PERFIL.email)) || "").trim(),
    p = n.split(/[ @.]/)[0].toLowerCase();
  return MOTOS.find((m) => m.toLowerCase() === n.toLowerCase() || m.toLowerCase().split(" ")[0] === p) || n.split(" ")[0] || n;
}
try {
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
/* motivos do "Tenho um problema" */
const PM_PROB = [
  ["video", "O vídeo do cliente não está passando"],
  ["tela", "Tela apagada ou com defeito"],
  ["acesso", "Não consegui chegar / local fechado"],
  ["outro", "Outro problema"],
];
const pmProbTxt = (k) => (PM_PROB.find((x) => x[0] === k) || [k, k])[1];
PM.rec = PM.rec || {}; /* fotos marcadas nesta sessão: continuam na tela com "Desfazer" por 15 min */
PM.sheet = null; /* chave do cliente com o "Tenho um problema" aberto */
PM.toast = null;
const pmRecente = (k) => PM.rec[k] && Date.now() - PM.rec[k] < 15 * 6e4;
/* pontos com foto pendente (pendente/refazer) de clientes no ar hoje */
function pmPontos(onde) {
  const m = new Map();
  tasks(true).forEach((t) => {
    if (!vig(t.vt) || (t.vt.man && t.vt.conc)) return;
    const pend = t.status === "pendente" || t.status === "refazer";
    if (!pend && !(t.status === "feita" && pmRecente(t.key))) return;
    let g = m.get(t.p.id);
    if (!g) m.set(t.p.id, (g = { p: t.p, L: [] }));
    g.L.push(t);
  });
  const arr = [...m.values()].filter((g) => g.L.some((t) => t.status === "pendente" || t.status === "refazer" || pmRecente(t.key))),
    sem = arr.filter((g) => !g.p.ll),
    com = arr
      .filter((g) => g.p.ll)
      .map((g) => ((g.d = onde ? pmDist(onde, g.p.ll) : null), g))
      .sort((a, b) => (a.d || 0) - (b.d || 0));
  com.forEach((g) => g.L.sort((a, b) => (a.vt.ini || "9").localeCompare(b.vt.ini || "9")));
  return { com, sem };
}
/* resumo do dia (topo e boas-vindas) */
function pmResumo() {
  const hj = fvDia(Date.now()),
    r = { fotos: 0, pontos: new Set(), atr: 0, rf: 0, prob: 0, feitas: 0 };
  tasks(true).forEach((t) => {
    const f = S.fotos[t.key] || {};
    if (f.fts && fvDia(f.fts) === hj && (!eMoto() || !f.by || f.by === moto)) r.feitas++;
    if (!vig(t.vt) || (t.vt.man && t.vt.conc)) return;
    if (t.status !== "pendente" && t.status !== "refazer") return;
    if (f.prob) {
      r.prob++;
      return;
    }
    r.fotos++;
    r.pontos.add(t.p.id);
    if (t.status === "refazer") r.rf++;
    if (fpDiasNoAr(t.vt) >= 3) r.atr++;
  });
  r.pontos = r.pontos.size;
  return r;
}
const pmIr = (p) => "https://www.google.com/maps/dir/?api=1&destination=" + p.ll[0] + "," + p.ll[1] + "&travelmode=driving";
const pmWaze = (p) => "https://waze.com/ul?ll=" + p.ll[0] + "," + p.ll[1] + "&navigate=yes";
function pmCli(t) {
  const f = S.fotos[t.key] || {},
    dn = fpDiasNoAr(t.vt),
    camp = (t.vt.ev && t.vt.ev.nome) || "";
  if (t.status === "feita")
    return `<div class="pm-cl done"><span><b>${e(t.vt.cliente)}</b><small>✓ feita agora · aguardando validação</small></span><div class="pm-mb"><button type="button" data-a="pmdesf" data-v="${t.key}">Desfazer</button></div></div>`;
  if (f.prob)
    return `<div class="pm-cl prob"><span><b>${e(t.vt.cliente)}</b><small class="pp">⚠ Problema enviado: ${e(pmProbTxt(f.prob))} · aguardando escritório</small></span><div class="pm-mb"><button type="button" data-a="pmprobx" data-v="${t.key}">Desfazer</button></div></div>`;
  const sub = [camp ? e(camp) : "", t.status === "refazer" && t.nota ? "refazer: " + e(t.nota) : t.status === "refazer" ? "refazer" : "", dn >= 3 ? `<i class="pm-atr">⚠ ${dn} dias no ar</i>` : ""]
    .filter(Boolean)
    .join(" · ");
  return `<div class="pm-cl"><span><b>${e(t.vt.cliente)}</b>${sub ? `<small>${sub}</small>` : ""}</span><div class="pm-mb"><button type="button" class="ok" data-a="pmfez1" data-v="${t.key}">✓ Fiz</button><button type="button" class="pr" data-a="pmprob" data-v="${t.key}" title="Tenho um problema" aria-label="Tenho um problema">⚠</button></div></div>`;
}
const pmPend = (g) => g.L.filter((t) => (t.status === "pendente" || t.status === "refazer") && !(S.fotos[t.key] || {}).prob).length;
const pmBtns = (g) =>
  `<div class="pm-bt"><a class="pm-b" href="${pmIr(g.p)}" target="_blank" rel="noopener">🧭 Rota</a><a class="pm-b w" href="${pmWaze(g.p)}" target="_blank" rel="noopener" title="Abrir no Waze">Waze</a>${
    pmPend(g) > 1 ? `<button type="button" class="pm-b pri" data-a="pmfez" data-v="${g.p.id}">📷 Fiz todas</button>` : ""
  }</div>`;
function pmHero() {
  const r = pmResumo();
  if (!r.fotos)
    return `<div class="pm-hero ok"><small>HOJE</small><div class="pm-hn"><b>🎉</b><span>Nenhuma foto pendente agora${r.feitas ? ` · ${r.feitas} feitas hoje` : ""}</span></div>${r.prob ? `<div class="pm-hch"><span class="pb">⚠ ${r.prob} com problema · aguardando escritório</span></div>` : ""}</div>`;
  return `<div class="pm-hero"><small>HOJE VOCÊ TEM</small><div class="pm-hn"><b>${r.fotos}</b><span>${r.fotos === 1 ? "foto" : "fotos"} em ${r.pontos} ${r.pontos === 1 ? "ponto" : "pontos"}</span></div><div class="pm-hch">${r.atr ? `<span class="a">⚠ ${r.atr} ${r.atr === 1 ? "atrasada" : "atrasadas"}</span>` : ""}${r.rf ? `<span class="r">↺ ${r.rf} refazer</span>` : ""}${r.prob ? `<span class="pb">⚠ ${r.prob} com problema</span>` : ""}<span class="o">✓ ${r.feitas} ${r.feitas === 1 ? "feita" : "feitas"} hoje</span></div></div>`;
}
function pmSheet() {
  const k = PM.sheet;
  if (!k) return "";
  const t = tasks(true).find((x) => x.key === k);
  if (!t) return "";
  const esc0 = PM.motivo || "video";
  return `<div class="pm-dim" data-a="pmprobc"></div><div class="pm-sheet" role="dialog" aria-label="Tenho um problema"><div class="pm-gr"></div><h3>⚠ Tenho um problema</h3><p>${e(t.vt.cliente)} · ${e(t.p.nome)} · o escritório recebe na hora</p>${PM_PROB.map(
    ([v, txt]) => `<button type="button" class="pm-op${esc0 === v ? " on" : ""}" data-a="pmmot" data-v="${v}"><i></i>${e(txt)}</button>`,
  ).join("")}<textarea id="pmtx" rows="2" maxlength="300" placeholder="Detalhes (opcional): ex. esperei 10 min e o vídeo não apareceu">${e(PM.probTxt || "")}</textarea><div class="pm-sb"><button type="button" data-a="pmprobc">Cancelar</button><button type="button" class="pri" data-a="pmprobok">Enviar problema</button></div></div>`;
}
function pmToast() {
  const t = PM.toast;
  if (!t || Date.now() - t.ts > 8000) return "";
  return `<div class="pm-toast ${t.cor || ""}"><span>${t.txt}</span>${t.undo ? `<button type="button" data-a="pmundo">Desfazer</button>` : ""}</div>`;
}
function pmCorpo() {
  const sim = PM.sim ? PMf(PM.sim) : null,
    onde = sim && sim.ll ? sim.ll : PM.pos;
  const { com, sem } = pmPontos(onde);
  let gps;
  if (sim) gps = `<span class="pm-pu sim"></span><span>Simulando que você está em <b>${e(sim.nome)}</b></span>`;
  else if (PM.pos) gps = `<span class="pm-pu"></span><span>GPS ativo · do mais perto para o mais longe</span>`;
  else if (PM.err) gps = `<span class="pm-pu off"></span><span>${e(PM.err)}</span>`;
  else gps = `<span class="pm-pu wait"></span><span>Procurando a sua localização…</span>`;
  let h = pmHero() + `<div class="pm-gps">${gps}</div>`;
  if (!onde) return h + `<div class="pm-vazio">Assim que o GPS responder, os pontos perto de você aparecem aqui.</div>` + pmSheet() + pmToast();
  const perto = com; /* raio automático: todos os pendentes, sempre do mais perto para o mais longe */
  if (!perto.length) h += `<div class="pm-vazio">${sem.length ? "Os pontos pendentes ainda não têm coordenada cadastrada." : "Nenhuma foto pendente agora. Tudo em dia! 🎉"}</div>`;
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
  if (sem.length)
    h += `<div class="pm-fora">${sem.length} ${sem.length === 1 ? "ponto pendente não tem" : "pontos pendentes não têm"} coordenada cadastrada e não ${sem.length === 1 ? "aparece" : "aparecem"} aqui: ${sem.map((g) => e(g.p.nome)).join(", ")}.</div>`;
  return h + pmSheet() + pmToast();
}
/* ações do motoboy */
function pmMarcar(L) {
  const falta = [],
    feitos = [];
  L.forEach((t) => {
    const fi = fotoInfo(t);
    if (fi && !fi.ok) falta.push(t.vt.cliente);
    else {
      setF(t.key, { status: "feita", nota: "", by: moto, fts: Date.now() });
      PM.rec[t.key] = Date.now();
      feitos.push(t.key);
    }
  });
  if (feitos.length)
    (clearTimeout(PM.tt), (PM.tt = setTimeout(pmPinta, 8100)), (PM.toast = { txt: "✓ " + feitos.length + (feitos.length === 1 ? " foto enviada" : " fotos enviadas") + " para validação", undo: { tipo: "fez", keys: feitos }, ts: Date.now() }));
  $("warn").innerHTML = falta.length
    ? '<div class="warn">' + e(falta.join(", ")) + ": este cliente exige fotos de início e fim. Fale com o escritório.</div>"
    : "";
}
function pmDesfazer(keys) {
  keys.forEach((k) => {
    const f = S.fotos[k] || {};
    if (f.status === "feita") setF(k, { status: f.nota ? "refazer" : "pendente", fts: 0 });
    delete PM.rec[k];
  });
}
function pmPinta() {
  const c = $("pmc");
  if (c) c.innerHTML = pmCorpo();
}
function pertoDeMim() {
  pmGps();
  const mot = eMoto();
  const quem = `<select data-a="msel" class="pm-sel">${MOTOS.map((m) => `<option ${m === moto ? "selected" : ""}>${e(m)}</option>`).join("")}</select>`;
  const simSel = `<select data-a="pmsim" class="pm-sel"><option value="">Minha localização real (GPS)</option>${ALL()
    .filter((p) => p.ll)
    .map((p) => `<option value="${p.id}" ${PM.sim === p.id ? "selected" : ""}>Simular: ${e(p.nome)}</option>`)
    .join("")}</select>`;
  const sauda = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  })();
  return `<div class="fpw pmw${mot ? " moto" : ""}"><div class="fp-blob a"></div><div class="fp-blob b"></div><div class="fp-in">
<div class="pm-top"><div><small>${mot ? sauda + ", " + e(String(moto).split(" ")[0]) + " 👋" : "Tela do motoboy"}</small><h1>📸 Fotos <i>perto de você</i></h1></div>${mot ? `<button type="button" class="pm-sair" data-a="sair" title="Sair">Sair</button>` : `<div class="pm-quem"><span>Fotos feitas por</span>${quem}</div>`}</div>
<div class="pm-modo"><button class="${PM.modo === "lista" ? "on" : ""}" data-a="pmmodo" data-v="lista">📋 Lista</button><button class="${PM.modo === "prox" ? "on" : ""}" data-a="pmmodo" data-v="prox">🎯 Próximo ponto</button></div>
<div id="pmc">${pmCorpo()}</div>
${mot ? "" : `<div class="pm-teste"><span>🧪 Teste no escritório</span>${simSel}</div>`}</div></div>`;
}
