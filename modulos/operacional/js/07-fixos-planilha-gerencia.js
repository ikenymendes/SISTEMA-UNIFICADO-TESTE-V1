/* =====================================================================
   Módulo operacional · Fixos do mês, planilha .xlsx, Gerência e Operação e dashboard
   (arquivo 7 de 13; carregados em ordem pelo index.html)
   ===================================================================== */

/* ===== Fixos: clientes fixos, VT, pontos e fotos do mês ===== */
let fxm = dia().slice(0, 7),
  fxf = "todos";
const fdv = () => ({ open: false, edit: null, cliente: "", vt: "", sel: new Set() });
let fd = fdv();
const mesTxt = (k) => {
  const [y, m] = k.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
};
const mesMv = (k, d) => {
  const [y, m] = k.split("-").map(Number),
    t = new Date(y, m - 1 + d, 1);
  return t.getFullYear() + "-" + p2(t.getMonth() + 1);
};
const fmOk = (c, k, id) => !!(c.fm && c.fm[k] && c.fm[k][id]);
const fIds = (c) => (c.paineis || []).filter((i) => PMf(i));
const fxStat = (k) => {
  let n = 0,
    t = 0;
  (S.cfix || []).forEach((c) =>
    fIds(c).forEach((i) => {
      t++;
      if (fmOk(c, k, i)) n++;
    }),
  );
  return [n, t];
};
function fixosMes() {
  const [n, t] = fxStat(fxm),
    pc = t ? Math.round((n / t) * 100) : 0,
    cur = fxm === dia().slice(0, 7);
  const st = (c) => {
    const ids = fIds(c),
      o = ids.filter((i) => fmOk(c, fxm, i)).length;
    return { ids, o, all: ids.length > 0 && o === ids.length, pend: ids.length - o };
  };
  const L = S.cfix
    .slice()
    .sort((a, b) => (a.cliente || "").localeCompare(b.cliente || "", "pt-BR"))
    .filter((c) => {
      const q = st(c);
      return fxf === "todos" || (fxf === "feitos" ? q.all : q.pend > 0);
    });
  let h = `<div class="card"><div class="row" style="flex-wrap:nowrap"><button class="sm" data-a="fxm" data-v="-1" style="flex:0 0 auto">◀</button><div style="text-align:center;text-transform:capitalize"><b>${e(mesTxt(fxm))}</b></div><button class="sm" data-a="fxm" data-v="1" style="flex:0 0 auto">▶</button>${cur ? "" : '<button class="sm" data-a="fxm" data-v="0" style="flex:0 0 auto">Mês atual</button>'}</div>
<div style="margin-top:8px"><b>${n}</b>/${t} <span class="mu">pontos com foto feita no mês · ${S.cfix.length} cliente(s) fixo(s)</span></div><div class="bar"><i style="width:${pc}%"></i></div>
<div class="row" style="margin-top:6px"><div class="chips" style="flex:1 1 200px">${[
    ["todos", "Todos"],
    ["pend", "Com pendência"],
    ["feitos", "Completos"],
  ]
    .map(([k, x]) => `<span class="chip ${fxf === k ? "sel" : ""}" data-a="fxf" data-v="${k}">${x}</span>`)
    .join(
      "",
    )}</div><button class="pri" data-a="fdnew" style="flex:0 0 auto">${fd.open ? "Fechar" : "+ Novo cliente fixo"}</button></div></div>`;
  if (fd.open)
    h += `<div class="card"><h2 style="margin-top:0">${fd.edit ? "Editando cliente fixo" : "Novo cliente fixo"}</h2><div class="row"><input id="fcl" placeholder="Cliente" value="${e(fd.cliente)}"><input id="fvt" placeholder="VT (nº ou referência)" value="${e(fd.vt)}"></div><h2>Pontos (${fd.sel.size} selecionados)</h2>${chips(fd.sel, "fxp", "fxreg")}<div class="row" style="margin-top:8px"><button class="pri" data-a="fdsave" style="flex:0 0 auto">${fd.edit ? "Salvar alterações" : "Cadastrar"}</button></div></div>`;
  if (!S.cfix.length)
    return h + `<div class="card mu">Nenhum cliente fixo cadastrado. Use “+ Novo cliente fixo”.</div>`;
  if (!L.length) return h + `<div class="card mu">Nada neste filtro.</div>`;
  L.forEach((c) => {
    const q = st(c),
      pc2 = q.ids.length ? Math.round((q.o / q.ids.length) * 100) : 0;
    h += `<div class="card"><div class="row"><div data-a="col" data-v="fx|${c.id}" style="cursor:pointer">${S.col["fx|" + c.id] ? "▸" : "▾"} <b>${e(c.cliente)}</b>${c.vt ? ` <span class="mu">VT ${e(c.vt)}</span>` : ""} <span class="b ${q.all ? "s-validada" : "s-pendente"}">${q.o}/${q.ids.length} no mês</span></div><button class="sm" data-a="fxall" data-v="${c.id}" style="flex:0 0 auto">Marcar todos</button><button class="sm" data-a="fded" data-v="${c.id}" style="flex:0 0 auto">Editar</button><button class="sm" data-a="fdel" data-v="${c.id}" style="flex:0 0 auto">${confRem === "fc|" + c.id ? "Confirmar excluir" : "Excluir"}</button></div><div class="bar"><i style="width:${pc2}%"></i></div>${
      S.col["fx|" + c.id]
        ? ""
        : q.ids
            .map((i) => {
              const p = PMf(i),
                o = fmOk(c, fxm, i);
              return `<div class="task"><div><b>${e(p.nome)}</b><div class="mu">${e(p.end)} · <a href="${mapa(p)}" target="_blank" rel="noopener">mapa</a></div><div class="mu"><span class="b ${o ? "s-validada" : "s-pendente"}">${o ? "Foto feita" : "Pendente"}</span>${o ? " em " + dt(c.fm[fxm][i]) : ""}</div></div><div class="acts"><button class="sm ${o ? "" : "pri"}" data-a="fxt" data-v="${c.id}|${i}">${o ? "Desfazer" : "Foto feita"}</button></div></div>`;
            })
            .join("") || '<div class="mu">Sem pontos.</div>'
    }</div>`;
  });
  return h;
}
const nOpts = (n, c, l) =>
  Array.from(
    { length: Math.max(n, c) + 1 },
    (_, i) => `<option value="${i}" ${c === i ? "selected" : ""}>${l}: ${i}/${n}</option>`,
  ).join("");
const adminTask = (t) => {
  const fi = fotoInfo(t);
  return `<div class="task"><div><b>${e(t.p.nome)}</b> <span class="mu">${e(t.p.end)}</span><div class="row" style="margin-top:6px"><select data-a="x_st" data-v="${t.key}">${Object.keys(
    ST,
  )
    .map((k) => `<option value="${k}" ${t.status === k ? "selected" : ""}>${ST[k]}</option>`)
    .join(
      "",
    )}</select>${fi ? `<select data-a="x_fi" data-v="${t.key}">${nOpts(fi.n, fi.i, "Início")}</select><select data-a="x_ff" data-v="${t.key}">${nOpts(fi.n, fi.f, "Fim")}</select>` : ""}<input data-a="x_nt" data-v="${t.key}" placeholder="Observação" value="${e(t.nota)}"></div></div></div>`;
};
function adminVT() {
  const all = tasks(true);
  let h = `<div class="card mu">Ajuste qualquer situação, contagem de fotos e observação de qualquer VT, inclusive os concluídos. Aqui não há as travas do fluxo normal (ex.: mínimo de fotos).</div>`;
  if (!S.vts.length) return h + `<div class="card mu">Nenhum VT cadastrado.</div>`;
  S.vts.forEach((v) => {
    const ts = all.filter((t) => t.vt.id === v.id),
      c = isConc(v),
      open = S.col["ax|" + v.id];
    h += `<div class="card"><div class="row"><div data-a="col" data-v="ax|${v.id}" style="cursor:pointer">${open ? "▾" : "▸"} <b>${e(v.cliente)}</b> <span class="b ${c ? "s-validada" : "s-pendente"}">${c ? "Concluído" : "No ar"}</span> <span class="mu">${ts.length} painéis${v.fif ? " · fotos início/fim ×" + nfv(v) : ""}</span></div><button class="sm" data-a="vted" data-v="${v.id}" style="flex:0 0 auto">Editar VT</button>${c ? `<button class="sm" data-a="vreab" data-v="${v.id}" style="flex:0 0 auto">Reabrir</button>` : `<button class="sm" data-a="venc" data-v="${v.id}" style="flex:0 0 auto">Concluir</button>`}<button class="sm" data-a="vdel" data-v="${v.id}" style="flex:0 0 auto">${confRem === "vd|" + v.id ? "Confirmar excluir" : "Excluir"}</button></div>${open ? ts.map(adminTask).join("") || '<div class="mu">Sem painéis.</div>' : ""}</div>`;
  });
  return h;
}
function adminM() {
  const o = { moto: 0, eld: 1, resolvida: 2 },
    L = S.manut.slice().sort((a, b) => o[a.status] - o[b.status] || mSort(a, b));
  return (
    `<div class="card mu">Todas as manutenções (abertas e resolvidas). Use “Editar” para mudar situação, prioridade, prazo, motoboy ou texto.</div>` +
    (L.length
      ? `<div class="card">${L.map((m) => mRow(m, "g")).join("")}</div>`
      : `<div class="card mu">Nenhuma manutenção.</div>`)
  );
}
const prioCard = () =>
  `<div class="card"><h2 style="margin-top:0">Prioridades e prazos de manutenção</h2><div class="mu">Prazo em horas, contado da abertura do chamado (24 h = 1 dia). A ordem define a cor e a posição nas listas (a primeira é a mais urgente). Mudanças valem para os próximos chamados; os já abertos você ajusta em “Editar”.</div>${PR()
    .map(
      (p, i) =>
        `<div class="row" style="margin-top:8px;flex-wrap:nowrap"><input data-a="x_pn" data-v="${p.id}" value="${e(p.nome)}"><input data-a="x_ph" data-v="${p.id}" type="number" min="1" value="${p.h}" style="flex:0 0 90px"><span class="mu" style="flex:0 0 auto">horas</span><button class="sm" data-a="pmv" data-v="${p.id}|-1" style="flex:0 0 auto">↑</button><button class="sm" data-a="pmv" data-v="${p.id}|1" style="flex:0 0 auto">↓</button><button class="sm" data-a="prem" data-v="${p.id}" style="flex:0 0 auto">${confRem === "pr|" + p.id ? "Confirmar?" : "Remover"}</button></div>`,
    )
    .join("")}<button class="sm" data-a="padd" style="margin-top:8px">+ Nova prioridade</button></div>`;
function xchg(el, a) {
  const v = el.dataset.v,
    val = el.value;
  if (a === "x_st") {
    setF(v, { status: val });
    render();
  } else if (a === "x_mo") setF(v, { moto: val });
  else if (a === "x_fi") setF(v, { fi: +val });
  else if (a === "x_ff") setF(v, { ff: +val });
  else if (a === "x_nt") setF(v, { nota: val });
  else if (a === "x_vd" || a === "x_vn") {
    const x = S.vts.find((q) => q.id === v);
    if (x) {
      const f0 = fechado(x);
      if (a === "x_vd") x.fdt = val;
      else x.nfn = val.trim();
      let rr = false;
      if (val && !x.fat) {
        x.fat = true;
        if (!x.fdt) x.fdt = dia();
        rr = true;
      }
      if (fechado(x) !== f0) rr = true;
      save();
      if (rr) render();
    }
  } else if (a === "x_eo") {
    keep();
    ef.oc = val;
    render();
  } else if (a === "x_pn") {
    const p = S.prio.find((q) => q.id === v);
    if (p) {
      p.nome = val.trim() || p.nome;
      S.pu = Date.now();
      save();
    }
  } else if (a === "x_ph") {
    const p = S.prio.find((q) => q.id === v);
    if (p) {
      p.h = Math.max(1, Math.round(+val) || p.h);
      S.pu = Date.now();
      save();
    }
  }
}

/* ===== Gerência e Operação: planilha (.xlsx) ===== */
function crc32(u) {
  const t =
    crc32.t ||
    (crc32.t = Array.from({ length: 256 }, (_, n) => {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      return c >>> 0;
    }));
  let r = -1;
  for (let i = 0; i < u.length; i++) r = t[(r ^ u[i]) & 255] ^ (r >>> 8);
  return (r ^ -1) >>> 0;
}
function zipBlob(files) {
  const enc = new TextEncoder(),
    parts = [],
    cd = [];
  let off = 0;
  files.forEach((f) => {
    const n = enc.encode(f.n),
      d = enc.encode(f.d),
      c = crc32(d),
      h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true);
    h.setUint16(4, 20, true);
    h.setUint16(6, 0x0800, true);
    h.setUint16(12, 0x21, true);
    h.setUint32(14, c, true);
    h.setUint32(18, d.length, true);
    h.setUint32(22, d.length, true);
    h.setUint16(26, n.length, true);
    parts.push(new Uint8Array(h.buffer), n, d);
    const g = new DataView(new ArrayBuffer(46));
    g.setUint32(0, 0x02014b50, true);
    g.setUint16(4, 20, true);
    g.setUint16(6, 20, true);
    g.setUint16(8, 0x0800, true);
    g.setUint16(14, 0x21, true);
    g.setUint32(16, c, true);
    g.setUint32(20, d.length, true);
    g.setUint32(24, d.length, true);
    g.setUint16(28, n.length, true);
    g.setUint32(42, off, true);
    cd.push(new Uint8Array(g.buffer), n);
    off += 30 + n.length + d.length;
  });
  const cs = cd.reduce((a, x) => a + x.length, 0),
    en = new DataView(new ArrayBuffer(22));
  en.setUint32(0, 0x06054b50, true);
  en.setUint16(8, files.length, true);
  en.setUint16(10, files.length, true);
  en.setUint32(12, cs, true);
  en.setUint32(16, off, true);
  return new Blob([...parts, ...cd, new Uint8Array(en.buffer)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
const xe = (s) =>
  String(s ?? "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
const xcol = (i) => {
  let s = "";
  i++;
  while (i > 0) {
    const r = (i - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
};
function xlsxBlob(sheets) {
  const sx = sheets.map((sh) => {
    const nc = sh.head.length,
      rows = [sh.head].concat(sh.rows);
    const sd = rows
      .map(
        (r, ri) =>
          `<row r="${ri + 1}"${ri === 0 ? ' ht="26" customHeight="1"' : ""}>${r
            .map((v, ci) => {
              const ref = xcol(ci) + (ri + 1);
              const fin = sh.fin && sh.fin.includes(ci);
              if (ri === 0)
                return `<c r="${ref}" s="${fin ? 4 : 1}" t="inlineStr"><is><t>${xe(v)}</t></is></c>`;
              if (typeof v === "number") return `<c r="${ref}" s="${fin ? 5 : 3}"><v>${v}</v></c>`;
              return `<c r="${ref}" s="${fin ? (sh.wrap && sh.wrap.includes(ci) ? 6 : 5) : sh.wrap && sh.wrap.includes(ci) ? 2 : 3}" t="inlineStr"><is><t xml:space="preserve">${xe(v)}</t></is></c>`;
            })
            .join("")}</row>`,
      )
      .join("");
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${sh.w.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols><sheetData>${sd}</sheetData><autoFilter ref="A1:${xcol(nc - 1)}${rows.length}"/>${
      sh.dv
        ? `<dataValidations count="${Object.keys(sh.dv).length}">${Object.entries(sh.dv)
            .map(
              ([c, l]) =>
                `<dataValidation type="list" allowBlank="1" showErrorMessage="1" errorTitle="Valor inválido" error="Escolha Sim ou Não" sqref="${xcol(+c)}2:${xcol(+c)}${rows.length + 300}"><formula1>"${l}"</formula1></dataValidation>`,
            )
            .join("")}</dataValidations>`
        : ""
    }</worksheet>`;
  });
  const files = [
    {
      n: "[Content_Types].xml",
      d: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    },
    {
      n: "_rels/.rels",
      d: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      n: "xl/workbook.xml",
      d: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${xe(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`,
    },
    {
      n: "xl/_rels/workbook.xml.rels",
      d: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    {
      n: "xl/styles.xml",
      d: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="10"/><name val="Calibri"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1B1F7A"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF5457F"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF6CC"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FFE3E6F2"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf><xf numFmtId="0" fontId="1" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf><xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
    },
  ];
  sheets.forEach((_, i) => files.push({ n: `xl/worksheets/sheet${i + 1}.xml`, d: sx[i] }));
  return zipBlob(files);
}
function planDados() {
  const hj = dia(),
    L = S.vts
      .filter((v) => (v.paineis || []).length && (!v.ini || v.ini <= hj))
      .sort((a, b) => (b.ini || "").localeCompare(a.ini || ""));
  const sit = (v) => (v.fim && v.fim < hj ? "Encerrada" : "No ar"),
    st = (v, i) => (S.fotos[v.id + "__" + i] || {}).status || "pendente";
  const camp = [],
    end = [];

  L.forEach((v) => {
    const ps = vIds(v).map(PMf),
      val = vIds(v).filter((i) => st(v, i) === "validada").length;
    camp.push([
      v.cliente || "",
      v.tipo === "evento" ? "Evento" : "PI",
      v.pi || "",
      v.ag || "",
      v.oc || "",
      fmt(v.ini),
      fmt(v.fim),
      sit(v),
      ps.length,
      ps
        .map((p) => "• " + [p.nome, p.end && p.end !== p.nome ? p.end : ""].filter(Boolean).join(" – "))
        .join("\n"),
      val + "/" + ps.length,
      v.chk ? "Sim" : "Não",
      v.chk ? fmt(v.chkd) : "",
      v.vok === "sim" ? "Correto" : v.vok === "nao" ? "A ajustar" : "Não verificado",
      v.fat ? "Sim" : "Não",
      v.fat ? fmt(v.fdt) : "",
      v.nfn || "",
      v.id,
    ]);
    vIds(v).forEach((i) => {
      const p = PMf(i),
        f = S.fotos[v.id + "__" + i] || {};
      end.push([
        v.cliente || "",
        v.pi || "",
        v.ag || "",
        fmt(v.ini),
        fmt(v.fim),
        sit(v),
        p.nome,
        p.end || "",
        rg(p),
        p.tp || "",
        p.fm || "",
        st(v, i),
        f.moto || "",
        v.fat ? "Sim" : "Não",
      ]);
    });
  });
  return { camp, end };
}
function planBlob() {
  const d = planDados();
  return xlsxBlob([
    {
      name: "GERÊNCIA E OPERAÇÃO",
      head: [
        "Cliente",
        "Tipo",
        "Nº PI",
        "Agência",
        "OC",
        "Início",
        "Fim",
        "Situação",
        "Qtd. endereços",
        "Endereços",
        "Fotos validadas",
        "Checking feito",
        "Data do checking",
        "VT (criativo)",
        "Faturado",
        "Data do faturamento",
        "Nº NF",
        "ID (não alterar)",
      ],
      rows: d.camp,
      w: [26, 8, 12, 22, 10, 11, 11, 11, 10, 60, 11, 10, 12, 14, 11, 14, 14, 16],
      wrap: [9],
    },
    {
      name: "ENDEREÇOS",
      head: [
        "Cliente",
        "Nº PI",
        "Agência",
        "Início",
        "Fim",
        "Situação",
        "Ponto",
        "Endereço",
        "Região",
        "Tipo",
        "Formato",
        "Status da foto",
        "Motoboy",
        "Faturado",
      ],
      rows: d.end,
      w: [26, 12, 22, 11, 11, 11, 30, 50, 14, 16, 10, 12, 12, 10],
    },
  ]);
}
function baixarPlan() {
  const b = planBlob(),
    a = document.createElement("a");
  a.href = URL.createObjectURL(b);
  a.download = "GERENCIA_E_OPERACAO_" + dia() + ".xlsx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}
async function bkPlan() {
  try {
    const s = JSON.stringify(planDados());
    if (s === BK.lastPlan) return;
    const b = planBlob();
    await bkW(PLN, b);
    BK.lastPlan = s;
  } catch (_) {}
}

const PLN = "GERENCIA_E_OPERACAO.xlsx";
let gof = "todas";
function gerencia() {
  const d = planDados(),
    hj = dia(),
    L = S.vts
      .filter((v) => (v.paineis || []).length && (!v.ini || v.ini <= hj))
      .sort((a, b) => (b.ini || "").localeCompare(a.ini || ""));
  const noAr = (v) => !(v.fim && v.fim < hj),
    F = [
      ["todas", "Todas", L.length],
      ["ar", "No ar agora", L.filter(noAr).length],
      ["enc", "Encerradas", L.filter((v) => !noAr(v)).length],
      ["afat", "A faturar", L.filter((v) => !v.fat && !v.nfat).length],
      ["fat", "Faturadas", L.filter((v) => v.fat).length],
    ];
  const R = L.filter((v) =>
    gof === "ar"
      ? noAr(v)
      : gof === "enc"
        ? !noAr(v)
        : gof === "afat"
          ? !v.fat && !v.nfat
          : gof === "fat"
            ? v.fat
            : true,
  );
  let h = `<div class="dh"><div style="flex:1;min-width:240px"><h1>Gerência e Operação</h1><div class="sub">Todas as campanhas que foram ao ar: períodos, endereços, agência e faturamento</div></div><div class="row" style="flex:0 0 auto"><button class="pri" data-a="gxls" style="background:#fff;color:#1B1F7A;box-shadow:none">⬇ Baixar planilha (.xlsx)</button></div></div>
  <div class="kpis">${[
    ["", L.length, "Campanhas que foram ao ar"],
    ["gr", L.filter((v) => v.fat).length, "Faturadas"],
    ["am", L.filter((v) => !v.fat && !v.nfat).length, "A faturar"],
    ["pk", L.filter((v) => noAr(v)).length, "No ar agora"],
  ]
    .map(([c, n, l]) => `<div class="kpi ${c}"><b>${n}</b><span>${l}</span></div>`)
    .join("")}</div>
  <div class="chips" style="margin-bottom:10px">${F.map(([k, n, c]) => `<span class="chip ${gof === k ? "sel" : ""}" data-a="gof" data-v="${k}">${n} (${c})</span>`).join("")}</div>
  <div class="mu" style="margin:0 2px 10px;font-size:13px">Planilha só de acompanhamento: ela é gerada pelo sistema e salva sozinha na pasta de backup (GERENCIA_E_OPERACAO.xlsx, mais uma cópia por dia). Quem marca o que foi faturado, a data e o Nº da NF é a operação, aqui no sistema; a planilha apenas reflete isso.</div>`;
  h +=
    R.map((v) => {
      const ids = vIds(v),
        val = ids.filter((i) => (S.fotos[v.id + "__" + i] || {}).status === "validada").length,
        open = S.col["go|" + v.id];
      return `<div class="dv ${v.fat || v.nfat ? "ok" : noAr(v) ? "bl" : "am"}"><div class="dvh"><b>${e(v.cliente)}</b>${v.pi ? `<span class="mu">PI ${e(v.pi)}</span>` : ""}${v.ag ? `<span class="mu">· Ag. ${e(v.ag)}</span>` : ""}<span class="mu">${e(fmt(v.ini) || "—")} → ${e(fmt(v.fim) || "—")}</span><span class="pill ${noAr(v) ? "b" : "a"}">${noAr(v) ? "No ar" : "Encerrada"}</span><span class="sp"></span><span class="pill ${v.chk ? "g" : "b"}">${v.chk ? "✔ Checking" : "Checking pendente"}</span><span class="pill ${v.fat ? "g" : "p"}">${v.fat ? "✔ Faturado" : "A faturar"}</span></div>
   <div class="row" style="margin-top:8px;align-items:center"><span class="mu" style="font-size:13px">${ids.length} endereço(s) · fotos ${val}/${ids.length}</span><button class="sm" data-a="col" data-v="go|${v.id}">${open ? "▾ Ocultar endereços" : "▸ Ver endereços"}</button><span class="sp"></span>
    ${v.nfat ? `<span class="b s-validada">Não faturável</span>` : `<button class="sm ${v.fat ? "" : "pri"}" data-a="vfat" data-v="${v.id}">${v.fat ? "Desfazer faturamento" : "Marcar faturado"}</button>`}
    <input type="date" data-a="x_vd" data-v="${v.id}" value="${e(v.fdt || "")}" title="Data do faturamento" style="flex:0 0 150px"><input data-a="x_vn" data-v="${v.id}" placeholder="Nº NF" value="${e(v.nfn || "")}" style="flex:0 0 110px"></div>
   ${
     open
       ? `<ol class="ckadr">${ids
           .map((i) => {
             const p = PMf(i);
             return `<li><b>${e(p.nome)}</b>${p.end && p.end !== p.nome ? ` <span class="mu">${e(p.end)}</span>` : ""}</li>`;
           })
           .join("")}</ol>`
       : ""
   }</div>`;
    }).join("") || '<div class="dvz">Nenhuma campanha neste filtro.</div>';
  return h;
}
function dashboard() {
  const hj = dia(),
    dt = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const stat = (v) => {
    const ids = vIds(v),
      c = { pendente: 0, feita: 0, refazer: 0, validada: 0 };
    ids.forEach((i) => {
      const s = (S.fotos[v.id + "__" + i] || {}).status || "pendente";
      c[s] = (c[s] || 0) + 1;
    });
    return { ids, c, n: ids.length };
  };
  const dias = (d) => Math.round((new Date(d + "T12:00:00") - new Date(hj + "T12:00:00")) / 864e5);
  const all = S.vts.filter((v) => (v.paineis || []).length),
    abertos = all.filter((v) => !isConc(v));
  const andamento = all.filter((v) => vig(v) && !(v.chk && isConc(v))),
    iniciar = abertos.filter((v) => v.ini && v.ini > hj).sort((a, b) => a.ini.localeCompare(b.ini));
  const semFoto = abertos
    .filter(
      (v) =>
        vig(v) &&
        (() => {
          const s = stat(v);
          return s.c.pendente + s.c.refazer > 0;
        })(),
    )
    .sort((a, b) => (a.fim || "9").localeCompare(b.fim || "9"));
  const vencidas = abertos.filter(
    (v) =>
      v.fim &&
      v.fim < hj &&
      (() => {
        const s = stat(v);
        return s.c.pendente + s.c.refazer > 0;
      })(),
  );
  const vtAj = abertos.filter((v) => v.vok === "nao"),
    vtNv = abertos.filter((v) => !v.vok);
  const prontos = ckLista(),
    feitos = all.filter((v) => v.chk).sort((a, b) => (b.chkd || "").localeCompare(a.chkd || ""));
  let pend = 0,
    val = 0,
    tot = 0;
  andamento.forEach((v) => {
    const s = stat(v);
    pend += s.c.pendente + s.c.refazer;
    val += s.c.validada;
    tot += s.n;
  });
  const pct = tot ? Math.round((val * 100) / tot) : 0;
  const reg = {};
  semFoto.forEach((v) =>
    stat(v).ids.forEach((i) => {
      const s = (S.fotos[v.id + "__" + i] || {}).status || "pendente";
      if (s === "pendente" || s === "refazer") {
        const p = PMf(i);
        if (p) reg[p.id] = rg(p);
      }
    }),
  );
  const regC = {};
  Object.values(reg).forEach((r) => (regC[r] = (regC[r] || 0) + 1));
  const pendIds = (v) =>
    stat(v).ids.filter((i) => {
      const s = (S.fotos[v.id + "__" + i] || {}).status || "pendente";
      return s === "pendente" || s === "refazer";
    });
  const vig2 = (v) => (v.fim ? `até ${e(fmt(v.fim))}` : "sem data final");
  const left = (v) => {
    if (!v.fim) return "";
    const d = dias(v.fim);
    return d < 0
      ? `<span class="pill p">vencido há ${-d} d</span>`
      : d === 0
        ? '<span class="pill p">termina hoje</span>'
        : d <= 3
          ? `<span class="pill a">${d} d restantes</span>`
          : `<span class="pill b">${d} d restantes</span>`;
  };
  const ckChip = (v) =>
    v.chk
      ? '<span class="pill g">✔ Checking feito</span>'
      : isConc(v)
        ? '<span class="pill p">Checking pronto para fazer</span>'
        : '<span class="pill b">Checking aguarda fotos</span>';
  const sec = (t, n, sub) =>
    `<div class="dsec"><h2>${t}</h2>${n !== undefined ? `<span class="n">${n}</span>` : ""}${sub ? `<span class="mu">${sub}</span>` : ""}</div>`;
  const kpi = (c, n, l) => `<div class="kpi ${c}"><b>${n}</b><span>${l}</span></div>`;
  let h = `<div class="dh"><div class="ring" style="--p:${pct}"><b>${pct}%</b></div><div style="flex:1;min-width:220px"><h1>Visão geral da operação</h1><div class="sub">${e(dt)}</div><div style="margin-top:8px;opacity:.92;font-size:14px">${andamento.length} campanha(s) no ar · ${val} de ${tot} fotos validadas${pend ? ` · <b>${pend} endereço(s) ainda sem foto</b>` : " · tudo fotografado 🎉"}</div></div>
  <div class="row" style="flex:0 0 auto"><button class="pri" data-a="gp" style="background:#fff;color:#1B1F7A;box-shadow:none">Montar rota com as pendências</button><button data-a="dnew" style="background:rgba(255,255,255,.18);color:#fff;box-shadow:none">＋ Novo VT</button></div></div>
  <div class="kpis">${kpi("", "'+'", "")}</div>`;
  h = h.replace(
    kpi("", "'+'", ""),
    kpi("", andamento.length, "Em andamento") +
      kpi("pk", pend, "Endereços sem foto") +
      kpi("am", iniciar.length, "Para iniciar") +
      kpi("am", vtAj.length + vtNv.length, "VT a ajustar / verificar") +
      kpi("pk", prontos.length, "Checkings para fazer") +
      kpi("gr", feitos.length, "Checkings feitos"),
  );
  h += plDash();
  // sem fotos
  h += sec("Ativas sem fotos — organize a rota", semFoto.length, "ordenadas pelo prazo mais curto");
  if (Object.keys(regC).length)
    h += `<div class="dch" style="margin:-2px 0 10px 2px">${Object.entries(regC)
      .sort((a, b) => b[1] - a[1])
      .map(([r, n]) => `<span class="r">${e(r)} · ${n}</span>`)
      .join("")}</div>`;
  h +=
    semFoto
      .map((v) => {
        const s = stat(v),
          pn = pendIds(v),
          pc = s.n ? Math.round(((s.c.validada + s.c.feita) * 100) / s.n) : 0;
        return `<div class="dv"><div class="dvh"><b>${e(v.cliente)}</b>${v.pi ? `<span class="mu">PI ${e(v.pi)}</span>` : ""}${v.ag ? `<span class="mu">· Ag. ${e(v.ag)}</span>` : ""}<span class="mu">${vig2(v)}</span>${left(v)}${vokBadge(v)}<span class="sp"></span><button class="sm pri" data-a="dvrota" data-v="${v.id}">Rota deste VT</button></div>
   <div class="bar"><i style="width:${pc}%"></i></div><div class="mu" style="font-size:13px"><b>${pn.length}</b> endereço(s) sem foto de ${s.n} · ${s.c.feita} a validar · ${s.c.validada} validadas${s.c.refazer ? ` · <b style="color:#C2185B">${s.c.refazer} p/ refazer</b>` : ""}</div>
   <div class="dch">${pn
     .slice(0, 8)
     .map((i) => {
       const p = PMf(i);
       return `<span>${e(p.nome)}</span>`;
     })
     .join("")}${pn.length > 8 ? `<span>+${pn.length - 8}</span>` : ""}</div></div>`;
      })
      .join("") || '<div class="dvz">Nenhuma campanha ativa com fotos pendentes. ✔</div>';
  if (vencidas.length)
    h +=
      sec("Vencidas com fotos pendentes", vencidas.length) +
      vencidas
        .map(
          (v) =>
            `<div class="dv am"><div class="dvh"><b>${e(v.cliente)}</b>${v.pi ? `<span class="mu">PI ${e(v.pi)}</span>` : ""}${left(v)}<span class="sp"></span><button class="sm" data-a="dvrota" data-v="${v.id}">Rota deste VT</button></div><div class="mu" style="font-size:13px">${pendIds(v).length} endereço(s) sem foto</div></div>`,
        )
        .join("");
  // em andamento
  h += sec(
    "Campanhas em andamento",
    andamento.length,
    "atualiza sozinho conforme você valida fotos e conclui checkings",
  );
  h += `<div class="dgrid">${
    andamento
      .map((v) => {
        const s = stat(v),
          p = s.n ? Math.round((s.c.validada * 100) / s.n) : 0;
        return `<div class="dcard"><div class="top"><div class="mini" style="--p:${p}"><i>${p}%</i></div><div style="min-width:0"><b>${e(v.cliente)}</b><div class="mu" style="font-size:13px">${v.pi ? "PI " + e(v.pi) + " · " : ""}${vig2(v)}</div></div></div>
   <div class="bar"><i style="width:${p}%"></i></div><div class="mu" style="font-size:13px">${s.c.validada}/${s.n} validadas · ${s.c.feita} a validar · ${s.c.pendente + s.c.refazer} sem foto</div>
   <div class="dch" style="margin-top:10px">${ckChip(v)}${left(v)}${vokBadge(v)}</div></div>`;
      })
      .join("") || '<div class="dvz" style="grid-column:1/-1">Nenhuma campanha no ar hoje.</div>'
  }</div>`;
  // para iniciar
  h += sec("Campanhas para iniciar", iniciar.length);
  h +=
    iniciar
      .map((v) => {
        const d = dias(v.ini);
        return `<div class="dv bl xp${S.col["dx|" + v.id] ? " ab" : ""}"><div class="dvh" data-a="dvx" data-v="${v.id}"><b>${e(v.cliente)}</b>${v.pi ? `<span class="mu">PI ${e(v.pi)}</span>` : ""}<span class="mu">inicia em ${e(fmt(v.ini))} · ${vIds(v).length} painéis</span><span class="pill ${d <= 2 ? "a" : "b"}">${d === 1 ? "amanhã" : "em " + d + " dias"}</span>${vokBadge(v)}${vfResumo(v)}<span class="sp"></span><i class="dvx-seta" aria-hidden="true">▾</i></div>${vfPainel(v)}</div>`;
      })
      .join("") || '<div class="dvz">Nenhuma campanha agendada para começar.</div>';
  // vt pendente
  h += sec(
    "Campanhas com VT pendente",
    vtAj.length + vtNv.length,
    "criativo a ajustar ou ainda não verificado",
  );
  const vl = (l, cls) =>
    l
      .map(
        (v) =>
          `<div class="dv ${cls}"><div class="dvh"><b>${e(v.cliente)}</b>${v.pi ? `<span class="mu">PI ${e(v.pi)}</span>` : ""}<span class="mu">${v.ini && v.ini > hj ? "inicia " + e(fmt(v.ini)) : vig2(v)}</span><span class="sp"></span>${vokBadge(v)}<button class="sm" data-a="vok" data-v="${v.id}">VT correto?</button></div></div>`,
      )
      .join("");
  h += vl(vtAj, "am") + vl(vtNv, "bl") || "";
  if (!vtAj.length && !vtNv.length) h += '<div class="dvz">Todos os VTs estão conferidos. ✔</div>';
  // checkings
  h += sec("Checkings");
  h += `<div class="dgrid"><div><div class="mu" style="margin:0 0 6px 4px;font-weight:700">Prontos para fazer (${prontos.length})</div>${prontos.map((v) => `<div class="dv"><div class="dvh"><b>${e(v.cliente)}</b>${v.pi ? `<span class="mu">PI ${e(v.pi)}</span>` : ""}<span class="sp"></span><button class="sm pri" data-a="ckopen" data-v="${v.id}">Fazer checking</button></div></div>`).join("") || '<div class="dvz">Nenhum aguardando.</div>'}</div>
  <div><div class="mu" style="margin:0 0 6px 4px;font-weight:700">Feitos (${feitos.length})</div>${
    feitos
      .slice(0, 8)
      .map(
        (v) =>
          `<div class="dv ok"><div class="dvh"><b>${e(v.cliente)}</b>${v.pi ? `<span class="mu">PI ${e(v.pi)}</span>` : ""}<span class="sp"></span><span class="pill g">✔ ${v.chkd ? e(fmt(v.chkd)) : "feito"}${v.chka ? " · auto" : ""}</span></div></div>`,
      )
      .join("") || '<div class="dvz">Nenhum ainda.</div>'
  }${feitos.length > 8 ? `<div class="mu" style="margin:4px 6px">+ ${feitos.length - 8} em Concluídos</div>` : ""}</div></div>`;
  return h;
}
const foot = () =>
  `<div class="card mu" style="margin-top:14px">${CLD ? "Dados salvos na nuvem (Supabase) e" : "Dados salvos"} neste navegador${mem ? " — <b>armazenamento bloqueado: nada está sendo salvo</b>" : ""}${BK.st === "on" ? " e sincronizados pela pasta do backup" : ""}. Backup, sincronização e planilha ficam em Admin.</div>`;

/* ===== VT por endereço (Campanhas para iniciar): ao passar o mouse (ou tocar) abre os endereços da campanha,
   cada um com "o vídeo está correto?" ===== */
const vpSt = (v, id) => (v.vokp && v.vokp[id]) || (v.vok === "sim" ? "sim" : "");
function vfResumo(v) {
  const L = vIds(v);
  if (L.length < 2) return "";
  const ok = L.filter((i) => vpSt(v, i) === "sim").length,
    aj = L.filter((i) => vpSt(v, i) === "nao").length;
  return `<span class="pill ${ok === L.length ? "g" : aj ? "p" : "b"}">${ok}/${L.length} endereços ok${aj ? ` · ${aj} a ajustar` : ""}</span>`;
}
function vfPainel(v) {
  const L = vIds(v);
  if (!L.length) return "";
  const TX = { sim: "✔ Vídeo correto", nao: "⚠ A ajustar", "": "Não verificado" };
  return `<div class="dvx"><div class="dvx-in"><div class="dvx-cab">Endereços desta campanha <span>toque no status para mudar</span></div>${L.map((i) => {
    const p = PMf(i),
      st = vpSt(v, i);
    return `<div class="vf ${st || "nv"}"><div class="vf-h"><div class="vf-n"><b>${e(p.nome)}</b><small>${e(p.end || "")}</small></div><span class="sp"></span><button type="button" class="vf-st" data-a="vokp" data-v="${v.id}|${e(i)}" title="Alternar: não verificado → correto → a ajustar">${TX[st]}</button></div></div>`;
  }).join("")}</div></div>`;
}
