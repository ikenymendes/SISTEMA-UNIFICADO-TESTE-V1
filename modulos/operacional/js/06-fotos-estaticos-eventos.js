/* =====================================================================
   Módulo operacional · Fotos início/fim, concluídos, prioridades, estáticos e eventos
   (arquivo 6 de 13; carregados em ordem pelo index.html)
   ===================================================================== */

/* ===== Fotos início/fim, concluídos, prioridades, estáticos ===== */
const nfv = (v) => Math.max(1, +v.nf || 2);
const fotoInfo = (t) => {
  const v = t.vt;
  if (!v || !v.fif) return null;
  const f = S.fotos[t.key] || {},
    n = nfv(v),
    i = f.fi || 0,
    x = f.ff || 0;
  return { n, i, f: x, ok: i >= n && x >= n };
};
const fiTxt = (t, k) => {
  const fi = fotoInfo(t);
  return fi ? (k === "fi" ? fi.i : fi.f) + "/" + fi.n : "";
};
const vIds = (v) => (v.paineis || []).filter((i) => PMf(i));
const isConc = (v) => {
  if (v.man) return !!v.conc;
  if (v.aberto) return false;
  const ids = vIds(v);
  return ids.length > 0 && ids.every((i) => (S.fotos[v.id + "__" + i] || {}).status === "validada");
};
const concDate = (v) =>
  v.man
    ? v.conc || 0
    : Math.max(0, ...(v.paineis || []).map((i) => (S.fotos[v.id + "__" + i] || {}).ts || 0)) || v.conc || 0;
let cfl = "todos",
  ctab = "ag";
const fatOk = (v) => !!(v.fat && v.fdt && (v.nfn || "").trim()),
  isEv = (v) => v.tipo === "evento",
  fechado = (v) => !!(v.chk && (fatOk(v) || (isEv(v) && v.evc)));
const falta = (v) =>
  isEv(v)
    ? [!v.chk && "checking"].filter(Boolean)
    : [
        !v.chk && "checking",
        !v.fat && "faturamento",
        v.fat && !v.fdt && "data do faturamento",
        v.fat && !(v.nfn || "").trim() && "Nº da NF",
      ].filter(Boolean);
const cflt = (v) => ctab !== "ag" || cfl === "todos" || (cfl === "chk" ? !v.chk : !fatOk(v) && !isEv(v));
const cflBar = () => {
  const c = S.vts.filter(isConc).filter((v) => !fechado(v)),
    n = (f) => c.filter(f).length;
  return [
    ["todos", "Todos (" + c.length + ")"],
    ["chk", "Sem checking (" + n((v) => !v.chk) + ")"],
    ["fat", "Faturamento incompleto (" + n((v) => !fatOk(v) && !isEv(v)) + ")"],
  ]
    .map(([k, t]) => `<span class="chip ${cfl === k ? "sel" : ""}" data-a="cfl" data-v="${k}">${t}</span>`)
    .join("");
};
const finPanel = (v) =>
  `<div class="fin"><div class="${v.chk ? "done" : ""}"><div><b>Checking</b> <span class="b ${v.chk ? "s-validada" : "s-pendente"}">${v.chk ? "Feito" + (v.chkd ? " em " + e(fmt(v.chkd)) : "") + (v.chka ? " (automático)" : "") : "Ainda não"}</span></div><div class="row" style="margin-top:8px"><button class="sm ${v.chk ? "" : "pri"}" data-a="vchk" data-v="${v.id}">${v.chk ? "Desfazer checking" : "Marcar checking feito"}</button><button class="sm" data-a="ckopen" data-v="${v.id}">${v.chk ? "Refazer checking" : "Fazer checking"}</button></div></div><div class="${v.fat ? "done" : ""}"><div><b>Faturamento${isEv(v) ? " (opcional)" : ""}</b> <span class="b ${v.fat ? "s-validada" : "s-pendente"}">${v.fat ? "Faturado" : "Não faturado"}</span></div><div class="row" style="margin-top:8px"><button class="sm ${v.fat ? "" : "pri"}" data-a="vfat" data-v="${v.id}">${v.fat ? "Desfazer faturamento" : "Marcar faturado"}</button></div><div class="row" style="margin-top:8px"><div><div class="mu">Data do faturamento</div><input type="date" data-a="x_vd" data-v="${v.id}" value="${e(v.fdt || "")}"></div><div><div class="mu">Nº da nota fiscal</div><input data-a="x_vn" data-v="${v.id}" placeholder="Ex.: 12345" value="${e(v.nfn || "")}"></div></div></div></div>`;
let cq = "",
  eed = null,
  efl = "todos",
  ef = { nome: "", end: "", obs: "", bulk: "", oc: "vazio", cl: "", pi: "", ini: "", fim: "" };
function conclList() {
  const q = cq.trim().toLowerCase(),
    L = S.vts
      .filter(isConc)
      .filter((v) =>
        ctab === "pc" ? fechado(v) && !isEv(v) : ctab === "ec" ? fechado(v) && isEv(v) : !fechado(v),
      )
      .filter(cflt)
      .filter(
        (v) =>
          !q ||
          ((v.cliente || "") + " " + (v.pi || "") + " " + ((v.ev && v.ev.nome) || ""))
            .toLowerCase()
            .includes(q),
      )
      .sort((a, b) => concDate(b) - concDate(a));
  if (!L.length)
    return `<div class="card mu">${q ? "Nada encontrado." : ctab === "ec" ? "Nenhum evento concluído ainda. Eventos com checking feito vão para cá ao marcar “Concluído” ou quando o faturamento for completado." : ctab === "pc" ? "Nenhum processo concluído ainda. Um VT chega aqui quando o checking está feito e o faturamento está completo (faturado, data e Nº da NF)." : "Nada aguardando fechamento. Quando todas as fotos de um VT forem validadas, ele aparece aqui até o checking e o faturamento estarem completos."}</div>`;
  const all = tasks(true);
  return L.map((v) => {
    const ts = all.filter((t) => t.vt.id === v.id),
      open = S.col["cx|" + v.id];
    return `<div class="card"><div class="row"><div data-a="col" data-v="cx|${v.id}" style="cursor:pointer">${open ? "▾" : "▸"} <b>${e(v.cliente)}</b>${v.tipo === "evento" ? evBadge(v) : v.pi ? ` <span class="mu">PI ${e(v.pi)}</span>` : ""} <span class="mu">${e(fmt(v.ini))} → ${e(fmt(v.fim))} · ${ts.length} painéis · concluído em ${dt(concDate(v))}</span>${v.fif ? ` <span class="b">📷 início/fim ×${nfv(v)}</span>` : ""}</div><button class="sm" data-a="vok" data-v="${v.id}" style="flex:0 0 auto" title="Alternar: não verificado → correto → ajustar">VT correto?</button><button class="sm" data-a="vted" data-v="${v.id}" style="flex:0 0 auto">Editar</button><button class="sm" data-a="cv" data-v="${v.id}" style="flex:0 0 auto">Copiar texto</button><button class="sm" data-a="ckopen" data-v="${v.id}" style="flex:0 0 auto">Checking</button><button class="sm" data-a="vreab" data-v="${v.id}" style="flex:0 0 auto">Reabrir</button><button class="sm" data-a="vdel" data-v="${v.id}" style="flex:0 0 auto">${confRem === "vd|" + v.id ? "Confirmar excluir" : "Excluir"}</button></div>${ctab !== "ag" ? `<div class="row" style="margin:6px 2px 0"><div class="mu" style="font-size:13px">✔ ${isEv(v) ? "Evento concluído" : "Processo concluído"} · checking ${e(fmt(v.chkd) || "feito")}${fatOk(v) ? ` · faturado em ${e(fmt(v.fdt))} · NF ${e(v.nfn)}` : isEv(v) ? " · sem faturamento" : ""}${v.evc ? ` · concluído em ${e(fmt(v.evc))}` : ""}</div>${isEv(v) && v.evc ? `<span class="sp"></span><button class="sm" data-a="evcu" data-v="${v.id}">Reabrir evento</button>` : ""}</div>` : `<div class="row" style="margin:6px 2px 0"><div class="mu" style="font-size:13px">${falta(v).length ? `Falta: <b>${e(falta(v).join(", "))}</b>. ` : ""}${isEv(v) ? "Faturamento é opcional para eventos." : "Ao completar, o VT vai sozinho para “Processos concluídos”."}</div>${isEv(v) && v.chk ? `<span class="sp"></span><button class="sm pri" data-a="evc" data-v="${v.id}">Marcar concluído (sem faturamento)</button>` : ""}</div>`}${finPanel(v)}${open ? ts.map((t) => taskRow(t, false)).join("") : ""}</div>`;
  }).join("");
}
const concl = () => {
  const c = S.vts.filter(isConc),
    na = c.filter((v) => !fechado(v)).length,
    ne = c.filter((v) => fechado(v) && isEv(v)).length,
    np = c.length - na - ne;
  return `<div class="tabs" style="margin-bottom:8px"><button class="sm ${ctab === "ag" ? "on" : ""}" data-a="ctab" data-v="ag">Aguardando fechamento (${na})</button><button class="sm ${ctab === "pc" ? "on" : ""}" data-a="ctab" data-v="pc">Processos concluídos (${np})</button><button class="sm ${ctab === "ec" ? "on" : ""}" data-a="ctab" data-v="ec">Eventos concluídos (${ne})</button></div><div class="card"><div class="row"><input id="cq" placeholder="Buscar por cliente ou PI…" value="${e(cq)}"><div class="mu" style="flex:0 0 auto">${ctab === "pc" ? np : ctab === "ec" ? ne : na} VT(s)</div></div>${ctab === "ag" ? `<div class="chips" style="margin-top:8px">${cflBar()}</div>` : ""}</div><div id="cl">${conclList()}</div>`;
};
const efv = () => ({ nome: "", end: "", obs: "", bulk: "", oc: "vazio", cl: "", pi: "", ini: "", fim: "" });
const vokBadge = (v) =>
  v.vok === "sim"
    ? ' <span class="b s-validada">🎬 VT correto</span>'
    : v.vok === "nao"
      ? ' <span class="b s-refazer">🎬 VT a ajustar</span>'
      : ' <span class="b">🎬 VT não verificado</span>';
const cliAt = (id) => S.vts.filter((v) => !isConc(v) && vig(v) && (v.paineis || []).includes(id));
const cliTxt = (id) =>
  cliAt(id).map((v) => v.cliente + (v.vok === "sim" ? " ✔" : v.vok === "nao" ? " ⚠ VT a ajustar" : ""));
const vig = (v) => {
  const h = dia();
  return (!v.ini || v.ini <= h) && (!v.fim || v.fim >= h);
};
const vigTxt = (v) => {
  const h = dia();
  return v.ini && v.ini > h
    ? `<span class="b s-pendente">inicia ${e(fmt(v.ini))}</span>`
    : v.fim && v.fim < h
      ? `<span class="b s-refazer">vencido</span>`
      : `<span class="b s-validada">vigente</span>`;
};
const EOP = [
  ["cli", "Cliente"],
  ["vazio", "Vazio"],
  ["lona", "Lona mega"],
];
const estOcD = () =>
  ef.oc === "cli"
    ? { oc: "cli", cl: ef.cl.trim(), pi: ef.pi.trim(), ini: ef.ini, fim: ef.fim }
    : { oc: ef.oc, cl: "", pi: "", ini: "", fim: "" };
const estErr = () =>
  ef.oc === "cli" && !ef.cl.trim()
    ? "Informe o cliente."
    : ef.ini && ef.fim && ef.fim < ef.ini
      ? "A data final é anterior à inicial."
      : "";
const estOc = (x) =>
  x.oc === "cli"
    ? `<b>${e(x.cl || "Cliente")}</b>${x.pi ? ` <span class="mu">PI ${e(x.pi)}</span>` : ""}${x.ini || x.fim ? ` <span class="mu">${e(fmt(x.ini))} → ${e(fmt(x.fim))}</span> ${vigTxt(x)}` : ""}`
    : x.oc === "vazio"
      ? `<span class="b s-pendente">Vazio</span>`
      : x.oc === "lona"
        ? `<span class="b s-feita">Lona mega</span>`
        : `<span class="b mu">ocupação não definida</span>`;
function estaticos() {
  const ed = (eed && S.est.find((x) => x.id === eed)) || null,
    cnt = (k) => S.est.filter((x) => (k === "todos" ? true : k === "nd" ? !x.oc : x.oc === k)).length,
    L = S.est.filter((x) => efl === "todos" || (efl === "nd" ? !x.oc : x.oc === efl)),
    FL = [
      ["todos", "Todos"],
      ["cli", "Cliente"],
      ["vazio", "Vazio"],
      ["lona", "Lona mega"],
    ].concat(cnt("nd") ? [["nd", "Sem definição"]] : []);
  return `<div class="card"><h2 style="margin-top:0">${ed ? "Editar estático" : "Adicionar estático"}</h2><div class="row"><input id="en" placeholder="Nome / referência (opcional)" value="${e(ef.nome)}"><input id="ee" placeholder="Endereço, bairro, cidade" value="${e(ef.end)}"></div>
<div class="row" style="margin-top:8px"><div><div class="mu">Ocupação</div><select id="eoc" data-a="x_eo">${ef.oc === "" ? '<option value="" selected>Não definida</option>' : ""}${EOP.map(([k, n]) => `<option value="${k}" ${ef.oc === k ? "selected" : ""}>${n}</option>`).join("")}</select></div></div>
${ef.oc === "cli" ? `<div class="row" style="margin-top:8px"><input id="ecl" placeholder="Cliente" value="${e(ef.cl)}"><input id="epi" placeholder="Nº da PI" value="${e(ef.pi)}"><div><div class="mu">Início</div><input id="eini" type="date" value="${e(ef.ini)}"></div><div><div class="mu">Fim</div><input id="efim" type="date" value="${e(ef.fim)}"></div></div>` : ""}
<input id="eo" style="margin-top:8px" placeholder="Observação (opcional)" value="${e(ef.obs)}"><div class="row" style="margin-top:8px"><button class="pri" data-a="eadd" style="flex:0 0 auto">${ed ? "Salvar" : "Adicionar"}</button>${ed ? '<button data-a="ecan2" style="flex:0 0 auto">Cancelar</button>' : ""}</div></div>
${ed ? "" : `<div class="card"><h2 style="margin-top:0">Adicionar vários</h2><div class="mu">Cole um endereço por linha. Todos entram com a ocupação escolhida acima (cliente + PI + período, vazio ou lona mega).</div><textarea id="eb" rows="4" style="margin-top:6px">${e(ef.bulk)}</textarea><button data-a="ebulk" style="margin-top:8px">Adicionar lista</button></div>`}
<div class="card"><b>${S.est.length}</b> <span class="mu">estáticos cadastrados</span><div class="chips">${FL.map(([k, n]) => `<span class="chip ${efl === k ? "sel" : ""}" data-a="efl" data-v="${k}">${n} (${cnt(k)})</span>`).join("")}</div>${L.map((x) => `<div class="task"><div><b>${e(x.nome || x.end)}</b>${x.nome ? `<div class="mu">${e(x.end)}</div>` : ""}<div>${estOc(x)}</div>${x.obs ? `<div class="mu">${e(x.obs)}</div>` : ""}<div class="mu"><a href="${mapa(x)}" target="_blank" rel="noopener">mapa</a></div></div><div class="acts"><button class="sm" data-a="eed" data-v="${x.id}">Editar</button><button class="sm" data-a="erem" data-v="${x.id}">${confRem === "es|" + x.id ? "Confirmar?" : "Remover"}</button></div></div>`).join("") || '<div class="mu">Nenhum neste filtro.</div>'}</div>`;
}
/* ===== Eventos: VTs do tipo evento, data e pontos que veiculam ===== */
const evEnd = (v) => (v.ev && (v.ev.dtf || v.ev.dt)) || "";
const evData = (v) =>
  v.ev && v.ev.dt ? fmt(v.ev.dt) + (v.ev.dtf && v.ev.dtf !== v.ev.dt ? " a " + fmt(v.ev.dtf) : "") : "";
const evBadge = (v) =>
  v.tipo === "evento"
    ? ` <span class="b s-feita">🎟 ${e((v.ev && v.ev.nome) || "Evento")}${evData(v) ? " · " + e(evData(v)) : ""}</span>`
    : "";
const vtTag = (v) =>
  v.tipo === "evento"
    ? ` <span class="b s-feita">🎟 evento ${e(evData(v))}</span>`
    : v.pi
      ? ` <span class="b">PI ${e(v.pi)}</span>`
      : "";
const evVts = () => S.vts.filter((v) => v.tipo === "evento" && v.ev && v.ev.dt);
const evProx = () => {
  const h = dia();
  return evVts()
    .filter((v) => evEnd(v) >= h)
    .sort((a, b) => a.ev.dt.localeCompare(b.ev.dt));
};
const evPass = () => {
  const h = dia();
  return evVts()
    .filter((v) => evEnd(v) < h)
    .sort((a, b) => b.ev.dt.localeCompare(a.ev.dt));
};
const evDias = (v) => {
  const h = dia(),
    i = v.ev.dt,
    f = evEnd(v);
  if (i <= h && f >= h) return i === h && f === h ? "hoje" : "acontecendo agora";
  const d = Math.round((new Date(i + "T00:00:00") - new Date(h + "T00:00:00")) / 864e5);
  return d === 1 ? "amanhã" : "em " + d + " dias";
};
const evTxt = () => {
  const L = evProx();
  if (!L.length) return "Nenhum evento programado.";
  return (
    "EVENTOS PROGRAMADOS\n\n" +
    L.map((v) => {
      const ids = vIds(v);
      return (
        "📅 " +
        evData(v) +
        " – " +
        (v.ev.nome || "Evento") +
        "\nCliente: " +
        v.cliente +
        "\nVT no ar: " +
        (fmt(v.ini) || "?") +
        " a " +
        (fmt(v.fim) || "?") +
        "\nPontos (" +
        ids.length +
        "):\n" +
        ids.map((i, n) => n + 1 + ". " + qs(PMf(i))).join("\n")
      );
    }).join("\n\n")
  );
};
function evCsv() {
  const q = (s) => '"' + String(s ?? "").replace(/"/g, '""') + '"',
    h = dia(),
    rows = [
      [
        "Data do evento",
        "Evento",
        "Cliente",
        "VT início",
        "VT fim",
        "Situação do evento",
        "Painel",
        "Endereço",
        "Região",
        "Foto do VT",
      ],
    ];
  evProx()
    .concat(evPass().slice().reverse())
    .forEach((v) => {
      const sit = evEnd(v) < h ? "Realizado" : "Próximo";
      vIds(v).forEach((i) => {
        const p = PMf(i);
        rows.push([
          evData(v),
          v.ev.nome || "",
          v.cliente,
          fmt(v.ini),
          fmt(v.fim),
          sit,
          p.nome,
          p.end,
          rg(p),
          ST[(S.fotos[v.id + "__" + i] || {}).status || "pendente"],
        ]);
      });
    });
  return "\ufeff" + rows.map((r) => r.map(q).join(";")).join("\r\n");
}
const evCard = (v) => {
  const ids = vIds(v),
    k = "ev|" + v.id,
    cl = S.col[k],
    past = evEnd(v) < dia();
  return `<div class="card"><div class="row"><div data-a="col" data-v="${k}" style="cursor:pointer">${cl ? "▸" : "▾"} 🎟 <b>${e(evData(v))}</b> ${past ? `<span class="b mu">realizado</span>` : `<span class="b s-pendente">${evDias(v)}</span>`}<div><b>${e(v.ev.nome || "Evento")}</b> <span class="mu">· ${e(v.cliente)}</span></div><div class="mu">VT no ar: ${e(fmt(v.ini) || "?")} → ${e(fmt(v.fim) || "?")} ${vigTxt(v)} · ${ids.length} ponto(s) veiculando</div></div><button class="sm" data-a="vted" data-v="${v.id}" style="flex:0 0 auto">Editar</button></div>
 ${
   cl
     ? ""
     : ids
         .map((i) => {
           const p = PMf(i),
             st = (S.fotos[v.id + "__" + i] || {}).status || "pendente";
           return `<div class="task"><div><b>${e(p.nome)}</b><div class="mu">${e(p.end)} · ${e(rg(p))} · <a href="${mapa(p)}" target="_blank" rel="noopener">mapa</a></div></div><div class="acts"><span class="b s-${st}">${ST[st]}</span></div></div>`;
         })
         .join("") || '<div class="mu">Sem pontos.</div>'
 }</div>`;
};
function eventos() {
  const pro = evProx(),
    pas = evPass();
  let h = `<div class="card"><div class="row"><div><b>${pro.length}</b> <span class="mu">evento(s) a acontecer${pas.length ? " · " + pas.length + " já realizado(s)" : ""}</span></div><button class="sm" data-a="evcopy" style="flex:0 0 auto">Copiar relação</button><button class="sm" data-a="evcsv" style="flex:0 0 auto">Gerar planilha</button><button class="pri" data-a="evnew" style="flex:0 0 auto">+ Novo evento</button></div></div>`;
  if (!pro.length)
    h += `<div class="card mu">Nenhum evento programado. Use “+ Novo evento” (ou, em “+ Novo VT” na Gestão, escolha o tipo Evento).</div>`;
  pro.forEach((v) => {
    h += evCard(v);
  });
  if (pas.length)
    h +=
      `<h2 data-a="col" data-v="evpass" style="cursor:pointer">${S.col.evpass ? "▾" : "▸"} Já realizados (${pas.length})</h2>` +
      (S.col.evpass ? pas.map(evCard).join("") : "");
  return h;
}
