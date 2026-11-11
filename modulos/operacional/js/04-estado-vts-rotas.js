/* =====================================================================
   Módulo operacional · Estado do sistema, VTs, rotas, tarefas e exportação CSV
   (arquivo 4 de 13; carregados em ordem pelo index.html)
   ===================================================================== */

/* ===== Manutenção ===== */
const mOpen = (pid) => S.manut.some((m) => m.pid === pid && m.status !== "resolvida");
const mset = (id, d) => {
  const m = S.manut.find((q) => q.id === id);
  if (m) Object.assign(m, d);
  save();
};
const MS = () => ({ moto: "Verificação do motoboy", eld: "Com " + ELD, resolvida: "Resolvida" }),
  dt = (t) => (t ? new Date(t).toLocaleDateString("pt-BR") : "");
let S = null,
  mem = false;
try {
  S = migrar(JSON.parse(localStorage.getItem(KEY)));
} catch (_) {
  mem = true;
}
if (!S) S = seed();
function fixS() {
  S.est = S.est || [];
  S.cfix = S.cfix || [];
  if (!Array.isArray(S.prio)) {
    S.prio = defPrio();
    S.pu = 0;
  }
  S.pu = S.pu || 0;
  if (!S.motos) S.motos = ["Thiago", "Alan"];
  MOTOS = S.motos;
  S.col = S.col || {};
  S.manut = S.manut || [];
  S.del = S.del || {};
  S.gu = S.gu || 0;
}
fixS();
const save = () => {
  BK.mod = Date.now();
  try {
    bkLine();
  } catch (_) {}
  stamp();
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
  } catch (_) {
    mem = true;
  }
  bkSched();
  if (CLD) cloudSched();
};
let view = "d",
  moto = MOTOS[0],
  draft = novoDraft(),
  mf = { pid: "", def: "", resp: "moto", moto: MOTOS[0], prio: "", pz: "" },
  mvOpen = null,
  RT = { sel: new Set(), motos: new Set(MOTOS) },
  refazerOpen = null,
  confRem = null;
try {
  const m = localStorage.getItem("moto");
  if (MOTOS.includes(m)) moto = m;
} catch (_) {}
const ALL = () => S.fixos.concat(S.vars),
  PMf = (id) => ALL().find((p) => p.id === id),
  rg = (p) => p.reg || "Outros";
const regs = () => [...new Set(ALL().map(rg))];
function cen(r) {
  const a = ALL().filter((x) => x.ll && rg(x) === r);
  return a.length
    ? [a.reduce((s, x) => s + x.ll[0], 0) / a.length, a.reduce((s, x) => s + x.ll[1], 0) / a.length]
    : CEN;
}
const ll = (p) => p.ll || cen(rg(p));
const parseLL = (s) => {
  const m = String(s || "").match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
  return m ? [+m[1], +m[2]] : null;
};
const D = (a, b) => {
  const r = Math.PI / 180;
  return 6371 * Math.hypot((b[1] - a[1]) * r * Math.cos(((a[0] + b[0]) / 2) * r), (b[0] - a[0]) * r);
};
function order(ps, st) {
  let rest = ps.slice(),
    cur = st,
    r = [];
  while (rest.length) {
    let bi = 0,
      bd = 1e9;
    rest.forEach((p, i) => {
      const d = D(cur, ll(p));
      if (d < bd) {
        bd = d;
        bi = i;
      }
    });
    const p = rest.splice(bi, 1)[0];
    r.push(p);
    cur = ll(p);
  }
  const len = (a) => {
    let t = 0,
      c = st;
    a.forEach((p) => {
      t += D(c, ll(p));
      c = ll(p);
    });
    return t;
  };
  let imp = true,
    g = 0;
  while (imp && g++ < 50) {
    imp = false;
    for (let i = 0; i < r.length - 1; i++)
      for (let j = i + 1; j < r.length; j++) {
        const n = r.slice(0, i).concat(r.slice(i, j + 1).reverse(), r.slice(j + 1));
        if (len(n) < len(r) - 1e-9) {
          r = n;
          imp = true;
        }
      }
  }
  return { r, km: len(r) };
}
function divide(ps, k) {
  if (k < 2 || ps.length < 2) return [ps];
  let a = ps[0],
    b = ps[0],
    m = -1;
  ps.forEach((x) =>
    ps.forEach((y) => {
      const d = D(ll(x), ll(y));
      if (d > m) {
        m = d;
        a = x;
        b = y;
      }
    }),
  );
  const A = ll(a),
    B = ll(b),
    pj = (p) => (ll(p)[1] - A[1]) * (B[1] - A[1]) + (ll(p)[0] - A[0]) * (B[0] - A[0]);
  const s = ps.slice().sort((p, q) => pj(p) - pj(q)),
    h = Math.ceil(s.length / 2);
  return [s.slice(0, h), s.slice(h)];
}
/* destino para o Google Maps/Waze: a coordenada exata, se houver; senão o endereço (nome do ponto + bairro/cidade) + estado */
/* coordenada exata (do Google Maps, 5+ casas decimais) vale mais que o texto do endereço */
const llExato = (p) => !!(p && p.ll && String(p.ll[0]).split(".")[1] && String(p.ll[0]).split(".")[1].length >= 5);
const endQ = (p) => {
  if (llExato(p)) return p.ll.join(",");
  const t = [p.nome, p.end].filter(Boolean).join(", ").trim();
  return /\b(MG|Minas|Belo Horizonte|BH|Contagem|Betim|Nova Lima|Sabar[áa]|Santa Luzia|Ribeir[ãa]o das Neves|Vespasiano|Lagoa Santa)\b/i.test(t) ? t : t + ", MG";
};
const qs = (p) => [p.nome, p.end].filter(Boolean).join(", "),
  enc = encodeURIComponent;
function links(stops) {
  const L = (S.base.end ? [S.base.end] : []).concat(stops.map(endQ)),
    o = [],
    u = "https://www.google.com/maps/dir/?api=1&travelmode=driving";
  if (L.length === 1) return [u + "&destination=" + enc(L[0])];
  for (let i = 0; i < L.length - 1; i += 10) {
    const s = L.slice(i, i + 11);
    o.push(
      u +
        "&origin=" +
        enc(s[0]) +
        "&destination=" +
        enc(s[s.length - 1]) +
        (s.length > 2 ? "&waypoints=" + enc(s.slice(1, -1).join("|")) : ""),
    );
  }
  return o;
}
function gerar() {
  const ps = [...RT.sel].map(PMf).filter(Boolean),
    ms = MOTOS.filter((m) => RT.motos.has(m));
  if (!ps.length || !ms.length) {
    $("warn").innerHTML = '<div class="warn">Selecione pontos e ao menos um motoboy.</div>';
    return;
  }
  $("warn").innerHTML = "";
  const st = S.base.ll || CEN,
    g = divide(ps, ms.length);
  S.rota = {
    ts: Date.now(),
    data: g.map((x, i) => {
      const o = order(x, st);
      return { moto: ms[i], stops: o.r.map((p) => p.id), km: o.km };
    }),
  };
  const as = new Map();
  S.rota.data.forEach((d) => d.stops.forEach((id) => as.set(id, d.moto)));
  tasks().forEach((t) => {
    if (as.has(t.p.id) && (t.status === "pendente" || t.status === "refazer"))
      setF(t.key, { moto: as.get(t.p.id) });
  });
  save();
}
function tasks(inc) {
  const t = [];
  S.vts.forEach((v) => {
    if (!inc && isConc(v)) return;
    (v.paineis || []).forEach((id) => {
      const p = PMf(id);
      if (!p) return;
      const k = v.id + "__" + id,
        f = S.fotos[k] || {};
      t.push({
        key: k,
        vt: v,
        p,
        status: f.status || "pendente",
        moto: f.moto || "",
        by: f.by || "",
        nota: f.nota || "",
      });
    });
  });
  return t;
}
function setF(k, d) {
  S.fotos[k] = { ...(S.fotos[k] || {}), ...d, ts: Date.now() };
  if (d.status && d.status !== "validada") {
    const v = S.vts.find((x) => x.id === k.split("__")[0]);
    if (v && v.aberto) v.aberto = false;
  }
  save();
}
const mapa = (p) => "https://www.google.com/maps/search/?api=1&query=" + enc(endQ(p));
const chips = (sel, a, ra) =>
  regs()
    .map((r) => {
      const P2 = ALL().filter((p) => rg(p) === r),
        k = "c|" + r,
        cl = S.col[k],
        n = P2.filter((p) => sel.has(p.id)).length;
      return `<div class="mu"><a href="#" data-a="col" data-v="${e(k)}" style="text-decoration:none">${cl ? "▸" : "▾"}</a> <b>${e(r)}</b> ${n ? `(${n} sel.) ` : ""}<a href="#" data-a="${ra}" data-v="${e(r)}">todos</a></div>${cl ? "" : `<div class="chips">${P2.map((p) => `<span class="chip ${sel.has(p.id) ? "sel" : ""}" data-a="${a}" data-v="${p.id}">${p.v ? "★ " : ""}${e(p.nome)}</span>`).join("")}</div>`}`;
    })
    .join("");
function quick(t) {
  if (t.status === "pendente" || t.status === "refazer")
    return `<div class="quick"><span class="mu">📷 Foto feita por:</span>${MOTOS.map((m) => `<button class="sm who" data-a="qf" data-v="${t.key}|${e(m)}">✓ ${e(m)}</button>`).join("")}</div>`;
  const ok = t.status === "validada";
  return `<div class="quick ${ok ? "okq" : ""}"><span>${ok ? "✔ Validada" : "✓ Foto feita"}${t.by ? " por <b>" + e(t.by) + "</b>" : ""}</span>${t.by ? "" : `<span class="mu">Quem fez?</span>${MOTOS.map((m) => `<button class="sm who" data-a="qwho" data-v="${t.key}|${e(m)}">${e(m)}</button>`).join("")}`}<button class="sm" data-a="qundo" data-v="${t.key}" style="margin-left:auto">Desfazer</button></div>`;
}
function taskRow(t, mgr, mc) {
  const acts = [],
    fi = fotoInfo(t);
  let ph = "";
  if (fi) {
    const can = mgr || t.status === "pendente" || t.status === "refazer",
      sl = (k, lab, c) =>
        Array.from(
          { length: fi.n },
          (_, j) =>
            `<span class="chip ${c > j ? "sel" : ""}"${can ? ` data-a="fslot" data-v="${t.key}|${k}|${j}"` : ""}>${lab} ${j + 1}${c > j ? " ✓" : ""}</span>`,
        ).join("");
    ph = `<div class="chips">${sl("i", "Início", fi.i)}${sl("f", "Fim", fi.f)}</div><div class="mu">📷 Cliente exige fotos de início e fim · início ${fi.i}/${fi.n} · fim ${fi.f}/${fi.n}${fi.ok ? " ✓ completo" : " — só finaliza com todas"}</div>`;
  }
  if (mgr) {
    acts.push(
      `<select data-a="moto" data-v="${t.key}" style="width:auto"><option value="">Sem motoboy</option>${MOTOS.map((m) => `<option ${t.moto === m ? "selected" : ""}>${m}</option>`).join("")}</select>`,
    );
    if (t.status === "feita")
      acts.push(
        `<button class="sm pri" data-a="ok" data-v="${t.key}">Validar</button><button class="sm" data-a="rf" data-v="${t.key}">Refazer</button>`,
      );
  } else if (t.status === "pendente" || t.status === "refazer")
    acts.push(`<button class="sm pri" data-a="feita" data-v="${t.key}">Foto feita</button>`);
  const rf =
    refazerOpen === t.key
      ? `<div class="row" style="margin-top:6px"><input id="rfn" placeholder="Motivo (ex.: VT errado na tela)"><button class="sm pri" data-a="rfok" data-v="${t.key}" style="flex:0 0 auto">Enviar</button></div>`
      : "";
  const qk = mgr ? quick(t) : "";
  return `<div class="task t-${t.status}"><div>${mc ? `<b>${e(t.p.nome)}</b>${vtTag(t.vt)}` : `<b>${e(t.vt.cliente)}</b> · ${e(t.p.nome)}`}${mOpen(t.p.id) ? ' <span class="s-refazer">⚠ manutenção aberta</span>' : ""}<div class="mu">${e(t.p.end)}${mc ? " · " + e(rg(t.p)) : ""} · <a href="${mapa(t.p)}" target="_blank" rel="noopener">mapa</a></div><div class="mu"><span class="b s-${t.status}">${ST[t.status]}</span> ${!mgr && t.by && t.status !== "pendente" ? "feita por <b>" + e(t.by) + "</b> · " : ""}${t.moto ? e(t.moto) + " · " : ""}até ${e(t.vt.fim || "?")}${t.nota && t.status === "refazer" ? ` · <span class="s-refazer">Motivo: ${e(t.nota)}</span>` : ""}</div>${ph}${qk}${rf}</div><div class="acts">${acts.join("")}</div></div>`;
}
function gestao() {
  const all = tasks(),
    c = (s) => all.filter((t) => t.status === s).length,
    pv = all.filter((t) => (t.status === "pendente" || t.status === "refazer") && vig(t.vt)).length;
  let h = `<div class="card"><div class="row"><div><b>${all.length}</b> <span class="mu">tarefas</span></div><div class="s-pendente"><b>${c("pendente")}</b> pendentes</div><div class="s-feita"><b>${c("feita")}</b> a validar</div><div class="s-refazer"><b>${c("refazer")}</b> refazer</div><div class="s-validada"><b>${c("validada")}</b> validadas</div></div><div class="row" style="margin-top:8px"><button data-a="gp">Gerar rota dos pendentes vigentes (${pv})</button><button data-a="colall" data-v="1">Recolher todos</button><button data-a="colall" data-v="0">Expandir todos</button><button data-a="csv">Gerar planilha</button><button class="pri" data-a="new">${draft.open ? "Fechar" : "+ Novo VT"}</button></div></div>`;
  if (draft.open)
    h += `<div class="card">${draft.edit ? `<h2 style="margin-top:0">Editando VT — marque/desmarque painéis; os novos entram como pendentes</h2>` : ""}<div class="chips"><span class="mu" style="align-self:center">Tipo:</span><span class="chip ${draft.tipo !== "evento" ? "sel" : ""}" data-a="vtipo" data-v="pi">PI</span><span class="chip ${draft.tipo === "evento" ? "sel" : ""}" data-a="vtipo" data-v="evento">Evento</span></div><div class="row"><input id="dc" style="text-transform:uppercase" oninput="var s=this.selectionStart,e2=this.selectionEnd;this.value=this.value.toUpperCase();try{this.setSelectionRange(s,e2)}catch(_){}" placeholder="Cliente (ex.: Bradesco)" value="${e(draft.cliente)}">${draft.tipo === "evento" ? `<input id="dvn" style="text-transform:uppercase" oninput="var s=this.selectionStart,e2=this.selectionEnd;this.value=this.value.toUpperCase();try{this.setSelectionRange(s,e2)}catch(_){}" placeholder="Nome do evento (opcional)" value="${e(draft.evn)}">` : `<input id="dpi" style="text-transform:uppercase" oninput="var s=this.selectionStart,e2=this.selectionEnd;this.value=this.value.toUpperCase();try{this.setSelectionRange(s,e2)}catch(_){}" placeholder="Nº da PI" value="${e(draft.pi)}">`}<input id="dag" style="text-transform:uppercase" oninput="var s=this.selectionStart,e2=this.selectionEnd;this.value=this.value.toUpperCase();try{this.setSelectionRange(s,e2)}catch(_){}" list="agList" placeholder="Agência (sai no relatório)" value="${e(draft.ag || "")}"><datalist id="agList">${[...new Set(S.vts.map((v) => v.ag).filter(Boolean))].map((a) => `<option value="${e(a)}">`).join("")}</datalist><div><div class="mu">VT no ar de</div><input id="di" type="date" value="${draft.ini}"></div><div><div class="mu">até</div><input id="df" type="date" value="${draft.fim}"></div></div>${draft.tipo === "evento" ? `<div class="row" style="margin-top:8px"><div><div class="mu">Data do evento</div><input id="dvd" type="date" value="${draft.evd}"></div><div><div class="mu">Fim do evento (opcional, se durar mais de um dia)</div><input id="dvf" type="date" value="${draft.evf}"></div></div>` : ""}<div class="row" style="margin-top:8px"><label><input type="checkbox" id="dfif" style="width:auto" ${draft.fif ? "checked" : ""}> Cliente exige fotos de início e fim</label><label>Fotos em cada momento <select id="dnf" style="width:auto">${[1, 2, 3, 4, 5].map((n) => `<option ${draft.nf == n ? "selected" : ""}>${n}</option>`).join("")}</select></label><label>Quantos VTs (vídeos) <select id="dnvt" style="width:auto">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `<option ${(draft.nvt || 1) == n ? "selected" : ""}>${n}</option>`).join("")}</select></label></div><div class="row" style="margin-top:8px"><div style="flex:1 1 320px"><div class="mu">O VT (criativo) deste cliente já está correto no ar?</div><select id="dvok"><option value="" ${!draft.vok ? "selected" : ""}>Ainda não verificado</option><option value="sim" ${draft.vok === "sim" ? "selected" : ""}>Sim, já está correto</option><option value="nao" ${draft.vok === "nao" ? "selected" : ""}>Não, precisa ajustar</option></select></div><div style="flex:1 1 320px"><div class="mu"><b>É faturável?</b> (obrigatório)</div><select id="dfatv" style="${draft.fatv ? "" : "border-color:#ff0066"}"><option value="" ${!draft.fatv ? "selected" : ""}>Escolha…</option><option value="sim" ${draft.fatv === "sim" ? "selected" : ""}>Sim, vai para o financeiro</option><option value="nao" ${draft.fatv === "nao" ? "selected" : ""}>Não (permuta, cortesia, evento sem cobrança)</option></select></div></div><div class="mu" style="margin-top:8px">Dados para o checking (opcional). Tipo e formato de cada endereço ficam em Admin → Endereços</div><div class="row"><input id="doc" style="text-transform:uppercase" oninput="var s=this.selectionStart,e2=this.selectionEnd;this.value=this.value.toUpperCase();try{this.setSelectionRange(s,e2)}catch(_){}" placeholder="OC" value="${e(draft.oc || "")}"><input id="dtp" style="text-transform:uppercase" oninput="var s=this.selectionStart,e2=this.selectionEnd;this.value=this.value.toUpperCase();try{this.setSelectionRange(s,e2)}catch(_){}" list="tiposMidia" placeholder="Tipo padrão (se o endereço não tiver)" value="${e(draft.tp || "")}"><input id="dfm" style="text-transform:uppercase" oninput="var s=this.selectionStart,e2=this.selectionEnd;this.value=this.value.toUpperCase();try{this.setSelectionRange(s,e2)}catch(_){}" placeholder="Formato padrão (se o endereço não tiver)" value="${e(draft.fm || "")}"></div><h2>Painéis (${draft.sel.size} selecionados)</h2>${chips(draft.sel, "dp", "dreg")}<h2>Texto para enviar</h2><textarea id="txt" readonly rows="${Math.min(14, draft.sel.size + 3)}" style="width:100%;border:1px solid var(--bd);background:var(--card);color:inherit;border-radius:8px;padding:8px;font:inherit">${e(txtVT(draft.cliente, [...draft.sel]))}</textarea><div class="row" style="margin-top:8px"><button data-a="ctxt">Copiar texto</button>${draft.edit ? `<button data-a="cnew">Copiar só os novos</button>` : ""}<button class="pri" data-a="save">${draft.edit ? "Salvar alterações" : "Criar VT e gerar tarefas"}</button></div></div>`;
  h += "<h2>VTs no ar</h2>";
  const nc = S.vts.filter(isConc).length;
  if (!S.vts.some((v) => !isConc(v)))
    h += `<div class="card mu">Nenhum VT no ar. Use “+ Novo VT”.${nc ? " Os " + nc + " concluído(s) estão na aba Concluídos." : ""}</div>`;
  S.vts
    .filter((v) => !isConc(v))
    .forEach((v) => {
      const ts = all.filter((t) => t.vt.id === v.id),
        ok = ts.filter((t) => t.status === "validada").length,
        pc = ts.length ? Math.round((ok / ts.length) * 100) : 0;
      h += `<div class="card"><div class="row"><div data-a="col" data-v="${v.id}" style="cursor:pointer">${S.col[v.id] ? "▸" : "▾"} <b>${e(v.cliente)}</b>${v.ag ? ` <span class="mu">· Ag. ${e(v.ag)}</span>` : ""} <span class="mu">${e(v.ini || "")} → ${e(v.fim || "")} · ${ts.length} painéis</span> ${vigTxt(v)}${vokBadge(v)}${evBadge(v)}${v.fif ? ` <span class="b">📷 início/fim ×${nfv(v)}</span>` : ""}</div>${v.tipo === "evento" ? "" : `<input data-a="pi" data-v="${v.id}" placeholder="Nº PI" value="${e(v.pi || "")}" style="flex:0 0 110px">`}<button class="sm" data-a="vok" data-v="${v.id}" style="flex:0 0 auto" title="Alternar: não verificado → correto → ajustar">VT correto?</button><button class="sm" data-a="vted" data-v="${v.id}" style="flex:0 0 auto">Editar</button><button class="sm" data-a="cv" data-v="${v.id}" style="flex:0 0 auto">Copiar texto</button><button class="sm" data-a="ckopen" data-v="${v.id}" style="flex:0 0 auto">Checking</button><button class="sm" data-a="venc" data-v="${v.id}" style="flex:0 0 auto">Concluir</button></div><div class="bar"><i style="width:${pc}%"></i></div>${S.col[v.id] ? sumT(ts) : ts.map((t) => taskRow(t, true)).join("")}</div>`;
    });
  return h;
}
function rotas() {
  let h = `<div class="card"><h2 style="margin-top:0">Pontos da rota (${RT.sel.size})</h2>${RT.info ? `<div class="mu" style="margin-bottom:6px">${e(RT.info)}</div>` : ""}<div class="row" style="margin-bottom:6px"><button class="sm" data-a="rpend">Só pendentes dos VTs vigentes</button><button class="sm" data-a="rclr">Limpar seleção</button></div>${chips(RT.sel, "rp", "rreg")}
 <div class="row" style="margin-top:8px">${MOTOS.map((m) => `<label><input type="checkbox" style="width:auto" data-a="mt" data-v="${m}" ${RT.motos.has(m) ? "checked" : ""}> ${m}</label>`).join("")}</div>
 <div class="mu" style="margin-top:8px">Partida: ${e(S.base.end || "não definida (Admin → Configurações)")}</div>
 <button class="pri" data-a="gen" style="margin-top:8px">Gerar rotas otimizadas</button></div>`;
  if (S.rota)
    S.rota.data.forEach((d, i) => {
      const st = d.stops.map(PMf).filter(Boolean);
      if (!st.length) return;
      const ls = links(st);
      h += `<div class="card"><div class="row" style="flex-wrap:nowrap"><div><b>${e(d.moto)}</b> <span class="mu">${st.length} paradas · ~${Math.round(d.km * 1.3)} km</span></div><button class="sm" data-a="copy" data-v="${i}" style="flex:0 0 auto">Copiar p/ WhatsApp</button></div><ol>${st
        .map(
          (p) =>
            `<li>${p.v ? "★ " : ""}${mOpen(p.id) ? "⚠ " : ""}<b>${e(p.nome)}</b> <span class="mu">${e(p.end)}</span>${
              cliAt(p.id).length
                ? `<div class="mu" style="margin-left:2px">Clientes aqui: ${cliAt(p.id)
                    .map(
                      (v) =>
                        `<b>${e(v.cliente)}</b>${v.vok === "sim" ? " ✔" : v.vok === "nao" ? " ⚠ VT a ajustar" : ""}`,
                    )
                    .join(" · ")}</div>`
                : ""
            }</li>`,
        )
        .join(
          "",
        )}</ol><div class="row">${ls.map((u, j) => `<a href="${u}" target="_blank" rel="noopener">Abrir no Maps${ls.length > 1 ? " (parte " + (j + 1) + ")" : ""}</a>`).join("")}</div></div>`;
    });
  return h;
}
let adm = "f",
  editId = null;
const fmt = (d) => (d ? d.split("-").reverse().join("/") : "");
function csv() {
  const q = (s) => '"' + String(s ?? "").replace(/"/g, '""') + '"',
    rows = [
      [
        "Cliente",
        "Nº PI",
        "Início",
        "Fim",
        "Painel",
        "Endereço",
        "Região",
        "Motoboy",
        "Status",
        "Observação",
        "Fotos início",
        "Fotos fim",
        "VT concluído",
        "Tipo",
        "Evento",
        "Data do evento",
        "Checking",
        "Faturado",
        "Data faturamento",
        "Nº NF",
        "Foto feita por",
      ],
    ];
  tasks(true).forEach((t) =>
    rows.push([
      t.vt.cliente,
      t.vt.pi || "",
      fmt(t.vt.ini),
      fmt(t.vt.fim),
      t.p.nome,
      t.p.end,
      rg(t.p),
      t.moto,
      ST[t.status],
      t.nota,
      fiTxt(t, "fi"),
      fiTxt(t, "ff"),
      isConc(t.vt) ? "Sim" : "Não",
      t.vt.tipo === "evento" ? "Evento" : "PI",
      t.vt.tipo === "evento" ? (t.vt.ev && t.vt.ev.nome) || "" : "",
      t.vt.tipo === "evento" ? evData(t.vt) : "",
      t.vt.chk ? "Sim" : "Não",
      t.vt.fat ? "Sim" : "Não",
      fmt(t.vt.fdt),
      t.vt.nfn || "",
      t.by || "",
    ]),
  );
  return "\ufeff" + rows.map((r) => r.map(q).join(";")).join("\r\n");
}
async function baixar(nome, txt, mime) {
  try {
    if (typeof claude !== "undefined") {
      const d = await claude.use("downloads");
      if (d) {
        await d.save({ filename: nome, data: txt });
        return;
      }
    }
  } catch (_) {}
  try {
    const u = URL.createObjectURL(new Blob([txt], { type: mime || "text/csv;charset=utf-8" })),
      a = document.createElement("a");
    a.href = u;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
  } catch (_) {
    $("warn").innerHTML = '<div class="warn">Não foi possível baixar o arquivo.</div>';
  }
}
