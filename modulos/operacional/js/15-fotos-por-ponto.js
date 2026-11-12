/* =====================================================================
   Módulo operacional · Fotos por ponto
   Cada ponto vira um cartão: quais clientes estão no ar ali e quem ainda
   precisa de foto. Busca por endereço, nome do ponto, região ou cliente.
   ===================================================================== */
let fpQ = "",
  fpF = "p",
  fpOpen = null, /* cliente (chave vt__ponto) com o menu de foto aberto */
  fpFixo = null; /* ponto que continua visível enquanto você mexe nele */
const fpN = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
/* grifa o termo buscado sem perder acentos */
function fpMark(txt, q) {
  const t = String(txt || "");
  if (!q) return e(t);
  const n = fpN(t),
    i = n.indexOf(q);
  if (i < 0) return e(t);
  return e(t.slice(0, i)) + "<mark>" + e(t.slice(i, i + q.length)) + "</mark>" + e(t.slice(i + q.length));
}
/* dias desde o início da campanha (0 = começou hoje) */
const fpDiasNoAr = (v) =>
  v.ini ? Math.round((new Date(dia() + "T12:00:00") - new Date(v.ini + "T12:00:00")) / 864e5) : 0;
const FP_ATRASO = 3; /* alerta: 3 dias no ar sem foto feita ou sem verificar */
const fpAtrasado = (c) => c.st !== "validada" && fpDiasNoAr(c.v) >= FP_ATRASO;
const FP_ST = { pendente: "p", refazer: "p", feita: "f", validada: "v" },
  FP_TXT = { pendente: "Pendente", refazer: "Refazer", feita: "A validar", validada: "Validada" };
/* pontos com clientes no ar hoje */
function fpPontos() {
  const m = new Map();
  tasks(true).forEach((t) => {
    const v = t.vt;
    if (!vig(v) || (v.man && v.conc)) return;
    let g = m.get(t.p.id);
    if (!g) m.set(t.p.id, (g = { p: t.p, cli: [] }));
    g.cli.push({ v, key: t.key, st: t.status, nota: t.nota, by: t.by, fts: (S.fotos[t.key] || {}).fts || 0 });
  });
  return [...m.values()].map((g) => {
    const np = g.cli.filter((c) => FP_ST[c.st] === "p").length,
      nf = g.cli.filter((c) => FP_ST[c.st] === "f").length;
    g.k = np ? "p" : nf ? "f" : "v";
    g.n = np || nf;
    g.fim = g.cli.map((c) => c.v.fim || "9999").sort()[0];
    g.atr = g.cli.filter(fpAtrasado).length;
    /* prioridade = campanha que começou primeiro (a mais antiga sem foto vem antes) */
    g.ini = g.cli.filter((c) => c.st !== "validada").map((c) => c.v.ini || "9999").sort()[0] || "9999";
    const o = { p: 0, f: 1, v: 2 };
    g.cli.sort((a, b) => o[FP_ST[a.st]] - o[FP_ST[b.st]] || (a.v.ini || "9").localeCompare(b.v.ini || "9"));
    return g;
  });
}
function fpBusca(g, q) {
  if (!q) return true;
  return [g.p.nome, g.p.end, rg(g.p), g.p.tp]
    .concat(g.cli.map((c) => c.v.cliente + " " + ((c.v.ev && c.v.ev.nome) || "")))
    .some((x) => fpN(x).includes(q));
}
const FP_OK =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>';
/* "hoje 14:32", "ontem 09:10" ou "08/11 16:05" */
function fpQuando(ts) {
  if (!ts) return "";
  const d = new Date(ts),
    h = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    dd = d.toISOString ? new Date(ts - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10) : "",
    hj = dia(),
    on = new Date(new Date(hj + "T12:00:00") - 864e5).toISOString().slice(0, 10);
  return (dd === hj ? "hoje" : dd === on ? "ontem" : fmt(dd).slice(0, 5)) + " às " + h;
}
const fpStTxt = (c) =>
  c.st === "feita" ? "Feita" + (c.by ? " · " + e(c.by) : "") : c.st === "validada" ? "Validada" : FP_TXT[c.st] || "Pendente";
const fpQuem = () => [...new Set(MOTOS.concat(typeof ELD === "string" && ELD ? [ELD] : []))];
/* menu rápido: Pendente -> quem fez a foto -> Validar (concluído) */
function fpMenu(c) {
  const k = c.key;
  if (refazerOpen === k)
    return `<div class="fp-menu"><span>Motivo para refazer</span><div class="fp-rf"><input id="rfn" placeholder="Ex.: VT errado na tela, foto escura…"><button type="button" class="fp-b pri" data-a="rfok" data-v="${k}">Enviar</button></div></div>`;
  if (c.st === "pendente" || c.st === "refazer")
    return `<div class="fp-menu"><span>📷 Quem tirou a foto?</span><div class="fp-bs">${fpQuem()
      .map((m) => `<button type="button" class="fp-b" data-a="qf" data-v="${k}|${e(m)}">${e(m)}</button>`)
      .join("")}</div></div>`;
  if (c.st === "feita")
    return `<div class="fp-menu"><span>Foto feita${c.by ? " por <b>" + e(c.by) + "</b>" : ""}${c.fts ? " " + fpQuando(c.fts) : ""}. Está certa?</span><div class="fp-bs"><button type="button" class="fp-b ok" data-a="ok" data-v="${k}">✔ Validar</button><button type="button" class="fp-b" data-a="rf" data-v="${k}">↺ Refazer</button><button type="button" class="fp-b ghost" data-a="qundo" data-v="${k}">Desfazer</button></div></div>`;
  return `<div class="fp-menu"><span>✔ Validada${c.by ? " · foto de <b>" + e(c.by) + "</b>" : ""}</span><div class="fp-bs"><button type="button" class="fp-b ghost" data-a="qundo" data-v="${k}">Desfazer</button></div></div>`;
}
/* ===== Semáforo: 🔴 falta foto · 🟡 conferir · 🟢 tudo certo ===== */
const FP_LUZ = {
  p: { cor: "r", nome: "Falta foto", sub: "Pontos que ainda não têm foto", dica: "Esses pontos <b>ainda não têm foto</b>. Mande o motoboy ou, se já tirou, aperte <b>“📷 Já tirei”</b>. Os <b>URGENTES</b> vêm primeiro." },
  f: { cor: "y", nome: "Conferir", sub: "O motoboy tirou, falta você olhar", dica: "O motoboy <b>já tirou</b> essas fotos. Olhe no WhatsApp/Google Fotos e aperte <b>“✓ Aprovar”</b>. Se ficou ruim, <b>“↺ Refazer”</b>." },
  v: { cor: "g", nome: "Tudo certo", sub: "Fotos já aprovadas", dica: "Esses pontos estão <b>com todas as fotos aprovadas</b>. Nada para fazer aqui 🎉" },
  a: { cor: "r", nome: "Urgentes", sub: "", dica: "<b>URGENTE</b> = cliente no ar há 3 dias ou mais sem foto (ou sem conferir). Faça esses primeiro." },
  t: { cor: "", nome: "Todos", sub: "", dica: "Todos os pontos com cliente no ar hoje." },
};
const fpUrg = (c) => (fpAtrasado(c) ? `<em class="fp-urg2">URGENTE · ${fpDiasNoAr(c.v)} dias ${c.st === "feita" ? "sem conferir" : "sem foto"}</em>` : "");
function fpLinha(c, q) {
  const v = c.v,
    k = FP_ST[c.st],
    pb = (S.fotos[c.key] || {}).prob && c.st !== "validada" ? `<em class="fp-pb">⚠ motoboy relatou problema</em>` : "",
    rf = c.st === "refazer" ? `<em class="fp-rfz">↺ refazer${c.nota ? ": " + e(c.nota) : ""}</em>` : "";
  let bt;
  if (k === "p") bt = `<button type="button" class="fp-go r${fpOpen === c.key ? " on" : ""}" data-a="fpst" data-v="${c.key}">📷 Já tirei</button>`;
  else if (k === "f")
    bt = `<div class="fp-gos"><button type="button" class="fp-go g" data-a="ok" data-v="${c.key}">✓ Aprovar</button><button type="button" class="fp-go x" data-a="rf" data-v="${c.key}" title="Pedir para refazer">↺</button></div>`;
  else bt = `<button type="button" class="fp-go v" data-a="fpst" data-v="${c.key}" title="Ver / desfazer">✓ aprovada</button>`;
  const quem = k === "f" ? `<small>📷 ${c.by ? e(c.by) : "foto feita"}${c.fts ? " · " + fpQuando(c.fts) : ""}</small>` : "";
  const menu = refazerOpen === c.key || (fpOpen === c.key && k !== "f") ? fpMenu(c) : "";
  return `<div class="fp-li ${k}"><div class="fp-lt"><b>${fpMark(v.cliente, q)} ${vtQtd(v)}</b>${fpUrg(c)}${pb}${rf}${quem}</div>${bt}</div>${menu}`;
}
function fpCard(g, q) {
  const p = g.p,
    luz = fpF === "a" || fpF === "t" ? null : fpF,
    mostra = luz ? g.cli.filter((c) => FP_ST[c.st] === luz) : g.cli,
    resto = luz ? g.cli.filter((c) => FP_ST[c.st] !== luz) : [],
    nv = resto.filter((c) => FP_ST[c.st] === "v").length,
    nf = resto.filter((c) => FP_ST[c.st] === "f").length,
    np = resto.filter((c) => FP_ST[c.st] === "p").length,
    lista = (mostra.length ? mostra : g.cli).map((c) => fpLinha(c, q)).join(""),
    nfe = g.cli.filter((c) => c.st === "feita").length,
    rod = [
      np ? `🔴 ${np} ${np === 1 ? "cliente ainda sem foto" : "clientes ainda sem foto"}` : "",
      nf ? `🟡 ${nf} ${nf === 1 ? "esperando conferir" : "esperando conferir"}` : "",
      nv ? `🟢 ${nv} ${nv === 1 ? "cliente já está com foto" : "clientes já estão com foto"}` : "",
    ].filter(Boolean);
  return `<div class="fp-pt2 ${g.atr ? "urg" : ""}"><div class="fp-ph"><h4>📍 ${fpMark(p.nome, q)}</h4><small>${fpMark(p.end || "", q)}${p.tp ? " · " + e(p.tp) : ""} · <a href="${mapa(p)}" target="_blank" rel="noopener">mapa</a></small></div>${lista}${
    (luz === "f" || !luz) && nfe > 1 ? `<button type="button" class="fp-todas" data-a="fpvall" data-v="${p.id}">✓ Aprovar as ${nfe} deste ponto</button>` : ""
  }${rod.length ? `<div class="fp-rod">${rod.join("<br>")}</div>` : ""}</div>`;
}
function fpList() {
  const q = fpN(fpQ.trim()),
    all = fpPontos().filter((g) => fpBusca(g, q)),
    c = { p: 0, f: 0, v: 0 };
  all.forEach((g) => {
    if (g.cli.some((x) => FP_ST[x.st] === "p")) c.p++;
    if (g.cli.some((x) => FP_ST[x.st] === "f")) c.f++;
    if (g.k === "v") c.v++;
  });
  c.a = all.filter((g) => g.atr).length;
  const tem = (g, k) => (k === "v" ? g.k === "v" : g.cli.some((x) => FP_ST[x.st] === k));
  const vis = all
    .filter((g) => fpF === "t" || (fpF === "a" ? g.atr : tem(g, fpF)) || g.p.id === fpFixo)
    .sort((a, b) => b.atr - a.atr || ({ p: 0, f: 1, v: 2 })[a.k] - ({ p: 0, f: 1, v: 2 })[b.k] || a.ini.localeCompare(b.ini) || b.n - a.n);
  const luz = (k) =>
    `<button type="button" class="fp-luz ${FP_LUZ[k].cor}${fpF === k ? " on" : ""}" data-a="fpf" data-v="${k}"><span class="lz"></span><span class="tx"><b>${c[k]}</b><strong>${FP_LUZ[k].nome}</strong><small>${FP_LUZ[k].sub}</small></span></button>`;
  const vazio = !all.length
    ? q
      ? "Nenhum ponto encontrado para essa busca."
      : "Nenhum cliente no ar hoje."
    : fpF === "p"
      ? "Nenhum ponto sem foto. Tudo em dia! 🎉"
      : fpF === "f"
        ? "Nada para conferir agora 👍 Quando o motoboy marcar “Fiz”, aparece aqui."
        : fpF === "a"
          ? "Nenhum urgente. 👏"
          : "Nenhum ponto aqui.";
  return (
    `<div class="fp-sem">${luz("p")}${luz("f")}${luz("v")}</div>` +
    `<div class="fp-dica ${FP_LUZ[fpF].cor}"><span>${fpF === "p" ? "🔴" : fpF === "f" ? "🟡" : fpF === "v" ? "🟢" : fpF === "a" ? "🚨" : "📋"}</span><span>${FP_LUZ[fpF].dica}</span><span class="fp-dlk">${
      c.a && fpF !== "a" ? `<button type="button" data-a="fpf" data-v="a">🚨 Só urgentes (${c.a})</button>` : ""
    }${fpF !== "t" ? `<button type="button" data-a="fpf" data-v="t">Ver todos (${all.length})</button>` : `<button type="button" data-a="fpf" data-v="p">Voltar</button>`}</span></div>` +
    fpProbPainel() +
    (vis.length ? `<div class="fp-grade2">${vis.map((g) => fpCard(g, q)).join("")}</div>` : `<div class="fp-vazio">${vazio}</div>`) +
    `<span id="fpn" hidden>${all.length}</span>`
  );
}
/* fotos marcadas como feitas (pelo motoboy ou por alguém) esperando validação */
function fpParaValidar() {
  const m = new Map();
  tasks(true).forEach((t) => {
    if (t.status !== "feita") return;
    const f = S.fotos[t.key] || {};
    let g = m.get(t.p.id);
    if (!g) m.set(t.p.id, (g = { p: t.p, L: [], ts: 0, by: new Set() }));
    g.L.push(t);
    g.ts = Math.max(g.ts, f.fts || f.ts || 0);
    if (t.by) g.by.add(t.by);
  });
  return [...m.values()].sort((a, b) => b.ts - a.ts);
}
function fpAvisos() {
  const L = fpParaValidar();
  if (!L.length) return "";
  return `<div class="fp-av"><div class="fp-av-cab">🔔 <b>Para validar</b> <span>${L.reduce((s, g) => s + g.L.length, 0)} foto(s) feitas esperando você</span></div>${L.slice(0, 8)
    .map(
      (g) =>
        `<div class="fp-av-it"><div><b>${e([...g.by].join(" e ") || "Alguém")}</b> fez as fotos de <b>${e(g.p.nome)}</b><small>${g.L.map((t) => e(t.vt.cliente)).join(" · ")}${g.ts ? " · " + fpQuando(g.ts) : ""}</small></div><button type="button" class="fp-b ok" data-a="fpvall" data-v="${g.p.id}">✔ Validar ${g.L.length > 1 ? "todas" : ""}</button></div>`,
    )
    .join("")}${L.length > 8 ? `<div class="fp-av-mais">e mais ${L.length - 8} ponto(s) no filtro "A validar"</div>` : ""}</div>`;
}
/* "Tenho um problema" enviados pelo motoboy */
function fpProblemas() {
  return tasks(true)
    .filter((t) => (S.fotos[t.key] || {}).prob && t.status !== "validada")
    .map((t) => ((t.f = S.fotos[t.key]), t))
    .sort((a, b) => (b.f.probTs || 0) - (a.f.probTs || 0));
}
function fpProbPainel() {
  const L = fpProblemas();
  if (!L.length) return "";
  return `<div class="fp-probs"><h3>⚠ Problemas relatados <em>${L.length}</em></h3>${L.map(
    (t) =>
      `<div class="fp-pr"><div><b>${e(t.f.probBy || "Motoboy")}</b> · ${e(t.vt.cliente)} em <b>${e(t.p.nome)}</b><q>${e(typeof pmProbTxt === "function" ? pmProbTxt(t.f.prob) : t.f.prob)}${t.f.probTxt ? " — “" + e(t.f.probTxt) + "”" : ""}</q><small>${t.f.probTs ? fpQuando(t.f.probTs) : ""}</small></div><div class="bt"><button type="button" class="ok" data-a="fpprobok" data-v="${t.key}" title="Resolvido: a foto volta a ficar pendente para o motoboy">✓ Resolvido</button><button type="button" data-a="fpprobman" data-v="${t.key}" title="Abrir manutenção já preenchida">🔧 Abrir manutenção</button></div></div>`,
  ).join("")}</div>`;
}
/* aviso para admin/operacional quando chega foto nova feita (ex.: motoboy na rua) */
let fpVisto = 0,
  fpNotif = Date.now(); /* só notifica fotos que chegarem depois de abrir o sistema */
try {
  fpVisto = +localStorage.getItem("fp_visto") || 0;
} catch (_) {}
/* problema novo relatado pelo motoboy: aviso na tela + notificação do navegador */
let fpPVisto = 0,
  fpPNotif = Date.now();
try {
  fpPVisto = +localStorage.getItem("fp_pvisto") || 0;
} catch (_) {}
function fpProbAviso() {
  const P = fpProblemas(),
    mx = Math.max(0, ...P.map((t) => t.f.probTs || 0));
  if (view === "fp") {
    if (mx > fpPVisto) {
      fpPVisto = mx;
      try {
        localStorage.setItem("fp_pvisto", String(mx));
      } catch (_) {}
    }
    return false;
  }
  const novo = P.filter((t) => (t.f.probTs || 0) > fpPVisto);
  if (!novo.length) return false;
  const t0 = novo[0];
  if (matchMedia("(max-width: 700px)").matches) return false; /* celular: só chegada do motoboy e fotos feitas */
  if (false && (t0.f.probTs || 0) > fpPNotif) {
    fpPNotif = t0.f.probTs;
    try {
      if ("Notification" in window && Notification.permission === "granted" && navigator.serviceWorker)
        navigator.serviceWorker.getRegistration().then((rg) => {
          if (rg)
            rg.showNotification("Mega · ⚠ " + (t0.f.probBy || "Motoboy") + " relatou um problema", {
              body: t0.vt.cliente + " · " + t0.p.nome + " · " + pmProbTxt(t0.f.prob),
              icon: "../../core/assets/app/icone-192.png",
              tag: "fpp-" + t0.key,
              data: { abrir: "fp" },
            });
        });
    } catch (_) {}
  }
  let t = $("fptoast");
  if (!t) {
    t = document.createElement("div");
    t.id = "fptoast";
    document.body.appendChild(t);
  }
  t.innerHTML = `<span class="fp-t-ico">⚠</span><div><b>${e(t0.f.probBy || "Motoboy")} relatou um problema</b><small>${e(t0.vt.cliente)} · ${e(t0.p.nome)} · ${e(pmProbTxt(t0.f.prob))}</small></div><button type="button" data-a="tab" data-v="fp">Ver</button><button type="button" class="x" data-a="fptx" aria-label="Fechar">×</button>`;
  return true;
}
function fpNotifica() {
  if (typeof eMoto === "function" && eMoto()) return;
  if (typeof eMan === "function" && eMan()) return;
  if (fpProbAviso()) return;
  const L = fpParaValidar(),
    novo = L.filter((g) => g.ts > fpVisto);
  if (view === "fp") {
    const mx = Math.max(fpVisto, ...L.map((g) => g.ts));
    if (mx > fpVisto) {
      fpVisto = mx;
      try {
        localStorage.setItem("fp_visto", String(mx));
      } catch (_) {}
    }
    const t0 = $("fptoast");
    if (t0) t0.remove();
    return;
  }
  if (!novo.length) return;
  if (ROLE === "admin" && matchMedia("(max-width: 900px), (pointer: coarse)").matches) return; /* admin no celular: sem avisos */
  /* notificação do navegador (uma vez por foto nova), se a pessoa ativou os avisos */
  const g0 = novo[0];
  if (g0.ts > fpNotif) {
    fpNotif = g0.ts;
    try {
      if ("Notification" in window && Notification.permission === "granted" && navigator.serviceWorker)
        navigator.serviceWorker.getRegistration().then((rg) => {
          if (rg)
            rg.showNotification("Mega · 📷 " + ([...g0.by].join(" e ") || "Alguém") + " fez as fotos", {
              body: g0.p.nome + " · " + g0.L.map((t) => t.vt.cliente).join(", ") + " · " + fpQuando(g0.ts),
              icon: "../../core/assets/app/icone-192.png",
              tag: "fp-" + g0.p.id,
              data: { abrir: "fp" },
            });
        });
    } catch (_) {}
  }
  let t = $("fptoast");
  if (!t) {
    t = document.createElement("div");
    t.id = "fptoast";
    document.body.appendChild(t);
  }
  const g = novo[0],
    n = novo.reduce((s, x) => s + x.L.length, 0);
  t.innerHTML = `<span class="fp-t-ico">📷</span><div><b>${e([...g.by].join(" e ") || "Alguém")} fez as fotos de ${e(g.p.nome)}</b><small>${n} foto(s) para validar · ${fpQuando(g.ts)}</small></div><button type="button" data-a="tab" data-v="fp">Validar</button><button type="button" class="x" data-a="fptx" aria-label="Fechar">×</button>`;
}
function fotosPonto() {
  const n = fpList();
  const tot = (n.match(/<span id="fpn" hidden>(\d+)<\/span>/) || [])[1] || 0;
  return `<div class="fpw"><div class="fp-blob a"></div><div class="fp-blob b"></div><div class="fp-in">
<div class="fp-cab"><div><small>Fluxo do VT</small><h1>📸 Fotos <i>por ponto</i></h1></div></div>
<label class="fp-busca"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="fpq" type="search" autocomplete="off" placeholder="Buscar endereço, ponto, região ou cliente…" value="${e(fpQ)}"><em id="fpc">${tot} ${tot == 1 ? "ponto" : "pontos"}</em></label>
<div id="fpl">${n}</div></div></div>`;
}
const fpPend = () => fpPontos().filter((g) => g.k === "p").length;
