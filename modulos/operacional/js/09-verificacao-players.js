/* =====================================================================
   Módulo operacional · Verificação de players (4YouSee)
   (arquivo 9 de 13; carregados em ordem pelo index.html)
   ===================================================================== */

let PLC = "",
  PLFN = "",
  PL = { d: null, err: "", busy: false },
  PLF = "off",
  PLQ = "",
  PLT = 0;
const PLL = (() => {
  try {
    return Object.assign({ g: 30, r: 24 }, JSON.parse(localStorage.getItem("mvt_pl_lim") || "{}"));
  } catch (_) {
    return { g: 30, r: 24 };
  }
})();
const plCls = (p) =>
  p.minutos == null ? "r" : p.minutos <= PLL.g ? "v" : p.minutos >= PLL.r * 60 ? "r" : "a";
const plFmt = (m) => {
  if (m == null) return "nunca conectou";
  if (m < 1) return "agora";
  if (m < 60) return "há " + m + " min";
  if (m < 1440) {
    const h = Math.floor(m / 60),
      x = m % 60;
    return "há " + h + " h" + (x ? " " + x + " min" : "");
  }
  const d = Math.floor(m / 1440),
    h = Math.floor((m % 1440) / 60);
  return "há " + d + (d > 1 ? " dias" : " dia") + (h ? " " + h + " h" : "");
};
const plNorm = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
const plStop = new Set([
  "led",
  "painel",
  "painéis",
  "paineis",
  "sentido",
  "horizontal",
  "vertical",
  "group",
  "demo",
  "av",
  "avenida",
  "rua",
  "rod",
  "rodovia",
  "de",
  "da",
  "do",
  "das",
  "dos",
  "bh",
  "e",
  "a",
  "o",
]);
const plTok = (s) =>
  new Set(
    plNorm(s)
      .split(/[^a-z0-9]+/)
      .filter((t) => t && !plStop.has(t) && (t.length > 2 || /\d/.test(t))),
  );
function plMatch(nome) {
  const A = plTok(nome);
  if (A.size < 2) return null;
  let best = null,
    bs = 0;
  for (const p of ALL()) {
    const B = plTok((p.nome || "") + " " + (p.end || ""));
    if (B.size < 2) continue;
    let c = 0,
      num = false;
    A.forEach((t) => {
      if (B.has(t)) {
        c++;
        if (/\d{2,}/.test(t)) num = true;
      }
    });
    const sc = c / Math.min(A.size, B.size);
    if (c >= 2 && sc > bs) {
      bs = sc;
      best = p;
      best._n = num;
    }
  }
  return best && bs >= 0.6 ? best : null;
}
const PLHIDE = /escrit/;
const plCn = (n) => ({ "Conta 1": "MEGA/R2", "Conta 2": "MEGA" })[n] || n;
const plGr = (p) => {
  const g = String(p.grupo || "").trim();
  return /demo/i.test(g) ? "" : g;
};
const PLST = {
  "local assist need": "Precisa de assistência local",
  "local assist needed": "Precisa de assistência local",
  "assistance needed": "Precisa de assistência",
  "assist needed": "Precisa de assistência",
  "assistance need": "Precisa de assistência",
  offline: "Offline",
  online: "Online",
  "no contact": "Sem contato",
  "never connected": "Nunca conectou",
  disconnected: "Desconectado",
};
const plSt = (s) => {
  const k = String(s || "")
    .trim()
    .toLowerCase();
  return PLST[k] || String(s || "").trim();
};
function plDash() {
  if (!CLD || ROLE !== "admin") return "";
  const d = PL.d,
    hojeOpen = S.manut.filter((m) => m.status !== "resolvida");
  let h = "";
  const sec = (t, n, sub) =>
    `<div class="dsec"><h2>${t}</h2><span class="n">${n}</span>${sub ? `<span class="mu">${sub}</span>` : ""}</div>`;
  if (d) {
    const L = d.players
      .map((p) => Object.assign({ c: plCls(p) }, p))
      .filter((p) => p.c !== "v")
      .sort((a, b) =>
        a.c === b.c
          ? (b.minutos == null ? 1e9 : b.minutos) - (a.minutos == null ? 1e9 : a.minutos)
          : a.c === "r"
            ? -1
            : 1,
      );
    h += sec("📡 Players com problema", L.length, L.length ? "o mais antigo primeiro" : "");
    if (!L.length)
      h += `<div class="card mu" style="margin-bottom:14px">🎉 Todos os players estão online.</div>`;
    else
      h += `<div class="pll" style="margin-bottom:14px">${L.slice(0, 8)
        .map(
          (p) =>
            `<div class="plr ${p.c}" style="--c:${p.c === "r" ? "#e5484d" : "#2f80ed"}"><span class="dot"></span><div class="i"><div class="n">${e(p.nome)}</div><div class="s">${e([plGr(p), plSt(p.status), (d.contas || []).length > 1 ? plCn(p.conta) : ""].filter(Boolean).join(" · "))}</div></div><div class="t">${p.c === "r" ? "FORA DO AR" : "Fora do ar"}<small>${e(plFmt(p.minutos))}</small></div></div>`,
        )
        .join(
          "",
        )}${L.length > 8 ? `<div class="mu" style="padding:6px 2px"><a href="#" data-a="tab" data-v="pl">ver todos os ${L.length} →</a></div>` : ""}</div>`;
  }
  if (hojeOpen.length)
    h +=
      sec("🔧 Manutenções abertas", hojeOpen.length, `<a href="#" data-a="tab" data-v="t">abrir</a>`) +
      `<div class="card" style="margin-bottom:14px">${hojeOpen
        .slice()
        .sort(mSort)
        .slice(0, 5)
        .map((m) => {
          const p = PMf(m.pid);
          return `<div style="padding:6px 0;border-bottom:1px solid #eee"><b>${p ? e(p.nome) : "(painel removido)"}</b> — 🔧 ${e(m.def)}${m.status === "moto" ? ' <span class="pill a">aguarda verificação</span>' : ""}</div>`;
        })
        .join("")}</div>`;
  return h;
}
const PLAL = (() => {
  try {
    return JSON.parse(localStorage.getItem("mvt_pl_al") || "{}");
  } catch (_) {
    return {};
  }
})();
function plAlert() {
  if (!PL.d || ROLE !== "admin") return;
  const key = (p) => (p.conta || "") + "|" + p.id;
  const nowOff = new Set();
  const novos = [];
  PL.d.players.forEach((p) => {
    if (PLHIDE.test(plNorm(p.nome))) return;
    if (p.minutos != null && p.minutos >= 120) {
      nowOff.add(key(p));
      if (!PLAL[key(p)]) {
        PLAL[key(p)] = Date.now();
        novos.push(p);
      }
    }
  });
  Object.keys(PLAL).forEach((k) => {
    if (!nowOff.has(k)) delete PLAL[k];
  });
  try {
    localStorage.setItem("mvt_pl_al", JSON.stringify(PLAL));
  } catch (_) {}
  if (!novos.length) return;
  /* sem janela na tela: a verificação é rotineira e manual. Vai só um aviso (sininho) para o próprio admin. */
  plAvisar(novos);
}
async function plAvisar(novos) {
  const uid = SES && SES.uid;
  if (!uid) return;
  const L = novos.sort((a, b) => b.minutos - a.minutos),
    nomes = L.slice(0, 6).map((p) => p.nome + " (" + plFmt(p.minutos) + ")"),
    titulo = L.length === 1 ? "Player fora do ar: " + L[0].nome : L.length + " players fora do ar há mais de 2 h";
  try {
    await sb("/rest/v1/avisos", {
      method: "POST",
      body: {
        titulo: titulo.slice(0, 120),
        texto: nomes.join(" · ") + (L.length > 6 ? " · +" + (L.length - 6) : ""),
        destino: "usuario",
        destino_id: uid,
        abrir: "pl",
        criado_por_nome: "Verificação de players",
      },
    });
  } catch (_) {
    /* sem internet: na próxima verificação ele tenta de novo só se o player continuar fora */
  }
}
async function plLoad() {
  if (!CLD || ROLE !== "admin" || PL.busy) return;
  PL.busy = true;
  PL.err = "";
  if (view === "pl") plPaint();
  try {
    let r = null,
      rede = 0;
    for (const fn of [...new Set([PLFN, "players-status", "quick-endpoint", "dynamic-task"].filter(Boolean))]) {
      try {
        r = await sb("/functions/v1/" + fn, { method: "POST", body: {}, retry: 1 });
      } catch (_) {
        rede++;
        r = null;
        continue;
      }
      if (r.status !== 404) {
        PLFN = fn;
        break;
      }
    }
    if (!r) {
      PL.err = rede
        ? "Não consegui falar com a função no Supabase. Confira se ela foi publicada (Edge Functions) e se a opção Verify JWT está desligada."
        : "Sem conexão com o servidor.";
      PL.busy = false;
      if (view === "pl") plPaint();
      return;
    }
    let j = null;
    try {
      j = await r.json();
    } catch (_) {}
    if (r.status === 404)
      PL.err =
        "A função de verificação ainda não foi instalada no Supabase. Veja o guia (LEIA-ME, seção “Verificação de players”).";
    else if (!j || j.ok === false)
      PL.err = (j && j.erro) || "Não foi possível consultar agora (" + r.status + ").";
    else {
      j.players = (j.players || []).filter((p) => !PLHIDE.test(plNorm(p.nome)));
      j.total = j.players.length;
      if (j.contas)
        j.contas.forEach((c) => {
          c.total = j.players.filter((p) => p.conta === c.nome).length;
        });
      PL.d = j;
      PLT = Date.now();
      try {
        plAlert();
      } catch (_) {}
      if (view === "d" && !document.querySelector("#plpop"))
        try {
          render();
        } catch (_) {}
    }
  } catch (x) {
    PL.err = "Sem conexão com o servidor.";
  }
  PL.busy = false;
  if (view === "pl") plPaint();
}
function plPaint() {
  const a = $("app");
  if (a && view === "pl") a.innerHTML = plview() + foot();
}
function plList() {
  const d = PL.d;
  if (!d) return "";
  const q = plNorm(PLQ);
  let L = d.players
    .map((p) => Object.assign({ c: plCls(p) }, p))
    .filter(
      (p) =>
        (PLF === "todos" || (PLF === "off" ? p.c !== "v" : p.c === PLF)) &&
        (!PLC || p.conta === PLC) &&
        (!q || plNorm(p.nome + " " + (p.grupo || "") + " " + plCn(p.conta || "")).includes(q)),
    );
  const key = (p) => (p.minutos == null ? -1 : p.minutos),
    ord = { r: 0, a: 1, v: 2 };
  L.sort((a, b) => ord[a.c] - ord[b.c] || (a.c === "v" ? key(a) - key(b) : key(b) - key(a)));
  if (!L.length)
    return `<div class="card mu" style="text-align:center;padding:26px">${PLF === "off" ? "🎉 Nenhum player fora do ar." : "Nenhum player neste filtro."}</div>`;
  const COL = { r: "#e5484d", a: "#2f80ed", v: "#16a34a" };
  return `<div class="pll">${L.map((p) => {
    const m = p.c === "v" ? null : plMatch(p.nome);
    return `<div class="plr ${p.c}" style="--c:${COL[p.c]}"><span class="dot"></span><div class="i"><div class="n">${e(p.nome)}</div><div class="s">${e([plGr(p), plSt(p.status)].filter(Boolean).join(" · "))}</div>${m ? `<span class="pt">📍 ${e(m.nome)}</span>` : ""}${(d.contas || []).length > 1 && p.conta ? ` <span class="pt" style="background:#fff0f5;color:#c2185b">${e(plCn(p.conta))}</span>` : ""}</div><div class="t">${p.c === "v" ? "Online" : p.c === "a" ? "Fora do ar" : "FORA DO AR"}<small>${e(plFmt(p.minutos))}</small></div></div>`;
  }).join("")}</div>`;
}
function plview() {
  const d = PL.d;
  let h = `<div class="card"><div class="plb"><div style="flex:1"><h2 style="margin:0">📡 Verificação de players</h2><div class="mu" style="font-size:13px">${d ? "Última consulta: " + e(new Date(PLT).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })) + " · atualiza sozinho a cada 5 min" : "Consulta direta ao 4YouSee"}</div></div><button class="btn pri" data-a="plr" ${PL.busy ? "disabled" : ""}>${PL.busy ? "Consultando…" : "↻ Atualizar agora"}</button></div></div>`;
  if (PL.err) h += `<div class="plmsg e" style="margin-top:12px">⚠ ${e(PL.err)}</div>`;
  if (!d && !PL.err)
    h += `<div class="plmsg" style="margin-top:12px">${PL.busy ? "Consultando o 4YouSee…" : "Preparando a consulta…"}</div>`;
  if (d && !d.total)
    h += `<div class="plmsg" style="margin-top:12px">O 4YouSee respondeu, mas sem nenhum player na lista.${d.diag ? "<br><small>Detalhe técnico: " + e(d.diag) + "</small>" : ""}<br>Isso costuma indicar que a integração do token não tem acesso aos players. Mande esse detalhe para ajustarmos.</div>`;
  if (d) {
    const C = { r: 0, a: 0, v: 0 };
    d.players.forEach((p) => C[plCls(p)]++);
    const K = (k, n, t, c) =>
      `<div style="--c:${c}" class="${PLF === k ? "on" : ""}" data-a="plf" data-v="${k}"><b>${n}</b><span>${t}</span></div>`;
    h += `<div class="plk">${K("todos", d.total, "Players no total", "#1B1F7A")}${K("r", C.r, "🔴 Fora do ar há mais tempo", "#e5484d")}${K("a", C.a, "🔵 Fora do ar há pouco tempo", "#2f80ed")}${K("v", C.v, "🟢 Online", "#16a34a")}</div>
  ${(d.contas || [])
    .filter((c) => c.erro)
    .map(
      (c) =>
        `<div class="plmsg e" style="margin-bottom:10px">⚠ <b>${e(plCn(c.nome))}</b>: ${e(c.erro)}</div>`,
    )
    .join(
      "",
    )}${(d.contas || []).length > 1 ? `<div class="plb"><span class="chip ${PLC === "" ? "sel" : ""}" data-a="plc" data-v="">Todas as contas (${d.total})</span>${d.contas.map((c) => `<span class="chip ${PLC === c.nome ? "sel" : ""}" data-a="plc" data-v="${e(c.nome)}">${e(plCn(c.nome))} (${c.total})</span>`).join("")}</div>` : ""}<div class="plb"><input type="search" id="plq" placeholder="Buscar player ou grupo…" value="${e(PLQ)}"><span class="chip ${PLF === "off" ? "sel" : ""}" data-a="plf" data-v="off">Só os que precisam de atenção (${C.r + C.a})</span><span class="nm">🟢 até <input type="number" min="1" id="pllg" value="${PLL.g}"> min · 🔴 a partir de <input type="number" min="1" id="pllr" value="${PLL.r}"> h</span></div><div id="pllist">${plList()}</div>`;
  }
  return h;
}
document.addEventListener("input", (ev) => {
  if (ev.target.id === "plq") {
    PLQ = ev.target.value;
    const l = $("pllist");
    if (l) l.innerHTML = plList();
  }
});
document.addEventListener("change", (ev) => {
  if (ev.target.id === "pllg" || ev.target.id === "pllr") {
    const g = Math.max(1, +$("pllg").value || 30),
      r = Math.max(1, +$("pllr").value || 24);
    PLL.g = g;
    PLL.r = r;
    try {
      localStorage.setItem("mvt_pl_lim", JSON.stringify({ g, r }));
    } catch (_) {}
    plPaint();
  }
});
setInterval(() => {
  if (!document.hidden && CLD && SES && ROLE === "admin") plLoad();
}, 300000);
setTimeout(function t() {
  if (CLD && SES && PERFIL) {
    if (ROLE === "admin") plLoad();
  } else setTimeout(t, 2000);
}, 3000);
