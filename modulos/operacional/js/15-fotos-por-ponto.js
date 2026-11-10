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
    g.cli.push({ v, key: t.key, st: t.status, nota: t.nota, by: t.by });
  });
  return [...m.values()].map((g) => {
    const np = g.cli.filter((c) => FP_ST[c.st] === "p").length,
      nf = g.cli.filter((c) => FP_ST[c.st] === "f").length;
    g.k = np ? "p" : nf ? "f" : "v";
    g.n = np || nf;
    g.fim = g.cli.map((c) => c.v.fim || "9999").sort()[0];
    const o = { p: 0, f: 1, v: 2 };
    g.cli.sort((a, b) => o[FP_ST[a.st]] - o[FP_ST[b.st]] || (a.v.fim || "9").localeCompare(b.v.fim || "9"));
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
    return `<div class="fp-menu"><span>Foto feita${c.by ? " por <b>" + e(c.by) + "</b>" : ""}. Está certa?</span><div class="fp-bs"><button type="button" class="fp-b ok" data-a="ok" data-v="${k}">✔ Validar</button><button type="button" class="fp-b" data-a="rf" data-v="${k}">↺ Refazer</button><button type="button" class="fp-b ghost" data-a="qundo" data-v="${k}">Desfazer</button></div></div>`;
  return `<div class="fp-menu"><span>✔ Validada${c.by ? " · foto de <b>" + e(c.by) + "</b>" : ""}</span><div class="fp-bs"><button type="button" class="fp-b ghost" data-a="qundo" data-v="${k}">Desfazer</button></div></div>`;
}
function fpCard(g, q) {
  const p = g.p,
    hj = dia();
  const cl = g.cli
    .map((c) => {
      const v = c.v,
        k = FP_ST[c.st],
        sub = [(v.ev && v.ev.nome) || "", v.fim ? "até " + fmt(v.fim).slice(0, 5) : ""].filter(Boolean).join(" · "),
        d = v.fim ? Math.round((new Date(v.fim + "T12:00:00") - new Date(hj + "T12:00:00")) / 864e5) : 99,
        urg = k === "p" && d <= 3 ? ` <span class="fp-urg">⏱ ${d <= 0 ? "sai do ar hoje" : "faltam " + d + (d === 1 ? " dia" : " dias")}</span>` : "";
      return `<div class="fp-cli"><span><b>${fpMark(v.cliente, q)}</b><small>${e(sub)}${urg}${c.st === "refazer" && c.nota ? ` · motivo: ${e(c.nota)}` : ""}${c.st === "feita" && c.by ? ` · foto feita por ${e(c.by)}` : ""}</small></span><button type="button" class="fp-st ${k}${fpOpen === c.key ? " on" : ""}" data-a="fpst" data-v="${c.key}" title="Clique para registrar a foto">${fpStTxt(c)}</button></div>${fpOpen === c.key ? fpMenu(c) : ""}`;
    })
    .join("");
  return `<div class="fp-pt ${g.k}${g.p.id === fpFixo && fpF !== "t" && g.k !== fpF ? " fixo" : ""}"><span class="fp-num">${g.k === "v" ? FP_OK : g.n}</span><h4>${fpMark(p.nome, q)}</h4><div class="fp-end">${fpMark(p.end || "", q)}${p.tp ? ` <b>${e(p.tp)}</b>` : ""} · <a href="${mapa(p)}" target="_blank" rel="noopener">mapa</a></div>${cl}</div>`;
}
function fpList() {
  const q = fpN(fpQ.trim()),
    all = fpPontos().filter((g) => fpBusca(g, q)),
    c = { p: 0, f: 0, v: 0 };
  all.forEach((g) => c[g.k]++);
  const vis = all
    .filter((g) => fpF === "t" || g.k === fpF || g.p.id === fpFixo)
    .sort((a, b) => ({ p: 0, f: 1, v: 2 })[a.k] - ({ p: 0, f: 1, v: 2 })[b.k] || b.n - a.n || a.fim.localeCompare(b.fim));
  const ch = (k, rot, dot) =>
    `<button class="${fpF === k ? "on" : ""}" data-a="fpf" data-v="${k}">${dot ? `<span class="dot ${k}"></span>` : ""}${rot}<i>${k === "t" ? all.length : c[k]}</i></button>`;
  const vazio = !all.length
    ? q
      ? "Nenhum ponto com clientes no ar encontrado para essa busca."
      : "Nenhum cliente no ar hoje."
    : fpF === "p"
      ? "Nenhum ponto precisando de foto. Tudo em dia! 🎉"
      : "Nenhum ponto nesta situação.";
  return (
    `<div class="fp-fil">${ch("p", "Precisa de foto")}${ch("f", "A validar", 1)}${ch("v", "Em dia", 1)}${ch("t", "Todos")}</div>` +
    (vis.length ? `<div class="fp-grade">${vis.map((g) => fpCard(g, q)).join("")}</div>` : `<div class="fp-vazio">${vazio}</div>`) +
    `<span id="fpn" hidden>${all.length}</span>`
  );
}
function fotosPonto() {
  const all = fpPontos(),
    c = { p: 0, f: 0, v: 0 };
  all.forEach((g) => c[g.k]++);
  const n = fpList();
  const tot = (n.match(/<span id="fpn" hidden>(\d+)<\/span>/) || [])[1] || 0;
  return `<div class="fpw"><div class="fp-blob a"></div><div class="fp-blob b"></div><div class="fp-in">
<div class="fp-cab"><div><small>Fluxo do VT</small><h1>📸 Fotos <i>por ponto</i></h1></div>
<div class="fp-kp"><div class="p"><b>${c.p}</b><span>precisam de foto</span></div><div class="f"><b>${c.f}</b><span>a validar</span></div><div class="v"><b>${c.v}</b><span>em dia</span></div></div></div>
<label class="fp-busca"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="fpq" type="search" autocomplete="off" placeholder="Buscar endereço, ponto, região ou cliente…" value="${e(fpQ)}"><em id="fpc">${tot} ${tot == 1 ? "ponto" : "pontos"}</em></label>
<div id="fpl">${n}</div></div></div>`;
}
const fpPend = () => fpPontos().filter((g) => g.k === "p").length;
