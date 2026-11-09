/* =====================================================================
   Módulo operacional · Telas de admin (pontos), manutenção, mensagem de WhatsApp e motoboy
   (arquivo 5 de 13; carregados em ordem pelo index.html)
   ===================================================================== */

function pontos(t) {
  const L = S[t],
    vr = t === "vars",
    ed = (editId && L.find((p) => p.id === editId)) || {};
  return `<div class="card"><h2 style="margin-top:0">${ed.id ? "Editar ponto" : vr ? "Adicionar ponto variável (★)" : "Adicionar endereço fixo"}</h2><div class="row"><input id="an" placeholder="Nome / referência" value="${e(ed.nome || "")}"><input id="ae" placeholder="Endereço, bairro, cidade" value="${e(ed.end || "")}"></div><div style="margin-top:8px"><div class="mu">Circuito com várias telas? Uma por linha: Nome | Formato (ex.: Estacionamento | 5x2). Cada tela sai separada no checking.</div><textarea id="atl" rows="3" placeholder="Estacionamento | 5x2&#10;Video wall saída Amazonas | 2x1&#10;Principais corredores | 1x1">${e(telasTxt(ed))}</textarea></div><div class="row" style="margin-top:8px"><input id="at" list="tiposMidia" placeholder="Tipo (ex.: Painel de LED, Banca estática)" value="${e(ed.tp || "")}" style="flex:1 1 110px"><input id="af" placeholder="Formato (ex.: 4x6m)" value="${e(ed.fm || "")}" style="flex:1 1 110px"><input id="ar" list="rl" placeholder="Região (ex.: Norte)" value="${e(ed.reg || "")}"><input id="apl" placeholder="ID do player 4yousee (opcional)" value="${e(ed.pl || "")}" style="flex:1 1 150px"><input id="al" placeholder="Coordenadas ou link do Maps (opcional)" value="${ed.ll ? ed.ll.join(", ") : ""}"><button class="pri" data-a="add" data-v="${t}" style="flex:0 0 auto">${ed.id ? "Salvar" : "Adicionar"}</button>${ed.id ? '<button data-a="ecan" style="flex:0 0 auto">Cancelar</button>' : ""}</div><datalist id="rl">${regs()
    .map((r) => `<option value="${e(r)}">`)
    .join("")}</datalist></div>
 <div class="card"><b>${L.length}</b> <span class="mu">cadastrados</span>${L.map((p) => `<div class="task"><div><b>${e(p.nome)}</b><div class="mu">${e(p.end)} · ${e(rg(p))}${p.tp || p.fm ? " · <b>" + e([p.tp, p.fm].filter(Boolean).join(" · ")) + "</b>" : p.telas && p.telas.length ? "" : " · sem formato"}${p.telas && p.telas.length ? " · <b>" + p.telas.length + " telas: " + e(p.telas.map((x) => x.n + (x.fm ? " " + x.fm : "")).join(", ")) + "</b>" : ""} · ${p.ll ? "com coordenadas" : "posição aproximada pela região"}</div></div><div class="acts"><button class="sm" data-a="ed" data-v="${p.id}">Editar</button><button class="sm" data-a="rem" data-v="${t}|${p.id}">${confRem === t + "|" + p.id ? "Confirmar?" : "Remover"}</button></div></div>`).join("") || '<div class="mu">Nenhum ainda.</div>'}</div>`;
}
function admin() {
  let subs = [
    ["f", "Endereços fixos"],
    ["v", "Pontos variáveis"],
    ["s", "Status dos VTs"],
    ["n", "Manutenções"],
    ["c", "Configurações"],
    ["d", "Dados e planilha"],
  ];
  if (CLD && ROLE === "admin" && !HOST) subs.push(["u", "Usuários"]);
  if (!eAdm()) {
    subs = subs.filter((x) => x[0] === "s" || x[0] === "n");
    if (adm !== "s" && adm !== "n") adm = "s";
  }
  const h = `<div class="tabs">${subs.map(([k, n]) => `<button class="sm ${adm === k ? "on" : ""}" data-a="sub" data-v="${k}">${n}</button>`).join("")}</div>`;
  if (adm === "u" && CLD && ROLE === "admin") return h + usuarios();
  if (adm === "f") return h + pontos("fixos");
  if (adm === "v") return h + pontos("vars");
  if (adm === "s") return h + adminVT();
  if (adm === "n") return h + adminM();
  if (adm === "c")
    return (
      h +
      `<div class="card"><h2 style="margin-top:0">Motoboys</h2><div class="row"><input id="m0" value="${e(MOTOS[0])}"><input id="m1" value="${e(MOTOS[1])}"><button class="pri" data-a="mnames" style="flex:0 0 auto">Salvar nomes</button></div></div><div class="card"><h2 style="margin-top:0">Ponto de partida das rotas</h2><div class="row"><input id="bse" data-a="base" placeholder="Endereço (opcional)" value="${e(S.base.end)}"><input id="bsl" data-a="base" placeholder="Coordenadas (opcional)" value="${S.base.ll ? S.base.ll.join(", ") : ""}"></div></div>` +
      prioCard()
    );
  return (
    h +
    (CLD ? cloudCard() : "") +
    `<div class="card"><h2 style="margin-top:0">Planilha de clientes</h2><div class="mu">Uma linha por cliente × painel: cliente, nº da PI, período, painel, endereço, região, motoboy, status e observação. Abre direto no Excel.</div><button class="pri" data-a="csv" style="margin-top:8px">Gerar planilha (.csv)</button></div>
 ${bkCard()}<div class="card"><h2 style="margin-top:0">Backup manual</h2><div class="mu" style="margin-bottom:8px">“Importar” aceita backups de versões anteriores (matriz-vt-v1/v2).</div><button class="sm" data-a="exp">Exportar backup</button> <label class="sm b" style="cursor:pointer;display:inline-block">Importar backup<input type="file" id="imp" accept=".json" hidden></label></div>
 <div class="card"><h2 style="margin-top:0">Zerar dados</h2><div class="mu">Apaga VTs, fotos e pontos cadastrados e volta aos 40 painéis iniciais.</div><button class="sm" data-a="reset" style="margin-top:8px">${confRem === "reset" ? "Confirmar: apagar tudo" : "Apagar tudo"}</button></div>`
  );
}
const PR = () => S.prio || [],
  prI = (id) => PR().findIndex((p) => p.id === id),
  prN = (id) => {
    const p = PR().find((q) => q.id === id);
    return p ? p.nome : "";
  },
  prC = (i) => ["s-refazer", "s-pendente", "s-feita", "mu"][Math.min(i, 3)];
const hTxt = (h) => (h >= 24 && h % 24 === 0 ? h / 24 + (h === 24 ? " dia" : " dias") : h + " h");
const toDL = (t) => {
    if (!t) return "";
    const d = new Date(t);
    return (
      d.getFullYear() +
      "-" +
      p2(d.getMonth() + 1) +
      "-" +
      p2(d.getDate()) +
      "T" +
      p2(d.getHours()) +
      ":" +
      p2(d.getMinutes())
    );
  },
  fromDL = (s) => (s ? new Date(s).getTime() || 0 : 0);
const mSort = (a, b) => {
  const x = prI(a.prio),
    y = prI(b.prio);
  return (x < 0 ? 99 : x) - (y < 0 ? 99 : y) || (a.pz || 1e15) - (b.pz || 1e15);
};
function pzTxt(m) {
  if (!m.pz) return "";
  const f = new Date(m.pz).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  if (m.status === "resolvida")
    return m.rts
      ? (m.rts <= m.pz
          ? `<span class="s-validada">no prazo</span>`
          : `<span class="s-refazer">fora do prazo</span>`) + ` <span class="mu">(prazo ${f})</span>`
      : "";
  const h = (m.pz - Date.now()) / 36e5,
    q = (x) => (x < 48 ? Math.max(1, Math.round(x)) + " h" : Math.round(x / 24) + " d");
  return h < 0
    ? `<span class="s-refazer">⏰ atrasada ${q(-h)} (prazo ${f})</span>`
    : `<span class="${h < 24 ? "s-pendente" : "mu"}">⏱ prazo ${f} · faltam ${q(h)}</span>`;
}
let editM = null,
  emf = {};
const ptOpts = (sel) =>
  regs()
    .map(
      (r) =>
        `<optgroup label="${e(r)}">${ALL()
          .filter((p) => rg(p) === r)
          .map((p) => `<option value="${p.id}" ${sel === p.id ? "selected" : ""}>${e(p.nome)}</option>`)
          .join("")}</optgroup>`,
    )
    .join("");
const mEdit = (
  m,
) => `<div class="card" style="margin-top:8px"><h2 style="margin-top:0">Editar manutenção</h2><select id="em_pid"><option value="">Endereço…</option>${ptOpts(emf.pid)}</select><textarea id="em_def" rows="2" style="margin-top:8px" placeholder="Defeito">${e(emf.def)}</textarea>
<div class="row" style="margin-top:8px"><select id="em_prio"><option value="">Sem prioridade</option>${PR()
  .map(
    (p) =>
      `<option value="${p.id}" ${emf.prio === p.id ? "selected" : ""}>${e(p.nome)} (${hTxt(p.h)})</option>`,
  )
  .join(
    "",
  )}</select><div><div class="mu">Prazo (vazio = calcular a partir de agora pela prioridade)</div><input id="em_pz" type="datetime-local" value="${e(emf.pz)}"></div></div>
<div class="row" style="margin-top:8px"><div><div class="mu">Situação</div><select id="em_st">${Object.entries(
  MS(),
)
  .map(([k, n]) => `<option value="${k}" ${emf.st === k ? "selected" : ""}>${e(n)}</option>`)
  .join(
    "",
  )}</select></div><div><div class="mu">Motoboy (se a situação for “verificação do motoboy”)</div><select id="em_moto">${MOTOS.map((o) => `<option ${emf.moto === o ? "selected" : ""}>${e(o)}</option>`).join("")}</select></div></div>
<input id="em_vn" style="margin-top:8px" placeholder="Observação do motoboy (opcional)" value="${e(emf.vn)}"><div class="row" style="margin-top:8px"><button class="pri" data-a="msaveed" data-v="${m.id}">Salvar alterações</button><button data-a="mcaned">Cancelar</button></div></div>`;
function mRow(m, ctx) {
  const p = PMf(m.pid),
    acts = [],
    pi = prI(m.prio);
  if (ctx === "m") acts.push(`<button class="sm pri" data-a="mvo" data-v="${m.id}">Verificado</button>`);
  else {
    if (m.status === "moto")
      acts.push(`<button class="sm" data-a="mtoeld" data-v="${m.id}">Passar p/ ${ELD}</button>`);
    acts.push(
      m.status === "resolvida"
        ? `<button class="sm" data-a="mreop" data-v="${m.id}">Reabrir</button>`
        : `<button class="sm pri" data-a="mdone" data-v="${m.id}">Manutenção feita</button>`,
    );
    acts.push(
      `<button class="sm" data-a="med" data-v="${m.id}">Editar</button><button class="sm" data-a="mcp" data-v="${m.id}">Copiar texto</button><button class="sm" data-a="mdel" data-v="${m.id}">${confRem === "md|" + m.id ? "Confirmar?" : "Excluir"}</button>`,
    );
  }
  const f =
    mvOpen === m.id
      ? `<div class="row" style="margin-top:6px"><input id="mvn" placeholder="O que viu no local?"><button class="sm pri" data-a="mvneed" data-v="${m.id}" style="flex:0 0 auto">Precisa de manutenção</button><button class="sm" data-a="mvok" data-v="${m.id}" style="flex:0 0 auto">Sem defeito</button></div>`
      : "";
  const pz = pzTxt(m);
  return `<div class="task"><div><b>${p ? e(p.nome) : "(painel removido)"}</b>${p ? `<div class="mu">${e(p.end)} · <a href="${mapa(p)}" target="_blank" rel="noopener">mapa</a></div>` : ""}<div>🔧 ${e(m.def)}</div>${pi >= 0 || pz ? `<div>${pi >= 0 ? `<span class="b ${prC(pi)}">${e(prN(m.prio))}</span> ` : ""}${pz}</div>` : ""}<div class="mu"><span class="b s-${m.status}">${MS()[m.status]}</span> ${m.resp === "moto" ? "verifica: " + e(m.moto) : "direto " + ELD} · aberto ${dt(m.ts)}${m.vnota ? ` · <span class="s-feita">Motoboy: ${e(m.vnota)}</span>` : ""}${m.rts ? " · resolvida " + dt(m.rts) + (m.rby ? " por " + e(m.rby) : "") : ""}${m.at && m.status !== "resolvida" ? ' · <span class="s-pendente">🔧 em atendimento' + (m.atby ? " (" + e(m.atby) + ")" : "") + "</span>" : ""}${m.snota ? ' · <span class="s-feita">Solução: ' + e(m.snota) + "</span>" : ""}${m.pnota ? ' · <span class="s-refazer">⚠ Pendência: ' + e(m.pnota) + "</span>" : ""}</div>${f}${editM === m.id && ctx !== "m" ? mEdit(m) : ""}</div><div class="acts">${acts.join("")}</div></div>`;
}
/* ===== Mensagem de manutenção para WhatsApp ===== */
let mwa = "all";
const PEMO = ["🔴", "🟠", "🟡", "🟢"],
  pEmo = (id) => {
    const i = prI(id);
    return i < 0 ? "⚪" : PEMO[Math.min(i, 3)];
  },
  dh = (t) =>
    new Date(t).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
const mQuem = (m) => (m.resp === "moto" ? m.moto || MOTOS[0] : ELD);
function mItemTxt(m, n) {
  const p = PMf(m.pid),
    L = [];
  L.push((n ? n + ") " : "") + "*" + (p ? p.nome : "(ponto removido)") + "*");
  if (p) {
    L.push(
      "📍 " +
        (p.end || "") +
        (rg(p) && !(p.end || "").toLowerCase().includes(rg(p).toLowerCase()) ? " – " + rg(p) : ""),
    );
    L.push("🗺 " + mapa(p));
  }
  L.push("⚠️ *Motivo:* " + m.def);
  L.push(
    "👷 *Quem vai:* " +
      mQuem(m) +
      (m.resp === "moto" ? " (verificar no local e avisar)" : " (manutenção direta)"),
  );
  if (m.pz) {
    const h = (m.pz - Date.now()) / 36e5,
      q = (x) => (x < 48 ? Math.max(1, Math.round(x)) + "h" : Math.round(x / 24) + " dia(s)");
    L.push(
      "⏱ *Prazo:* " + dh(m.pz) + (h < 0 ? " — ⏰ *ATRASADA há " + q(-h) + "*" : " (faltam " + q(h) + ")"),
    );
  }
  if (m.vnota) L.push("📝 *Motoboy informou:* " + m.vnota);
  L.push("🕐 Aberto em " + dh(m.ts));
  return L.join("\n");
}
function mMsg(f) {
  const L = S.manut
    .filter(
      (m) =>
        m.status !== "resolvida" &&
        (f === "all" || (f === "eld" ? m.resp === "eld" : m.resp === "moto" && m.moto === f)),
    )
    .sort(mSort);
  if (!L.length) return "";
  const t = [];
  t.push("🔧 *MANUTENÇÃO – MEGA MÍDIA OOH*");
  t.push(
    "📅 " +
      dh(Date.now()) +
      " · " +
      L.length +
      " chamado(s)" +
      (f !== "all" ? " · " + (f === "eld" ? "Com " + ELD : f) : ""),
  );
  const pids = [...new Set(L.map((m) => m.prio))].sort(
    (a, b) => (prI(a) < 0 ? 99 : prI(a)) - (prI(b) < 0 ? 99 : prI(b)),
  );
  let n = 0;
  pids.forEach((pid) => {
    const G = L.filter((m) => m.prio === pid),
      pr = PR().find((p) => p.id === pid);
    if (t[t.length - 1] !== "") t.push("");
    t.push("━━━━━━━━━━━━━━");
    t.push(
      pEmo(pid) +
        " *" +
        (pr ? pr.nome.toUpperCase() : "SEM PRIORIDADE") +
        "*" +
        (pr ? " · prazo padrão " + hTxt(pr.h) : "") +
        " (" +
        G.length +
        ")",
    );
    t.push("");
    G.forEach((m) => {
      t.push(mItemTxt(m, ++n));
      t.push("");
    });
  });
  while (t[t.length - 1] === "") t.pop();
  return t.join("\n");
}
function mwCard() {
  const op = [["all", "Todas abertas"]].concat(MOTOS.map((x) => [x, x])).concat([["eld", "Com " + ELD]]),
    cnt = (f) =>
      S.manut.filter(
        (m) =>
          m.status !== "resolvida" &&
          (f === "all" || (f === "eld" ? m.resp === "eld" : m.resp === "moto" && m.moto === f)),
      ).length;
  if (!op.some((o) => o[0] === mwa)) mwa = "all";
  const tx = mMsg(mwa);
  return `<div class="card"><h2 style="margin-top:0">Mensagem para WhatsApp</h2><div class="chips">${op.map(([k, n]) => `<span class="chip ${mwa === k ? "sel" : ""}" data-a="mwsel" data-v="${e(k)}">${e(n)} (${cnt(k)})</span>`).join("")}</div>${tx ? `<textarea id="mwtxt" rows="12" style="margin-top:8px;font-family:inherit">${e(tx)}</textarea><div class="row" style="margin-top:8px"><button class="pri" data-a="mwcopy" style="flex:0 0 auto">Copiar mensagem</button><span class="mu" style="font-size:13px">Pode editar o texto antes de copiar.</span></div>` : `<div class="mu" style="margin-top:8px">Nenhum chamado aberto para este filtro.</div>`}</div>`;
}
function manut() {
  const g = (s) => S.manut.filter((m) => m.status === s).sort(mSort);
  if (!PR().find((p) => p.id === mf.prio)) mf.prio = (PR()[Math.min(2, PR().length - 1)] || {}).id || "";
  const pr = PR().find((p) => p.id === mf.prio);
  let h =
    `<div class="card"><h2 style="margin-top:0">Nova manutenção</h2><select id="mp"><option value="">Selecione o endereço…</option>${ptOpts(mf.pid)}</select><textarea id="md" rows="2" placeholder="Defeito (ex.: tela apagada, LED queimado)" style="margin-top:8px">${e(mf.def)}</textarea>
<div class="mu" style="margin-top:8px">Prioridade</div><div class="chips">${
      PR()
        .map(
          (p) =>
            `<span class="chip ${mf.prio === p.id ? "sel" : ""}" data-a="mprio" data-v="${p.id}">${e(p.nome)} · ${hTxt(p.h)}</span>`,
        )
        .join("") || '<span class="mu">Nenhuma prioridade cadastrada (Admin → Configurações).</span>'
    }</div>
<div class="mu">Prazo personalizado (opcional — vazio usa o padrão${pr ? ": " + hTxt(pr.h) : ""})</div><input id="mpz" type="datetime-local" value="${e(mf.pz)}">
<div class="mu" style="margin-top:8px">Quem verifica primeiro?</div><div class="chips"><span class="chip ${mf.resp === "moto" ? "sel" : ""}" data-a="mresp" data-v="moto">Motoboy</span><span class="chip ${mf.resp === "eld" ? "sel" : ""}" data-a="mresp" data-v="eld">${ELD} direto da manutenção</span></div>${mf.resp === "moto" ? `<select id="mm">${MOTOS.map((m) => `<option ${mf.moto === m ? "selected" : ""}>${e(m)}</option>`).join("")}</select>` : ""}<button class="pri" data-a="madd" style="margin-top:8px">Abrir chamado</button></div>` +
    mwCard();
  [
    ["moto", "Com o motoboy (verificar)"],
    ["eld", "Com " + ELD],
  ].forEach(([s, t]) => {
    const a = g(s);
    h +=
      `<h2>${t} (${a.length})</h2>` +
      (a.length
        ? `<div class="card">${a.map((m) => mRow(m, "g")).join("")}</div>`
        : `<div class="card mu">Nada aqui.</div>`);
  });
  const r = g("resolvida").sort((a, b) => (b.rts || 0) - (a.rts || 0));
  return (
    h +
    `<h2 data-a="col" data-v="mres" style="cursor:pointer">${S.col.mres ? "▾" : "▸"} Resolvidas (${r.length})</h2>${S.col.mres ? `<div class="card">${r.map((m) => mRow(m, "g")).join("")}</div>` : ""}`
  );
}
function motoboy() {
  const mine = tasks().filter((t) => t.moto === moto && (t.status === "pendente" || t.status === "refazer")),
    mm = S.manut.filter((m) => m.status === "moto" && m.moto === moto).sort(mSort);
  let h = `<div class="card"><div class="row"><select data-a="msel">${MOTOS.map((m) => `<option ${m === moto ? "selected" : ""}>${m}</option>`).join("")}</select><div class="mu">${mine.length} foto(s) para fazer${mine.length ? " em " + new Set(mine.map((t) => (t.vt.cliente || "").trim().toLowerCase())).size + " cliente(s)" : ""}${mm.length ? " · " + mm.length + " manutenção(ões) a verificar" : ""}</div></div></div>`;
  if (mm.length)
    h += `<h2>Manutenção a verificar (${mm.length})</h2><div class="card">${mm.map((m) => mRow(m, "m")).join("")}</div>`;
  if (!mine.length) return h + `<div class="card mu">Nenhuma foto pendente.</div>`;
  const mp = new Map();
  mine.forEach((t) => {
    const n = (t.vt.cliente || "").trim(),
      k = n.toLowerCase();
    if (!mp.has(k)) mp.set(k, { n: n || "(sem cliente)", k, L: [] });
    mp.get(k).L.push(t);
  });
  [...mp.values()]
    .sort((a, b) => a.n.localeCompare(b.n, "pt-BR"))
    .forEach((c) => {
      const g = c.L.sort(
          (a, b) => rg(a.p).localeCompare(rg(b.p), "pt-BR") || a.p.nome.localeCompare(b.p.nome, "pt-BR"),
        ),
        ck = "mc|" + c.k;
      h += `<h2 data-a="col" data-v="${e(ck)}" style="cursor:pointer">${S.col[ck] ? "▸" : "▾"} ${e(c.n)} (${g.length})</h2>${S.col[ck] ? "" : `<div class="card">${g.map((t) => taskRow(t, false, true)).join("")}</div>`}`;
    });
  return h;
}
