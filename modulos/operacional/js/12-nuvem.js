/* =====================================================================
   Módulo operacional · Modo nuvem: sessão, login, sincronização com o banco
   (arquivo 12 de 13; carregados em ordem pelo index.html)
   ===================================================================== */

/* ===== MODO NUVEM (login e sincronização pelo Supabase) =====
   Só ativa quando existe o arquivo config.js ao lado do sistema (veja o README). Sem ele, tudo funciona como antes (local/Drive). */
const CFGC = window.MVT_CLOUD || {},
  SBU = String(CFGC.url || "").replace(/\/$/, ""),
  CLD =
    /^(https:\/\/[a-z0-9-]+\.supabase\.co|http:\/\/127\.0\.0\.1:\d+)$/i.test(SBU) &&
    String(CFGC.anon || "").length > 20 &&
    !/SEU-PROJETO|COLE_AQUI/i.test(SBU + CFGC.anon);
let SES = null,
  ROLE = "",
  PERFIL = null,
  CL = null,
  CLERR = "",
  CLTS = 0,
  USERS = null,
  RFP = null,
  CLPULL = false;
try {
  SES = JSON.parse(localStorage.getItem("mvt_ses") || "null");
} catch (_) {}
/* Dentro da casca unificada (iframe): o login e a renovação da sessão são da casca. */
const HOST = (() => {
  try {
    return window.parent !== window && window.parent.MEGA ? window.parent.MEGA : null;
  } catch (_) {
    return null;
  }
})();
if (HOST) SES = HOST.sessao();
const eAdm = () => !CLD || ROLE === "admin";
const ADMIN_ONLY = new Set([
  "add",
  "ed",
  "rem",
  "padd",
  "pmv",
  "prem",
  "mnames",
  "x_pn",
  "x_ph",
  "base",
  "cpushall",
  "ccrun",
  "ccset",
  "ccfix",
  "ccok",
]);
const emptyS = () => ({
  fixos: [],
  vars: [],
  vts: [],
  fotos: {},
  base: { end: "", ll: null },
  rota: null,
  n: 1,
  motos: ["Thiago", "Alan"],
  manut: [],
  est: [],
  prio: defPrio(),
  pu: 0,
  cfix: [],
  del: {},
  gu: 0,
  col: {},
});
function setSes(j) {
  const o = {
    access: j.access_token,
    refresh: j.refresh_token,
    exp: Date.now() + (j.expires_in || 3600) * 1000,
    uid: (j.user && j.user.id) || (SES && SES.uid),
    email: (j.user && j.user.email) || (SES && SES.email),
  };
  SES = o;
  try {
    localStorage.setItem("mvt_ses", JSON.stringify(o));
  } catch (_) {}
}
async function sbRefresh() {
  if (HOST) {
    const s = await HOST.renovarSessao();
    if (s) {
      SES = s;
      return true;
    }
    sesFim("Sua sessão expirou. Entre novamente.");
    return false;
  }
  if (!SES || !SES.refresh) return false;
  if (RFP) return RFP;
  RFP = (async () => {
    try {
      const r = await fetch(SBU + "/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        headers: { apikey: CFGC.anon, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: SES.refresh }),
      });
      if (r.status === 400 || r.status === 401 || r.status === 403) {
        sesFim("Sua sessão expirou. Entre novamente.");
        return false;
      }
      if (!r.ok) return false;
      setSes(await r.json());
      return true;
    } catch (_) {
      return false;
    } finally {
      setTimeout(() => {
        RFP = null;
      }, 0);
    }
  })();
  return RFP;
}
async function sb(path, o) {
  o = o || {};
  const anon = !!o.anon;
  if (!anon && SES && SES.exp - Date.now() < 60000) await sbRefresh();
  const h = Object.assign(
    { apikey: CFGC.anon, "Content-Type": "application/json" },
    !anon && SES ? { Authorization: "Bearer " + SES.access } : {},
    o.h || {},
  );
  const r = await fetch(SBU + path, {
    method: o.method || "GET",
    headers: h,
    body: o.body !== undefined ? JSON.stringify(o.body) : undefined,
  });
  if (r.status === 401 && !anon && !o.retry && SES && (await sbRefresh()))
    return sb(path, Object.assign({}, o, { retry: 1 }));
  return r;
}
function loginCSS() {
  if (document.getElementById("lgcss")) return;
  const st = document.createElement("style");
  st.id = "lgcss";
  st.textContent = `
#login{position:fixed;inset:0;z-index:9999;display:grid;grid-template-columns:1.1fr 1fr;background:var(--bg);overflow:auto}
#login .lgL{position:relative;overflow:hidden;color:#fff;padding:44px 48px;display:flex;flex-direction:column;justify-content:space-between;background:linear-gradient(145deg,#12165f 0%,#1B1F7A 55%,#2a2f9a 100%)}
#login .lgL:before,#login .lgL:after{content:"";position:absolute;border-radius:50%;filter:blur(60px);opacity:.55;animation:lgf 14s ease-in-out infinite}
#login .lgL:before{width:380px;height:380px;background:#F5457F;right:-120px;top:-100px}
#login .lgL:after{width:320px;height:320px;background:#4a52d8;left:-90px;bottom:-110px;animation-delay:-7s}
@keyframes lgf{0%,100%{transform:translate(0,0)}50%{transform:translate(-40px,34px)}}
#login .lggrid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:44px 44px;mask-image:radial-gradient(circle at 30% 40%,#000 0,transparent 75%);-webkit-mask-image:radial-gradient(circle at 30% 40%,#000 0,transparent 75%)}
#login .lgL>*{position:relative;z-index:1}
#login .lgbb{width:min(580px,100%,max(340px,calc((100vh - 500px)*1.78)));margin-top:18px;position:relative;outline:0}
#login .lgscr{position:relative;aspect-ratio:16/9;border:10px solid #fff;border-radius:16px;overflow:hidden;background:linear-gradient(135deg,#0d1050,#1B1F7A 60%,#2a2f9a);box-shadow:0 22px 50px rgba(0,0,0,.4),0 0 0 1px rgba(255,255,255,.2) inset;cursor:pointer;animation:lgu 6s ease-in-out infinite}
#login .lgscr:before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(255,255,255,.04) 0 2px,transparent 2px 5px);pointer-events:none;z-index:3}
#login .lgscr>div{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;transition:opacity .4s}
#login .s1 i{position:absolute;display:block;border-radius:99px;background:#fff;opacity:.5}
#login .s1 .a{left:9%;top:16%;width:42%;height:9%;background:#F5457F;opacity:1}
#login .s1 .b{left:9%;top:36%;width:60%;height:6%}
#login .s1 .c{left:9%;top:50%;width:48%;height:6%;opacity:.28}
#login .s1 .d{right:9%;bottom:14%;width:22%;aspect-ratio:1;border-radius:50%;background:#F5457F;opacity:.9}
#login .s2,#login .s3{opacity:0}
#login .s2 img{width:68%;height:auto;display:block}
#login .s3{gap:4px;text-align:center;font-weight:800;letter-spacing:.06em;color:#fff;font-size:clamp(20px,2.7vw,40px);line-height:1.15}
#login .s3 b{color:#FF4D8D;font-weight:900}
#login .s2{transform:scale(.9);transition:opacity .5s ease,transform .6s ease}
#login .s3{transform:translateY(14px) scale(.97);transition:opacity .6s ease,transform .6s ease}
#login .lgbb.t1 .s1{opacity:0}
#login .lgbb.t1 .s2{opacity:1;transform:scale(1)}
#login .lgbb.t2 .s2{opacity:0;transform:scale(1.06)}
#login .lgbb.t2 .s3{opacity:1;transform:none}
#login .lgbb.t1 .lghint{opacity:0}
#login .lgpole{width:14px;height:clamp(26px,5vh,52px);background:linear-gradient(90deg,#d9dcf5,#fff,#c9cdf0);margin:0 auto}
#login .lgbase{width:36%;height:9px;border-radius:5px;background:rgba(255,255,255,.55);margin:0 auto}
#login .lghint{white-space:nowrap;text-align:center;font-size:12px;opacity:.6;margin-top:10px;transition:opacity .3s}
#login .lglogo{height:clamp(50px,min(6.4vw,9vh),84px);width:auto;display:block;margin-bottom:22px}#login .lgbrand{border:0;padding:0;font-weight:800;letter-spacing:.14em;font-size:13px;opacity:.9;text-transform:uppercase;display:flex;align-items:center;gap:10px}
#login .lgbrand i{width:10px;height:10px;border-radius:50%;background:#F5457F;box-shadow:0 0 0 0 rgba(245,69,127,.7);animation:lgp 2s infinite}
@keyframes lgp{70%{box-shadow:0 0 0 12px rgba(245,69,127,0)}100%{box-shadow:0 0 0 0 rgba(245,69,127,0)}}
#login .lghello{font-size:15px;opacity:.85;margin-bottom:6px}
#login .lgclock{font-size:clamp(44px,min(6vw,9.5vh),78px);font-weight:800;letter-spacing:-.04em;line-height:1;font-variant-numeric:tabular-nums}
#login .lgclock u{all:unset;color:#FF8DB8;animation:lgb 1s steps(2) infinite}
@keyframes lgb{50%{opacity:.25}}
#login .lgdow{font-size:clamp(20px,2.6vw,30px);font-weight:700;margin-top:10px;text-transform:capitalize}
#login .lgdt{opacity:.8;margin-top:2px;font-size:15px}
@keyframes lgu{50%{transform:translateY(-8px)}}
#login .lgfoot{font-size:12px;opacity:.65}
#login .lgR{display:flex;align-items:center;justify-content:center;padding:28px 20px}
#login form{width:100%;max-width:370px;animation:lgi .6s ease both}
@media(max-height:800px){#login .lghint{display:none}#login .lgL{padding-top:30px;padding-bottom:26px}}
@keyframes lgi{from{opacity:0;transform:translateY(14px)}}
#login h2{text-transform:none;margin:0;font-size:26px;letter-spacing:-.02em;color:var(--ac)}
#login .lgsub{color:var(--mu);margin:4px 0 22px;font-size:14px}
#login .lgfld{position:relative;margin-bottom:12px}
#login .lgfld input{width:100%;box-sizing:border-box;padding:20px 44px 8px 14px;border:1.5px solid var(--bd);border-radius:12px;font-size:15px;background:#fff;outline:none;transition:.2s}
#login .lgfld input:focus{border-color:var(--acb);box-shadow:0 0 0 4px rgba(245,69,127,.12)}
#login .lgfld label{position:absolute;left:14px;top:15px;font-size:15px;color:var(--mu);pointer-events:none;transition:.18s}
#login .lgfld input:focus+label,#login .lgfld input:not(:placeholder-shown)+label{top:6px;font-size:11px;color:var(--acb);font-weight:700}
#login .lgeye{position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:0;cursor:pointer;font-size:17px;padding:6px;opacity:.6}
#login .lgeye:hover{opacity:1}
#login .lgrow{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--mu);margin:2px 0 6px}
#login .lgrow label{display:flex;gap:6px;align-items:center;cursor:pointer;margin:0;font-weight:400;position:static}#login .lgrow input{width:auto;margin:0}
#login #lgc{color:var(--wa);font-weight:600;display:none}
#login #lgm{color:var(--er);font-size:13px;min-height:20px;margin:6px 0}
#login #lgm.sh{animation:lgs .4s}
@keyframes lgs{20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
#login #lgb{width:100%;padding:13px;border:0;border-radius:12px;font-size:16px;font-weight:700;color:#fff;cursor:pointer;background:linear-gradient(90deg,#F5457F,#ff6a9c);box-shadow:0 8px 20px rgba(245,69,127,.3);transition:.2s}
#login #lgb:hover{transform:translateY(-1px);box-shadow:0 12px 26px rgba(245,69,127,.38)}
#login #lgb:disabled{opacity:.7;cursor:wait;transform:none}
#login .lgbusy{display:flex;align-items:center;gap:12px;color:var(--mu)}
#login .lgspin{width:20px;height:20px;border:3px solid var(--ac2);border-top-color:var(--acb);border-radius:50%;animation:lgr .8s linear infinite}
@keyframes lgr{to{transform:rotate(360deg)}}
#login .lgnote{margin-top:18px;font-size:12px;color:var(--mu);text-align:center}
@media(max-width:820px){#login{grid-template-columns:1fr;grid-template-rows:auto 1fr}#login .lgL{padding:26px 22px}#login .lgbb,#login .lgfoot{display:none}#login .lgclock{font-size:52px}#login .lglogo{height:26px}}
@media(prefers-reduced-motion:reduce){#login *,#login *:before,#login *:after{animation:none!important}}
`;
  document.head.appendChild(st);
}
function loginClock() {
  const c = document.getElementById("lgclk");
  if (!c) return;
  const d = new Date(),
    h = d.getHours(),
    p = (n) => String(n).padStart(2, "0");
  c.innerHTML =
    p(h) +
    "<u>:</u>" +
    p(d.getMinutes()) +
    "<em style='font-size:.4em;opacity:.7;margin-left:6px;font-weight:700;font-style:normal'>" +
    p(d.getSeconds()) +
    "</em>";
  const g = h < 5 ? "Boa madrugada" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite",
    H = document.getElementById("lgh");
  if (H) H.textContent = g + "! 👋";
  const w = document.getElementById("lgw");
  if (w) w.textContent = d.toLocaleDateString("pt-BR", { weekday: "long" });
  const t = document.getElementById("lgd");
  if (t) t.textContent = d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}
function loginUI(msg, busy) {
  loginCSS();
  let el = document.getElementById("login");
  if (!el) {
    el = document.createElement("div");
    el.id = "login";
    document.body.appendChild(el);
  }
  const bb = `<div class="lgbb" tabindex="0" aria-label="Painel Mega OOH"><div class="lgscr"><div class="s1"><i class="a"></i><i class="b"></i><i class="c"></i><i class="d"></i></div><div class="s2"><img src="${LOGO_W}" alt="Mega OOH"></div><div class="s3"><span>PENSE GRANDE,</span><b>PENSE MEGA</b></div></div><div class="lgpole"></div><div class="lgbase"></div><div class="lghint">passe o mouse no painel ✨</div></div>`;
  const right = busy
    ? `<form id="lgf" onsubmit="return false"><h2>Matriz VT</h2><div class="lgsub">Mega Mídia OOH · acesso restrito</div><div class="lgbusy"><div class="lgspin"></div><div>${e(msg || "Conectando…")}</div></div></form>`
    : `<form id="lgf"><h2>Bem-vindo de volta</h2><div class="lgsub">Entre com o e-mail e a senha que o administrador criou para você.</div>
  <div class="lgfld"><input id="lge" type="email" autocomplete="username" placeholder=" " required><label for="lge">E-mail</label></div>
  <div class="lgfld"><input id="lgp" type="password" autocomplete="current-password" placeholder=" " required><label for="lgp">Senha</label><button type="button" class="lgeye" id="lgv" title="Mostrar/ocultar senha" aria-label="Mostrar ou ocultar senha">👁</button></div>
  <div class="lgrow"><label><input type="checkbox" id="lgr"> Lembrar meu e-mail</label><span id="lgc">⚠ Caps Lock ligado</span></div>
  <div id="lgm" role="alert">${e(msg || "")}</div><button id="lgb" type="submit">Entrar</button>
  <div class="lgnote">Esqueceu a senha? Peça ao administrador para redefinir.</div></form>`;
  el.innerHTML = `<div class="lgL"><div class="lggrid"></div><div class="lgbrand"><img src="${LOGO_W}" alt="Mega OOH" class="lglogo"></div><div><div class="lghello" id="lgh"></div><div class="lgclock" id="lgclk"></div><div class="lgdow" id="lgw"></div><div class="lgdt" id="lgd"></div>${bb}</div><div class="lgfoot">Matriz VT × Painéis · Gestão operacional</div></div><div class="lgR">${right}</div>`;
  {
    const B = el.querySelector(".lgbb");
    if (B) {
      let T = 0;
      const on = () => {
          clearTimeout(T);
          B.classList.add("t1");
          B.classList.remove("t2");
          T = setTimeout(() => B.classList.add("t2"), 2000);
        },
        off = () => {
          clearTimeout(T);
          B.classList.remove("t1", "t2");
        };
      B.addEventListener("mouseenter", on);
      B.addEventListener("mouseleave", off);
      B.addEventListener("focus", on);
      B.addEventListener("blur", off);
      B.addEventListener("click", () => (B.classList.contains("t1") ? off() : on()));
    }
  }
  loginClock();
  clearInterval(window.__lgt);
  window.__lgt = setInterval(() => {
    if (!document.getElementById("lgclk")) {
      clearInterval(window.__lgt);
      return;
    }
    loginClock();
  }, 1000);
  if (!busy) {
    const f = document.getElementById("lgf"),
      I = document.getElementById("lge"),
      P = document.getElementById("lgp");
    try {
      const m = localStorage.getItem("mvt_lg_email");
      if (m) {
        I.value = m;
        document.getElementById("lgr").checked = true;
      }
    } catch (_) {}
    document.getElementById("lgv").onclick = () => {
      P.type = P.type === "password" ? "text" : "password";
      P.focus();
    };
    const caps = (ev) => {
      const c = document.getElementById("lgc");
      if (c && ev.getModifierState) c.style.display = ev.getModifierState("CapsLock") ? "inline" : "none";
    };
    P.addEventListener("keydown", caps);
    P.addEventListener("keyup", caps);
    const erro = (t) => {
      const m = document.getElementById("lgm");
      m.textContent = t;
      m.classList.remove("sh");
      void m.offsetWidth;
      m.classList.add("sh");
    };
    if (msg) erro(msg);
    f.onsubmit = async (ev) => {
      ev.preventDefault();
      const b = document.getElementById("lgb");
      b.disabled = true;
      b.textContent = "Entrando…";
      document.getElementById("lgm").textContent = "";
      try {
        const mail = I.value.trim();
        const r = await fetch(SBU + "/auth/v1/token?grant_type=password", {
          method: "POST",
          headers: { apikey: CFGC.anon, "Content-Type": "application/json" },
          body: JSON.stringify({ email: mail, password: P.value }),
        });
        if (!r.ok) {
          erro(
            r.status === 400 || r.status === 401
              ? "E-mail ou senha incorretos."
              : "Não foi possível entrar (" + r.status + ").",
          );
          b.disabled = false;
          b.textContent = "Entrar";
          return;
        }
        try {
          if (document.getElementById("lgr").checked) localStorage.setItem("mvt_lg_email", mail);
          else localStorage.removeItem("mvt_lg_email");
        } catch (_) {}
        setSes(await r.json());
        loginUI("Conectando…", true);
        await cloudStart();
      } catch (x) {
        loginUI(x && x.message ? x.message : "Sem conexão com o servidor.");
      }
    };
    (I.value ? P : I).focus();
  }
}
function sesFim(msg, limpa) {
  const uid = SES && SES.uid;
  SES = null;
  ROLE = "";
  PERFIL = null;
  USERS = null;
  try {
    localStorage.removeItem("mvt_ses");
  } catch (_) {}
  if (limpa) {
    try {
      localStorage.removeItem("mvt_cl_" + uid);
      localStorage.removeItem(KEY);
    } catch (_) {}
    S = emptyS();
    fixS();
    snap();
    CL = null;
  }
  if (HOST) {
    HOST.sair(msg || "");
    return;
  }
  loginUI(msg || "");
  try {
    bkLine();
  } catch (_) {}
}
const clKey = () => "mvt_cl_" + SES.uid,
  clSave = () => {
    try {
      localStorage.setItem(clKey(), JSON.stringify(CL));
    } catch (_) {}
  };
function clLoad() {
  let o = null;
  try {
    o = JSON.parse(localStorage.getItem(clKey()) || "null");
  } catch (_) {}
  CL = Object.assign({ init: false, rev: 0, known: {}, kdel: {}, cu: {}, sent: {} }, o || {});
}
async function cloudStart() {
  const r = await sb("/rest/v1/profiles?id=eq." + SES.uid + "&select=id,email,nome,papel,ativo");
  if (!r.ok) throw new Error("Não foi possível ler seu perfil (" + r.status + ").");
  const a = await r.json();
  PERFIL = a[0];
  if (!PERFIL) {
    sesFim("Seu usuário ainda não tem perfil. Fale com o administrador.");
    return;
  }
  if (!PERFIL.ativo) {
    sesFim("Usuário desativado. Fale com o administrador.");
    return;
  }
  ROLE = PERFIL.papel;
  clLoad();
  if (!CL.init) {
    const c = await sb("/rest/v1/registros?select=chave&limit=1");
    if (!c.ok) throw new Error("Não foi possível acessar os dados (" + c.status + ").");
    const vazio = !(await c.json()).length;
    if (!(vazio && ROLE === "admin")) {
      await bkSafe("antes-de-sincronizar");
      S = emptyS();
      fixS();
      snap();
      try {
        localStorage.setItem(KEY, JSON.stringify(S));
      } catch (_) {}
      CL.rev = 0;
      CL.known = {};
      CL.kdel = {};
      CL.cu = {};
      CL.sent = {};
    }
    CL.init = true;
    clSave();
  }
  const l = document.getElementById("login");
  if (l) l.remove();
  if (adm === "f" && !eAdm()) adm = "s";
  render();
  bkLine();
  await cloudCycle(true);
}
function cloudSched() {
  if (!CLD || !SES || !ROLE) return;
  clearTimeout(cloudSched.t);
  cloudSched.t = setTimeout(() => {
    lock(() => cloudCycle(false)).catch(() => {});
  }, 400);
}
async function cloudPerfil() {
  const r = await sb("/rest/v1/profiles?id=eq." + SES.uid + "&select=nome,papel,ativo");
  if (!r.ok) return true;
  const p = (await r.json())[0];
  if (!p || !p.ativo) {
    sesFim("Seu acesso foi desativado. Fale com o administrador.");
    return false;
  }
  if (p.papel !== ROLE || p.nome !== PERFIL.nome) {
    const was = ROLE;
    Object.assign(PERFIL, p);
    ROLE = p.papel;
    if (was !== ROLE) {
      if (!eAdm() && adm !== "s" && adm !== "n") adm = "s";
      render();
    }
  }
  return true;
}
async function cloudCycle(force) {
  if (!SES || !ROLE || !CL) return;
  try {
    if (force || Date.now() - (cloudCycle.pt || 0) > 30000) {
      cloudPerfil.busy = 1;
      const ok = await cloudPerfil();
      cloudCycle.pt = Date.now();
      if (ok === false) return;
    }
    await cloudPull();
    await cloudPush();
    CLERR = "";
    CLTS = Date.now();
  } catch (x) {
    CLERR =
      x && x.message && !/fetch|network|load failed/i.test(x.message)
        ? x.message
        : "sem conexão — tentando de novo";
  }
  bkLine();
}
async function cloudPull() {
  const rows = [];
  let last = Math.max(0, (CL.rev || 0) - 20);
  for (;;) {
    const r = await sb(
      "/rest/v1/registros?select=chave,tipo,dados,u,excluido,rev&rev=gt." +
        last +
        "&order=rev.asc&limit=1000",
    );
    if (!r.ok) throw new Error("Falha ao ler dados (" + r.status + ")");
    const a = await r.json();
    rows.push(...a);
    if (a.length < 1000) break;
    last = a[a.length - 1].rev;
  }
  if (rows.length) cloudApply(rows, false);
}
function cloudApply(rows, force) {
  const R = {
    fixos: [],
    vars: [],
    vts: [],
    manut: [],
    est: [],
    cfix: [],
    fotos: {},
    del: {},
    gu: 0,
    pu: 0,
    n: S.n || 1,
  };
  let cfg = false,
    any = false;
  const cur = (n) =>
    ({
      base: JSON.stringify({ base: S.base, motos: S.motos }),
      rota: JSON.stringify({ rota: S.rota }),
      prio: JSON.stringify({ prio: S.prio }),
    })[n];
  rows.forEach((w) => {
    const k = w.chave,
      t = w.tipo;
    CL.rev = Math.max(CL.rev || 0, w.rev || 0);
    if (t === "cfg" || t === "rot") {
      const n = k === "cfg:base" ? "base" : k === "cfg:prio" ? "prio" : "rota",
        d = w.dados || {};
      if (!force && w.u <= (CL.cu[n] || 0)) return;
      if (!force && CL.sent[n] !== undefined && CL.sent[n] !== cur(n)) return;
      if (n === "base") {
        if (d.base) S.base = d.base;
        if (Array.isArray(d.motos) && d.motos.length > 1) {
          S.motos = d.motos;
          MOTOS = d.motos;
          RT.motos = new Set(MOTOS);
        }
      } else if (n === "prio") {
        if (Array.isArray(d.prio)) {
          S.prio = d.prio;
          S.pu = w.u;
        }
      } else S.rota = d.rota || null;
      CL.cu[n] = w.u;
      CL.sent[n] = cur(n);
      cfg = true;
      return;
    }
    if (w.excluido) {
      if (!force && CL.kdel[k] === w.u) return;
      R.del[k] = w.u;
      CL.kdel[k] = w.u;
      delete CL.known[k];
      any = true;
      return;
    }
    if (!force && CL.known[k] === w.u) return;
    const d = Object.assign({}, w.dados || {});
    d.u = w.u;
    if (t === "ft") R.fotos[k.slice(3)] = d;
    else if (AR[t]) {
      d.id = d.id || k.slice(t.length + 1);
      R[AR[t]].push(d);
    } else return;
    CL.known[k] = w.u;
    delete CL.kdel[k];
    any = true;
  });
  if (!eAdm())
    ["fx", "vr"].forEach((t) => {
      const arr = S[AR[t]];
      R[AR[t]].forEach((d) => {
        const i = arr.findIndex((p) => p.id === d.id);
        if (i >= 0) arr[i] = JSON.parse(JSON.stringify(d));
      });
    });
  let ch = false;
  if (any) {
    const r = merge(R);
    ch = r.chg;
  }
  if (ch || cfg) {
    fixS();
    afterMerge();
  }
  clSave();
}
async function cloudPush() {
  const it = [],
    cf = [];
  recs(S).forEach((o, k) => {
    const u = o.u || 0;
    if (CL.known[k] !== u) it.push({ chave: k, tipo: k.split(":")[0], dados: o, u, excluido: false });
  });
  Object.entries(S.del || {}).forEach(([k, ts]) => {
    if (CL.kdel[k] !== ts) it.push({ chave: k, tipo: k.split(":")[0], dados: null, u: ts, excluido: true });
  });
  [
    ["base", "cfg:base", "cfg", { base: S.base, motos: S.motos }],
    ["rota", "rot:atual", "rot", { rota: S.rota }],
    ["prio", "cfg:prio", "cfg", { prio: S.prio }],
  ].forEach(([n, k, t, d]) => {
    const s = JSON.stringify(d);
    if (CL.sent[n] !== s) {
      const u = Date.now();
      it.push({ chave: k, tipo: t, dados: d, u, excluido: false });
      cf.push({ k, n, s, u });
    }
  });
  if (!it.length) return;
  const neg = [];
  let again = false;
  for (let i = 0; i < it.length; i += 150) {
    const lote = it.slice(i, i + 150),
      r = await sb("/rest/v1/rpc/gravar_registros", { method: "POST", body: { p: lote } });
    if (!r.ok) {
      let m = "";
      try {
        m = (await r.json()).message || "";
      } catch (_) {}
      throw new Error("Falha ao enviar (" + r.status + ") " + m);
    }
    const j = await r.json(),
      ok = new Set(j.ok || []);
    lote.forEach((x) => {
      const c = cf.find((q) => q.k === x.chave);
      if (ok.has(x.chave)) {
        if (c) {
          CL.sent[c.n] = c.s;
          CL.cu[c.n] = c.u;
        } else if (x.excluido) CL.kdel[x.chave] = x.u;
        else CL.known[x.chave] = x.u;
      }
    });
    (j.antigo || []).forEach(() => {
      again = true;
    });
    (j.negado || []).forEach((k) => neg.push(k));
  }
  clSave();
  if (neg.length) {
    await cloudRevert(neg);
    throw new Error(
      "Sem permissão para alterar: " +
        neg.slice(0, 3).join(", ") +
        (neg.length > 3 ? "…" : "") +
        " (peça ao admin)",
    );
  }
  if (again) await cloudPull();
}
async function cloudRevert(keys) {
  const r = await sb(
    "/rest/v1/registros?select=chave,tipo,dados,u,excluido,rev&chave=in.(" +
      keys.map((k) => '"' + k + '"').join(",") +
      ")",
  );
  const a = r.ok ? await r.json() : [],
    have = new Set(a.map((x) => x.chave));
  keys.forEach((k) => {
    if (S.del) delete S.del[k];
    delete CL.kdel[k];
    if (have.has(k)) return;
    const t = k.split(":")[0];
    if (AR[t]) {
      const id = k.slice(t.length + 1);
      S[AR[t]] = S[AR[t]].filter((p) => p.id !== id);
    } else if (t === "cfg" || t === "rot") {
      CL.sent[k === "cfg:base" ? "base" : k === "cfg:prio" ? "prio" : "rota"] = JSON.stringify(
        k === "cfg:base"
          ? { base: S.base, motos: S.motos }
          : k === "cfg:prio"
            ? { prio: S.prio }
            : { rota: S.rota },
      );
    }
  });
  if (a.length) cloudApply(a, true);
  snap();
  fixS();
  afterMerge();
  clSave();
}
async function cloudUsers() {
  try {
    const r = await sb("/rest/v1/profiles?select=id,email,nome,papel,ativo,criado_em&order=criado_em.asc");
    if (r.ok) {
      USERS = await r.json();
      if (view === "a" && adm === "u") render();
    }
  } catch (_) {}
}
function usuarios() {
  if (!USERS) {
    cloudUsers();
    return '<div class="card mu">Carregando usuários…</div>';
  }
  return `<div class="card"><h2 style="margin-top:0">Usuários</h2>${USERS.map((u) => `<div class="task"><div style="flex:1"><div class="mu">${e(u.email || "")}${u.id === SES.uid ? " · você" : ""}</div><div class="row" style="margin-top:6px"><input id="un_${u.id}" value="${e(u.nome || "")}" placeholder="Nome"><select id="up_${u.id}"><option value="operacional" ${u.papel === "operacional" ? "selected" : ""}>Operador</option><option value="manutencao" ${u.papel === "manutencao" ? "selected" : ""}>Manutenção</option><option value="admin" ${u.papel === "admin" ? "selected" : ""}>Admin</option></select><label class="mu" style="flex:0 0 auto"><input type="checkbox" id="ua_${u.id}" ${u.ativo ? "checked" : ""} style="width:auto"> ativo</label></div></div><div class="acts"><button class="sm pri" data-a="usave" data-v="${u.id}">Salvar</button></div></div>`).join("")}</div>
<div class="card mu"><b>Operador</b> faz tudo no sistema, menos alterar ou apagar pontos (endereços fixos e variáveis) e as configurações. <b>Manutenção</b> vê uma tela própria só com os chamados (onde ir, defeito, prazo) e só pode atualizar chamados de manutenção. <b>Admin</b> faz tudo.<br>Para <b>criar um novo usuário</b>: Supabase → Authentication → Users → Add user → Create new user (e-mail e senha). Ele aparece aqui como Operador; mude para Admin se precisar. Para <b>bloquear</b> alguém, desmarque “ativo”.</div>`;
}
function cloudCard() {
  return `<div class="card"><h2 style="margin-top:0">Nuvem</h2><div class="mu">${CLERR ? '<b style="color:var(--er)">Problema: ' + e(CLERR) + "</b>" : "Sincronizada" + (CLTS ? " às " + new Date(CLTS).toLocaleTimeString("pt-BR") : "")}. Tudo o que muda aqui vai para a nuvem em instantes; cada pessoa recebe as alterações dos outros a cada 5 segundos.</div><div class="mu" style="margin-top:6px">Primeira vez? Importe seu backup (Importar backup, logo abaixo) e os dados sobem sozinhos. Se precisar reenviar tudo manualmente:</div><button class="sm" data-a="cpushall" style="margin-top:6px">Reenviar tudo para a nuvem</button></div>`;
}
async function cloudBoot() {
  if (!CLD) {
    if (window.MVT_CLOUD) {
      const w = $("warn");
      if (w)
        w.innerHTML =
          '<div class="warn">O arquivo config.js existe, mas a URL ou a chave do Supabase não estão preenchidas corretamente. O sistema está rodando só neste navegador (modo local).</div>';
    }
    return;
  }
  if (!SES) {
    loginUI("");
    return;
  }
  loginUI("Conectando…", true);
  try {
    await cloudStart();
  } catch (x) {
    loginUI((x && x.message ? x.message : "Sem conexão com o servidor.") + " Tente entrar de novo.");
  }
}
