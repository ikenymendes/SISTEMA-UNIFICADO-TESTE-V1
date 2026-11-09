/* =====================================================================
   Módulo operacional · Checking integrado (Gerador de Checking)
   (arquivo 8 de 13; carregados em ordem pelo index.html)
   ===================================================================== */

/* ===== Checking integrado ===== */
const telasTxt = (p) => (p.telas || []).map((t) => t.n + (t.fm ? " | " + t.fm : "")).join("\n");
const parseTelas = (s) =>
  String(s || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [a, ...r] = l.split(/\s*[|;]\s*/);
      return { n: a.trim(), fm: (r[0] || "").trim() };
    });
const ck = { id: null, show: false, n: 0, exp: false },
  ckA = new Set();
const ckAdr = (v) => {
  const ps = (v.paineis || []).map((i) => ({ i, p: PMf(i) })).filter((x) => x.p);
  if (!ps.length) return "";
  return `<ol class="ckadr">${ps
    .map(({ i, p }) => {
      const st = ckSt(v, i),
        tl =
          p.telas && p.telas.length
            ? p.telas.map((t) => e(t.n) + (t.fm ? " " + e(t.fm) : "")).join(" · ")
            : "",
        tf = [p.tp, p.fm].filter(Boolean).join(" · ");
      return `<li><b>${e(p.nome)}</b>${p.end && p.end !== p.nome ? ` <span class="mu">${e(p.end)}</span>` : ""}${tf ? ` <span class="b">${e(tf)}</span>` : ""}${tl ? `<div class="mu">Telas: ${tl}</div>` : ""} <span class="b ${st === "validada" ? "s-validada" : "s-pendente"}">foto: ${e(st)}</span></li>`;
    })
    .join("")}</ol>`;
};
const ckAbtn = (v) =>
  `<button class="sm" data-a="ckadr" data-v="${v.id}" style="flex:0 0 auto">${ckA.has(v.id) ? "▾ Ocultar endereços" : "▸ Ver endereços (" + (v.paineis || []).length + ")"}</button>`;
const ckSt = (v, i) => (S.fotos[v.id + "__" + i] || {}).status || "pendente";
const ckPronto = (v) =>
  !!(v.paineis && v.paineis.length) && v.paineis.every((i) => ckSt(v, i) === "validada");
const ckLista = () => S.vts.filter((v) => !v.chk && ckPronto(v));
function ckPayload(x) {
  return {
    id: x.id,
    cliente: x.cliente,
    pi: x.pi || "",
    oc: x.oc || "",
    ag: x.ag || "",
    ini: x.ini || "",
    fim: x.fim || "",
    tp: x.tp || "",
    fm: x.fm || "",
    obs: x.tipo === "evento" && x.ev && x.ev.nome ? "Evento: " + x.ev.nome : "",
    paineis: (x.paineis || []).flatMap((i) => {
      const p = PMf(i);
      if (!p) return [];
      const st = ckSt(x, i),
        pl = p.pl || "";
      return p.telas && p.telas.length
        ? p.telas.map((t) => ({
            nome: p.nome,
            end: p.end,
            tela: t.n,
            tp: t.tp || p.tp || "",
            fm: t.fm || p.fm || "",
            pl,
            st,
          }))
        : [{ nome: p.nome, end: p.end, tp: p.tp || "", fm: p.fm || "", pl, st }];
    }),
  };
}
function ckDrop() {
  ck.id = null;
  ck.show = false;
  ck.n = 0;
  ck.exp = false;
  const h = $("ckhost");
  if (h) h.innerHTML = "";
}
function ckOpen(id) {
  const x = S.vts.find((q) => q.id === id);
  if (!x) return;
  if (
    ck.id &&
    ck.id !== id &&
    ck.n > 0 &&
    !confirm("Há um checking em andamento com fotos na tela. Abrir outro descarta essas fotos. Continuar?")
  )
    return;
  if (ck.id && ck.id !== id) ckDrop();
  ck.id = id;
  ck.show = true;
  ck.exp = false;
  ck.auto = false;
  view = "k";
  const h = $("ckhost");
  let f = $("ckf");
  if (!f) {
    f = document.createElement("iframe");
    f.id = "ckf";
    f.style.cssText =
      "width:100%;height:calc(100vh - 210px);min-height:520px;border:0;border-radius:14px;background:#F5F6FB;box-shadow:0 2px 12px rgba(0,0,0,.1)";
    f.dataset.ready = "";
    f.onload = () => {
      f.dataset.ready = "1";
      f.contentWindow.postMessage({ vt: ckPayload(x) }, "*");
    };
    f.src = "gerador-checking.html?v=20261109p";
    h.appendChild(f);
  } else f.contentWindow.postMessage({ vt: ckPayload(x) }, "*");
  render();
  scrollTo(0, 0);
}
addEventListener("message", (ev) => {
  const d = ev.data;
  if (!d || !d.ck) return;
  if (d.title) {
    if (ck.oldT === undefined) ck.oldT = document.title;
    document.title = d.title;
  }
  if (d.titleReset && ck.oldT !== undefined) {
    document.title = ck.oldT;
    delete ck.oldT;
  }
  if (d.fotos !== undefined) ck.n = d.fotos;
  if (d.completo && ck.id && !ck.auto) {
    const x = S.vts.find((q) => q.id === ck.id);
    ck.auto = true;
    if (x && !x.chk) {
      x.chk = true;
      x.chkd = dia();
      x.chka = 1;
      save();
      if (view === "k") render();
    }
  }
  if (d.exported) {
    ck.exp = true;
    if (view === "k") render();
  }
});
function ckShow() {
  const h = $("ckhost");
  if (h) h.style.display = view === "k" && ck.id && ck.show ? "block" : "none";
}
function ckview() {
  if (ck.id && ck.show) {
    const x = S.vts.find((q) => q.id === ck.id);
    if (!x) {
      ckDrop();
      return ckview();
    }
    return `<div class="card"><div class="row"><div><b>Checking — ${e(x.cliente)}</b> <span class="mu">${x.pi ? "PI " + e(x.pi) + " · " : ""}${(x.paineis || []).length} endereços · arraste as fotos em cada endereço e baixe o PowerPoint/PDF</span></div>${ckAbtn(x)}<button class="sm" data-a="cklist" style="flex:0 0 auto;margin-left:auto">← Lista</button><button class="sm" data-a="ckclose" style="flex:0 0 auto">Fechar sem concluir</button></div>${ckA.has(x.id) ? ckAdr(x) : ""}${x.chk ? `<div class="quick okq" style="margin-top:8px"><span>✔ Checking marcado como feito${x.chka ? " automaticamente (todas as fotos inseridas)" : ""}. Para desfazer ou refazer, use Concluídos.</span>${ck.exp ? `<button class="sm pri" data-a="ckdone" style="margin-left:auto">Fechar</button>` : ""}</div>` : ck.exp ? `<div class="quick okq" style="margin-top:8px"><span>✔ Checking exportado.</span><button class="sm pri" data-a="ckdone" style="margin-left:auto">Marcar checking como feito e fechar</button></div>` : ""}</div>`;
  }
  const L = ckLista(),
    W = S.vts.filter(
      (v) =>
        (!v.chk && !ckPronto(v) && (v.paineis || []).length && !isConc(v)) ||
        (!v.chk && !ckPronto(v) && isConc(v) && (v.paineis || []).length),
    );
  let h = `<div class="card"><b>${L.length}</b> <span class="mu">VT(s) com todas as fotos validadas, prontos para checking. Escolha um, arraste as fotos nos endereços e gere o PowerPoint/PDF. As fotos não ficam guardadas.</span></div>`;
  if (ck.id && !ck.show) {
    const x = S.vts.find((q) => q.id === ck.id);
    if (x)
      h += `<div class="card"><div class="row"><div>Checking em andamento: <b>${e(x.cliente)}</b> <span class="mu">${ck.n} foto(s) na tela</span></div><button class="sm pri" data-a="ckback" style="flex:0 0 auto;margin-left:auto">Voltar ao checking</button><button class="sm" data-a="ckclose" style="flex:0 0 auto">Descartar</button></div></div>`;
  }
  h +=
    L.map(
      (v) =>
        `<div class="card"><div class="row"><div><b>${e(v.cliente)}</b> ${v.pi ? `<span class="mu">PI ${e(v.pi)}</span>` : ""} <span class="mu">${e(fmt(v.ini) || "")} → ${e(fmt(v.fim) || "")} · ${(v.paineis || []).length} painéis · todos validados</span></div>${ckAbtn(v)}<button class="sm pri" data-a="ckopen" data-v="${v.id}" style="flex:0 0 auto;margin-left:auto">Fazer checking</button></div>${ckA.has(v.id) ? ckAdr(v) : ""}</div>`,
    ).join("") ||
    '<div class="card mu">Nenhum VT pronto ainda. Quando todas as fotos de um VT forem validadas na Gestão, ele aparece aqui automaticamente.</div>';
  const pend = W.filter((v) => (v.paineis || []).some((i) => ckSt(v, i) === "validada"));
  if (pend.length)
    h +=
      `<h2>Em andamento (aguardando validação)</h2>` +
      pend
        .map((v) => {
          const n = v.paineis.filter((i) => ckSt(v, i) === "validada").length;
          return `<div class="card"><div class="row"><div><b>${e(v.cliente)}</b> <span class="mu">${n}/${v.paineis.length} fotos validadas</span></div>${ckAbtn(v)}<button class="sm" data-a="ckopen" data-v="${v.id}" style="flex:0 0 auto;margin-left:auto">Fazer checking mesmo assim</button></div>${ckA.has(v.id) ? ckAdr(v) : ""}</div>`;
        })
        .join("");
  return h;
}
