/* =====================================================================
   Módulo operacional · Navegação, render principal e tratamento de cliques
   (arquivo 11 de 13; carregados em ordem pelo index.html)
   ===================================================================== */

function mobNav() {
  const T = $("tabs");
  if (!T) return;
  const cnt = {};
  T.querySelectorAll("button[data-v]").forEach((b) => {
    const m = b.textContent.match(/\((\d+)(?:\/\d+)?\)/);
    cnt[b.dataset.v] = m ? m[1] : "";
  });
  let bar = $("mbar"),
    nav = $("mnav"),
    sh = $("msheet"),
    sc = $("mscrim");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "mbar";
    const sd = document.querySelector(".shell");
    sd.parentNode.insertBefore(bar, sd);
    nav = document.createElement("nav");
    nav = Object.assign(nav, { id: "mnav" });
    document.body.appendChild(nav);
    sc = document.createElement("div");
    sc.id = "mscrim";
    sc.onclick = () => document.body.classList.remove("mm");
    document.body.appendChild(sc);
    sh = document.createElement("div");
    sh.id = "msheet";
    document.body.appendChild(sh);
    sh.addEventListener("click", (ev) => {
      if (ev.target.closest("[data-a]")) setTimeout(() => document.body.classList.remove("mm"), 0);
    });
    nav.addEventListener("click", (ev) => {
      const b = ev.target.closest("button");
      if (b && b.id === "mmais") {
        document.body.classList.toggle("mm");
      } else document.body.classList.remove("mm");
    });
  }
  if (eMoto()) {
    document.body.classList.add("rmoto");
    bar.innerHTML = `<img src="${LOGO_W}" alt="Mega OOH"><b>Fotos perto de você</b><span>👤 ${e(mtUser())}</span>${HOST ? "" : `<a href="#" data-a="sair">Sair</a>`}`;
    nav.innerHTML = "";
    sh.innerHTML = "";
    return;
  }
  if (eMan()) {
    bar.innerHTML = `<img src="${LOGO_W}" alt="Mega OOH"><b>Manutenção</b><span>👤 ${e(mtUser())}</span>${HOST ? "" : `<a href="#" data-a="sair">Sair</a>`}`;
    nav.innerHTML = "";
    sh.innerHTML = "";
    return;
  }
  bar.innerHTML = `<img src="${LOGO_W}" alt="Mega OOH"><b>${MV_NAME[view] || ""}</b>`;
  const main = ["d", "g", "r", "k"],
    bt = (v) =>
      `<button data-a="tab" data-v="${v}" class="${view === v ? "on" : ""}"><span>${MV_ICO[v]}</span>${MV_NAME[v]}${cnt[v] ? `<em>${cnt[v]}</em>` : ""}</button>`;
  nav.innerHTML =
    main.map(bt).join("") +
    `<button id="mmais" class="${main.includes(view) ? "" : "on"}"><span>☰</span>Mais</button>`;
  const rest = ["fp", "fv", "pm", "m", "c", "t", "pl", "x", "i", "e", "ev", "o", "a"].filter((v) =>
    T.querySelector('button[data-v="' + v + '"]'),
  );
  sh.innerHTML = `<div class="gr"></div>${CLD && SES && PERFIL ? `<div class="us">👤 ${e(PERFIL.nome || PERFIL.email || "")} · ${ROLE === "admin" ? "admin" : "operacional"}</div>` : ""}<div class="gd">${rest.map((v) => `<button data-a="tab" data-v="${v}" class="${view === v ? "on" : ""}"><span>${MV_ICO[v]}</span>${MV_NAME[v]}${cnt[v] ? ` (${cnt[v]})` : ""}</button>`).join("")}</div>${CLD && SES && !HOST ? `<a href="#" class="sair" data-a="sair">Sair da conta</a>` : ""}`;
}
/* Informações do VT sempre em CAIXA ALTA: padroniza os VTs já cadastrados (só altera o que tiver minúscula) */
let upFeito = false;
function vtsCaixaAlta() {
  if (upFeito || !S || !Array.isArray(S.vts) || !S.vts.length) return;
  if (typeof PERFIL === "undefined" || !PERFIL || !/^(admin|operacional)$/.test(PERFIL.papel || "")) return;
  let mud = 0;
  const U = (o, k) => {
    if (o && typeof o[k] === "string" && o[k] !== o[k].toUpperCase()) {
      o[k] = o[k].toUpperCase();
      mud++;
      return true;
    }
    return false;
  };
  S.vts.forEach((v) => {
    ["cliente", "pi", "ag", "oc", "tp", "fm"].forEach((k) => U(v, k));
    if (v.ev) U(v.ev, "nome");
  });
  upFeito = true;
  if (mud) save();
}
function render() {
  try {
    vtsCaixaAlta();
  } catch (_) {}
  PEND = false;
  if (view === "pl" && CLD && ROLE !== "admin") view = "d";
  S.col = S.col || {};
  if (eMan()) {
    view = "mt";
    document.body.classList.add("rm");
  } else if (eMoto()) {
    view = "pm";
    moto = motoLogado();
    document.body.classList.add("rm");
  } else {
    document.body.classList.remove("rm");
    if (view === "pm") view = "g"; /* "Perto de mim" é só a tela do motoboy */
  }
  const nfx = fxStat(dia().slice(0, 7));
  {
    const T1 = [
        ["g", "Gestão"],
        ["fp", "Fotos por ponto" + ((n) => (n ? " (" + n + ")" : ""))(fpPend())],
        ["fv", "Fotos validadas"],
        ["r", "Rotas"],
        ["m", "Motoboy"],
        ["k", "Checking (" + ckLista().length + ")"],
        ["c", "Concluídos (" + S.vts.filter(isConc).length + ")"],
      ],
      T2 = [
        ["t", "Manutenção"],
        ...(CLD && ROLE === "admin" ? [["pl", "Verificação de players"]] : []),
        ["x", "Fixos (" + nfx[0] + "/" + nfx[1] + ")"],
        ["i", "Instalação de estáticos" + (inAvisos().length ? " (" + inAvisos().length + ")" : "")],
        ["e", "Estáticos"],
        ["ev", "Eventos (" + evProx().length + ")"],
        ["a", "Admin"],
      ],
      B = (k, n, i, c) =>
        `<button data-a="tab" data-v="${k}" class="${c || ""}${view === k ? " on" : ""}">${i}${n}</button>`;
    $("tabs").innerHTML =
      B("d", "Dashboard", '<i class="d"></i>') +
      B("o", "Gerência e Operação", '<i class="d"></i>') +
      '<div class="grp">Fluxo do VT</div>' +
      T1.map(([k, n], i) => B(k, n, `<i>${i + 1}</i>`, "st" + (i === T1.length - 1 ? " last" : ""))).join(
        "",
      ) +
      '<div class="grp">Apoio</div>' +
      T2.map(([k, n]) => B(k, n, '<i class="d"></i>')).join("");
  }
  try {
    mobNav();
  } catch (_) {}
  $("app").innerHTML =
    {
      d: dashboard,
      o: gerencia,
      g: gestao,
      fp: fotosPonto,
      fv: fotosValidadas,
      r: rotas,
      m: motoboy,
      pm: pertoDeMim,
      t: manut,
      pl: plview,
      x: fixosMes,
      i: instalacao,
      e: estaticos,
      ev: eventos,
      k: ckview,
      c: concl,
      a: admin,
      mt: mtec,
    }[view]() +
    foot() +
    (eMan() ? mtWelcome() : "");
  ckShow();
  if (view === "pl" && !PL.d && !PL.busy && !PL.err) plLoad();
  try {
    fpNotifica();
  } catch (_) {}
}
function keep() {
  const c = $("dc");
  if (c) {
    draft.cliente = c.value;
    const dp = $("dpi");
    if (dp) draft.pi = dp.value;
    const dn = $("dvn");
    if (dn) draft.evn = dn.value;
    const dd = $("dvd");
    if (dd) {
      draft.evd = dd.value;
      draft.evf = $("dvf").value;
    }
    draft.ini = $("di").value;
    draft.fim = $("df").value;
    {
      const q = (k) => {
        const i = $(k);
        return i ? i.value : null;
      };
      const a = q("dag");
      if (a !== null) {
        draft.ag = a;
        draft.oc = q("doc");
        draft.tp = q("dtp");
        draft.fm = q("dfm");
      }
    }
    {
      const o = $("dvok");
      if (o) draft.vok = o.value;
      const fv = $("dfatv");
      if (fv) draft.fatv = fv.value;
    }
    const ff = $("dfif");
    if (ff) {
      draft.fif = ff.checked;
      draft.nf = +$("dnf").value || 2;
      if ($("dnvt")) draft.nvt = +$("dnvt").value || 1;
    }
  }
  const mp = $("mp");
  if (mp) {
    mf.pid = mp.value;
    mf.def = $("md").value;
    const q = $("mm");
    if (q) mf.moto = q.value;
    const z = $("mpz");
    if (z) mf.pz = z.value;
  }
  const ep = $("em_def");
  if (ep) {
    emf.pid = $("em_pid").value;
    emf.def = ep.value;
    emf.prio = $("em_prio").value;
    emf.pz = $("em_pz").value;
    emf.st = $("em_st").value;
    emf.moto = $("em_moto").value;
    emf.vn = $("em_vn").value;
  }
  const fc = $("fcl");
  if (fc) {
    fd.cliente = fc.value;
    fd.vt = $("fvt").value;
  }
  const ee = $("ee");
  if (ee) {
    ef.nome = $("en").value;
    ef.end = ee.value;
    ef.obs = $("eo").value;
    if ($("eesp")) ef.nesp = Math.max(1, Math.min(20, +$("eesp").value || 1));
    const so = $("eoc");
    if (so) ef.oc = so.value;
    const ec = $("ecl");
    if (ec) {
      ef.cl = ec.value;
      ef.pi = $("epi").value;
      ef.ini = $("eini").value;
      ef.fim = $("efim").value;
    }
  }
  const eb = $("eb");
  if (eb) ef.bulk = eb.value;
}
const sumT = (ts) => {
  const c = (s) => ts.filter((t) => t.status === s).length;
  return `<div class="mu">${c("pendente")} pendentes · ${c("feita")} a validar · ${c("refazer")} refazer · ${c("validada")} validadas</div>`;
};
const txtVT = (c, ids) => {
  const s = new Set(ids);
  return (
    (c.trim() || "(cliente)") +
    "\n" +
    ALL()
      .filter((p) => s.has(p.id))
      .map((p, i) => i + 1 + ". " + qs(p))
      .join("\n")
  );
};
const tg = (s, v) => (s.has(v) ? s.delete(v) : s.add(v)),
  selReg = (s, r) =>
    ALL()
      .filter((p) => rg(p) === r)
      .forEach((p) => s.add(p.id));
function ask4(msg) {
  return new Promise((ok) => {
    const code = String(Math.floor(Math.random() * 10000)).padStart(4, "0"),
      o = document.createElement("div");
    o.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,60,.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit";
    o.innerHTML =
      '<div style="background:#fff;color:#1E2140;border-radius:18px;max-width:420px;width:100%;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.35)"><div style="font-weight:700;font-size:18px;color:#1B1F7A;margin-bottom:6px">Confirmar exclusão</div><div id="a4m" style="font-size:14px;color:#6B7090;margin-bottom:14px"></div><div style="font-size:13px;color:#6B7090;text-align:center">Digite os 4 números abaixo para confirmar</div><div style="font-size:36px;font-weight:800;letter-spacing:12px;color:#F5457F;text-align:center;margin:6px 0 10px;user-select:none;padding-left:12px">' +
      code +
      '</div><input id="a4i" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="____" style="width:100%;box-sizing:border-box;font-size:22px;text-align:center;letter-spacing:8px;padding:10px;border:2px solid #E3E5F5;border-radius:12px;color:#1E2140;background:#fff"><div id="a4e" style="color:#C0194F;font-size:13px;min-height:18px;margin-top:6px;text-align:center"></div><div style="display:flex;gap:10px;margin-top:6px"><button id="a4c" style="flex:1;padding:12px;border-radius:12px;border:0;background:#EEF0FA;color:#1B1F7A;font-weight:700;cursor:pointer;font-size:14px">Cancelar</button><button id="a4o" style="flex:1;padding:12px;border-radius:12px;border:0;background:#F5457F;color:#fff;font-weight:700;cursor:pointer;font-size:14px">Excluir</button></div></div>';
    document.body.appendChild(o);
    o.querySelector("#a4m").textContent = msg;
    const i = o.querySelector("#a4i"),
      er = o.querySelector("#a4e");
    const fim = (r) => {
      o.remove();
      document.removeEventListener("keydown", kd, true);
      ok(r);
    };
    const go = () => {
      if (i.value === code) fim(true);
      else {
        er.textContent = "Números não conferem. Tente de novo.";
        i.value = "";
        i.focus();
      }
    };
    const kd = (ev) => {
      if (ev.key === "Escape") {
        ev.stopPropagation();
        fim(false);
      } else if (ev.key === "Enter" && o.contains(document.activeElement)) {
        ev.stopPropagation();
        go();
      }
    };
    document.addEventListener("keydown", kd, true);
    i.oninput = () => {
      i.value = i.value.replace(/\D/g, "").slice(0, 4);
      er.textContent = "";
    };
    o.querySelector("#a4c").onclick = () => fim(false);
    o.querySelector("#a4o").onclick = go;
    o.onclick = (ev) => {
      if (ev.target === o) fim(false);
    };
    setTimeout(() => i.focus(), 30);
  });
}
document.addEventListener("click", async (ev) => {
  const el = ev.target.closest("[data-a]");
  if (!el) return;
  const a = el.dataset.a,
    v = el.dataset.v;
  if (/^(mt|base|moto|msel|pmsim|pi|x_\w+)$/.test(a)) return;
  if (el.tagName === "A") ev.preventDefault();
  keep();
  if (eMan() && !MAN_OK.has(a)) {
    return;
  }
  if (eMoto() && !MOTO_OK.has(a)) return;
  if (CLD && !eAdm() && ADMIN_ONLY.has(a)) {
    $("warn").innerHTML =
      '<div class="warn">Só o administrador pode alterar ou apagar pontos e configurações.</div>';
    return;
  }
  if (a === "ccrun") {
    ccRodar();
    return;
  }
  if (a === "cccola") {
    CC.cola = v || null;
    ccPinta();
    const i = $("ccll");
    if (i) i.focus();
    return;
  }
  if (a === "ccset" || a === "ccfix" || a === "ccok") {
    const p = ccPts().find((x) => x.id === v),
      r = CC.res[v];
    if (!p) return;
    if (a === "ccset") {
      const ll = ccParse(($("ccll") || {}).value);
      if (!ll) {
        $("warn").innerHTML = '<div class="warn">Não achei coordenadas nesse texto. Cole o link do Google Maps do lugar (com o alfinete) ou algo como -19.93, -43.98.</div>';
        return;
      }
      p.ll = ll;
    } else if (a === "ccfix" && r && r.g && r.g.ll) p.ll = r.g.ll;
    p.llOk = p.ll ? p.ll.join(",") : "";
    delete CC.res[v];
    CC.cola = null;
    $("warn").innerHTML = "";
    save();
    render();
    return;
  }
  if (a === "pmmodo") {
    PM.modo = v;
    try {
      localStorage.setItem("pm_modo", PM.modo);
    } catch (_) {}
    render();
    return;
  }
  if (a === "fvaba") {
    fvAba = v;
    render();
    return;
  }
  if (a === "wbrec") {
    WB.err = "";
    wbCarregar();
    render();
    return;
  }
  if (a === "wbmais") {
    wbN += 200;
    wbPinta();
    return;
  }
  if (a === "wbxls") {
    wbExcel();
    return;
  }
  if (a === "fvper") {
    fvP = v;
    fvN = 150;
    render();
    return;
  }
  if (a === "fvxls") {
    fvExcel();
    return;
  }
  if (a === "fvmais") {
    fvN += 150;
    fvPinta();
    return;
  }
  if (a === "fptx") {
    const t = $("fptoast");
    if (t) t.remove();
    fpVisto = Math.max(fpVisto, ...fpParaValidar().map((g) => g.ts));
    fpPVisto = Math.max(fpPVisto, ...fpProblemas().map((t) => t.f.probTs || 0));
    try {
      localStorage.setItem("fp_pvisto", String(fpPVisto));
    } catch (_) {}
    try {
      localStorage.setItem("fp_visto", String(fpVisto));
    } catch (_) {}
    return;
  }
  if (a === "fpvall") {
    /* valida de uma vez todas as fotos "feitas" daquele ponto */
    tasks(true)
      .filter((t) => t.p.id === v && t.status === "feita")
      .forEach((t) => setF(t.key, { status: "validada", vts: Date.now() }));
    render();
    return;
  }
  if (a === "pmfez" || a === "pmfez1") {
    /* "Fiz todas" (ponto inteiro) ou "✓ Fiz" (um cliente) */
    const L = tasks(true).filter(
      (t) =>
        (a === "pmfez" ? t.p.id === v : t.key === v) &&
        vig(t.vt) &&
        !(t.vt.man && t.vt.conc) &&
        (t.status === "pendente" || t.status === "refazer") &&
        !(S.fotos[t.key] || {}).prob,
    );
    pmMarcar(L);
    render();
    return;
  }
  if (a === "pmdesf") {
    pmDesfazer([v]);
    PM.toast = null;
    render();
    return;
  }
  if (a === "pmundo") {
    const u = PM.toast && PM.toast.undo;
    if (u && u.tipo === "fez") pmDesfazer(u.keys);
    if (u && u.tipo === "prob") setF(u.key, { prob: "", probTxt: "", probBy: "", probTs: 0 });
    PM.toast = null;
    render();
    return;
  }
  if (a === "pmprob") {
    PM.sheet = v;
    PM.motivo = "video";
    PM.probTxt = "";
    pmPinta();
    return;
  }
  if (a === "pmmot") {
    const tx = $("pmtx");
    if (tx) PM.probTxt = tx.value;
    PM.motivo = v;
    pmPinta();
    return;
  }
  if (a === "pmprobc") {
    PM.sheet = null;
    pmPinta();
    return;
  }
  if (a === "pmprobok") {
    const tx = $("pmtx"),
      k = PM.sheet;
    if (k) {
      setF(k, { prob: PM.motivo || "outro", probTxt: tx ? tx.value.trim().slice(0, 300) : "", probBy: moto || "", probTs: Date.now() });
      PM.toast = { txt: "⚠ Problema enviado ao escritório", cor: "pb", undo: { tipo: "prob", key: k }, ts: Date.now() };
      clearTimeout(PM.tt);
      PM.tt = setTimeout(pmPinta, 8100);
    }
    PM.sheet = null;
    render();
    return;
  }
  if (a === "pmprobx") {
    setF(v, { prob: "", probTxt: "", probBy: "", probTs: 0 });
    render();
    return;
  }
  if (a === "fpprobok") {
    /* escritório: problema resolvido, a foto volta a ficar pendente para o motoboy */
    setF(v, { prob: "", probTxt: "", probBy: "", probTs: 0, probOk: Date.now() });
    render();
    return;
  }
  if (a === "fpprobman") {
    /* escritório: abre manutenção já preenchida com o problema relatado */
    const f = S.fotos[v] || {},
      t = tasks(true).find((x) => x.key === v);
    if (t) {
      mf.pid = t.p.id;
      mf.def = "Relatado por " + (f.probBy || "motoboy") + " (" + t.vt.cliente + "): " + pmProbTxt(f.prob) + (f.probTxt ? " — " + f.probTxt : "");
      view = "t";
      render();
      window.scrollTo(0, 0);
    }
    return;
  }
  if (a === "fpst") {
    fpOpen = fpOpen === v ? null : v;
    fpFixo = fpOpen ? v.split("__")[1] : null;
    refazerOpen = null;
    const l = $("fpl");
    if (l) l.innerHTML = fpList();
    return;
  }
  if (view === "fp" && /^(ok|qundo|rfok)$/.test(a)) {
    fpOpen = null;
    fpFixo = null;
  }
  if (a === "fpf") {
    fpOpen = null;
    fpFixo = null;
    fpF = v;
    const l = $("fpl");
    if (l) l.innerHTML = fpList();
    return;
  }
  if (a === "tab") {
    view = v;
    RT.info = "";
  } else if (a === "new") {
    if (draft.open && draft.edit) {
      const rt = draft.ret;
      draft = novoDraft();
      if (rt) view = rt;
    } else {
      draft.open = !draft.open;
      draft.ret = "";
    }
  } else if (a === "gxls") {
    baixarPlan();
    return;
  } else if (a === "gof") gof = v;
  else if (a === "dnew") {
    view = "g";
    draft.open = true;
    draft.ret = "";
    scrollTo(0, 0);
  } else if (a === "dvrota") {
    const x = S.vts.find((q) => q.id === v);
    if (x) {
      RT.sel = new Set(
        (x.paineis || []).filter(
          (i) =>
            PMf(i) &&
            ["pendente", "refazer"].includes(
              (S.fotos[x.id + "__" + i] || { status: "pendente" }).status || "pendente",
            ),
        ),
      );
      RT.info = "Rota montada com os endereços sem foto de " + x.cliente + ".";
      view = "r";
      scrollTo(0, 0);
    }
  } else if (a === "vok") {
    const x = S.vts.find((q) => q.id === v);
    if (x) {
      x.vok = x.vok === "sim" ? "nao" : x.vok === "nao" ? "" : "sim";
      save();
    }
  } else if (a === "dvx") {
    S.col["dx|" + v] = !S.col["dx|" + v];
    const el = ev.target.closest(".dv");
    if (el) el.classList.toggle("ab", !!S.col["dx|" + v]);
    return;
  } else if (a === "vokp") {
    const k = v.indexOf("|"),
      id = v.slice(0, k),
      pid = v.slice(k + 1),
      x = S.vts.find((q) => q.id === id);
    if (x) {
      const cur = vpSt(x, pid);
      x.vokp = { ...(x.vokp || {}) };
      x.vokp[pid] = cur === "sim" ? "nao" : cur === "nao" ? "" : "sim";
      /* o status geral do VT acompanha os endereços */
      const st = vIds(x).map((i) => x.vokp[i] || "");
      x.vok = st.includes("nao") ? "nao" : st.every((q) => q === "sim") ? "sim" : "";
      x.u = Date.now();
      save();
    }
  } else if (a === "vted") {
    const x = S.vts.find((q) => q.id === v);
    if (x) {
      draft = {
        tipo: x.tipo === "evento" ? "evento" : "pi",
        evn: (x.ev && x.ev.nome) || "",
        evd: (x.ev && x.ev.dt) || "",
        evf: (x.ev && x.ev.dtf) || "",
        cliente: x.cliente,
        pi: x.pi || "",
        ini: x.ini || "",
        fim: x.fim || "",
        sel: new Set(x.paineis),
        open: true,
        edit: x.id,
        orig: [...x.paineis],
        fif: !!x.fif,
        nf: x.nf || 2,
        nvt: x.nvt || 1,
        ret: view !== "g" ? view : "",
        ag: x.ag || "",
        oc: x.oc || "",
        tp: x.tp || "",
        fm: x.fm || "",
        vok: x.vok || "",
        fatv: x.nfat ? "nao" : "sim",
      };
      view = "g";
      scrollTo(0, 0);
    }
  } else if (a === "cnew") {
    const o = new Set(draft.orig),
      tx = txtVT(
        draft.cliente,
        [...draft.sel].filter((i) => !o.has(i)),
      );
    try {
      await navigator.clipboard.writeText(tx);
      el.textContent = "Copiado!";
    } catch (_) {
      el.textContent = "Não foi possível copiar";
    }
    return;
  } else if (a === "vtipo") draft.tipo = v === "evento" ? "evento" : "pi";
  else if (a === "evnew") {
    draft = novoDraft();
    draft.open = true;
    draft.tipo = "evento";
    draft.ret = "ev";
    view = "g";
    scrollTo(0, 0);
  } else if (a === "evcopy") {
    try {
      await navigator.clipboard.writeText(evTxt());
      el.textContent = "Copiado!";
    } catch (_) {
      el.textContent = "Não foi possível copiar";
    }
    return;
  } else if (a === "evcsv") {
    baixar("eventos-vt-" + new Date().toISOString().slice(0, 10) + ".csv", evCsv());
    return;
  } else if (a === "dp") tg(draft.sel, v);
  else if (a === "dreg") selReg(draft.sel, v);
  else if (a === "rp") tg(RT.sel, v);
  else if (a === "rreg") selReg(RT.sel, v);
  else if (a === "rclr") {
    RT.sel.clear();
    RT.info = "";
  } else if (a === "rpend" || a === "gp") {
    const pe = tasks().filter((t) => t.status === "pendente" || t.status === "refazer"),
      ok = pe.filter((t) => vig(t.vt));
    RT.sel = new Set(ok.map((t) => t.p.id));
    RT.info = !ok.length
      ? "Nenhuma pendência em VT vigente hoje."
      : pe.length > ok.length
        ? pe.length -
          ok.length +
          " pendência(s) de VT fora do período (vencido ou ainda não iniciado) ficaram de fora."
        : "";
    if (a === "gp") view = "r";
  } else if (a === "save") {
    if (!draft.cliente.trim() || !draft.sel.size) {
      $("warn").innerHTML = '<div class="warn">Informe o cliente e escolha ao menos um painel.</div>';
      return;
    }
    const isEv = draft.tipo === "evento";
    if (!draft.fatv) {
      $("warn").innerHTML = '<div class="warn">Diga se é faturável (Sim ou Não) antes de salvar.</div>';
      return;
    }
    if (isEv && !draft.evd) {
      $("warn").innerHTML = '<div class="warn">Informe a data do evento.</div>';
      return;
    }
    if (isEv && draft.evf && draft.evf < draft.evd) {
      $("warn").innerHTML = '<div class="warn">O fim do evento é anterior à data de início.</div>';
      return;
    }
    $("warn").innerHTML = "";
    const U = (x) => String(x || "").trim().toUpperCase();
    const d = {
        cliente: U(draft.cliente),
        tipo: isEv ? "evento" : "pi",
        ev: isEv
          ? {
              nome: U(draft.evn),
              dt: draft.evd,
              dtf: draft.evf && draft.evf !== draft.evd ? draft.evf : "",
            }
          : null,
        pi: U(draft.pi),
        ini: draft.ini,
        fim: draft.fim,
        paineis: [...draft.sel],
        fif: !!draft.fif,
        nf: draft.nf || 2,
        nvt: draft.nvt || 1,
        ag: U(draft.ag),
        oc: U(draft.oc),
        tp: U(draft.tp),
        fm: U(draft.fm),
        vok: draft.vok || "",
        nfat: draft.fatv === "nao",
      },
      x = draft.edit && S.vts.find((q) => q.id === draft.edit);
    {
      const rm = x ? draft.orig.filter((i) => !draft.sel.has(i)) : [];
      if (
        rm.length &&
        !(await ask4(
          "Remover " + rm.length + " painel(is) deste VT? As fotos e o status deles serão apagados.",
        ))
      )
        return;
    }
    if (x) {
      draft.orig.filter((i) => !draft.sel.has(i)).forEach((i) => delete S.fotos[x.id + "__" + i]);
      Object.assign(x, d);
      if ([...draft.sel].some((i) => !draft.orig.includes(i))) {
        x.aberto = false;
        x.man = false;
        x.conc = 0;
      }
    } else S.vts.unshift({ id: "v" + Date.now(), ...d });
    const rt = draft.ret;
    draft = novoDraft();
    if (rt) view = rt;
    save();
  } else if (a === "venc") {
    const x = S.vts.find((q) => q.id === v);
    if (x) {
      x.man = true;
      x.conc = Date.now();
      x.aberto = false;
      save();
    }
  } else if (a === "vreab") {
    const x = S.vts.find((q) => q.id === v);
    if (x) {
      x.man = false;
      x.conc = 0;
      x.aberto = true;
      save();
    }
  } else if (a === "vnfat") {
    const x = S.vts.find((q) => q.id === v);
    if (x) {
      x.nfat = !x.nfat;
      save();
    }
  } else if (a === "vchk") {
    const x = S.vts.find((q) => q.id === v);
    if (x) {
      x.chk = !x.chk;
      x.chkd = x.chk ? dia() : "";
      x.chka = 0;
      save();
    }
  } else if (a === "evc") {
    const x = S.vts.find((q) => q.id === v);
    if (x && x.chk) {
      x.evc = dia();
      save();
    }
  } else if (a === "evcu") {
    const x = S.vts.find((q) => q.id === v);
    if (x) {
      x.evc = "";
      save();
    }
  } else if (a === "vfat") {
    const x = S.vts.find((q) => q.id === v);
    if (x) {
      x.fat = !x.fat;
      if (x.fat && !x.fdt) x.fdt = dia();
      save();
    }
  } else if (a === "vdel") {
    if (!(await ask4("Excluir este VT e as fotos dele?"))) return;
    const x = S.vts.find((q) => q.id === v);
    if (x) (x.paineis || []).forEach((i) => delete S.fotos[x.id + "__" + i]);
    S.vts = S.vts.filter((q) => q.id !== v);
    confRem = null;
    save();
  } else if (a === "fslot") {
    const [k, ph, i] = v.split("|"),
      f = S.fotos[k] || {},
      fl = ph === "i" ? "fi" : "ff",
      c = f[fl] || 0,
      n = +i;
    setF(k, { [fl]: c > n ? n : n + 1 });
  } else if (a === "mprio") mf.prio = v;
  else if (a === "med") {
    const m = S.manut.find((q) => q.id === v);
    if (m) {
      editM = v;
      emf = {
        pid: m.pid,
        def: m.def,
        prio: m.prio || "",
        pz: toDL(m.pz),
        st: m.status,
        moto: m.moto || MOTOS[0],
        vn: m.vnota || "",
      };
    }
  } else if (a === "mcaned") editM = null;
  else if (a === "msaveed") {
    const m = S.manut.find((q) => q.id === v);
    if (!m) return;
    if (!emf.pid || !emf.def.trim()) {
      $("warn").innerHTML = '<div class="warn">Selecione o endereço e descreva o defeito.</div>';
      return;
    }
    $("warn").innerHTML = "";
    const now = Date.now(),
      pr = S.prio.find((p) => p.id === emf.prio);
    let pz = fromDL(emf.pz);
    if (!pz && pr) pz = now + pr.h * 36e5;
    const d = {
      pid: emf.pid,
      def: emf.def.trim(),
      prio: pr ? pr.id : "",
      pz,
      status: emf.st,
      vnota: emf.vn.trim(),
    };
    if (emf.st === "moto") {
      d.resp = "moto";
      d.moto = MOTOS.includes(emf.moto) ? emf.moto : MOTOS[0];
    }
    d.rts = emf.st === "resolvida" ? (m.status === "resolvida" && m.rts ? m.rts : now) : 0;
    Object.assign(m, d);
    editM = null;
    save();
  } else if (a === "eadd") {
    const end = ef.end.trim(),
      er = estErr();
    if (!end || er) {
      $("warn").innerHTML = '<div class="warn">' + (!end ? "Informe o endereço." : er) + "</div>";
      return;
    }
    $("warn").innerHTML = "";
    const d = { nome: ef.nome.trim(), end, obs: ef.obs.trim(), ...estOcD() },
      x = eed && S.est.find((q) => q.id === eed);
    if (!x || !x.pai) d.nesp = ef.nesp || 1; /* nº de espaços fica no ponto principal */
    if (x) Object.assign(x, d);
    else S.est.push({ id: "e" + Date.now() + S.n++, ...d });
    eed = null;
    ef = { ...efv(), bulk: ef.bulk };
    save();
  } else if (a === "ebulk") {
    const L = ef.bulk
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!L.length) return;
    const er = estErr();
    if (er) {
      $("warn").innerHTML = '<div class="warn">' + er + "</div>";
      return;
    }
    $("warn").innerHTML = "";
    L.forEach((end) => S.est.push({ id: "e" + Date.now() + S.n++, nome: "", end, obs: "", ...estOcD() }));
    ef.bulk = "";
    save();
  } else if (a === "eed") {
    const x = S.est.find((q) => q.id === v);
    if (x) {
      eed = v;
      ef = {
        nome: x.nome || "",
        end: x.end || "",
        obs: x.obs || "",
        bulk: "",
        oc: x.oc || "",
        cl: x.cl || "",
        pi: x.pi || "",
        ini: x.ini || "",
        fim: x.fim || "",
        nesp: x.nesp || 1,
      };
      scrollTo(0, 0);
    }
  } else if (a === "ecan2") {
    eed = null;
    ef = efv();
  } else if (a === "efl") efl = v;
  else if (a === "cfl") cfl = v;
  else if (a === "ctab") {
    ctab = v;
    cfl = "todos";
  } else if (a === "fxm") fxm = v === "0" ? dia().slice(0, 7) : mesMv(fxm, +v);
  else if (a === "fxf") fxf = v;
  else if (a === "fxt") {
    const [cid, pid] = v.split("|"),
      c = S.cfix.find((q) => q.id === cid);
    if (c) {
      const f = { ...(c.fm || {}) },
        m = { ...(f[fxm] || {}) };
      if (m[pid]) delete m[pid];
      else m[pid] = Date.now();
      f[fxm] = m;
      c.fm = f;
      save();
    }
  } else if (a === "fxall") {
    const c = S.cfix.find((q) => q.id === v);
    if (c) {
      const f = { ...(c.fm || {}) },
        m = { ...(f[fxm] || {}) },
        now = Date.now();
      fIds(c).forEach((i) => {
        if (!m[i]) m[i] = now;
      });
      f[fxm] = m;
      c.fm = f;
      save();
    }
  } else if (a === "fdnew") {
    fd = fd.open ? fdv() : { ...fdv(), open: true };
  } else if (a === "fxp") tg(fd.sel, v);
  else if (a === "fxreg") selReg(fd.sel, v);
  else if (a === "fdsave") {
    if (!fd.cliente.trim() || !fd.sel.size) {
      $("warn").innerHTML = '<div class="warn">Informe o cliente e escolha ao menos um ponto.</div>';
      return;
    }
    $("warn").innerHTML = "";
    const d = { cliente: fd.cliente.trim(), vt: fd.vt.trim(), paineis: [...fd.sel] },
      x = fd.edit && S.cfix.find((q) => q.id === fd.edit);
    if (x) {
      const f = { ...(x.fm || {}) };
      Object.keys(f).forEach((k) => {
        const m = { ...f[k] };
        Object.keys(m).forEach((i) => {
          if (!fd.sel.has(i)) delete m[i];
        });
        f[k] = m;
      });
      Object.assign(x, d, { fm: f });
    } else S.cfix.unshift({ id: "f" + Date.now() + S.n++, ...d, fm: {} });
    fd = fdv();
    save();
  } else if (a === "fded") {
    const x = S.cfix.find((q) => q.id === v);
    if (x) {
      fd = {
        open: true,
        edit: x.id,
        cliente: x.cliente || "",
        vt: x.vt || "",
        sel: new Set(x.paineis || []),
      };
      scrollTo(0, 0);
    }
  } else if (a === "fdel") {
    if (!(await ask4("Excluir este cliente fixo?"))) return;
    S.cfix = S.cfix.filter((q) => q.id !== v);
    confRem = null;
    save();
  } else if (a === "erem") {
    const nf = S.est.filter((q) => q.pai === v).length;
    if (!(await ask4("Excluir este ponto estático" + (nf ? " e os outros " + nf + " espaços dele" : "") + "?"))) return;
    S.est = S.est.filter((q) => q.id !== v && q.pai !== v);
    confRem = null;
    save();
  } else if (a === "padd") {
    S.prio.push({ id: "q" + Date.now() + S.n++, nome: "Nova prioridade", h: 72 });
    S.pu = Date.now();
    save();
  } else if (a === "prem") {
    if (!(await ask4("Excluir esta prioridade?"))) return;
    S.prio = S.prio.filter((p) => p.id !== v);
    S.pu = Date.now();
    confRem = null;
    save();
  } else if (a === "pmv") {
    const [id, d] = v.split("|"),
      i = S.prio.findIndex((p) => p.id === id),
      j = i + +d;
    if (i >= 0 && j >= 0 && j < S.prio.length) {
      [S.prio[i], S.prio[j]] = [S.prio[j], S.prio[i]];
      S.pu = Date.now();
      save();
    }
  } else if (a === "feita" || a === "ok") {
    const t = tasks(true).find((x) => x.key === v),
      fi = t && fotoInfo(t);
    if (fi && !fi.ok) {
      $("warn").innerHTML =
        '<div class="warn">' +
        e(t.p.nome) +
        ": faltam fotos para finalizar (este cliente exige início e fim). Início " +
        fi.i +
        "/" +
        fi.n +
        " · Fim " +
        fi.f +
        "/" +
        fi.n +
        ".</div>";
      return;
    }
    $("warn").innerHTML = "";
    setF(v, a === "feita" ? { status: "feita", nota: "", by: moto, fts: Date.now() } : { status: "validada", vts: Date.now() });
  } else if (a === "rf") refazerOpen = v;
  else if (a === "rfok") {
    const n = $("rfn").value;
    refazerOpen = null;
    setF(v, { status: "refazer", nota: n, by: "" });
  } else if (a === "qf") {
    const [k, m] = v.split("|"),
      t = tasks(true).find((x) => x.key === k),
      fi = t && fotoInfo(t);
    if (fi && !fi.ok) {
      $("warn").innerHTML =
        '<div class="warn">' +
        e(t.p.nome) +
        ": este cliente exige fotos de início e fim. Marque os campos Início/Fim na linha do painel primeiro (" +
        fi.i +
        "/" +
        fi.n +
        " · " +
        fi.f +
        "/" +
        fi.n +
        ").</div>";
      return;
    }
    $("warn").innerHTML = "";
    setF(k, { status: "feita", nota: "", by: m, fts: Date.now() });
  } else if (a === "qwho") {
    const [k, m] = v.split("|");
    setF(k, { by: m });
  } else if (a === "qundo") {
    setF(v, { status: "pendente", by: "", nota: "" });
  } else if (a === "gen") gerar();
  else if (a === "add") {
    const n = $("an").value.trim();
    if (!n) return;
    const d = {
        nome: n,
        end: $("ae").value.trim(),
        reg: $("ar").value.trim() || "Outros",
        ll: ccParse($("al").value),
        tp: ($("at") ? $("at").value : "").trim(),
        fm: ($("af") ? $("af").value : "").trim(),
        pl: ($("apl") ? $("apl").value : "").trim(),
        telas: parseTelas($("atl") ? $("atl").value : ""),
      },
      x = editId && S[v].find((p) => p.id === editId);
    if (x) Object.assign(x, d);
    else {
      const p = { id: "x" + Date.now() + S.n++, ...d };
      if (v === "vars") p.v = true;
      S[v].push(p);
    }
    editId = null;
    save();
  } else if (a === "ed") editId = v;
  else if (a === "ecan") editId = null;
  else if (a === "sub") {
    adm = v;
    editId = null;
  } else if (a === "csv") {
    baixar("clientes-vt-" + new Date().toISOString().slice(0, 10) + ".csv", csv());
    return;
  } else if (a === "mnames") {
    const nn = [$("m0").value.trim() || MOTOS[0], $("m1").value.trim() || MOTOS[1]],
      mp = {};
    MOTOS.forEach((o, i) => (mp[o] = nn[i]));
    Object.values(S.fotos).forEach((q) => {
      if (mp[q.moto]) q.moto = mp[q.moto];
    });
    S.manut.forEach((m) => {
      if (mp[m.moto]) m.moto = mp[m.moto];
    });
    mf.moto = mp[mf.moto] || mf.moto;
    if (S.rota) S.rota.data.forEach((d) => (d.moto = mp[d.moto] || d.moto));
    moto = mp[moto] || nn[0];
    S.motos = nn;
    MOTOS = nn;
    RT.motos = new Set(nn);
    try {
      localStorage.setItem("moto", moto);
    } catch (_) {}
    save();
  } else if (a === "reset") {
    if (
      !(await ask4(
        "APAGAR TODOS os dados (VTs, fotos e pontos cadastrados) e voltar aos 40 painéis iniciais?",
      ))
    )
      return;
    const od = S.del,
      og = S.gu;
    S = seed();
    fixS();
    S.del = od || {};
    S.gu = og || 0;
    S.pu = Date.now();
    S.rota = null;
    RT.sel.clear();
    RT.motos = new Set(MOTOS);
    moto = MOTOS[0];
    confRem = null;
    save();
  } else if (a === "rem") {
    if (!(await ask4("Excluir este ponto cadastrado?"))) return;
    const [t, id] = v.split("|");
    S[t] = S[t].filter((p) => p.id !== id);
    confRem = null;
    RT.sel.delete(id);
    save();
  } else if (a === "copy") {
    const d = S.rota.data[+v],
      st = d.stops.map(PMf).filter(Boolean),
      ls = links(st);
    const tx =
      d.moto +
      " – rota:\n" +
      st
        .map(
          (p, i) =>
            i + 1 + ". " + qs(p) + (cliTxt(p.id).length ? "\n    Clientes: " + cliTxt(p.id).join(", ") : ""),
        )
        .join("\n") +
      "\n\n" +
      ls.join("\n");
    try {
      await navigator.clipboard.writeText(tx);
      el.textContent = "Copiado!";
    } catch (_) {
      el.textContent = "Não foi possível copiar";
    }
    return;
  } else if (a === "cknovo") {
    ckTroca(v);
  } else if (a === "ckpend") {
    const x = S.vts.find((q) => q.id === v);
    ckA.add(v);
    if (x && x.ckPend) ckOpen(v, { ...x.ckPend });
    else ckOpen(v);
  } else if (a === "ckopen") {
    ckA.add(v);
    ckOpen(v);
  } else if (a === "ckadr") {
    ckA.has(v) ? ckA.delete(v) : ckA.add(v);
  } else if (a === "cklist") {
    ck.show = false;
    render();
  } else if (a === "ckback") {
    ck.show = true;
    render();
  } else if (a === "ckclose") {
    if (ck.n > 0 && !confirm("Fechar o checking e descartar as fotos que estão na tela?")) return;
    ckDrop();
    render();
  } else if (a === "ckdone") {
    const x = S.vts.find((q) => q.id === ck.id);
    if (x) {
      ckLimparFotos(ckPayload(x).id);
      if (!x.chk) {
        x.chk = true;
        x.chkd = dia();
        x.chka = 0;
      }
      save();
    }
    ckDrop();
    render();
  } else if (a === "ctxt" || a === "cv") {
    const tx =
      a === "ctxt"
        ? $("txt").value
        : (() => {
            const x = S.vts.find((q) => q.id === v);
            return x ? txtVT(x.cliente, x.paineis) : "";
          })();
    try {
      await navigator.clipboard.writeText(tx);
      el.textContent = "Copiado!";
    } catch (_) {
      el.textContent = "Não foi possível copiar";
      if (a === "ctxt") $("txt").select();
    }
    return;
  } else if (a === "col") {
    S.col[v] = !S.col[v];
    save();
  } else if (a === "colall") {
    S.vts.forEach((x) => (S.col[x.id] = v === "1"));
    save();
  } else if (a === "mresp") mf.resp = v;
  else if (a === "mwsel") mwa = v;
  else if (a === "sair") {
    if (HOST && HOST.sair) {
      /* dentro da casca (motoboy em tela cheia): manda o que falta e sai pela casca */
      await lock(() => cloudCycle(false)).catch(() => {});
      if (CLERR && !(await ask4("Há alterações que não foram enviadas à nuvem. Sair mesmo assim?"))) return;
      HOST.sair();
      return;
    }
    if (CLD && SES) {
      await lock(() => cloudCycle(false)).catch(() => {});
      if (CLERR && !(await ask4("Há alterações que não foram enviadas à nuvem. Sair mesmo assim?"))) return;
      sesFim("", true);
    }
    return;
  } else if (a === "cpushall") {
    CL.known = {};
    CL.kdel = {};
    CL.sent = {};
    clSave();
    await lock(() => cloudCycle(false));
    $("warn").innerHTML = CLERR ? '<div class="warn">' + e(CLERR) + "</div>" : "";
  } else if (a === "usave") {
    const b = { nome: $("un_" + v).value.trim(), papel: $("up_" + v).value, ativo: $("ua_" + v).checked },
      r = await sb("/rest/v1/profiles?id=eq." + v, {
        method: "PATCH",
        body: b,
        h: { Prefer: "return=minimal" },
      });
    if (r.ok) {
      $("warn").innerHTML = "";
      USERS = null;
    } else {
      let m = "";
      try {
        m = (await r.json()).message;
      } catch (_) {}
      $("warn").innerHTML = '<div class="warn">Não foi possível salvar: ' + e(m || r.status) + "</div>";
    }
  } else if (a === "mwcopy") {
    const t = $("mwtxt");
    try {
      await navigator.clipboard.writeText(t ? t.value : "");
      el.textContent = "Copiado!";
    } catch (_) {
      el.textContent = "Não foi possível copiar";
      if (t) t.select();
    }
    return;
  } else if (a === "madd") {
    if (!mf.pid || !mf.def.trim()) {
      $("warn").innerHTML = '<div class="warn">Selecione o endereço e descreva o defeito.</div>';
      return;
    }
    $("warn").innerHTML = "";
    const mo = mf.resp === "moto";
    const pr = S.prio.find((p) => p.id === mf.prio),
      now = Date.now(),
      pz = fromDL(mf.pz) || (pr ? now + pr.h * 36e5 : 0);
    S.manut.unshift({
      id: "m" + now + S.n++,
      pid: mf.pid,
      def: mf.def.trim(),
      prio: pr ? pr.id : "",
      pz,
      resp: mf.resp,
      moto: mo ? (MOTOS.includes(mf.moto) ? mf.moto : MOTOS[0]) : "",
      status: mo ? "moto" : "eld",
      ts: Date.now(),
      vnota: "",
      rts: 0,
    });
    mf = { pid: "", def: "", resp: mf.resp, moto: mf.moto, prio: "", pz: "" };
    save();
  } else if (a === "mvo") mvOpen = v;
  else if (a === "mvneed" || a === "mvok") {
    const m = S.manut.find((q) => q.id === v),
      n = $("mvn").value.trim();
    if (m) {
      m.vnota = n;
      m.vts = Date.now();
      if (a === "mvok") {
        m.status = "resolvida";
        m.rts = Date.now();
        if (!n) m.vnota = "Sem defeito";
      } else m.status = "eld";
    }
    mvOpen = null;
    save();
  } else if (a === "mtw") {
    mtW = false;
    const w = $("mtw");
    if (w) w.remove();
    return;
  } else if (a === "plr") {
    plLoad();
    return;
  } else if (a === "plf") {
    PLF = v;
    plPaint();
    return;
  } else if (a === "plc") {
    PLC = v || "";
    plPaint();
    return;
  } else if (a === "mtf") mtF = v;
  else if (a === "mtg") mtG = v;
  else if (a === "mtat") {
    mset(v, { at: Date.now(), atby: mtUser() });
    return;
  } else if (a === "mtdo") {
    const [i, md] = v.split("|");
    mtO = i;
    mtM = md;
  } else if (a === "mtcx") {
    mtO = null;
    mtM = "";
  } else if (a === "mtcf") {
    const n = ($("mtn") || { value: "" }).value.trim();
    if (mtM === "pend") {
      if (!n) {
        $("warn").innerHTML = '<div class="warn">Escreva o que falta para resolver.</div>';
        return;
      }
      mset(v, { pnota: n, pts: Date.now() });
    } else mset(v, { status: "resolvida", rts: Date.now(), snota: n, rby: mtUser(), pnota: "", pts: 0 });
    mtO = null;
    mtM = "";
    $("warn").innerHTML = "";
  } else if (a === "mtoeld") mset(v, { status: "eld" });
  else if (a === "mdone") {
    mResolvidoAbrir(v, true);
    return;
  } else if (a === "mrby") {
    mResolvidoAbrir(v, false);
    return;
  }
  else if (a === "mreop") mset(v, { status: "eld", rts: 0 });
  else if (a === "mdel") {
    if (!(await ask4("Excluir este chamado de manutenção?"))) return;
    S.manut = S.manut.filter((q) => q.id !== v);
    confRem = null;
    save();
  } else if (a === "mcp") {
    const m = S.manut.find((q) => q.id === v);
    if (!m) return;
    const tx = m.status === "resolvida" ? mConclTxt(m) :
      "🔧 *MANUTENÇÃO – MEGA MÍDIA OOH*\n" +
      pEmo(m.prio) +
      " *" +
      (prN(m.prio) || "Sem prioridade").toUpperCase() +
      "*\n\n" +
      mItemTxt(m, 0);
    try {
      await navigator.clipboard.writeText(tx);
      el.textContent = "Copiado!";
    } catch (_) {
      el.textContent = "Não foi possível copiar";
    }
    return;
  } else if (a === "snaprest") {
    if (!(await ask4("Restaurar esta cópia? Os dados atuais serão substituídos."))) return;
    try {
      const s = snaps()[+v],
        d = migrar(JSON.parse(s.d));
      if (!d) throw 0;
      await bkSafe("antes-de-restaurar");
      aplicar(d);
      BK.hold = false;
    } catch (_) {
      $("warn").innerHTML = '<div class="warn">Não foi possível restaurar esta cópia.</div>';
    }
  } else if (a === "bkpick") {
    try {
      const h = await showDirectoryPicker({ id: "mvtbk", mode: "readwrite" });
      BK.h = h;
      await idbOp((s) => s.put(h, "dir"));
      BK.st = "on";
      BK.err = "";
      BK.hold = false;
      await bkChk();
      if (!BK.hold) await bkNow();
    } catch (x) {
      if (x.name !== "AbortError") {
        BK.st = "err";
        BK.err = x.message || x.name;
      }
    }
    bkBar();
  } else if (a === "bkperm") {
    try {
      if ((await BK.h.requestPermission({ mode: "readwrite" })) === "granted") {
        BK.st = "on";
        BK.err = "";
        await bkChk();
        bkSched();
      }
    } catch (_) {}
    bkBar();
  } else if (a === "bknow") {
    BK.hold = false;
    await bkNow(true);
  } else if (a === "bkskip") {
    BK.hold = false;
    bkBar();
    bkSched();
  } else if (a === "bkoff") {
    try {
      await idbOp((s) => s.delete("dir"));
    } catch (_) {}
    BK.h = null;
    BK.st = "off";
    BK.hold = false;
    BK.files = [];
    bkBar();
  } else if (a === "bklist") {
    BK.files = [];
    try {
      for await (const [k, h] of BK.h.entries())
        if (h.kind === "file" && /\.json$/i.test(k)) {
          const x = await h.getFile();
          BK.files.push({ n: k, t: x.lastModified, s: x.size });
        }
      BK.files.sort((p, q) => q.t - p.t);
    } catch (x) {
      BK.st = "err";
      BK.err = x.message || x.name;
    }
  } else if (a === "bkrest") {
    if (!vazio() && !(await ask4("Restaurar este backup? Os dados atuais serão substituídos."))) return;
    confRem = null;
    try {
      const d = migrar(JSON.parse(await (await (await BK.h.getFileHandle(v)).getFile()).text()));
      if (!d) throw 0;
      await bkSafe("antes-de-restaurar");
      aplicar(d);
      BK.hold = false;
      BK.files = [];
    } catch (_) {
      $("warn").innerHTML = '<div class="warn">Não foi possível restaurar este arquivo.</div>';
    }
    bkBar();
  } else if (a === "exp") {
    baixar("backup-matriz-vt.json", arqStr(S), "application/json");
    return;
  }
  render();
});
document.addEventListener("change", (ev) => {
  if (ev.target && ev.target.id === "wbarq" && ev.target.files && ev.target.files[0]) {
    wbImportar(ev.target.files[0]);
    ev.target.value = "";
  }
});
document.addEventListener("input", (ev) => {
  if (ev.target.id === "pmtx") {
    PM.probTxt = ev.target.value;
    return;
  }
  if (ev.target.id === "wbq") {
    wbQ = ev.target.value;
    wbN = 200;
    wbPinta();
    return;
  }
  if (ev.target.id === "fvq" || ev.target.id === "fvde" || ev.target.id === "fvate") {
    if (ev.target.id === "fvq") fvQ = ev.target.value;
    else if (ev.target.id === "fvde") fvDe = ev.target.value;
    else fvAte = ev.target.value;
    fvN = 150;
    if (fvAba === "wpp") wbPinta();
    else fvPinta();
    return;
  }
  if (ev.target.id === "fpq") {
    fpQ = ev.target.value;
    const l = $("fpl");
    if (l) l.innerHTML = fpList();
    const n = +((l && l.querySelector("#fpn")) || {}).textContent || 0,
      c = $("fpc");
    if (c) c.textContent = n + (n === 1 ? " ponto" : " pontos");
    return;
  }
  if (ev.target.id === "cq") {
    cq = ev.target.value;
    const l = $("cl");
    if (l) l.innerHTML = conclList();
    return;
  }
  if (ev.target.id === "dc") {
    draft.cliente = ev.target.value;
    const x = $("txt");
    if (x) x.value = txtVT(draft.cliente, [...draft.sel]);
  }
});
document.addEventListener("change", (ev) => {
  const el = ev.target;

  if (el.id === "imp") {
    const f = el.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = async () => {
      try {
        const d = migrar(JSON.parse(r.result));
        if (!d) throw 0;
        await bkSafe("antes-de-importar");
        aplicar(d);
        $("warn").innerHTML = "";
        render();
      } catch (_) {
        $("warn").innerHTML = '<div class="warn">Arquivo de backup inválido.</div>';
      }
    };
    r.readAsText(f);
    el.value = "";
    return;
  }
  const a = el.dataset.a;
  if (a && a.startsWith("x_")) {
    xchg(el, a);
    return;
  }
  if (a === "moto") {
    setF(el.dataset.v, { moto: el.value });
    render();
  } else if (a === "pmsim") {
    PM.sim = el.value;
    render();
  } else if (a === "msel") {
    moto = el.value;
    try {
      localStorage.setItem("moto", moto);
    } catch (_) {}
    render();
  } else if (a === "mt") {
    el.checked ? RT.motos.add(el.dataset.v) : RT.motos.delete(el.dataset.v);
  } else if (a === "pi") {
    const x = S.vts.find((q) => q.id === el.dataset.v);
    if (x) {
      x.pi = el.value.trim();
      save();
    }
  } else if (a === "base") {
    S.base.end = $("bse").value.trim();
    S.base.ll = parseLL($("bsl").value);
    save();
  }
});
