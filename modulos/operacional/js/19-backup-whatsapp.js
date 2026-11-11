/* =====================================================================
   Módulo operacional · Fotos validadas › Backup WhatsApp
   Histórico dos pedidos de rota/foto feitos no grupo do operacional
   (antes do sistema): dia, hora, motoboy e ponto. Fica separado das
   fotos do sistema; guardado no banco no registro "wpp:backup".
   ===================================================================== */
let fvAba = "sis", /* sis = fotos do sistema | wpp = backup do WhatsApp */
  wbQ = "",
  wbN = 200;
const WB = { L: null, busy: false, err: "", em: 0 };
async function wbCarregar() {
  if (WB.busy) return;
  WB.busy = true;
  WB.err = "";
  try {
    const r = await sb("/rest/v1/registros?chave=eq.wpp:backup&select=dados");
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json(),
      d = (j[0] && j[0].dados) || {};
    WB.L = Array.isArray(d.L) ? d.L : [];
    WB.em = d.em || 0;
  } catch (err) {
    WB.err = "Não consegui carregar o backup do WhatsApp (" + (err.message || err) + ").";
  }
  WB.busy = false;
  if (view === "fv" && fvAba === "wpp") render();
}
/* uma linha por pedido: {d: data, h: hora, m: motoboy, p: id do ponto, t: texto da mensagem, g: etiqueta} */
function wbLinhas() {
  return (WB.L || []).map((x) => {
    const p = PMf(x.p) || { nome: x.t, end: "" };
    return { ...x, pt: p };
  });
}
function wbFiltradas() {
  const q = fpN(wbQ.trim()),
    hj = dia(),
    sete = new Date(Date.now() - 6 * 864e5),
    d7 = fvDia(sete.getTime());
  return wbLinhas()
    .filter((x) => {
      if (fvP === "hoje" && x.d !== hj) return false;
      if (fvP === "7" && x.d < d7) return false;
      if (fvP === "mes" && x.d.slice(0, 7) !== hj.slice(0, 7)) return false;
      if (fvP === "faixa" && ((fvDe && x.d < fvDe) || (fvAte && x.d > fvAte))) return false;
      if (!q) return true;
      return fpN([x.pt.nome, x.pt.end, x.m, x.t, x.g, fmt(x.d), x.d, FV_SEM[new Date(x.d + "T12:00:00").getDay()]].join(" ")).includes(q);
    })
    .sort((a, b) => (b.d + b.h).localeCompare(a.d + a.h));
}
function wbCorpo() {
  if (WB.err) return `<div class="fp-vazio">${e(WB.err)} <button type="button" class="sm" data-a="wbrec">Tentar de novo</button></div><span id="wbn" hidden>0</span>`;
  if (!WB.L) return `<div class="fp-vazio">Carregando o backup do WhatsApp…</div><span id="wbn" hidden>0</span>`;
  const q = fpN(wbQ.trim()),
    F = wbFiltradas();
  if (!F.length) return `<div class="fp-vazio">${WB.L.length ? "Nenhum pedido encontrado com essa busca/período." : "O backup do WhatsApp ainda não foi importado."}</div><span id="wbn" hidden>0</span>`;
  const V = F.slice(0, wbN);
  let h = "",
    ult = "";
  V.forEach((x) => {
    if (x.d !== ult) {
      if (ult) h += `</div>`;
      const nd = F.filter((y) => y.d === x.d).length;
      h += `<div class="fv-dia wb"><div class="fv-dcab"><b>${fvDiaTxt(x.d)}</b><span>${nd} ${nd === 1 ? "pedido" : "pedidos"}</span></div>`;
      ult = x.d;
    }
    h += `<div class="fv-it wb"><span class="fv-h">${e(x.h)}</span><div class="fv-loc"><b>${fpMark(x.pt.nome, q)}</b><small>${fpMark(x.pt.end || "", q)}${x.pt.tp ? " · " + e(x.pt.tp) : ""}</small></div><div class="fv-cli"><b class="wb-msg">${x.t ? "“" + fpMark(x.t, q) + "”" : "📲 pedido no grupo"}</b><small>${x.g ? `<i class="wb-tag">${e(x.g)}</i>` : x.p ? "" : "endereço fora do cadastro"}</small></div><div class="fv-by">🛵 ${fpMark(x.m, q)}</div></div>`;
  });
  h += `</div>`;
  if (F.length > V.length) h += `<button type="button" class="fv-mais" data-a="wbmais">Mostrar mais (${F.length - V.length} restantes)</button>`;
  return h + `<span id="wbn" hidden>${F.length}</span>`;
}
function wbPinta() {
  const l = $("fvl");
  if (!l) return;
  l.innerHTML = wbCorpo();
  const n = WB.L ? wbFiltradas().length : 0,
    c = $("wbc");
  if (c) c.textContent = n + (n == 1 ? " pedido" : " pedidos");
}
function wbExcel() {
  const F = wbFiltradas();
  const b = xlsxBlob([
    {
      name: "BACKUP WHATSAPP",
      head: ["Data", "Hora", "Dia da semana", "Motoboy", "Ponto", "Endereço", "Região", "Tipo", "Mensagem no grupo", "Etiqueta"],
      rows: F.map((x) => [fmt(x.d), x.h, FV_SEM[new Date(x.d + "T12:00:00").getDay()], x.m, x.pt.nome || "", x.pt.end || "", PMf(x.p) ? rg(x.pt) : "", x.pt.tp || "", x.t, x.g || ""]),
      w: [12, 8, 12, 12, 30, 46, 14, 16, 46, 12],
    },
  ]);
  const a = document.createElement("a"),
    suf = fvP === "faixa" && (fvDe || fvAte) ? (fvDe || "inicio") + "_a_" + (fvAte || "hoje") : fvP === "tudo" ? "todos" : fvP === "7" ? "ultimos-7-dias" : fvP;
  a.href = URL.createObjectURL(b);
  a.download = "BACKUP_WHATSAPP_" + suf + (wbQ.trim() ? "_" + wbQ.trim().replace(/[^\w\-]+/g, "-").slice(0, 30) : "") + "_" + dia() + ".xlsx";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1500);
}
/* importar o arquivo .json do backup (gerado a partir do chat exportado do WhatsApp) — só admin */
async function wbImportar(arq) {
  try {
    const d = JSON.parse(await arq.text());
    if (!d || d.tipo !== "mega-backup-whatsapp" || !Array.isArray(d.L)) throw new Error("este arquivo não é um backup do WhatsApp do sistema");
    const L = d.L.filter((x) => x && /^\d{4}-\d\d-\d\d$/.test(x.d)).map((x) => ({ d: x.d, h: String(x.h || ""), m: String(x.m || ""), p: String(x.p || ""), t: String(x.t || ""), g: String(x.g || "") }));
    if (!window.confirm("Importar " + L.length + " pedidos do WhatsApp? Isso substitui o backup do WhatsApp atual (as fotos do sistema não mudam).")) return;
    const u = Date.now(),
      r = await sb("/rest/v1/rpc/gravar_registros", {
        method: "POST",
        body: { p: [{ chave: "wpp:backup", tipo: "wpp", dados: { v: 1, em: u, fonte: d.fonte || "WhatsApp", L }, u, excluido: false }] },
      });
    const j = r.ok ? await r.json() : null;
    if (!r.ok || !j || !(j.ok || []).length) throw new Error("o banco recusou (" + r.status + ")");
    WB.L = L;
    WB.em = u;
    WB.err = "";
    $("warn").innerHTML = '<div class="warn" style="background:#e7f8ef;border-color:#9fe0bd;color:#0d5a34">✓ Backup do WhatsApp importado: ' + L.length + " pedidos.</div>";
    render();
  } catch (err) {
    $("warn").innerHTML = '<div class="warn">Não consegui importar: ' + e(err.message || String(err)) + "</div>";
  }
}
