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
/* alerta: campanha no ar há 3 dias ou mais e o checking ainda não foi feito */
const ckAtr = (v) => !v.chk && !!v.ini && fpDiasNoAr(v) >= 3;
const ckLista = () => S.vts.filter((v) => (!v.chk || v.ckPend) && ckPronto(v));
function ckPayload(x) {
  const tr = ck.troca && ck.id === x.id ? ck.troca : null;
  return {
    id: tr ? x.id + "#troca" + tr.n : x.id,
    /* evento: o nome do evento é a campanha (PI e datas continuam iguais) */
    campanha: tr && tr.nome ? tr.nome : x.tipo === "evento" && x.ev && x.ev.nome ? x.ev.nome : "",
    evento: x.tipo === "evento" && x.ev && x.ev.nome ? x.ev.nome : "",
    cliente: x.cliente,
    pi: x.pi || "",
    oc: x.oc || "",
    ag: x.ag || "",
    ini: (tr && tr.ini) || x.ini || "",
    fim: x.fim || "",
    tp: x.tp || "",
    fm: x.fm || "",
    obs: tr
      ? "Checking reaberto" + (tr.mot ? " — motivo: " + tr.mot : "") + (tr.ini ? " — novo vídeo em veiculação a partir de " + fmt(tr.ini) : "") + "."
      : "",
    paineis: (x.paineis || []).flatMap((i) => {
      const p = PMf(i);
      if (!p) return [];
      const st = ckSt(x, i),
        pl = p.pl || "",
        pad = padraoPonto(p) || {}; /* tipo/formato padrão do cadastro quando o endereço não tem */
      return p.telas && p.telas.length
        ? p.telas.map((t) => ({
            nome: p.nome,
            end: p.end,
            tela: t.n,
            tp: t.tp || p.tp || pad.tp || "",
            fm: t.fm || p.fm || pad.fm || "",
            pl,
            st,
          }))
        : [{ nome: p.nome, end: p.end, tp: p.tp || pad.tp || "", fm: p.fm || pad.fm || "", pl, st }];
    }),
  };
}
/* apaga as fotos guardadas do checking (neste computador) quando ele é concluído */
function ckLimparFotos(id) {
  try {
    const r = indexedDB.open("megaooh-checking", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("k");
    r.onsuccess = () => {
      try {
        r.result.transaction("k", "readwrite").objectStore("k").delete("fotos:" + id);
      } catch (_) {}
    };
  } catch (_) {}
}
function ckDrop() {
  ck.id = null;
  ck.show = false;
  ck.n = 0;
  ck.exp = false;
  const h = $("ckhost");
  if (h) h.innerHTML = "";
}
function ckOpen(id, troca) {
  const x = S.vts.find((q) => q.id === id);
  if (!x) return;
  if (troca === undefined && ck.troca && ck.id === id && ck.show) troca = null;
  if (
    ck.id &&
    ck.id !== id &&
    ck.n > 0 &&
    !confirm("Há um checking em andamento com fotos na tela. As fotos ficam guardadas neste computador por 7 dias (até concluir). Abrir o outro checking?")
  )
    return;
  if (ck.id && ck.id !== id) ckDrop();
  ck.troca = troca || null;
  if (ck.id !== id) ck.ok = ck.tot = 0;
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
    f.src = "gerador-checking.html?v=20261112a";
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
  if (d.total !== undefined) {
    ck.ok = d.ok || 0;
    ck.tot = d.total || 0;
    ckBarra();
  }
  if (d.completo && ck.id && !ck.auto) {
    const x = S.vts.find((q) => q.id === ck.id);
    ck.auto = true;
    /* troca de vídeo: só registra no histórico; não mexe no checking original nem no faturamento */
    if (x && ck.troca) {
      x.rck = x.rck || [];
      if (!x.rck.some((r) => r.n === ck.troca.n)) {
        x.rck.push({ n: ck.troca.n, d: dia(), ini: ck.troca.ini || "", nome: ck.troca.nome || "", mot: ck.troca.mot || "" });
        if (x.ckPend && x.ckPend.n === ck.troca.n) delete x.ckPend;
        save();
        if (view === "k" || view === "c") render();
      }
    } else if (x && !x.chk) {
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
/* barra de conclusão do checking: endereços com foto / total */
const ckBarraHtml = () => {
  const t = ck.tot || 0,
    o = Math.min(ck.ok || 0, t),
    pc = t ? Math.round((o / t) * 100) : 0;
  return `<div class="ckbar${pc === 100 ? " ok" : ""}"><div class="ckbar-t"><b>${pc === 100 ? "✓ Todas as fotos inseridas" : "Checking em andamento"}</b><span>${o} de ${t} ${t === 1 ? "endereço" : "endereços"} com foto · ${pc}%</span></div><div class="ckbar-l"><i style="width:${pc}%"></i></div></div>`;
};
function ckBarra() {
  const el = document.getElementById("ckbarw");
  if (el) el.innerHTML = ckBarraHtml();
}
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
    return `<div class="card"><div class="row"><div><b>${ck.troca ? "Checking reaberto" + (ck.troca.mot ? " (" + e(ck.troca.mot) + ")" : "") : "Checking"} — ${e(x.cliente)}</b> <span class="mu">${x.pi ? "PI " + e(x.pi) + " · " : ""}${(x.paineis || []).length} endereços · arraste as fotos em cada endereço e baixe o PowerPoint/PDF</span></div>${ckAbtn(x)}<button class="sm" data-a="cklist" style="flex:0 0 auto;margin-left:auto">← Lista</button><button class="sm" data-a="ckclose" style="flex:0 0 auto">Fechar sem concluir</button></div><div id="ckbarw">${ckBarraHtml()}</div>${ckA.has(x.id) ? ckAdr(x) : ""}${x.chk ? `<div class="quick okq" style="margin-top:8px"><span>✔ Checking marcado como feito${x.chka ? " automaticamente (todas as fotos inseridas)" : ""}. Para desfazer ou refazer, use Concluídos.</span>${ck.exp ? `<button class="sm pri" data-a="ckdone" style="margin-left:auto">Fechar</button>` : ""}</div>` : ck.exp ? `<div class="quick okq" style="margin-top:8px"><span>✔ Checking exportado.</span><button class="sm pri" data-a="ckdone" style="margin-left:auto">Marcar checking como feito e fechar</button></div>` : ""}</div>`;
  }
  const L = ckLista().sort((a, b) => (a.ini || "9").localeCompare(b.ini || "9")),
    W = S.vts.filter(
      (v) =>
        ((!v.chk || v.ckPend) && !ckPronto(v) && (v.paineis || []).length && !isConc(v)) ||
        ((!v.chk || v.ckPend) && !ckPronto(v) && isConc(v) && (v.paineis || []).length),
    );
  let h = `<div class="card"><b>${L.length}</b> <span class="mu">VT(s) com todas as fotos validadas, prontos para checking. Escolha um, arraste as fotos nos endereços e gere o PowerPoint/PDF. As fotos ficam guardadas neste computador por 7 dias ou até o checking ser concluído.</span></div>`;
  if (ck.id && !ck.show) {
    const x = S.vts.find((q) => q.id === ck.id);
    if (x)
      h += `<div class="card"><div class="row"><div>Checking em andamento: <b>${e(x.cliente)}</b> <span class="mu">${ck.n} foto(s) na tela</span></div><button class="sm pri" data-a="ckback" style="flex:0 0 auto;margin-left:auto">Voltar ao checking</button><button class="sm" data-a="ckclose" style="flex:0 0 auto">Descartar</button></div></div>`;
  }
  h +=
    L.map(
      (v) =>
        `<div class="card${ckAtr(v) ? " ck-atr" : ""}"><div class="row"><div><b>${e(v.cliente)}</b> ${v.pi ? `<span class="mu">PI ${e(v.pi)}</span>` : ""}${v.ckPend ? ` <span class="b s-pendente">↺ reaberto · ${e(v.ckPend.mot)}</span>` : ""} <span class="mu">${e(fmt(v.ini) || "")} → ${e(fmt(v.fim) || "")} · ${(v.paineis || []).length} painéis · todos validados</span>${ckAtr(v) ? `<div class="ck-alerta">⚠ Checking atrasado · campanha no ar há ${fpDiasNoAr(v)} dias</div>` : ""}</div>${ckAbtn(v)}<button class="sm pri" data-a="${v.ckPend ? "ckpend" : "ckopen"}" data-v="${v.id}" style="flex:0 0 auto;margin-left:auto">Fazer checking</button></div>${ckA.has(v.id) ? ckAdr(v) : ""}</div>`,
    ).join("") ||
    '<div class="card mu">Nenhum VT pronto ainda. Quando todas as fotos de um VT forem validadas na Gestão, ele aparece aqui automaticamente.</div>';
  const pend = W.filter((v) => (v.paineis || []).some((i) => ckSt(v, i) === "validada")).sort((a, b) =>
    (a.ini || "9").localeCompare(b.ini || "9"),
  );
  if (pend.length)
    h +=
      `<h2>Em andamento (aguardando validação)</h2>` +
      pend
        .map((v) => {
          const n = v.paineis.filter((i) => ckSt(v, i) === "validada").length;
          const at = ckAtr(v);
          return `<div class="card${at ? " ck-atr" : ""}"><div class="row"><div><b>${e(v.cliente)}</b> <span class="mu">${n}/${v.paineis.length} fotos validadas</span>${at ? `<div class="ck-alerta">⚠ Campanha no ar há ${fpDiasNoAr(v)} dias e ${v.paineis.length - n} foto(s) ainda não feitas ou verificadas</div>` : ""}</div>${ckAbtn(v)}<button class="sm" data-a="${v.ckPend ? "ckpend" : "ckopen"}" data-v="${v.id}" style="flex:0 0 auto;margin-left:auto">Fazer checking mesmo assim</button></div>${ckA.has(v.id) ? ckAdr(v) : ""}</div>`;
        })
        .join("");
  return h;
}

/* ===== Reabrir checking (ex.: VT novo) =====
   Pede o motivo, manda TODAS as fotos do VT de volta para os motoboys (com o motivo) e,
   quando forem validadas, o VT aparece de novo em Checking para gerar o checking novo.
   O checking original e o faturamento continuam como estão. */
const CK_MOTIVOS = ["VT novo", "Troca de vídeo", "Foto com problema", "Pedido do cliente"];
function ckTroca(id) {
  const x = S.vts.find((q) => q.id === id);
  if (!x) return;
  const old = document.getElementById("cktr");
  if (old) old.remove();
  const hoje = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  let ini = hoje;
  if (x.ini && ini < x.ini) ini = x.ini;
  if (x.fim && ini > x.fim) ini = x.fim;
  const n = ((x.rck || []).reduce((m, r) => Math.max(m, r.n || 0), 0) || 0) + 1;
  const el = document.createElement("div");
  el.id = "cktr";
  el.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(15,18,60,.55);display:flex;align-items:center;justify-content:center;padding:16px";
  el.innerHTML = `<div style="background:#fff;border-radius:18px;max-width:500px;width:100%;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.35);border-top:6px solid #ff0066">
    <div style="font-size:18px;font-weight:700;color:#000066;margin-bottom:4px">↺ Reabrir checking</div>
    <div class="mu" style="margin-bottom:12px">${e(x.cliente)}${x.pi ? " · PI " + e(x.pi) : ""} · as ${(x.paineis || []).length} fotos voltam para os motoboys com o motivo. O checking original e o faturamento continuam como estão.</div>
    <div class="mu"><b>Motivo</b> (obrigatório)</div>
    <div class="chips" id="cktrm" style="margin:6px 0">${CK_MOTIVOS.map((m) => `<span class="chip" data-m="${e(m)}">${e(m)}</span>`).join("")}</div>
    <input id="cktrmo" placeholder="Ou escreva o motivo" style="width:100%;box-sizing:border-box;margin-bottom:10px">
    <div class="mu">Nome do novo vídeo / peça (opcional · aparece como “Campanha”)</div>
    <input id="cktrn" placeholder="Ex.: Black Friday — VT 2" style="width:100%;box-sizing:border-box;margin-bottom:10px">
    <div class="mu">Novo vídeo em veiculação a partir de</div>
    <input id="cktri" type="date" value="${ini}" ${x.ini ? `min="${x.ini}"` : ""} ${x.fim ? `max="${x.fim}"` : ""} style="width:100%;box-sizing:border-box">
    <div id="cktrer" style="color:#c2185b;font-size:13px;margin-top:8px" hidden>Escolha ou escreva o motivo.</div>
    <div class="row" style="margin-top:14px"><button class="pri" id="cktrok" style="flex:1">Reabrir e pedir fotos novas</button><button id="cktrx" style="flex:0 0 auto">Cancelar</button></div></div>`;
  document.body.appendChild(el);
  const mo = el.querySelector("#cktrmo");
  el.querySelectorAll("#cktrm .chip").forEach((c) =>
    (c.onclick = () => {
      el.querySelectorAll("#cktrm .chip").forEach((o) => o.classList.toggle("sel", o === c));
      mo.value = c.dataset.m;
    }),
  );
  mo.oninput = () => el.querySelectorAll("#cktrm .chip").forEach((o) => o.classList.toggle("sel", o.dataset.m === mo.value.trim()));
  el.querySelector("#cktrx").onclick = () => el.remove();
  el.onclick = (ev) => { if (ev.target === el) el.remove(); };
  el.querySelector("#cktrok").onclick = () => {
    const mot = mo.value.trim(),
      nome = el.querySelector("#cktrn").value.trim(),
      di = el.querySelector("#cktri").value;
    if (!mot) {
      el.querySelector("#cktrer").hidden = false;
      mo.focus();
      return;
    }
    el.remove();
    ckReabrir(x, { n, ini: di, nome, mot });
  };
  setTimeout(() => mo.focus(), 50);
}
function ckReabrir(x, r) {
  x.ckPend = { n: r.n, ini: r.ini || "", nome: r.nome || "", mot: r.mot, d: dia() };
  x.man = false;
  x.conc = 0;
  (x.paineis || []).forEach((i) => {
    const k = x.id + "__" + i;
    S.fotos[k] = { ...(S.fotos[k] || {}), status: "refazer", nota: "Checking reaberto: " + r.mot, by: "", moto: "", prob: null, ts: Date.now() };
  });
  x.aberto = false;
  save();
  $("warn").innerHTML =
    '<div class="warn" style="background:#e7f8ef;border-color:#9fe0bd;color:#0d5a34">✓ Checking de ' +
    e(x.cliente) +
    " reaberto (" +
    e(r.mot) +
    "). As " +
    (x.paineis || []).length +
    " fotos foram pedidas de novo aos motoboys. Quando forem validadas, o VT aparece em Checking.</div>";
  render();
}
