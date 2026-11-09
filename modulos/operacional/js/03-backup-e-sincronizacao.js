/* =====================================================================
   Módulo operacional · Backup em pasta, backup ao fechar, snapshots e sincronização entre computadores
   (arquivo 3 de 13; carregados em ordem pelo index.html)
   ===================================================================== */

/* ===== Backup automático em pasta (Chrome/Edge) ===== */
const BK = {
    h: null,
    st: "off",
    ts: 0,
    err: "",
    files: [],
    t: null,
    hold: false,
    found: "",
    seen: 0,
    last: "",
    pt: 0,
  },
  BKN = "matriz-vt-auto.json";
const vazio = () =>
  !S.vts.length &&
  !S.vars.length &&
  !S.manut.length &&
  !(S.est || []).length &&
  !Object.keys(S.fotos).length &&
  !Object.keys(S.del || {}).length;
const p2 = (n) => String(n).padStart(2, "0"),
  dia = () => {
    const d = new Date();
    return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
  },
  hora = () => {
    const d = new Date();
    return p2(d.getHours()) + p2(d.getMinutes());
  };
const idb = () =>
  new Promise((ok, no) => {
    const r = indexedDB.open("mvt_bk", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("h");
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
  });
const idbOp = async (fn) => {
  const d = await idb();
  return new Promise((ok, no) => {
    const q = fn(d.transaction("h", "readwrite").objectStore("h"));
    q.onsuccess = () => ok(q.result);
    q.onerror = () => no(q.error);
  });
};
async function bkW(n, t) {
  const w = await (await BK.h.getFileHandle(n, { create: true })).createWritable();
  await w.write(t);
  await w.close();
}
async function bkPrune() {
  try {
    const x = [];
    for await (const [k] of BK.h.entries())
      if (
        /^matriz-vt-auto-\d{4}-\d\d-\d\d\.json$/.test(k) ||
        /^matriz-vt-fechamento-.+\.json$/.test(k) ||
        /^matriz-vt-antes-de-.+\.json$/.test(k) ||
        /^GERENCIA_E_OPERACAO-\d{4}-\d\d-\d\d\.xlsx$/.test(k)
      )
        x.push(k);
    for (const k of x) await BK.h.removeEntry(k);
  } catch (_) {}
}
/* ===== Backup ao fechar a página ===== */
let lastClose = "";
const snaps = () => {
  try {
    return JSON.parse(localStorage.getItem("mvt_fecha") || "[]");
  } catch (_) {
    return [];
  }
};
function fechaBk() {
  if (vazio()) return;
  let t;
  try {
    t = JSON.stringify(S, (k, v) => (k === "col" ? undefined : v));
  } catch (_) {
    return;
  }
  if (t === lastClose) return;
  lastClose = t;
  try {
    const a = snaps();
    if (!a.length || a[0].d !== t) {
      a.unshift({ ts: Date.now(), d: t });
      localStorage.setItem("mvt_fecha", JSON.stringify(a.slice(0, 3)));
    }
  } catch (_) {}
  if (BK.st === "on" && !BK.hold) {
    try {
      bkW("matriz-vt-fechamento.json", arqStr(S));
    } catch (_) {}
  }
}
addEventListener("pagehide", fechaBk);
addEventListener("beforeunload", fechaBk);
/* ===== Sincronização entre computadores (pasta compartilhada do Drive) =====
   Cada registro (VT, ponto, manutenção, foto) tem "u" = data da última alteração; exclusões ficam em S.del.
   Ao ler o arquivo da pasta, mescla registro a registro: vale o mais recente. */
let SN = new Map(),
  GS = "",
  PEND = false,
  Q = Promise.resolve();
const lock = (fn) => {
  const p = Q.then(fn);
  Q = p.catch(() => {});
  return p;
};
const AR = { fx: "fixos", vr: "vars", vt: "vts", mn: "manut", es: "est", cf: "cfix" },
  js = (o) => JSON.stringify(o, (k, v) => (k === "u" ? undefined : v)),
  gjs = () => js({ b: S.base, m: S.motos, r: S.rota });
function recs(d) {
  const m = new Map();
  Object.keys(AR).forEach((k) => (d[AR[k]] || []).forEach((o) => m.set(k + ":" + o.id, o)));
  Object.keys(d.fotos || {}).forEach((id) => m.set("ft:" + id, d.fotos[id]));
  return m;
}
function snap() {
  SN = new Map();
  recs(S).forEach((o, k) => SN.set(k, js(o)));
  GS = gjs();
}
function stamp() {
  const now = Date.now(),
    cur = recs(S);
  S.del = S.del || {};
  cur.forEach((o, k) => {
    const s = js(o);
    if (SN.get(k) !== s) {
      o.u = now;
      delete S.del[k];
    }
    SN.set(k, s);
  });
  [...SN.keys()].forEach((k) => {
    if (!cur.has(k)) {
      S.del[k] = now;
      SN.delete(k);
    }
  });
  const g = gjs();
  if (g !== GS) {
    S.gu = now;
    GS = g;
  }
  for (const k in S.del) if (now - S.del[k] > 5184e6) delete S.del[k];
}
function touchAll() {
  const now = Date.now();
  S.del = S.del || {};
  recs(S).forEach((o, k) => {
    o.u = now;
    delete S.del[k];
  });
  S.gu = now;
  S.pu = now;
}
function merge(R) {
  const now = Date.now();
  S.del = S.del || {};
  R.del = R.del || {};
  const L = recs(S),
    X = recs(R),
    keys = new Set([...L.keys(), ...X.keys(), ...Object.keys(S.del), ...Object.keys(R.del)]),
    out = { fx: [], vr: [], vt: [], mn: [], es: [], cf: [] },
    ft = {};
  let chg = false,
    back = false;
  keys.forEach((k) => {
    const i = k.indexOf(":"),
      kd = k.slice(0, i),
      id = k.slice(i + 1),
      a = L.get(k),
      b = X.get(k),
      tb = Math.max(S.del[k] || 0, R.del[k] || 0),
      au = a ? a.u || 0 : -1,
      bu = b ? b.u || 0 : -1,
      m = Math.max(au, bu);
    if (m >= 0 && (!tb || m > tb)) {
      const w = au < 0 ? b : bu < 0 ? a : bu > au ? b : a;
      if (kd === "ft") ft[id] = w;
      else out[kd].push(w);
      if (w !== a) chg = true;
      if (!b || (w.u || 0) !== (b.u || 0) || js(w) !== js(b)) back = true;
      delete S.del[k];
    } else {
      if (a) chg = true;
      if (b || (R.del[k] || 0) < tb) back = true;
      S.del[k] = tb;
    }
  });
  const so = (x, y) => (+y.id.slice(1, 14) || 0) - (+x.id.slice(1, 14) || 0);
  out.vt.sort(so);
  out.mn.sort(so);
  out.es.sort((x, y) => so(y, x));
  S.fixos = out.fx;
  S.vars = out.vr;
  S.vts = out.vt;
  S.manut = out.mn;
  S.est = out.es;
  S.cfix = out.cf;
  S.fotos = ft;
  const rg2 = R.gu || 0,
    lg = S.gu || 0;
  if (rg2 > lg) {
    S.base = R.base;
    S.motos = R.motos;
    S.rota = R.rota;
    S.gu = rg2;
    chg = true;
  } else if (lg > rg2) back = true;
  {
    const rp = R.pu || 0,
      lp = S.pu || 0;
    if (rp > lp) {
      S.prio = R.prio;
      S.pu = rp;
      chg = true;
    } else if (lp > rp) back = true;
  }
  S.n = Math.max(S.n || 1, R.n || 1);
  for (const k in S.del) if (now - S.del[k] > 5184e6) delete S.del[k];
  return { chg, back };
}
function afterMerge() {
  fixS();
  RT.motos = new Set([...RT.motos].filter((m) => MOTOS.includes(m)));
  if (!RT.motos.size) RT.motos = new Set(MOTOS);
  [...RT.sel].forEach((id) => {
    if (!PMf(id)) RT.sel.delete(id);
  });
  if (!MOTOS.includes(moto)) moto = MOTOS[0];
  if (!MOTOS.includes(mf.moto)) mf.moto = MOTOS[0];
  snap();
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
  } catch (_) {
    mem = true;
  }
  const a = document.activeElement;
  if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && $("app").contains(a)) PEND = true;
  else {
    keep();
    render();
  }
}
const bkSt = () => {
  const s = $("bkst");
  if (s) s.innerHTML = bkTxt();
};
async function pullI(force) {
  if (BK.st !== "on") return;
  let f;
  try {
    f = await (await BK.h.getFileHandle(BKN)).getFile();
  } catch (x) {
    if (x.name === "NotAllowedError") {
      BK.st = "perm";
      bkBar();
    }
    return;
  }
  BK.pt = Date.now();
  bkSt();
  if (!force && f.lastModified === BK.seen) return;
  let R,
    flat = false;
  try {
    const raw = JSON.parse(await f.text());
    flat = !!raw && raw._formato !== "matriz-vt";
    R = migrar(raw);
  } catch (_) {
    return;
  }
  if (!R) return;
  BK.seen = f.lastModified;
  const r = merge(R);
  if (r.chg) afterMerge();
  if (flat) BK.last = "";
  if ((r.back || flat) && !force) bkSched();
}
const pull = () =>
  lock(async () => {
    await pullI(false);
    if (CLD && SES && ROLE) await cloudCycle(false);
  }).catch(() => {});
function bkNow(man) {
  if (BK.st !== "on" || BK.hold) return Promise.resolve();
  return lock(async () => {
    try {
      await pullI(!!man);
      if (BK.st !== "on" || vazio()) return;
      const t = JSON.stringify(S, (k, v) => (k === "col" ? undefined : v));
      if (man) {
        const rp = [],
          tm = async (n, fn) => {
            try {
              await fn();
              const f = await (await BK.h.getFileHandle(n)).getFile();
              rp.push("✔ " + n + " (" + Math.max(1, Math.round(f.size / 1024)) + " KB)");
            } catch (x) {
              rp.push("✖ " + n + ": " + (x.message || x.name));
            }
          };
        const j = arqStr(S);
        await tm(BKN, async () => {
          await bkW(BKN, j);
          BK.last = t;
          try {
            BK.seen = (await (await BK.h.getFileHandle(BKN)).getFile()).lastModified;
          } catch (_) {}
        });
        await tm("matriz-vt-fechamento.json", () => bkW("matriz-vt-fechamento.json", j));
        BK.lastPlan = "";
        await tm(PLN, () => bkPlan());
        BK.rep = new Date().toLocaleTimeString("pt-BR") + " — " + rp.join(" · ");
        if (rp.some((x) => x[0] === "✖")) {
          BK.err = rp.filter((x) => x[0] === "✖").join(" | ");
          BK.st = "err";
          bkBar();
          return;
        }
      } else if (t !== BK.last) {
        await bkW(BKN, arqStr(S));
        BK.last = t;
        try {
          BK.seen = (await (await BK.h.getFileHandle(BKN)).getFile()).lastModified;
        } catch (_) {}
      }
      if (!BK.clean) {
        BK.clean = 1;
        bkPrune();
      }
      BK.ts = Date.now();
      BK.err = "";
      bkBar();
      if (!man) await bkPlan();
    } catch (x) {
      BK.st = x.name === "NotAllowedError" ? "perm" : "err";
      BK.err = x.message || x.name;
    }
    bkBar();
  }).catch(() => {});
}
const bkSched = () => {
  if (BK.st !== "on") return;
  clearTimeout(BK.t);
  BK.t = setTimeout(() => {
    BK.t = null;
    bkNow();
  }, 300);
};
async function bkSafe(tag) {
  if (vazio()) return;
  try {
    const a = snaps();
    a.unshift({ ts: Date.now(), d: JSON.stringify(S, (k, v) => (k === "col" ? undefined : v)) });
    localStorage.setItem("mvt_fecha", JSON.stringify(a.slice(0, 3)));
  } catch (_) {}
}
async function bkChk() {
  await pull();
}
async function bkInit() {
  if (!window.showDirectoryPicker || !window.indexedDB) {
    BK.st = "unsup";
    return;
  }
  try {
    const h = await idbOp((s) => s.get("dir"));
    if (h) {
      BK.h = h;
      BK.st = (await h.queryPermission({ mode: "readwrite" })) === "granted" ? "on" : "perm";
      if (BK.st === "on") await bkChk();
    }
  } catch (_) {}
  bkBar();
}
const bkTxt = () =>
  ({
    unsup:
      "Este navegador não permite escolher pasta (use Chrome ou Edge no computador, abrindo o arquivo direto).",
    off: "Desligado.",
    perm: "Pausado — clique em Reativar.",
    err: "Erro: " + e(BK.err),
    on:
      "Ativo na pasta <b>" +
      e((BK.h && BK.h.name) || "") +
      "</b>" +
      (BK.ts
        ? " · último backup às " + new Date(BK.ts).toLocaleTimeString("pt-BR")
        : " · aguardando a próxima alteração") +
      (BK.pt ? " · pasta verificada às " + new Date(BK.pt).toLocaleTimeString("pt-BR") : "") +
      (BK.rep ? '<div style="margin-top:4px">Última gravação manual: ' + e(BK.rep) + "</div>" : ""),
  })[BK.st];
function bkBar() {
  const el = $("bkbar");
  if (!el) return;
  let h = "";
  if (BK.hold)
    h = `<div class="warn">Há um backup na pasta (${e(BK.found)}), mas os dados deste navegador estão vazios. <button class="sm pri" data-a="bkrest" data-v="${BKN}">Restaurar</button> <button class="sm" data-a="bkskip">Ignorar</button></div>`;
  else if (BK.st === "perm")
    h = `<div class="warn">Backup automático pausado: o navegador pede permissão de novo. <button class="sm pri" data-a="bkperm">Reativar</button></div>`;
  else if (BK.st === "err") h = `<div class="warn">Falha no backup automático: ${e(BK.err)}</div>`;
  el.innerHTML = h;
  const s = $("bkst");
  if (s) s.innerHTML = bkTxt();
  bkLine();
}
function bkLine() {
  const el = $("bkline");
  if (!el) return;
  const f = (t) => {
    const d = new Date(t),
      h = d.toLocaleTimeString("pt-BR");
    return d.toDateString() === new Date().toDateString()
      ? "hoje " + h
      : d.toLocaleDateString("pt-BR").slice(0, 5) + " " + h;
  };
  let h;
  if (BK.st === "on") {
    const pend = BK.mod && BK.mod > (BK.ts || 0) + 1500;
    h =
      (pend
        ? '<span style="color:#B7791F">● salvando backup…</span> · '
        : '<span style="color:#2F855A">● backup em dia</span> · ') +
      "último backup " +
      (BK.ts ? f(BK.ts) : "aguardando") +
      (BK.mod ? " · última alteração " + f(BK.mod) : "");
  } else if (BK.st === "perm" || BK.st === "err")
    h =
      '<span style="color:#C53030">● backup com problema</span>' +
      (BK.ts ? " · último backup " + f(BK.ts) : "");
  else
    h =
      '<span style="color:#C53030">● backup em pasta desligado</span> · os dados ficam só neste navegador' +
      (BK.mod ? " · última alteração " + f(BK.mod) : "");
  if (CLD && SES && PERFIL) {
    const cs = CLERR
      ? '<span style="color:#C53030">● nuvem: ' + e(CLERR) + "</span>"
      : CL && CLTS
        ? '<span style="color:#2F855A">● nuvem sincronizada ' + f(CLTS) + "</span>"
        : '<span class="mu">● sincronizando…</span>';
    h =
      "👤 " +
      e(PERFIL.nome || PERFIL.email || "") +
      " (" +
      (ROLE === "admin" ? "admin" : ROLE === "manutencao" ? "manutenção" : "operacional") +
      ") · " +
      cs +
      (BK.st === "on" ? " · " + h : "") +
      (HOST && ROLE === "admin" ? "" : ' · <a href="#" data-a="sair">sair</a>');
  }
  el.innerHTML = h;
}
setInterval(() => {
  try {
    bkLine();
  } catch (_) {}
}, 10000);
const bkCard = () =>
  `<div class="card"><h2 style="margin-top:0">Backup automático em pasta</h2><div class="mu" id="bkst">${bkTxt()}</div><div class="mu" style="margin-top:4px">Grava a cada alteração em ${BKN} (backup principal). Não grava enquanto os dados estiverem vazios, para não sobrescrever um backup bom.<br><b>Sincronização:</b> se os dois computadores apontarem para a mesma pasta do Google Drive, este arquivo é lido a cada 5 segundos e ao voltar para a aba, e as alterações são mescladas registro a registro (vale a mais recente).</div><div class="mu" style="margin-top:6px"><b>Ao fechar a página</b> o sistema grava automaticamente uma cópia na pasta (matriz-vt-fechamento.json, sempre a mais recente) e guarda as 3 últimas neste navegador. A pasta fica só com esses 2 arquivos de backup (mais a planilha GERENCIA_E_OPERACAO.xlsx).</div>${snaps()
    .map(
      (s, i) =>
        `<div class="task"><div>Cópia ao fechar · ${new Date(s.ts).toLocaleString("pt-BR")}</div><button class="sm" data-a="snaprest" data-v="${i}">Restaurar</button></div>`,
    )
    .join(
      "",
    )}${BK.st === "unsup" ? "" : `<div class="row" style="margin-top:8px"><button class="sm pri" data-a="${BK.st === "perm" ? "bkperm" : "bkpick"}">${BK.st === "perm" ? "Reativar" : BK.h ? "Trocar pasta" : "Escolher pasta"}</button>${BK.h ? `<button class="sm" data-a="bknow">Fazer backup agora</button><button class="sm" data-a="bklist">Ver / restaurar backups da pasta</button><button class="sm" data-a="bkoff">Desligar</button>` : ""}</div>`}${BK.files.map((f) => `<div class="task"><div>${e(f.n)}<div class="mu">${new Date(f.t).toLocaleString("pt-BR")} · ${Math.max(1, Math.round(f.s / 1024))} KB</div></div><button class="sm" data-a="bkrest" data-v="${e(f.n)}">${confRem === "bk|" + f.n ? "Confirmar substituir" : "Restaurar"}</button></div>`).join("")}</div>`;
function aplicar(d) {
  S = d;
  fixS();
  touchAll();
  RT.motos = new Set(MOTOS);
  RT.sel.clear();
  if (!MOTOS.includes(moto)) moto = MOTOS[0];
  save();
}
