/* =====================================================================
   Módulo operacional · Fotos validadas (histórico)
   Todas as fotos validadas, da mais nova para a mais antiga: dia, local
   e cliente. Busca por cliente, PI, endereço, data, quem fez etc. e gera
   uma planilha Excel (usada para achar as fotos no Google Fotos).
   ===================================================================== */
let fvQ = "",
  fvP = "tudo", /* período: hoje | 7 | mes | tudo | faixa */
  fvDe = "",
  fvAte = "",
  fvN = 150; /* quantas linhas mostrar (o Excel sempre leva todas as filtradas) */
const FV_SEM = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const fvDia = (ts) => {
  const d = new Date(ts);
  return new Date(ts - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
};
const fvHora = (ts) => new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
/* data da foto: quando marcaram "foto feita"; nas fotos antigas (antes deste registro) vale a última alteração */
function fvLista() {
  const L = [];
  Object.keys(S.fotos || {}).forEach((k) => {
    const f = S.fotos[k];
    if (!f || f.status !== "validada") return;
    const [vid, pid] = k.split("__"),
      v = S.vts.find((x) => x.id === vid),
      p = PMf(pid);
    if (!v || !p) return;
    const ts = f.fts || f.ts || f.u || 0;
    if (!ts) return;
    L.push({ k, v, p, ts, dia: fvDia(ts), by: f.by || "", vts: f.vts || f.ts || 0, aprox: !f.fts });
  });
  return L.sort((a, b) => b.ts - a.ts);
}
function fvPeriodo(x) {
  const hj = dia();
  if (fvP === "hoje") return x.dia === hj;
  if (fvP === "7") return x.dia >= new Date(new Date(hj + "T12:00:00") - 6 * 864e5).toISOString().slice(0, 10);
  if (fvP === "mes") return x.dia.slice(0, 7) === hj.slice(0, 7);
  if (fvP === "faixa") return (!fvDe || x.dia >= fvDe) && (!fvAte || x.dia <= fvAte);
  return true;
}
function fvBusca(x, q) {
  if (!q) return true;
  const d = fmt(x.dia);
  return [x.v.cliente, x.v.pi, x.v.ag, x.v.oc, (x.v.ev && x.v.ev.nome) || "", x.p.nome, x.p.end, rg(x.p), x.p.tp, x.by, d, d.slice(0, 5), x.dia, FV_SEM[new Date(x.dia + "T12:00:00").getDay()]]
    .some((s) => fpN(s).includes(q));
}
function fvFiltradas() {
  const q = fpN(fvQ.trim());
  return fvLista().filter((x) => fvPeriodo(x) && fvBusca(x, q));
}
function fvDiaTxt(d) {
  const hj = dia(),
    on = new Date(new Date(hj + "T12:00:00") - 864e5).toISOString().slice(0, 10),
    s = FV_SEM[new Date(d + "T12:00:00").getDay()];
  return (d === hj ? "Hoje · " : d === on ? "Ontem · " : "") + fmt(d) + " · " + s;
}
function fvCorpo() {
  const q = fpN(fvQ.trim()),
    F = fvFiltradas();
  if (!F.length)
    return `<div class="fp-vazio">${fvLista().length ? "Nenhuma foto validada encontrada com essa busca/período." : "Ainda não há fotos validadas."}</div><span id="fvn" hidden>0</span>`;
  const V = F.slice(0, fvN);
  let h = "",
    ult = "";
  V.forEach((x) => {
    if (x.dia !== ult) {
      if (ult) h += `</div>`;
      const nd = F.filter((y) => y.dia === x.dia).length;
      h += `<div class="fv-dia"><div class="fv-dcab"><b>${fvDiaTxt(x.dia)}</b><span>${nd} ${nd === 1 ? "foto" : "fotos"}</span></div>`;
      ult = x.dia;
    }
    h += `<div class="fv-it"><span class="fv-h">${x.aprox ? "≈" : ""}${fvHora(x.ts)}</span><div class="fv-loc"><b>${fpMark(x.p.nome, q)}</b><small>${fpMark(x.p.end || "", q)}${x.p.tp ? " · " + e(x.p.tp) : ""}</small></div><div class="fv-cli"><b>${fpMark(x.v.cliente, q)}</b><small>${[(x.v.ev && x.v.ev.nome) ? fpMark(x.v.ev.nome, q) : "", x.v.pi ? "PI " + fpMark(x.v.pi, q) : ""].filter(Boolean).join(" · ")}</small></div><div class="fv-by">${x.by ? "📷 " + fpMark(x.by, q) : ""}</div></div>`;
  });
  h += `</div>`;
  if (F.length > V.length)
    h += `<button type="button" class="fv-mais" data-a="fvmais">Mostrar mais (${F.length - V.length} restantes)</button>`;
  return h + `<span id="fvn" hidden>${F.length}</span>`;
}
function fotosValidadas() {
  const all = fvLista(),
    hj = dia();
  const nHoje = all.filter((x) => x.dia === hj).length,
    nMes = all.filter((x) => x.dia.slice(0, 7) === hj.slice(0, 7)).length;
  const per = [
    ["hoje", "Hoje"],
    ["7", "Últimos 7 dias"],
    ["mes", "Este mês"],
    ["tudo", "Tudo"],
    ["faixa", "Escolher datas"],
  ];
  const n = (fvCorpo().match(/<span id="fvn" hidden>(\d+)<\/span>/) || [])[1] || 0;
  return `<div class="fpw"><div class="fp-blob a"></div><div class="fp-blob b"></div><div class="fp-in">
<div class="fp-cab"><div><small>Fluxo do VT</small><h1>✅ Fotos <i>validadas</i></h1></div>
<div class="fp-kp"><div class="v"><b>${nHoje}</b><span>hoje</span></div><div class="f"><b>${nMes}</b><span>este mês</span></div><div class="p"><b>${all.length}</b><span>no total</span></div></div></div>
<label class="fp-busca"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="fvq" type="search" autocomplete="off" placeholder="Buscar cliente, PI, endereço, data (ex.: 05/11), quem fez…" value="${e(fvQ)}"><em id="fvc">${n} ${n == 1 ? "foto" : "fotos"}</em></label>
<div class="fv-bar"><div class="fp-fil">${per.map(([k, r]) => `<button class="${fvP === k ? "on" : ""}" data-a="fvper" data-v="${k}">${r}</button>`).join("")}</div>
<button type="button" class="fv-xls" data-a="fvxls">⬇ Baixar Excel</button></div>
${fvP === "faixa" ? `<div class="fv-faixa"><label>De <input type="date" id="fvde" value="${e(fvDe)}"></label><label>Até <input type="date" id="fvate" value="${e(fvAte)}"></label></div>` : ""}
<div id="fvl">${fvCorpo()}</div></div></div>`;
}
function fvPinta() {
  const l = $("fvl");
  if (l) l.innerHTML = fvCorpo();
  const n = +((l && l.querySelector("#fvn")) || {}).textContent || 0,
    c = $("fvc");
  if (c) c.textContent = n + (n === 1 ? " foto" : " fotos");
}
function fvExcel() {
  const F = fvFiltradas();
  const rows = F.map((x) => [
    fmt(x.dia),
    (x.aprox ? "≈ " : "") + fvHora(x.ts),
    FV_SEM[new Date(x.dia + "T12:00:00").getDay()],
    x.v.cliente || "",
    (x.v.ev && x.v.ev.nome) || "",
    x.v.pi || "",
    x.p.nome || "",
    x.p.end || "",
    rg(x.p),
    x.p.tp || "",
    x.by || "",
    x.vts ? fmt(fvDia(x.vts)) + " " + fvHora(x.vts) : "",
    fmt(x.v.ini) || "",
    fmt(x.v.fim) || "",
    x.v.ag || "",
  ]);
  const b = xlsxBlob([
    {
      name: "FOTOS VALIDADAS",
      head: ["Data da foto", "Hora", "Dia da semana", "Cliente", "Campanha", "Nº PI", "Ponto", "Endereço", "Região", "Tipo", "Foto feita por", "Validada em", "Início da campanha", "Fim da campanha", "Agência"],
      rows,
      w: [12, 8, 12, 24, 24, 12, 26, 46, 14, 16, 14, 16, 14, 14, 20],
    },
  ]);
  const a = document.createElement("a"),
    suf = fvP === "faixa" && (fvDe || fvAte) ? (fvDe || "inicio") + "_a_" + (fvAte || "hoje") : fvP === "tudo" ? "todas" : fvP === "7" ? "ultimos-7-dias" : fvP;
  a.href = URL.createObjectURL(b);
  a.download = "FOTOS_VALIDADAS_" + suf + (fvQ.trim() ? "_" + fvQ.trim().replace(/[^\w\-]+/g, "-").slice(0, 30) : "") + "_" + dia() + ".xlsx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}
