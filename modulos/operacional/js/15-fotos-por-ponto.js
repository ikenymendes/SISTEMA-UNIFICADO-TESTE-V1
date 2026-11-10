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
    return `<div class="fp-menu"><span>📷 Quem fez a foto?</span><div class="fp-bs">${fpQuem()
      .map((m) => `<button type="button" class="fp-b" data-a="qf" data-v="${k}|${e(m)}">${e(m)}</button>`)
      .join("")}</div></div>`;
  if (c.st === "feita")
    return `<div class="fp-menu"><span>Foto feita${c.by ? " por <b>" + e(c.by) + "</b>" : ""}${c.fts ? " " + fpQuando(c.fts) : ""}. Está certa?</span><div class="fp-bs"><button type="button" class="fp-b ok" data-a="ok" data-v="${k}">✔ Validar</button><button type="button" class="fp-b" data-a="rf" data-v="${k}">↺ Refazer</button><button type="button" class="fp-b ghost" data-a="qundo" data-v="${k}">Desfazer</button></div></div>`;
  return `<div class="fp-menu"><span>✔ Validada${c.by ? " · foto de <b>" + e(c.by) + "</b>" : ""}</span><div class="fp-bs"><button type="button" class="fp-b ghost" data-a="qundo" data-v="${k}">Desfazer</button></div></div>`;
}
function fpCard(g, q) {
  const p = g.p,
    hj = dia();
  const cl = g.cli
    .map((c) => {
      const v = c.v,
        k = FP_ST[c.st],
        sub = [(v.ev && v.ev.nome) || "", v.ini ? "início " + fmt(v.ini).slice(0, 5) : "", v.fim ? "até " + fmt(v.fim).slice(0, 5) : ""].filter(Boolean).join(" · "),
        d = v.fim ? Math.round((new Date(v.fim + "T12:00:00") - new Date(hj + "T12:00:00")) / 864e5) : 99,
        dn = fpDiasNoAr(v),
        atr = fpAtrasado(c)
          ? `<span class="fp-atr">⚠ ${dn} dias no ar ${c.st === "feita" ? "sem verificar" : "sem foto"}</span>`
          : "",
        urg = k === "p" && d <= 3 ? ` <span class="fp-urg">⏱ ${d <= 0 ? "sai do ar hoje" : "faltam " + d + (d === 1 ? " dia" : " dias")}</span>` : "";
      return `<div class="fp-cli${atr ? " atr" : ""}"><span><b>${fpMark(v.cliente, q)}</b>${(S.fotos[c.key] || {}).prob && c.st !== "validada" ? `<span class="fp-pb">⚠ problema relatado</span>` : ""}${atr}<small>${e(sub)}${urg}${c.st === "refazer" && c.nota ? ` · motivo: ${e(c.nota)}` : ""}${c.st === "feita" && (c.by || c.fts) ? ` · <span class="fp-fez">📷 ${c.by ? e(c.by) + " " : ""}${fpQuando(c.fts)}</span>` : ""}</small></span><button type="button" class="fp-st ${k}${fpOpen === c.key ? " on" : ""}" data-a="fpst" data-v="${c.key}" title="Clique para registrar a foto">${fpStTxt(c)}</button></div>${fpOpen === c.key ? fpMenu(c) : ""}`;
    })
    .join("");
  return `<div class="fp-pt ${g.k}${g.atr ? " atrasado" : ""}${g.p.id === fpFixo && fpF !== "t" && g.k !== fpF ? " fixo" : ""}"><span class="fp-num">${g.k === "v" ? FP_OK : g.n}</span>${g.atr ? `<div class="fp-alerta">⚠ ${g.atr} ${g.atr === 1 ? "foto atrasada" : "fotos atrasadas"}</div>` : ""}<h4>${fpMark(p.nome, q)}</h4><div class="fp-end">${fpMark(p.end || "", q)}${p.tp ? ` <b>${e(p.tp)}</b>` : ""} · <a href="${mapa(p)}" target="_blank" rel="noopener">mapa</a></div>${cl}</div>`;
}
function fpList() {
  const q = fpN(fpQ.trim()),
    all = fpPontos().filter((g) => fpBusca(g, q)),
    c = { p: 0, f: 0, v: 0 };
  all.forEach((g) => c[g.k]++);
  c.a = all.filter((g) => g.atr).length;
  const vis = all
    .filter((g) => fpF === "t" || (fpF === "a" ? g.atr : g.k === fpF) || g.p.id === fpFixo)
    .sort(
      (a, b) =>
        ({ p: 0, f: 1, v: 2 })[a.k] - ({ p: 0, f: 1, v: 2 })[b.k] || a.ini.localeCompare(b.ini) || b.n - a.n || a.fim.localeCompare(b.fim),
    );
  const ch = (k, rot, dot) =>
    `<button class="${fpF === k ? "on" : ""}${k === "a" ? " atr" : ""}" data-a="fpf" data-v="${k}">${dot ? `<span class="dot ${k}"></span>` : ""}${rot}<i>${k === "t" ? all.length : c[k]}</i></button>`;
  const vazio = !all.length
    ? q
      ? "Nenhum ponto com clientes no ar encontrado para essa busca."
      : "Nenhum cliente no ar hoje."
    : fpF === "p"
      ? "Nenhum ponto precisando de foto. Tudo em dia! 🎉"
      : fpF === "a"
        ? "Nenhuma foto atrasada. 👏"
        : "Nenhum ponto nesta situação.";
  return (
    `<div class="fp-fil">${c.a ? ch("a", "⚠ Atrasadas") : ""}${ch("p", "Precisa de foto")}${ch("f", "A validar", 1)}${ch("v", "Em dia", 1)}${ch("t", "Todos")}</div>` +
    (vis.length ? `<div class="fp-grade">${vis.map((g) => fpCard(g, q)).join("")}</div>` : `<div class="fp-vazio">${vazio}</div>`) +
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
  if ((t0.f.probTs || 0) > fpPNotif) {
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
  const all = fpPontos(),
    c = { p: 0, f: 0, v: 0 };
  all.forEach((g) => c[g.k]++);
  const na = all.reduce((s, g) => s + g.atr, 0);
  const n = fpList();
  const tot = (n.match(/<span id="fpn" hidden>(\d+)<\/span>/) || [])[1] || 0;
  return `<div class="fpw"><div class="fp-blob a"></div><div class="fp-blob b"></div><div class="fp-in">
<div class="fp-cab"><div><small>Fluxo do VT</small><h1>📸 Fotos <i>por ponto</i></h1></div>
<div class="fp-kp">${na ? `<div class="a" data-a="fpf" data-v="a"><b>${na}</b><span>⚠ fotos atrasadas</span></div>` : ""}<div class="p"><b>${c.p}</b><span>precisam de foto</span></div><div class="f"><b>${c.f}</b><span>a validar</span></div><div class="v"><b>${c.v}</b><span>em dia</span></div></div></div>
<label class="fp-busca"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="fpq" type="search" autocomplete="off" placeholder="Buscar endereço, ponto, região ou cliente…" value="${e(fpQ)}"><em id="fpc">${tot} ${tot == 1 ? "ponto" : "pontos"}</em></label>
${fpProbPainel()}${fpAvisos()}<div id="fpl">${n}</div></div></div>`;
}
const fpPend = () => fpPontos().filter((g) => g.k === "p").length;
