/* =====================================================================
   Módulo operacional · Tela do usuário de Manutenção (celular)
   (arquivo 10 de 13; carregados em ordem pelo index.html)
   ===================================================================== */

const eMan = () => CLD && ROLE === "manutencao";
const MAN_OK = new Set([
  "col",
  "mtw",
  "mtat",
  "mtdo",
  "mtcf",
  "mtcx",
  "mtf",
  "mtg",
  "mtoeld",
  "mcp",
  "mwcopy",
  "mwsel",
  "sair",
]);
let mtF = "ir",
  mtG = "prio",
  mtO = null,
  mtM = "";
const mtCor = (i) => ["#e5484d", "#f59e0b", "#eab308", "#22c55e"][Math.min(Math.max(i, 0), 3)];
const mtUser = () => (PERFIL && (PERFIL.nome || PERFIL.email)) || "";
function mtCard(m) {
  const p = PMf(m.pid),
    pi = prI(m.prio),
    now = Date.now(),
    atr = m.pz && m.pz < now && m.status !== "resolvida";
  let pz = "";
  if (m.pz && m.status !== "resolvida") {
    const h = (m.pz - now) / 36e5,
      q = (x) => (x < 48 ? Math.max(1, Math.round(x)) + " h" : Math.round(x / 24) + " dias");
    pz =
      h < 0
        ? `<div class="pz r">⏰ ATRASADO há ${q(-h)} (prazo ${dh(m.pz)})</div>`
        : `<div class="pz ${h < 24 ? "o" : ""}">⏱ Prazo ${dh(m.pz)} · faltam ${q(h)}</div>`;
  }
  let vb = "";
  if (m.status === "moto")
    vb = `<div class="mtv w">⏳ <b>Aguardando verificação prévia</b> do motoboy ${e(m.moto || "")}. Ainda não confirmado.</div>`;
  else if (m.vnota)
    vb = `<div class="mtv">🏍️ <b>${e(m.moto || "Motoboy")}</b> verificou no local${m.vts ? " (" + dh(m.vts) + ")" : ""}:<br><b>“${e(m.vnota)}”</b></div>`;
  else vb = `<div class="mtv n">Chamado direto, sem verificação prévia do motoboy.</div>`;
  const at = m.at
      ? `<div class="mtv n">🔧 Em atendimento desde ${dh(m.at)}${m.atby ? " por " + e(m.atby) : ""}</div>`
      : "",
    pn = m.pnota
      ? `<div class="mtv p">⚠ <b>Pendência</b>${m.pts ? " (" + dh(m.pts) + ")" : ""}: ${e(m.pnota)}</div>`
      : "";
  let ac = "";
  if (m.status === "resolvida")
    ac = `<div class="mtv n">✅ Resolvida ${m.rts ? dh(m.rts) : ""}${m.rby ? " por " + e(m.rby) : ""}${m.snota ? " — " + e(m.snota) : ""}</div>`;
  else {
    const open = mtO === m.id;
    const nt = open
      ? `<div class="nt"><input id="mtn" placeholder="${mtM === "pend" ? "O que falta? (peça, acesso, etc.)" : "O que foi feito? (opcional)"}"><button class="${mtM === "pend" ? "" : "ok"}" data-a="mtcf" data-v="${m.id}" style="flex:0 0 auto;padding:11px 16px;border-radius:12px;font-weight:700;border:1.5px solid var(--bd);${mtM === "pend" ? "" : "color:#fff"}">${mtM === "pend" ? "Salvar pendência" : "Confirmar conclusão"}</button><button data-a="mtcx" style="flex:0 0 auto;padding:11px 14px;border-radius:12px;border:1.5px solid var(--bd);background:#fff">Cancelar</button></div>`
      : "";
    ac =
      (m.status === "moto"
        ? `<div class="ac"><button class="go" data-a="mtoeld" data-v="${m.id}">Assumir direto (sem esperar o motoboy)</button>${p ? `<a href="${mapa(p)}" target="_blank" rel="noopener">📍 Mapa</a>` : ""}</div>`
        : `<div class="ac">${p ? `<a class="go" href="${mapa(p)}" target="_blank" rel="noopener">📍 Abrir no mapa</a>` : ""}${m.at ? "" : `<button data-a="mtat" data-v="${m.id}">▶ Iniciar atendimento</button>`}<button class="ok" data-a="mtdo" data-v="${m.id}|done">✔ Concluir</button><button data-a="mtdo" data-v="${m.id}|pend">⚠ Pendência</button></div>`) +
      nt;
  }
  return `<div class="mtc" style="--pc:${pi >= 0 ? mtCor(pi) : "#94a3b8"}"><div class="h"><b>${p ? e(p.nome) : "(ponto removido)"}</b>${pi >= 0 ? `<span class="pr">${e(prN(m.prio))}</span>` : ""}</div>${p ? `<div class="ad">📍 ${e(p.end || "")}${p && rg(p) ? " · <b>" + e(rg(p)) + "</b>" : ""}</div>` : ""}<div class="df">🔧 ${e(m.def)}</div>${vb}${pz}${at}${pn}${ac}</div>`;
}

const mtNome = () => {
  const n = ((PERFIL && PERFIL.nome) || "").split(/[\s\-–]+/)[0] || "";
  return n ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : "colega";
};
let mtW = true;
const mtDT = () => {
  const d = new Date();
  return (
    d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }) +
    ", " +
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
};
const mtRes = () => {
  const now = Date.now(),
    ab = S.manut.filter((m) => m.status !== "resolvida");
  return {
    ir: ab.filter((m) => m.status === "eld").length,
    ver: ab.filter((m) => m.status === "moto").length,
    atr: ab.filter((m) => m.pz && m.pz < now).length,
    conf: ab.filter((m) => m.status === "eld" && m.vnota).length,
  };
};
function mtHero() {
  const r = mtRes();
  return `<div class="mth2"><div class="hi">Olá, ${e(mtNome())}! 👋</div><div class="dtl">Bem-vindo ao software de manutenção da Mega OOH</div><div class="dtl">Hoje é <b id="mtclk">${e(mtDT())}</b></div><div class="rs"><span>🔧 ${r.ir} para ir</span>${r.conf ? `<span>🏍️ ${r.conf} confirmado${r.conf > 1 ? "s" : ""} pelo motoboy</span>` : ""}<span>⏳ ${r.ver} aguardando verificação</span>${r.atr ? `<span class="r">⏰ ${r.atr} atrasado${r.atr > 1 ? "s" : ""}</span>` : ""}</div></div>`;
}
function mtWelcome() {
  if (!mtW || !eMan()) return "";
  const r = mtRes(),
    h = new Date().getHours(),
    g = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  return `<div id="mtw"><div class="bx"><img src="${LOGO_W}" alt="Mega OOH"><h2>Olá, ${e(mtNome())}! 👋</h2><p>${g}, bem-vindo ao <b>software de manutenção da Mega OOH</b>.</p><p>Hoje é <b>${e(mtDT())}</b>.</p><p>Temos estas verificações pendentes:</p><div class="big"><div><b>${r.ir}</b><span>PARA IR</span></div><div><b>${r.ver}</b><span>AGUARDANDO MOTOBOY</span></div><div class="r"><b>${r.atr}</b><span>ATRASADOS</span></div></div><button data-a="mtw">Ver meus chamados</button></div></div>`;
}
setInterval(() => {
  const c = document.getElementById("mtclk");
  if (c) c.textContent = mtDT();
}, 20000);
function mtec() {
  const now = Date.now(),
    ab = S.manut.filter((m) => m.status !== "resolvida"),
    eld = ab.filter((m) => m.status === "eld"),
    mo = ab.filter((m) => m.status === "moto"),
    atr = ab.filter((m) => m.pz && m.pz < now),
    conf = eld.filter((m) => m.vnota),
    hj = S.manut.filter(
      (m) =>
        m.status === "resolvida" && m.rts && new Date(m.rts).toDateString() === new Date().toDateString(),
    );
  const K = (n, t, c) => `<div style="--c:${c}"><b>${n}</b><span>${t}</span></div>`;
  let h =
    mtHero() +
    `<div class="mtk">${K(eld.length, "Para ir agora", "#1B1F7A")}${K(atr.length, "Atrasados", "#e5484d")}${K(conf.length, "Defeito confirmado pelo motoboy", "#16a34a")}${K(hj.length, "Resolvidos hoje", "#0ea5e9")}</div>`;
  const F = [
    ["ir", "Para ir (" + eld.length + ")"],
    ["conf", "Confirmados pelo motoboy (" + conf.length + ")"],
    ["atras", "Atrasados (" + atr.length + ")"],
    ["ver", "Aguardando motoboy (" + mo.length + ")"],
    ["todos", "Todos (" + ab.length + ")"],
  ];
  h += `<div class="mtbar">${F.map(([k, t]) => `<span class="chip ${mtF === k ? "sel" : ""}" data-a="mtf" data-v="${k}">${t}</span>`).join("")}<span class="sp"></span><span class="chip ${mtG === "prio" ? "sel" : ""}" data-a="mtg" data-v="prio">Por prioridade</span><span class="chip ${mtG === "reg" ? "sel" : ""}" data-a="mtg" data-v="reg">Por região</span></div>`;
  const L = { ir: eld, conf, atras: atr, ver: mo, todos: ab }[mtF].slice().sort(mSort);
  if (L.length) {
    const pts = [...new Map(L.filter((m) => PMf(m.pid)).map((m) => [m.pid, PMf(m.pid)])).values()].slice(
      0,
      9,
    );
    if (pts.length)
      h += `<div class="mtbar"><a class="chip" style="text-decoration:none" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/${pts.map((p) => encodeURIComponent(qs(p))).join("/")}">🧭 Montar rota no Google Maps (${pts.length} ponto${pts.length > 1 ? "s" : ""})</a><span class="chip" data-a="mwcopy">📋 Copiar lista</span></div><textarea id="mwtxt" style="display:none">${e(mMsg("all"))}</textarea>`;
    const groups =
      mtG === "prio"
        ? (() => {
            const ids = [...new Set(L.map((m) => m.prio))].sort(
              (a, b) => (prI(a) < 0 ? 99 : prI(a)) - (prI(b) < 0 ? 99 : prI(b)),
            );
            return ids.map((id) => ({
              t: pEmo(id) + " " + (prN(id) || "Sem prioridade"),
              L: L.filter((m) => m.prio === id),
            }));
          })()
        : (() => {
            const rs = [
              ...new Set(
                L.map((m) => {
                  const p = PMf(m.pid);
                  return p ? rg(p) : "Outros";
                }),
              ),
            ].sort((a, b) => a.localeCompare(b, "pt-BR"));
            return rs.map((r) => ({
              t: "📍 " + r,
              L: L.filter((m) => {
                const p = PMf(m.pid);
                return (p ? rg(p) : "Outros") === r;
              }),
            }));
          })();
    groups.forEach((g) => {
      h += `<div class="mth">${e(g.t)} <i>${g.L.length} chamado${g.L.length > 1 ? "s" : ""}</i></div><div class="mtgrid">${g.L.map(mtCard).join("")}</div>`;
    });
  } else
    h += `<div class="card mu" style="text-align:center;padding:30px">🎉 Nenhum chamado neste filtro.</div>`;
  const r = S.manut
    .filter((m) => m.status === "resolvida" && m.rts && now - m.rts < 7 * 864e5)
    .sort((a, b) => b.rts - a.rts);
  h += `<div class="mth" data-a="col" data-v="mtres" style="cursor:pointer">${S.col.mtres ? "▾" : "▸"} Resolvidos nos últimos 7 dias (${r.length})</div>${S.col.mtres ? `<div class="mtgrid">${r.map(mtCard).join("")}</div>` : ""}`;
  return h;
}
const LOGO_W = "assets/logo-branca.png";
const MV_ICO = {
  pl: "📡",
  d: "🏠",
  g: "📋",
  fp: "📸",
  r: "🗺️",
  m: "🏍️",
  pm: "📍",
  k: "✅",
  c: "📦",
  t: "🔧",
  x: "📌",
  i: "🪧",
  e: "🏢",
  ev: "🎪",
  a: "⚙️",
  o: "📊",
};
const MV_NAME = {
  pl: "Players",
  d: "Início",
  o: "Gerência e Operação",
  g: "Gestão",
  fp: "Fotos por ponto",
  r: "Rotas",
  m: "Motoboy",
  pm: "Perto de mim",
  k: "Checking",
  c: "Concluídos",
  t: "Manutenção",
  x: "Fixos",
  i: "Instalação",
  e: "Estáticos",
  ev: "Eventos",
  a: "Admin",
};
