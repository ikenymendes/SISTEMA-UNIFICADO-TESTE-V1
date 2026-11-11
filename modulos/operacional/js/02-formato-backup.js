/* =====================================================================
   Módulo operacional · Formato do arquivo de backup (organizado e legível) e migração de versões
   (arquivo 2 de 13; carregados em ordem pelo index.html)
   ===================================================================== */

/* ===== Formato do arquivo de backup (organizado, legível e pronto para migrar para banco de dados) ===== */
const MP_PONTO = {
    end: "endereco",
    reg: "regiao",
    ll: "coordenadas",
    v: "variavel",
    tp: "tipo",
    fm: "formato",
    pl: "players",
    u: "atualizado_em",
  },
  MP_VT = {
    cliente: "cliente",
    pi: "numero_pi",
    oc: "ordem_compra",
    ag: "agencia",
    ini: "inicio",
    fim: "fim",
    tp: "tipo_painel",
    fm: "formato",
    ev: "evento",
    fif: "fotos_inicio_fim",
    nf: "fotos_por_endereco",
    man: "conclusao_manual",
    conc: "concluido_em",
    aberto: "reaberto",
    chk: "checking_feito",
    chkd: "checking_data",
    chka: "checking_automatico",
    vok: "vt_correto",
    vokp: "vt_por_endereco",
    fat: "faturado",
    nfat: "nao_faturavel",
    fdt: "faturamento_data",
    nfn: "nota_fiscal",
    evc: "evento_concluido_em",
    u: "atualizado_em",
  },
  MP_EV = { dt: "data", dtf: "data_fim" },
  MP_FT = {
    moto: "motoboy",
    ts: "registrado_em",
    fi: "foto_inicio",
    ff: "foto_fim",
    nota: "observacao",
    by: "feito_por",
    u: "atualizado_em",
  },
  MP_MN = {
    pid: "ponto_id",
    def: "defeito",
    prio: "prioridade",
    pz: "prazo",
    resp: "responsavel",
    moto: "motoboy",
    ts: "aberta_em",
    vnota: "nota_verificacao",
    rts: "resolvida_em",
    vts: "verificada_em",
    at: "atendimento_em",
    atby: "atendimento_por",
    snota: "nota_solucao",
    rby: "resolvida_por",
    pnota: "nota_pendencia",
    pts: "pendencia_em",
    u: "atualizado_em",
  };
const rmap = (o, mp, inv) => {
  if (!o || typeof o !== "object" || Array.isArray(o)) return o;
  const mm = inv ? Object.fromEntries(Object.entries(mp).map(([a, b]) => [b, a])) : mp,
    r = {};
  for (const k in o) r[mm[k] || k] = o[k];
  return r;
};
const ARQ_LEGENDA = {
  campanhas_vt:
    "Uma campanha (PI) ou evento. 'paineis' = ids dos pontos usados. Datas no formato AAAA-MM-DD. 'atualizado_em' = milissegundos (controle de sincronização).",
  fotos:
    "Registro de foto por campanha + ponto (vt_id + painel_id). status: pendente, feita, validada, refazer.",
  pontos: "Endereços de mídia. 'fixos' = cadastro base; 'variaveis' = pontos criados para campanhas.",
  exclusoes: "Registros apagados (usado na sincronização entre computadores).",
};
function arq(S) {
  const ft = Object.entries(S.fotos || {}).map(([k, v]) => {
    const i = k.indexOf("__");
    return { vt_id: k.slice(0, i), painel_id: k.slice(i + 2), ...rmap(v, MP_FT) };
  });
  return {
    _sistema: "Matriz VT · Mega Mídia OOH",
    _formato: "matriz-vt",
    _versao: 2,
    _gerado_em: new Date().toISOString(),
    _legenda: ARQ_LEGENDA,
    configuracoes: {
      base: { endereco: (S.base || {}).end || "", coordenadas: (S.base || {}).ll || null },
      motoboys: S.motos,
      prioridades_manutencao: (S.prio || []).map((p) => ({ id: p.id, nome: p.nome, horas: p.h })),
      rota_atual: S.rota || null,
    },
    controle: {
      contador: S.n || 1,
      configuracoes_atualizadas_em: S.gu || 0,
      prioridades_atualizadas_em: S.pu || 0,
    },
    pontos: {
      fixos: (S.fixos || []).map((p) => rmap(p, MP_PONTO)),
      variaveis: (S.vars || []).map((p) => rmap(p, MP_PONTO)),
    },
    campanhas_vt: (S.vts || []).map((v) => {
      const r = rmap(v, MP_VT);
      if (r.evento) r.evento = rmap(r.evento, MP_EV);
      return r;
    }),
    fotos: ft,
    manutencoes: (S.manut || []).map((x) => rmap(x, MP_MN)),
    estaticos: S.est || [],
    circuitos_fixos: S.cfix || [],
    exclusoes: Object.entries(S.del || {}).map(([chave, em]) => ({ chave, em })),
  };
}
function deArq(d) {
  if (!d || d._formato !== "matriz-vt") return d;
  const c = d.configuracoes || {},
    ct = d.controle || {},
    P = (a) => (a || []).map((p) => rmap(p, MP_PONTO, 1)),
    f = {};
  (d.fotos || []).forEach((x) => {
    const { vt_id, painel_id, ...r } = x;
    f[vt_id + "__" + painel_id] = rmap(r, MP_FT, 1);
  });
  return {
    fixos: P((d.pontos || {}).fixos),
    vars: P((d.pontos || {}).variaveis),
    vts: (d.campanhas_vt || []).map((v) => {
      const r = rmap(v, MP_VT, 1);
      if (r.ev) r.ev = rmap(r.ev, MP_EV, 1);
      return r;
    }),
    fotos: f,
    base: { end: (c.base || {}).endereco || "", ll: (c.base || {}).coordenadas || null },
    motos: c.motoboys,
    prio: (c.prioridades_manutencao || []).map((p) => ({ id: p.id, nome: p.nome, h: p.horas })),
    rota: c.rota_atual || null,
    n: ct.contador || 1,
    gu: ct.configuracoes_atualizadas_em || 0,
    pu: ct.prioridades_atualizadas_em || 0,
    manut: (d.manutencoes || []).map((x) => rmap(x, MP_MN, 1)),
    est: d.estaticos || [],
    cfix: d.circuitos_fixos || [],
    del: Object.fromEntries((d.exclusoes || []).map((x) => [x.chave, x.em])),
  };
}
const arqStr = (S) => JSON.stringify(arq(S), (k, v) => (k === "col" ? undefined : v), 2);
function deLinhas(rows) {
  const S2 = {
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
    },
    AR2 = { fx: "fixos", vr: "vars", vt: "vts", mn: "manut", es: "est", cf: "cfix" };
  rows.forEach((w) => {
    const k = w.chave,
      t = w.tipo,
      d = w.dados || {};
    if (t === "cfg" && k === "cfg:base") {
      if (d.base) S2.base = d.base;
      if (Array.isArray(d.motos) && d.motos.length > 1) S2.motos = d.motos;
      S2.gu = Math.max(S2.gu, w.u || 0);
    } else if (t === "cfg" && k === "cfg:prio") {
      if (Array.isArray(d.prio)) {
        S2.prio = d.prio;
        S2.pu = w.u || 0;
      }
    } else if (t === "rot") {
      S2.rota = d.rota || null;
    } else if (w.excluido) {
      S2.del[k] = w.u || 0;
    } else if (t === "ft") {
      S2.fotos[k.slice(3)] = Object.assign({}, d, { u: w.u });
    } else if (AR2[t]) {
      S2[AR2[t]].push(Object.assign({}, d, { id: d.id || k.slice(t.length + 1), u: w.u }));
    }
  });
  return S2;
}
function migrar(d) {
  if (Array.isArray(d) && d.length && d[0] && typeof d[0].chave === "string") d = deLinhas(d);
  d = deArq(d);
  if (!d || typeof d !== "object" || !Array.isArray(d.fixos)) return null;
  d.vars = Array.isArray(d.vars) ? d.vars : [];
  d.vts = Array.isArray(d.vts) ? d.vts : [];
  d.vts.forEach((v) => {
    v.paineis = Array.isArray(v.paineis) ? v.paineis : [];
  });
  d.fotos = d.fotos && typeof d.fotos === "object" ? d.fotos : {};
  d.base = d.base && typeof d.base === "object" ? d.base : {};
  d.base.end = d.base.end || "";
  d.base.ll = d.base.ll || null;
  d.manut = Array.isArray(d.manut) ? d.manut : [];
  d.est = Array.isArray(d.est) ? d.est : [];
  d.cfix = Array.isArray(d.cfix) ? d.cfix : [];
  if (!Array.isArray(d.prio)) {
    d.prio = defPrio();
    d.pu = 0;
  }
  d.pu = d.pu || 0;
  d.col = d.col || {};
  d.n = d.n || 1;
  d.rota = d.rota || null;
  d.del = d.del && typeof d.del === "object" ? d.del : {};
  d.gu = d.gu || 0;
  if (!Array.isArray(d.motos) || d.motos.length < 2) d.motos = ["Thiago", "Alan"];
  return d;
}
