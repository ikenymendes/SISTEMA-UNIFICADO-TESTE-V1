/* =====================================================================
   Módulo operacional · Instalação de estáticos (lonas)
   Usa os próprios estáticos (S.est) com ocupação "Cliente": cl, pi, ini, fim
   + dois campos novos: inst (data em que a lona foi instalada) e ret (data da retirada).
   Avisos: lona não instalada (início da campanha), retirada 2 dias antes do fim e no dia.
   ===================================================================== */
let inf = { id: "", pt: "", nome: "", end: "", cl: "", pi: "", ini: "", fim: "" };
const INFV = () => ({ id: "", pt: "", nome: "", end: "", cl: "", pi: "", ini: "", fim: "" });
const inDias = (d) => Math.round((new Date(d + "T12:00:00") - new Date(dia() + "T12:00:00")) / 864e5);
const inPlural = (n) => n + (n === 1 ? " dia" : " dias");
const inLista = () => (S.est || []).filter((x) => x.oc === "cli" && x.ini && x.fim);
const inNome = (x) => estNome(x);

/* avisos de cada campanha de estático (só as que ainda não foram retiradas) */
function inAviso(x) {
  if (x.ret) return null;
  const di = inDias(x.ini),
    df = inDias(x.fim);
  if (!x.inst) {
    if (df < 0) return { n: "er", t: "Campanha terminou e a instalação da lona não foi registrada" };
    if (di < 0) return { n: "er", t: "Lona NÃO instalada — a campanha começou há " + inPlural(-di) };
    if (di === 0) return { n: "er", t: "Instalar a lona HOJE — é o início da campanha" };
    if (di <= 2) return { n: "wa", t: "Instalar a lona em " + inPlural(di) + " (início " + fmt(x.ini) + ")" };
    return null;
  }
  if (df < 0) return { n: "er", t: "Retirada ATRASADA há " + inPlural(-df) + " — a campanha terminou em " + fmt(x.fim) };
  if (df === 0) return { n: "er", t: "RETIRAR a lona HOJE — último dia da campanha" };
  if (df <= 2) return { n: "wa", t: "Retirada da lona em " + inPlural(df) + " (fim " + fmt(x.fim) + ")" };
  return null;
}
const inAvisos = () =>
  inLista()
    .map((x) => ({ x, a: inAviso(x) }))
    .filter((r) => r.a)
    .sort((p, q) => (p.a.n === q.a.n ? p.x.fim.localeCompare(q.x.fim) : p.a.n === "er" ? -1 : 1));
const inAvLinha = (r) =>
  `<div class="task"><div><b>${e(inNome(r.x))}</b> <span class="mu">· ${e(r.x.cl || "")}${r.x.pi ? " · PI " + e(r.x.pi) : ""}</span><div class="${r.a.n === "er" ? "warn" : "mu"}" style="${r.a.n === "wa" ? "color:#b45309;font-weight:600" : ""}">${r.a.n === "er" ? "🚨" : "⏰"} ${e(r.a.t)}</div></div><div class="acts"><button class="sm" data-a="in_ir" data-v="${r.x.id}">Abrir</button></div></div>`;

/* cartão de avisos no Início (Dashboard) */
function inCard() {
  const L = inAvisos();
  if (!L.length) return "";
  return `<div class="card" style="border-left:5px solid #ff0066"><div class="row"><h2 style="margin:0">🪧 Estáticos · avisos (${L.length})</h2><button class="sm" data-a="in_ir" data-v="" style="flex:0 0 auto">Ver instalação</button></div>${L.slice(0, 6).map(inAvLinha).join("")}${L.length > 6 ? `<div class="mu">+ ${L.length - 6} aviso(s) na aba Instalação</div>` : ""}</div>`;
}
/* pop-up 1x por dia com o que precisa de ação */
function inPopup() {
  const L = inAvisos(),
    k = "in_aviso_" + dia() + "_" + L.length;
  if (!L.length || document.getElementById("inpop")) return;
  try {
    if (localStorage.getItem(k)) return;
    localStorage.setItem(k, "1");
  } catch (_) {}
  const el = document.createElement("div");
  el.id = "inpop";
  el.style.cssText =
    "position:fixed;inset:0;z-index:99999;background:rgba(15,18,60,.55);display:flex;align-items:center;justify-content:center;padding:16px";
  el.innerHTML = `<div style="background:#fff;border-radius:18px;max-width:480px;width:100%;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.35);border-top:6px solid #ff0066"><div style="font-size:19px;font-weight:700;color:#000066">🪧 Estáticos: precisa da sua atenção</div><div style="margin:12px 0;max-height:46vh;overflow:auto">${L.map((r) => `<div style="padding:8px 0;border-bottom:1px solid #eee"><b>${e(inNome(r.x))}</b> <span style="color:#666">· ${e(r.x.cl || "")}</span><div style="font-size:13px;color:${r.a.n === "er" ? "#c4003f" : "#b45309"}">${e(r.a.t)}</div></div>`).join("")}</div><div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" id="inpx">Fechar</button><button class="btn pri" id="inpv">Abrir instalação</button></div></div>`;
  document.body.appendChild(el);
  el.querySelector("#inpx").onclick = () => el.remove();
  el.querySelector("#inpv").onclick = () => {
    el.remove();
    view = "i";
    render();
  };
}
/* o Início ganha o cartão de avisos e o pop-up diário */
const dashboardBase = dashboard;
dashboard = function () {
  setTimeout(() => {
    try {
      if (view === "d") inPopup();
    } catch (_) {}
  }, 600);
  return inCard() + dashboardBase();
};

/* ---- tela "Instalação de estáticos" ---- */
function inCartao(x) {
  const av = inAviso(x),
    di = inDias(x.ini),
    df = inDias(x.fim);
  const sit = x.ret
    ? `<span class="b s-validada">Retirada em ${e(fmt(x.ret))}</span>`
    : x.inst
      ? `<span class="b s-feita">Instalada em ${e(fmt(x.inst))}</span>`
      : `<span class="b s-pendente">Falta instalar</span>`;
  const prazo = x.ret
    ? ""
    : x.inst
      ? df >= 0
        ? `<span class="mu">termina ${df === 0 ? "hoje" : "em " + inPlural(df)}</span>`
        : ""
      : di >= 0
        ? `<span class="mu">inicia ${di === 0 ? "hoje" : "em " + inPlural(di)}</span>`
        : "";
  const btn = x.ret
    ? `<button class="sm" data-a="in_des" data-v="${x.id}">Desfazer retirada</button>`
    : x.inst
      ? `<button class="sm pri" data-a="in_ret" data-v="${x.id}">Marcar retirada</button><button class="sm" data-a="in_des" data-v="${x.id}">Desfazer instalação</button>`
      : `<button class="sm pri" data-a="in_ins" data-v="${x.id}">Marcar instalada</button>`;
  return `<div class="task" id="in_${x.id}"><div style="flex:1"><b>${e(inNome(x))}</b>${x.nome ? `<div class="mu">${e(x.end)}</div>` : ""}<div>${e(x.cl || "")}${x.pi ? ` <span class="mu">PI ${e(x.pi)}</span>` : ""} <span class="mu">${e(fmt(x.ini))} → ${e(fmt(x.fim))}</span> ${sit} ${prazo}</div>${av ? `<div style="margin-top:4px;font-weight:600;color:${av.n === "er" ? "#c4003f" : "#b45309"}">${av.n === "er" ? "🚨" : "⏰"} ${e(av.t)}</div>` : ""}<div class="mu"><a href="${mapa(x)}" target="_blank" rel="noopener">mapa</a></div></div><div class="acts">${btn}${x.ret ? "" : `<button class="sm" data-a="in_msg" data-v="${x.id}">📋 Mensagem</button>`}<button class="sm" data-a="in_ed" data-v="${x.id}">Editar</button></div></div>`;
}
function instalacao() {
  const L = inLista(),
    A = inAvisos(),
    ed = inf.id && S.est.find((q) => q.id === inf.id),
    novo = inf.pt === "__novo",
    inOcup = (q) => q.oc === "cli" && q.cl && !q.ret && q.fim && q.fim >= dia(),
    opts = (S.est || [])
      .filter((x) => !x.pai)
      .slice()
      .sort((a, b) => inNome(a).localeCompare(inNome(b), "pt-BR"))
      .map((x) => {
        const G = estGrupo(x.id),
          n = Math.max(+x.nesp || 1, G.length),
          oc = G.filter(inOcup).length;
        return `<option value="${x.id}" ${inf.pt === x.id ? "selected" : ""}>${e(x.nome || x.end || "Ponto")}${x.nome && x.end ? " — " + e(x.end) : ""}${n > 1 ? ` · ${oc}/${n} espaços ocupados` : oc ? " · ocupado" : ""}</option>`;
      })
      .join(""),
    G = {
      falta: L.filter((x) => !x.ret && !x.inst).sort((a, b) => a.ini.localeCompare(b.ini)),
      no: L.filter((x) => !x.ret && x.inst).sort((a, b) => a.fim.localeCompare(b.fim)),
      ret: L.filter((x) => x.ret).sort((a, b) => b.ret.localeCompare(a.ret)),
    };
  let h = `<div class="card"><h2 style="margin-top:0">${ed ? "Editar campanha de estático" : "Nova instalação de estático"}</h2>
<div class="row"><input id="in_cl" data-a="in_f" data-k="cl" placeholder="Cliente / campanha" value="${e(inf.cl)}"><input id="in_pi" data-a="in_f" data-k="pi" placeholder="Nº da PI" value="${e(inf.pi)}"></div>
<div class="row" style="margin-top:8px"><div><div class="mu">Início da campanha (PI)</div><input id="in_ini" type="date" data-a="in_f" data-k="ini" value="${e(inf.ini)}"></div><div><div class="mu">Fim da campanha (PI)</div><input id="in_fim" type="date" data-a="in_f" data-k="fim" value="${e(inf.fim)}"></div></div>
<div style="margin-top:8px"><div class="mu">Ponto</div><select id="in_pt" data-a="in_pt"><option value="">Escolha o ponto…</option>${opts}<option value="__novo" ${novo ? "selected" : ""}>➕ Ponto que ainda não existe (cadastrar agora)</option></select></div>
${novo ? `<div class="row" style="margin-top:8px"><input id="in_nome" data-a="in_f" data-k="nome" placeholder="Nome / referência (opcional)" value="${e(inf.nome)}"><input id="in_end" data-a="in_f" data-k="end" placeholder="Endereço, bairro, cidade" value="${e(inf.end)}"></div>` : ""}
<div id="in_warn"></div>
<div class="row" style="margin-top:10px"><button class="pri" data-a="in_save" style="flex:0 0 auto">${ed ? "Salvar alterações" : "Cadastrar instalação"}</button>${ed || inf.cl || inf.pt ? '<button data-a="in_can" style="flex:0 0 auto">Limpar</button>' : ""}</div>
<div class="mu" style="margin-top:8px">Depois de cadastrar, o sistema avisa se a lona ainda não foi instalada perto do início, e avisa a retirada 2 dias antes do fim e no último dia.</div></div>`;
  if (A.length) h += `<div class="card" style="border-left:5px solid #ff0066"><h2 style="margin:0 0 6px">Precisa de ação (${A.length})</h2>${A.map(inAvLinha).join("")}</div>`;
  h += `<div class="card"><h2 style="margin:0 0 6px">Falta instalar (${G.falta.length})</h2>${G.falta.map(inCartao).join("") || '<div class="mu">Nenhuma lona pendente de instalação.</div>'}</div>`;
  h += `<div class="card"><h2 style="margin:0 0 6px">Instaladas, no ar (${G.no.length})</h2>${G.no.map(inCartao).join("") || '<div class="mu">Nenhuma lona instalada agora.</div>'}</div>`;
  h += `<div class="card"><h2 data-a="col" data-v="inret" style="margin:0;cursor:pointer">${S.col.inret ? "▾" : "▸"} Já retiradas (${G.ret.length})</h2>${S.col.inret ? G.ret.map(inCartao).join("") || '<div class="mu">Nada por aqui ainda.</div>' : ""}</div>`;
  return h;
}

/* ---- campos e botões ---- */
document.addEventListener("input", (ev) => {
  const el = ev.target;
  if (el.dataset && el.dataset.a === "in_f") inf[el.dataset.k] = el.value;
});
document.addEventListener("change", (ev) => {
  const el = ev.target;
  if (!el.dataset) return;
  if (el.dataset.a === "in_f") inf[el.dataset.k] = el.value;
  if (el.dataset.a === "in_pt") {
    inf.pt = el.value;
    render();
  }
});
document.addEventListener("click", (ev) => {
  const el = ev.target.closest("[data-a^='in_']");
  if (!el || typeof eMan === "function" && eMan()) return;
  const a = el.dataset.a,
    v = el.dataset.v,
    x = v && S.est.find((q) => q.id === v),
    msg = (t) => {
      const w = document.getElementById("in_warn");
      if (w) w.innerHTML = '<div class="warn" style="margin-top:8px">' + t + "</div>";
    };
  if (a === "in_msg" && x) {
    inMsgAbrir(x);
  } else if (a === "in_ir") {
    view = "i";
    render();
    if (v)
      setTimeout(() => {
        const c = document.getElementById("in_" + v);
        if (c) c.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 80);
  } else if (a === "in_ins" && x) {
    x.inst = dia();
    save();
    render();
  } else if (a === "in_ret" && x) {
    x.ret = dia();
    save();
    render();
  } else if (a === "in_des" && x) {
    if (x.ret) x.ret = "";
    else x.inst = "";
    save();
    render();
  } else if (a === "in_ed" && x) {
    inf = { id: x.id, pt: x.pai || x.id, nome: "", end: "", cl: x.cl || "", pi: x.pi || "", ini: x.ini || "", fim: x.fim || "" };
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else if (a === "in_can") {
    inf = INFV();
    render();
  } else if (a === "in_save") {
    const n = (id) => (document.getElementById(id) || {}).value;
    ["in_cl", "in_pi", "in_ini", "in_fim", "in_nome", "in_end"].forEach((id) => {
      const k = id.slice(3);
      if (n(id) !== undefined) inf[k] = n(id);
    });
    if (!inf.cl.trim()) return msg("Informe o cliente / campanha.");
    if (!inf.ini || !inf.fim) return msg("Informe o início e o fim da campanha (período da PI).");
    if (inf.fim < inf.ini) return msg("A data final é anterior à inicial.");
    if (!inf.pt) return msg("Escolha o ponto — ou use “Ponto que ainda não existe”.");
    const campos = { oc: "cli", cl: inf.cl.trim(), pi: inf.pi.trim(), ini: inf.ini, fim: inf.fim };
    let alvo;
    if (inf.pt === "__novo") {
      if (!inf.end.trim()) return msg("Informe o endereço do novo ponto.");
      alvo = { id: "e" + Date.now() + S.n++, nome: inf.nome.trim(), end: inf.end.trim(), obs: "", ...campos, inst: "", ret: "" };
      S.est.push(alvo);
    } else {
      const pai = S.est.find((q) => q.id === inf.pt);
      if (!pai) return msg("Ponto não encontrado.");
      /* espaço ocupado = campanha não retirada que cruza o período da nova */
      const G = estGrupo(pai.id),
        ocupa = (q) => q.oc === "cli" && q.cl && !q.ret && q.fim && q.fim >= inf.ini && (!q.ini || q.ini <= inf.fim);
      alvo = inf.id && G.find((q) => q.id === inf.id);
      if (!alvo) alvo = G.find((q) => !ocupa(q));
      if (!alvo && G.length < (+pai.nesp || 1)) {
        const usados = G.map((q) => (q.pai ? +q.esp || 2 : 1));
        let nx = 2;
        while (usados.includes(nx)) nx++;
        alvo = { ...pai, id: "e" + Date.now() + S.n++, pai: pai.id, esp: nx, nesp: undefined, obs: "", oc: "", cl: "", pi: "", ini: "", fim: "", inst: "", ret: "" };
        delete alvo.nesp;
        S.est.push(alvo);
      }
      if (!alvo) {
        const q = G.slice().sort((a, b) => (a.fim || "").localeCompare(b.fim || ""))[0];
        if (!confirm((G.length > 1 ? "Os " + G.length + " espaços deste ponto estão ocupados nesse período." : "Este ponto já tem a campanha de " + q.cl + " (até " + fmt(q.fim) + ").") + "\n\nSubstituir a campanha de " + q.cl + " (até " + fmt(q.fim) + ") pela nova?\n\nDica: se o ponto tem mais placas, aumente “Espaços (placas)” em Estáticos.")) return;
        alvo = q;
      }
      const mudou = alvo.id !== inf.id || alvo.ini !== campos.ini || alvo.fim !== campos.fim || alvo.cl !== campos.cl;
      Object.assign(alvo, campos);
      if (!inf.id || mudou && alvo.id !== inf.id) {
        alvo.inst = "";
        alvo.ret = "";
      }
    }
    inf = INFV();
    save();
    render();
  }
});

/* ---- mensagens prontas para copiar e colar no grupo do WhatsApp ---- */
function inMsgTexto(x, tipo) {
  const L = [];
  const dat = (d) => fmt(d);
  const cab = (t) => {
    L.push(t, "");
    L.push("*Cliente:* " + (x.cl || "—"));
    L.push("*PI:* " + (x.pi || "—"));
    L.push("*Endereço:* " + (x.end || inNome(x)));
    if (x.nome && x.nome !== x.end) L.push("*Ponto:* " + x.nome);
  };
  if (tipo === "ini") {
    const di = inDias(x.ini);
    cab("🪧 *INSTALAÇÃO DE LONA " + (di === 0 ? "— HOJE" : di === 1 ? "— AMANHÃ" : di > 1 ? "— em " + di + " dias" : "— PENDENTE") + "*");
    L.push("*Início da campanha:* " + dat(x.ini));
    L.push("*Fim da campanha:* " + dat(x.fim));
    L.push("", "Favor confirmar no grupo quando a lona for instalada. ✅");
  } else {
    const n = tipo === "r1" ? "1 dia" : tipo === "r2" ? "2 dias" : "HOJE";
    cab("⚠️ *RETIRAR LONA " + (tipo === "r0" ? "HOJE" : "— faltam " + n) + "*");
    L.push("*Fim da campanha:* " + dat(x.fim));
    L.push("", "Programar a retirada da lona e confirmar no grupo. ✅");
  }
  return L.join("\n");
}
function inMsgSugerido(x) {
  const di = inDias(x.ini),
    df = inDias(x.fim);
  if (!x.inst && di >= -1) return "ini";
  if (x.inst) return df <= 0 ? "r0" : df === 1 ? "r1" : "r2";
  return "ini";
}
function inMsgAbrir(x) {
  const old = document.getElementById("inmsg");
  if (old) old.remove();
  const el = document.createElement("div");
  el.id = "inmsg";
  el.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(15,18,60,.55);display:flex;align-items:center;justify-content:center;padding:16px";
  const sug = inMsgSugerido(x);
  const op = [["ini", "Instalação de lona (início)"], ["r2", "Retirar lona — faltam 2 dias"], ["r1", "Retirar lona — falta 1 dia"], ["r0", "Retirar lona — hoje"]];
  el.innerHTML = `<div style="background:#fff;border-radius:18px;max-width:520px;width:100%;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.35);border-top:6px solid #25d366"><div style="font-size:18px;font-weight:700;color:#000066;margin-bottom:10px">📋 Mensagem para o grupo</div><select id="inmt" style="width:100%;margin-bottom:8px">${op.map((o) => `<option value="${o[0]}" ${o[0] === sug ? "selected" : ""}>${o[1]}</option>`).join("")}</select><textarea id="inmx" rows="11" style="width:100%;font-family:inherit;font-size:14px;box-sizing:border-box"></textarea><div class="row" style="margin-top:10px"><button class="pri" id="inmc" style="flex:1">Copiar mensagem</button><button id="inmf" style="flex:0 0 auto">Fechar</button></div><div id="inmo" class="mu" style="margin-top:6px"></div></div>`;
  document.body.appendChild(el);
  const ta = el.querySelector("#inmx"),
    sel = el.querySelector("#inmt");
  const atual = () => (ta.value = inMsgTexto(x, sel.value));
  atual();
  sel.onchange = atual;
  el.querySelector("#inmf").onclick = () => el.remove();
  el.onclick = (e2) => {
    if (e2.target === el) el.remove();
  };
  el.querySelector("#inmc").onclick = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(ta.value);
      ok = true;
    } catch (_) {
      ta.focus();
      ta.select();
      try {
        ok = document.execCommand("copy");
      } catch (_) {}
    }
    el.querySelector("#inmo").textContent = ok ? "✅ Copiado! Agora é só colar no grupo do WhatsApp." : "Não consegui copiar automaticamente — selecione o texto e copie.";
  };
}
