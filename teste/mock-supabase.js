/* ======================================================================
 *  MOCK DO SUPABASE — AMBIENTE DE TESTES (roda 100% no navegador)
 *  ----------------------------------------------------------------------
 *  Carregue este arquivo ANTES de qualquer outro script (na casca e em
 *  cada módulo/iframe). Ele troca window.fetch e window.WebSocket para a
 *  URL falsa  https://teste.supabase.co  — qualquer outra URL passa direto
 *  para o fetch/WebSocket originais.
 *
 *  O que é simulado (o bastante para os módulos Comercial e Operacional):
 *    - Auth (GoTrue): login por senha, refresh, /user, logout, signup
 *    - PostgREST: GET/POST/PATCH/DELETE em /rest/v1/<tabela>
 *      (select, filtros, order, limit/offset/Range, upsert, Prefer, count)
 *    - RPC: gravar_registros, resolver_sugestao,
 *           admin_criar_usuario, admin_redefinir_senha
 *    - Storage (bucket "fotos"): upload e leitura pública
 *    - Realtime: WebSocket falso que entrega postgres_changes entre abas
 *    - Edge Function "players-status" (lista de players fictícia)
 *    - Permissões (RLS) iguais às do schema unificado (ver POLITICAS)
 *
 *  Estado: localStorage["mega_teste_db"] (compartilhado entre casca e
 *  iframes e mantido ao recarregar). MEGA_TESTE.reset() volta aos dados
 *  de fábrica (definidos em dados-teste.js → window.MEGA_TESTE_SEED).
 * ====================================================================== */
(function () {
  'use strict';
  if (window.MEGA_TESTE) return;                       // já instalado neste frame

  var BASE = 'https://teste.supabase.co';
  var CHAVE_DB = 'mega_teste_db';
  var CANAL = 'mega_teste_rt';
  var fetchOriginal = window.fetch ? window.fetch.bind(window) : null;
  var WebSocketOriginal = window.WebSocket;

  var API = {
    latencia: 25,                                      // ms de "rede" simulada
    versao: 1
  };

  /* ====================================================================
   *  1) BANCO DE MENTIRA (persistido em localStorage)
   * ==================================================================== */
  var memoria = null;                                  // usado se o localStorage falhar
  var cacheBruto = null, cacheObj = null;

  function lerBruto() {
    try { return localStorage.getItem(CHAVE_DB); } catch (e) { return memoria; }
  }

  /** Lê o banco (com cache enquanto o texto no localStorage não mudar). */
  function ler() {
    var bruto = lerBruto();
    if (!bruto) { var novo = fabrica(); salvar(novo); return novo; }
    if (bruto !== cacheBruto) { cacheObj = JSON.parse(bruto); cacheBruto = bruto; }
    return cacheObj;
  }

  function salvar(db) {
    var txt = JSON.stringify(db);
    try { localStorage.setItem(CHAVE_DB, txt); }
    catch (e) { memoria = txt; if (!salvar.avisou) { salvar.avisou = true; console.warn('[teste] localStorage cheio/indisponível: dados só nesta aba.'); } }
    cacheBruto = txt; cacheObj = db;
  }

  function agora() { return new Date().toISOString(); }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16);
    });
  }

  /** Monta o banco de fábrica a partir de window.MEGA_TESTE_SEED (dados-teste.js). */
  function fabrica() {
    var S = window.MEGA_TESTE_SEED;
    if (!S) throw new Error('[teste] dados-teste.js não foi carregado antes do mock-supabase.js');
    var t0 = Date.now();
    var db = {
      versao: S.versao || 1,
      criado_em: agora(),
      seq: { rev: 0 },
      users: [],                                       // {id,email,senha,nome,criado_em}
      dominios_permitidos: (S.dominios_permitidos || []).slice(),
      admins_iniciais: (S.admins_iniciais || []).slice(),
      storage: {},                                     // "bucket/caminho" -> {tipo, dataUrl}
      players: S.players ? S.players(t0) : [],
      tabelas: { profiles: [], config: [], pontos: [], sugestoes: [], propostas: [], registros: [] }
    };
    S.usuarios.forEach(function (u) {
      db.users.push({ id: u.id, email: u.email, senha: u.senha, nome: u.nome, criado_em: agora() });
      db.tabelas.profiles.push({ id: u.id, email: u.email, nome: u.nome, papel: u.papel, ativo: true, criado_em: agora() });
    });
    if (S.comercial) {
      db.tabelas.config.push({ id: 'main', data: S.comercial.config, updated_at: agora(), updated_by: null });
      S.comercial.pontos.forEach(function (p) {
        db.tabelas.pontos.push({ id: p.id, ord: p.ord, data: p.data, updated_at: agora(), updated_by: null });
      });
      var ex = S.comercialExtras ? S.comercialExtras(t0) : { propostas: [], sugestoes: [] };
      db.tabelas.propostas = ex.propostas;
      db.tabelas.sugestoes = ex.sugestoes;
    }
    if (S.operacional) {
      S.operacional(t0).forEach(function (r) {
        db.seq.rev += 1;
        db.tabelas.registros.push({ chave: r.chave, tipo: r.tipo, dados: r.dados, u: r.u || 0, excluido: !!r.excluido,
                                    rev: db.seq.rev, atualizado_por: null, atualizado_em: agora() });
      });
    }
    return db;
  }

  /* ====================================================================
   *  2) ESQUEMA DAS TABELAS (colunas, chaves, valores padrão, checks)
   * ==================================================================== */
  var PAPEIS = ['admin', 'comercial', 'operacional', 'manutencao', 'pendente', 'bloqueado'];
  var TIPOS_REG = ['fx', 'vr', 'vt', 'ft', 'mn', 'es', 'cf', 'cfg', 'rot'];

  var ESQUEMA = {
    profiles:  { pk: 'id',    cols: ['id', 'email', 'nome', 'papel', 'ativo', 'criado_em'] },
    config:    { pk: 'id',    cols: ['id', 'data', 'updated_at', 'updated_by'] },
    pontos:    { pk: 'id',    cols: ['id', 'ord', 'data', 'updated_at', 'updated_by'] },
    sugestoes: { pk: 'id',    cols: ['id', 'tipo', 'ponto_id', 'payload', 'antes', 'motivo', 'status', 'criado_por', 'criado_por_email',
                                     'criado_por_nome', 'criado_em', 'resolvido_por', 'resolvido_em', 'resposta'] },
    propostas: { pk: 'id',    cols: ['id', 'tipo', 'formato', 'cliente', 'titulo', 'n_locais', 'modo_valor', 'comissao', 'total_tabela',
                                     'total_negociado', 'locais', 'valores', 'bv', 'criado_por', 'criado_por_email', 'criado_por_nome', 'criado_em'] },
    registros: { pk: 'chave', cols: ['chave', 'tipo', 'dados', 'u', 'excluido', 'rev', 'atualizado_por', 'atualizado_em'] }
  };

  /** Valores padrão aplicados no INSERT (como os "default" do SQL). */
  function padroes(tabela, db) {
    switch (tabela) {
      case 'profiles':  return { ativo: true, papel: 'pendente', criado_em: agora() };
      case 'config':    return { data: {} };
      case 'sugestoes': return { id: uuid(), status: 'pendente', criado_em: agora() };
      case 'propostas': return { id: uuid(), tipo: 'proposta', n_locais: 0, total_tabela: 0, total_negociado: 0, locais: [], valores: [], criado_em: agora() };
      case 'registros': return { u: 0, excluido: false };
    }
    return {};
  }

  /** Checks/NOT NULL do SQL. Devolve erro PostgREST ou null. */
  function validar(tabela, r) {
    function nn(c) { return r[c] === null || r[c] === undefined ? erro(400, '23502', 'null value in column "' + c + '" of relation "' + tabela + '" violates not-null constraint') : null; }
    function ck(ok, nome) { return ok ? null : erro(400, '23514', 'new row for relation "' + tabela + '" violates check constraint "' + nome + '"'); }
    var e = null, i, obrig = [];
    if (tabela === 'profiles')  { obrig = ['id', 'email', 'papel']; }
    if (tabela === 'config')    { obrig = ['id', 'data']; }
    if (tabela === 'pontos')    { obrig = ['id', 'data']; }
    if (tabela === 'sugestoes') { obrig = ['id', 'tipo', 'payload', 'status', 'criado_por']; }
    if (tabela === 'propostas') { obrig = ['id', 'tipo', 'formato', 'criado_por']; }
    if (tabela === 'registros') { obrig = ['chave', 'tipo', 'u', 'excluido']; }
    for (i = 0; i < obrig.length && !e; i++) e = nn(obrig[i]);
    if (e) return e;
    if (tabela === 'profiles')  e = ck(PAPEIS.indexOf(r.papel) >= 0, 'profiles_papel_check');
    if (tabela === 'sugestoes') e = ck(['adicionar', 'alterar'].indexOf(r.tipo) >= 0, 'sugestoes_tipo_check') ||
                                    ck(['pendente', 'aprovada', 'recusada'].indexOf(r.status) >= 0, 'sugestoes_status_check');
    if (tabela === 'propostas') e = ck(['proposta', 'kit_completo'].indexOf(r.tipo) >= 0, 'propostas_tipo_check') ||
                                    ck(['pptx', 'pdf'].indexOf(r.formato) >= 0, 'propostas_formato_check');
    if (tabela === 'registros') e = ck(TIPOS_REG.indexOf(r.tipo) >= 0, 'registros_tipo_check') ||
                                    ck(String(r.chave).split(':')[0] === r.tipo, 'registros_chave_tipo');
    return e;
  }

  /* ====================================================================
   *  3) PERMISSÕES (RLS) — espelham o schema unificado
   *     admin        : tudo
   *     comercial    : tabelas comerciais (config/pontos leitura;
   *                    sugestoes/propostas: cria e lê as próprias)
   *     operacional  : só "registros" (não altera/apaga fx, vr, cfg;
   *                    não cria fx/cfg)
   *     manutencao   : só "registros" do tipo 'mn'
   *     pendente / bloqueado: nada
   * ==================================================================== */
  function perfilDe(db, u) { return u ? db.tabelas.profiles.filter(function (p) { return p.id === u.id; })[0] || null : null; }
  function ehAdmin(p)   { return !!p && p.papel === 'admin' && p.ativo !== false; }
  function ativoCom(p)  { return !!p && (p.papel === 'admin' || p.papel === 'comercial') && p.ativo !== false; }
  function ativoOp(p)   { return !!p && (p.papel === 'admin' || p.papel === 'operacional' || p.papel === 'manutencao') && p.ativo !== false; }
  function ehManut(p)   { return !!p && p.papel === 'manutencao' && p.ativo !== false; }
  function nao() { return false; }

  var POLITICAS = {
    profiles: {
      ver:    function (p, r) { return !!p && (r.id === p.id || ehAdmin(p)); },
      criar:  nao,
      usar:   function (p) { return ehAdmin(p); },       // UPDATE ... USING
      checar: function (p) { return ehAdmin(p); },       // UPDATE ... WITH CHECK
      apagar: nao
    },
    config: {
      ver:    function (p) { return ativoCom(p); },
      criar:  function (p) { return ehAdmin(p); },
      usar:   function (p) { return ehAdmin(p); },
      checar: function (p) { return ehAdmin(p); },
      apagar: function (p) { return ehAdmin(p); }
    },
    sugestoes: {
      ver:    function (p, r) { return !!p && (r.criado_por === p.id || ehAdmin(p)); },
      criar:  function (p, r) { return ativoCom(p) && r.status === 'pendente'; },
      usar: nao, checar: nao, apagar: nao                // decisão do admin só via RPC resolver_sugestao
    },
    propostas: {
      ver:    function (p, r) { return !!p && (r.criado_por === p.id || ehAdmin(p)); },
      criar:  function (p) { return ativoCom(p); },
      usar: nao, checar: nao, apagar: nao                // histórico = backup, ninguém reescreve
    },
    registros: {
      ver:    function (p) { return ativoOp(p); },
      criar:  function (p, r) { return ativoOp(p) && (['fx', 'cfg'].indexOf(r.tipo) < 0 || ehAdmin(p)) && (!ehManut(p) || r.tipo === 'mn'); },
      usar:   function (p, r) { return ativoOp(p) && (['fx', 'vr', 'cfg'].indexOf(r.tipo) < 0 || ehAdmin(p)) && (!ehManut(p) || r.tipo === 'mn'); },
      checar: function (p, r) { return ativoOp(p) && (['fx', 'vr', 'cfg'].indexOf(r.tipo) < 0 || ehAdmin(p)) && (!ehManut(p) || r.tipo === 'mn'); },
      apagar: function (p) { return ehAdmin(p); }
    }
  };
  POLITICAS.pontos = POLITICAS.config;

  /* ====================================================================
   *  4) ERROS NO FORMATO POSTGREST / GOTRUE
   * ==================================================================== */
  function erro(status, code, message, details, hint) {
    return { __erro: true, status: status, corpo: { code: code, details: details || null, hint: hint || null, message: message } };
  }
  function ehErro(x) { return x && x.__erro === true; }
  function rlsErro(tabela) { return erro(403, '42501', 'new row violates row-level security policy for table "' + tabela + '"'); }
  function erroAuth(status, codigo, msg) {
    return { status: status, corpo: { code: status, error_code: codigo, msg: msg, message: msg, error: codigo, error_description: msg } };
  }

  /* ====================================================================
   *  5) JWT FALSO E SESSÃO
   * ==================================================================== */
  function b64url(obj) {
    var s = typeof obj === 'string' ? obj : JSON.stringify(obj);
    return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64urlLer(t) {
    t = t.replace(/-/g, '+').replace(/_/g, '/'); while (t.length % 4) t += '=';
    return JSON.parse(decodeURIComponent(escape(atob(t))));
  }
  function gerarJwt(u) {
    var iat = Math.floor(Date.now() / 1000);
    return b64url({ alg: 'HS256', typ: 'JWT' }) + '.' + b64url({
      iss: BASE + '/auth/v1', sub: u.id, aud: 'authenticated', role: 'authenticated', email: u.email,
      iat: iat, exp: iat + 3600, session_id: 'sessao-teste'
    }) + '.assinatura-de-teste-nao-valida';
  }
  function usuarioJson(u, db) {
    var p = perfilDe(db, u) || {};
    return { id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, email_confirmed_at: u.criado_em,
             phone: '', confirmed_at: u.criado_em, last_sign_in_at: agora(),
             app_metadata: { provider: 'email', providers: ['email'] },
             user_metadata: { nome: u.nome || p.nome || '', email_verified: true },
             identities: [], created_at: u.criado_em, updated_at: agora() };
  }
  function sessaoJson(u, db) {
    var jwt = gerarJwt(u);
    return { access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
             refresh_token: 'rt.' + u.id + '.' + Math.random().toString(36).slice(2, 12), user: usuarioJson(u, db) };
  }

  /** Identifica quem chama a partir do cabeçalho Authorization. */
  function identificar(db, h) {
    var a = h.authorization || '';
    var m = /^Bearer\s+(\S+)/i.exec(a);
    if (!m) return { anon: true, user: null, perfil: null };
    var pl;
    try { pl = b64urlLer(m[1].split('.')[1]); } catch (e) { return { invalido: true }; }
    if (pl.role === 'anon') return { anon: true, user: null, perfil: null };
    if (pl.exp && pl.exp * 1000 < Date.now() - 5000) return { expirado: true };
    var u = db.users.filter(function (x) { return x.id === pl.sub; })[0];
    if (!u) return { invalido: true };
    return { anon: false, user: u, perfil: perfilDe(db, u) };
  }

  /* ====================================================================
   *  6) FILTROS, ORDEM E SELEÇÃO DO POSTGREST
   * ==================================================================== */
  var RESERVADOS = ['select', 'order', 'limit', 'offset', 'on_conflict', 'columns', 'or', 'and'];

  /** Separa "a,b,c" respeitando parênteses e aspas. */
  function dividirLista(s) {
    var out = [], atual = '', nivel = 0, asp = false, i, c;
    for (i = 0; i < s.length; i++) {
      c = s[i];
      if (c === '"' && s[i - 1] !== '\\') asp = !asp;
      if (!asp && c === '(') nivel++;
      if (!asp && c === ')') nivel--;
      if (!asp && nivel === 0 && c === ',') { out.push(atual); atual = ''; } else atual += c;
    }
    if (atual !== '') out.push(atual);
    return out;
  }
  function tirarAspas(v) {
    v = v.trim();
    if (v.length > 1 && v[0] === '"' && v[v.length - 1] === '"') return v.slice(1, -1).replace(/\\(["\\])/g, '$1');
    return v;
  }
  function comparar(a, b) {                              // -1, 0, 1 ; null/undefined tratados fora
    if (typeof a === 'number' || typeof a === 'bigint') { b = Number(b); return a < b ? -1 : a > b ? 1 : 0; }
    if (typeof a === 'boolean') { b = String(b) === 'true'; return a === b ? 0 : (a ? 1 : -1); }
    a = String(a); b = String(b);
    return a < b ? -1 : a > b ? 1 : 0;
  }
  function criarCondicao(op, valor) {
    var neg = false;
    if (op.indexOf('not.') === 0) { neg = true; op = op.slice(4); }
    var base = op.split('.')[0];
    var rest = op.slice(base.length + 1);
    var val = rest;
    var f;
    switch (base) {
      case 'eq':  f = function (x) { return x !== null && x !== undefined && comparar(x, val) === 0; }; break;
      case 'neq': f = function (x) { return x === null || x === undefined || comparar(x, val) !== 0; }; break;
      case 'gt':  f = function (x) { return x != null && comparar(x, val) > 0; }; break;
      case 'gte': f = function (x) { return x != null && comparar(x, val) >= 0; }; break;
      case 'lt':  f = function (x) { return x != null && comparar(x, val) < 0; }; break;
      case 'lte': f = function (x) { return x != null && comparar(x, val) <= 0; }; break;
      case 'is':  f = function (x) {
                    if (val === 'null') return x === null || x === undefined;
                    if (val === 'true') return x === true; if (val === 'false') return x === false; return false; }; break;
      case 'in':  var lista = dividirLista(val.replace(/^\(/, '').replace(/\)$/, '')).map(tirarAspas);
                  f = function (x) { return x != null && lista.some(function (y) { return comparar(x, y) === 0; }); }; break;
      case 'like': case 'ilike':
                  var re = new RegExp('^' + val.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '%').replace(/%/g, '.*').replace(/_/g, '.') + '$', base === 'ilike' ? 'i' : '');
                  f = function (x) { return x != null && re.test(String(x)); }; break;
      default:    f = function () { return true; };
    }
    return neg ? function (x) { return !f(x); } : f;
  }
  /** Constrói a função de filtro a partir dos parâmetros da URL (ex.: rev=gt.5, chave=in.("a","b")). */
  function montarFiltro(params) {
    var conds = [];
    params.forEach(function (valor, chave) {
      if (RESERVADOS.indexOf(chave) >= 0) return;
      if (valor.indexOf('.') < 0) return;
      conds.push({ col: chave, f: criarCondicao(valor) });
    });
    return function (linha) {
      for (var i = 0; i < conds.length; i++) if (!conds[i].f(linha[conds[i].col])) return false;
      return true;
    };
  }
  function ordenar(linhas, ordem) {
    if (!ordem) return linhas;
    var termos = ordem.split(',').map(function (t) {
      var p = t.split('.');
      return { col: p[0], desc: p.indexOf('desc') > 0, nullsFirst: p.indexOf('nullsfirst') > 0, nullsLast: p.indexOf('nullslast') > 0 };
    });
    return linhas.slice().sort(function (a, b) {
      for (var i = 0; i < termos.length; i++) {
        var t = termos[i], x = a[t.col], y = b[t.col];
        var nx = x === null || x === undefined, ny = y === null || y === undefined;
        if (nx || ny) {
          if (nx && ny) continue;
          var nulosPrimeiro = t.nullsFirst || (!t.nullsLast && t.desc);   // padrão do Postgres: ASC → nulos no fim; DESC → no início
          return nx ? (nulosPrimeiro ? -1 : 1) : (nulosPrimeiro ? 1 : -1);
        }
        var c = typeof x === 'number' && typeof y === 'number' ? (x < y ? -1 : x > y ? 1 : 0) : (String(x) < String(y) ? -1 : String(x) > String(y) ? 1 : 0);
        if (c) return t.desc ? -c : c;
      }
      return 0;
    });
  }
  function projetar(linha, select) {
    if (!select || select === '*') return JSON.parse(JSON.stringify(linha));
    var out = {};
    dividirLista(select).forEach(function (c) {
      c = c.trim(); if (!c) return;
      if (c === '*') { Object.keys(linha).forEach(function (k) { out[k] = linha[k]; }); return; }
      var alias = c, col = c, m = /^([^:]+):(.+)$/.exec(c);
      if (m) { alias = m[1]; col = m[2]; }
      out[alias] = linha[col] === undefined ? null : linha[col];
    });
    return JSON.parse(JSON.stringify(out));
  }

  /* ====================================================================
   *  7) TRIGGERS (carimbos automáticos do SQL)
   * ==================================================================== */
  function gatilhoAntes(db, tabela, linha, perfilQuem, op, antiga) {
    var uid = perfilQuem ? perfilQuem.id : null;
    if (tabela === 'config' || tabela === 'pontos') { linha.updated_at = agora(); linha.updated_by = uid; }
    if (tabela === 'registros') { db.seq.rev += 1; linha.rev = db.seq.rev; linha.atualizado_por = uid; linha.atualizado_em = agora(); }
    if ((tabela === 'sugestoes' || tabela === 'propostas') && op === 'insert') {            // preenche_autor()
      linha.criado_por = uid; linha.criado_por_email = perfilQuem ? perfilQuem.email : null; linha.criado_por_nome = perfilQuem ? perfilQuem.nome : null;
    }
    if (tabela === 'profiles' && op === 'update' && antiga) {                               // protege_ultimo_admin()
      var eraAdmin = antiga.papel === 'admin' && antiga.ativo;
      var seraAdmin = linha.papel === 'admin' && linha.ativo;
      if (eraAdmin && !seraAdmin) {
        var outro = db.tabelas.profiles.some(function (p) { return p.papel === 'admin' && p.ativo && p.id !== antiga.id; });
        if (!outro) return erro(400, 'P0001', 'Precisa existir pelo menos um admin ativo.');
      }
    }
    return null;
  }

  /* ====================================================================
   *  8) REALTIME (postgres_changes) — entre abas/iframes
   * ==================================================================== */
  var sockets = [];                                      // sockets falsos deste frame
  var canal = null;
  try { canal = new BroadcastChannel(CANAL); } catch (e) { canal = null; }

  function entregarMudanca(ev) {
    var db = ler();
    sockets.forEach(function (ws) { ws._entregar(ev, db); });
  }
  if (canal) canal.onmessage = function (m) { try { entregarMudanca(m.data); } catch (e) {} };

  function emitir(tabela, tipo, registro, antigo) {
    var ev = { tabela: tabela, tipo: tipo, registro: registro, antigo: antigo || null };
    setTimeout(function () { entregarMudanca(ev); }, 0);                   // neste frame
    if (canal) { try { canal.postMessage(ev); } catch (e) {} }               // nos outros frames/abas
  }

  /* ====================================================================
   *  9) PostgREST: GET / POST / PATCH / DELETE
   * ==================================================================== */
  function parseCorpo(corpo) {
    if (corpo === undefined || corpo === null || corpo === '') return null;
    if (typeof corpo === 'string') { try { return JSON.parse(corpo); } catch (e) { return null; } }
    return corpo;
  }

  function lidarRest(db, ctx) {
    var tabelaUrl = ctx.partes[2];                       // /rest/v1/<tabela>
    var alias = false;
    if (tabelaUrl === 'perfis') { tabelaUrl = 'profiles'; alias = true; }   // compatibilidade com o operacional antigo
    var esq = ESQUEMA[tabelaUrl];
    var tabela = tabelaUrl;

    if (!esq) {
      if (tabelaUrl === 'dominios_permitidos' || tabelaUrl === 'admins_iniciais') return { status: 200, corpo: [] };   // RLS sem policy: vazio
      return { status: 404, corpo: { code: '42P01', details: null, hint: null, message: 'relation "public.' + tabelaUrl + '" does not exist' } };
    }
    if (ctx.id.anon) return { status: 401, corpo: { code: '42501', details: null, hint: null, message: 'permission denied for table ' + tabela } };

    var perfil = ctx.id.perfil;
    var pol = POLITICAS[tabela];
    var linhas = db.tabelas[tabela];
    var prefer = ctx.headers.prefer || '';
    var querRepr = /return=representation/.test(prefer);
    var m = ctx.metodo;

    /* adaptação do alias antigo (perfis): operacional ↔ operador */
    function paraAlias(r) { if (!alias) return r; var c = Object.assign({}, r); if (c.papel === 'operacional') c.papel = 'operador'; return c; }
    function doAlias(r) { if (!alias || !r) return r; var c = Object.assign({}, r); if (c.papel === 'operador') c.papel = 'operacional'; return c; }

    var filtro = montarFiltro(ctx.params);
    var select = ctx.params.get('select') || '*';

    /* --------------------------- GET / HEAD --------------------------- */
    if (m === 'GET' || m === 'HEAD') {
      var vis = linhas.filter(function (r) { return pol.ver(perfil, r) && filtro(paraAlias(r)); }).map(paraAlias);
      vis = ordenar(vis, ctx.params.get('order'));
      var total = vis.length;
      var off = parseInt(ctx.params.get('offset') || '0', 10) || 0;
      var lim = ctx.params.get('limit') != null ? parseInt(ctx.params.get('limit'), 10) : null;
      var rg = /^(\d+)-(\d*)$/.exec(ctx.headers.range || '');
      if (rg) { off = parseInt(rg[1], 10); if (rg[2] !== '') lim = parseInt(rg[2], 10) - off + 1; }
      var pag = vis.slice(off, lim != null ? off + lim : undefined);
      var cabec = {};
      if (/count=/.test(prefer)) cabec['Content-Range'] = (pag.length ? off + '-' + (off + pag.length - 1) : '*') + '/' + total;
      else if (rg) cabec['Content-Range'] = (pag.length ? off + '-' + (off + pag.length - 1) : '*') + '/*';
      var status = (rg && pag.length < total) ? 206 : 200;
      if (m === 'HEAD') return { status: status, corpo: null, cabec: cabec };
      var saida = pag.map(function (r) { return projetar(r, select); });
      if (/vnd\.pgrst\.object\+json/.test(ctx.headers.accept || '')) {
        if (saida.length !== 1) return { status: 406, corpo: { code: 'PGRST116', details: 'The result contains ' + saida.length + ' rows', hint: null,
                                                               message: 'JSON object requested, multiple (or no) rows returned' } };
        return { status: 200, corpo: saida[0], cabec: cabec };
      }
      return { status: status, corpo: saida, cabec: cabec };
    }

    /* ------------------------------ POST ------------------------------ */
    if (m === 'POST') {
      var corpo = parseCorpo(ctx.corpo);
      var lista = Array.isArray(corpo) ? corpo : (corpo ? [corpo] : []);
      var upsert = /resolution=(merge|ignore)-duplicates/.test(prefer);
      var ignorar = /resolution=ignore-duplicates/.test(prefer);
      var colConf = ctx.params.get('on_conflict') || esq.pk;
      var resultado = [], eventos = [];
      var novasLinhas = linhas.slice();                  // aplica só se tudo der certo (atômico)

      for (var i = 0; i < lista.length; i++) {
        var entrada = doAlias(lista[i]);
        var desconhecida = Object.keys(entrada).filter(function (c) { return esq.cols.indexOf(c) < 0; })[0];
        if (desconhecida) return { status: 400, corpo: { code: 'PGRST204', details: null, hint: null,
                                   message: "Could not find the '" + desconhecida + "' column of '" + tabela + "' in the schema cache" } };
        var existente = null;
        var chaveVal = entrada[colConf];
        if (chaveVal !== undefined) existente = novasLinhas.filter(function (r) { return r[colConf] === chaveVal; })[0] || null;
        if (existente && !upsert) return { status: 409, corpo: { code: '23505', details: 'Key (' + esq.pk + ')=(' + existente[esq.pk] + ') already exists.', hint: null,
                                                                 message: 'duplicate key value violates unique constraint "' + tabela + '_pkey"' } };
        if (existente && ignorar) continue;
        var nova, antiga = null;
        if (existente) {                                  // upsert → UPDATE
          if (!pol.ver(perfil, existente) || !pol.usar(perfil, existente)) return { status: 403, corpo: rlsErro(tabela).corpo };
          antiga = JSON.parse(JSON.stringify(existente));
          nova = Object.assign({}, existente, entrada);
          var ge = gatilhoAntes(db, tabela, nova, perfil, 'update', antiga); if (ehErro(ge)) return ge;
          if (!pol.checar(perfil, nova)) return { status: 403, corpo: rlsErro(tabela).corpo };
        } else {                                          // INSERT
          nova = {};
          esq.cols.forEach(function (c) { nova[c] = null; });
          Object.assign(nova, padroes(tabela, db), entrada);
          var ge2 = gatilhoAntes(db, tabela, nova, perfil, 'insert', null); if (ehErro(ge2)) return ge2;
          if (!pol.criar(perfil, nova)) return { status: 403, corpo: rlsErro(tabela).corpo };
        }
        var ev = validar(tabela, nova); if (ev) return { status: ev.status, corpo: ev.corpo };
        if (existente) novasLinhas[novasLinhas.indexOf(existente)] = nova; else novasLinhas.push(nova);
        resultado.push(paraAlias(nova));
        eventos.push({ tipo: existente ? 'UPDATE' : 'INSERT', registro: nova, antigo: antiga });
      }
      db.tabelas[tabela] = novasLinhas;
      eventos.forEach(function (e) { emitir(tabela, e.tipo, e.registro, e.antigo); });
      if (querRepr) {
        var visiveis = resultado.filter(function (r) { return pol.ver(perfil, r); }).map(function (r) { return projetar(r, select); });
        if (/vnd\.pgrst\.object\+json/.test(ctx.headers.accept || '')) return { status: 201, corpo: visiveis[0] || null, salvar: true };
        return { status: 201, corpo: visiveis, salvar: true };
      }
      return { status: 201, corpo: null, salvar: true };
    }

    /* ------------------------------ PATCH ----------------------------- */
    if (m === 'PATCH') {
      var mudanca = doAlias(parseCorpo(ctx.corpo) || {});
      var desc = Object.keys(mudanca).filter(function (c) { return esq.cols.indexOf(c) < 0; })[0];
      if (desc) return { status: 400, corpo: { code: 'PGRST204', details: null, hint: null, message: "Could not find the '" + desc + "' column of '" + tabela + "' in the schema cache" } };
      var alvo = linhas.filter(function (r) { return pol.ver(perfil, r) && filtro(paraAlias(r)) && pol.usar(perfil, r); });
      var devolvidos = [], aplicar = [];
      for (var k = 0; k < alvo.length; k++) {
        var antes = JSON.parse(JSON.stringify(alvo[k]));
        var dep = Object.assign({}, alvo[k], mudanca);
        var g = gatilhoAntes(db, tabela, dep, perfil, 'update', antes); if (ehErro(g)) return g;
        if (!pol.checar(perfil, dep)) return { status: 403, corpo: rlsErro(tabela).corpo };
        var e2 = validar(tabela, dep); if (e2) return { status: e2.status, corpo: e2.corpo };
        aplicar.push({ linha: alvo[k], nova: dep, antes: antes });
      }
      aplicar.forEach(function (a) {                      // só aplica depois que TODAS passaram (atômico)
        Object.keys(a.linha).forEach(function (c) { delete a.linha[c]; });
        Object.assign(a.linha, a.nova);
        devolvidos.push(paraAlias(a.linha));
      });
      aplicar.forEach(function (a) { emitir(tabela, 'UPDATE', a.nova, a.antes); });
      if (querRepr) {
        var out = devolvidos.map(function (r) { return projetar(r, select); });
        if (/vnd\.pgrst\.object\+json/.test(ctx.headers.accept || '')) return { status: 200, corpo: out[0] || null, salvar: true };
        return { status: 200, corpo: out, salvar: true };
      }
      return { status: 204, corpo: null, salvar: true };
    }

    /* ----------------------------- DELETE ----------------------------- */
    if (m === 'DELETE') {
      var apagar = linhas.filter(function (r) { return pol.ver(perfil, r) && filtro(paraAlias(r)) && pol.apagar(perfil, r); });
      db.tabelas[tabela] = linhas.filter(function (r) { return apagar.indexOf(r) < 0; });
      apagar.forEach(function (r) { emitir(tabela, 'DELETE', null, r); });
      if (querRepr) return { status: 200, corpo: apagar.map(function (r) { return projetar(paraAlias(r), select); }), salvar: true };
      return { status: 204, corpo: null, salvar: true };
    }

    return { status: 405, corpo: { message: 'Método não suportado' } };
  }

  /* ====================================================================
   * 10) RPC — mesma lógica das funções SQL
   * ==================================================================== */
  function lancar(msg) { return erro(400, 'P0001', msg); }

  function lidarRpc(db, ctx) {
    var fn = ctx.partes[3];
    var args = parseCorpo(ctx.corpo) || {};
    if (ctx.id.anon) return { status: 401, corpo: { code: '42501', details: null, hint: null, message: 'permission denied for function ' + fn } };
    var perfil = ctx.id.perfil;

    /* ---- gravar_registros(p jsonb) : security invoker (respeita a RLS) ---- */
    if (fn === 'gravar_registros') {
      var itens = Array.isArray(args.p) ? args.p : [];
      var ok = [], negado = [], antigo = [], pol = POLITICAS.registros;
      var linhas = db.tabelas.registros;
      itens.forEach(function (r) {
        var k = r.chave, t = r.tipo, nu = Number(r.u || 0);
        var ex = linhas.filter(function (x) { return x.chave === k; })[0];
        var podeAtualizar = ex && pol.ver(perfil, ex) && pol.usar(perfil, ex) && ex.u <= nu;
        if (podeAtualizar) {
          var dep = Object.assign({}, ex, { tipo: t, dados: r.dados === undefined ? null : r.dados, u: nu, excluido: !!r.excluido });
          if (String(k).split(':')[0] !== t) { negado.push(k); return; }       // violaria registros_chave_tipo
          if (!pol.checar(perfil, dep)) { negado.push(k); return; }
          gatilhoAntes(db, 'registros', dep, perfil, 'update', ex);
          var antes = JSON.parse(JSON.stringify(ex));
          Object.keys(ex).forEach(function (c) { delete ex[c]; }); Object.assign(ex, dep);
          ok.push(k); emitir('registros', 'UPDATE', ex, antes);
        } else if (ex) {                                  // existe mas não pôde atualizar
          if (pol.ver(perfil, ex)) { if (ex.u > nu) antigo.push(k); else negado.push(k); }
          else negado.push(k);
        } else {
          var nova = { chave: k, tipo: t, dados: r.dados === undefined ? null : r.dados, u: nu, excluido: !!r.excluido,
                       rev: null, atualizado_por: null, atualizado_em: null };
          if (String(k).split(':')[0] !== t || TIPOS_REG.indexOf(t) < 0) { negado.push(k); return; }   // check_violation → "negado"
          gatilhoAntes(db, 'registros', nova, perfil, 'insert', null);
          if (!pol.criar(perfil, nova)) { negado.push(k); return; }                                    // insufficient_privilege → "negado"
          linhas.push(nova); ok.push(k); emitir('registros', 'INSERT', nova, null);
        }
      });
      return { status: 200, corpo: { ok: ok, negado: negado, antigo: antigo }, salvar: true };
    }

    /* ---- resolver_sugestao(p_id, p_acao, p_payload, p_resposta) ---- */
    if (fn === 'resolver_sugestao') {
      if (!ehAdmin(perfil)) return lancar('Apenas administrador.');
      var s = db.tabelas.sugestoes.filter(function (x) { return x.id === args.p_id; })[0];
      if (!s) return lancar('Sugestão não encontrada.');
      if (s.status !== 'pendente') return lancar('Esta sugestão já foi resolvida.');
      if (args.p_acao === 'aprovar') {
        var dados = args.p_payload || s.payload;
        if (s.tipo === 'adicionar') {
          var novoId = 's' + uuid().replace(/-/g, '').slice(0, 12);
          var prox = db.tabelas.pontos.reduce(function (m, p) { return Math.max(m, p.ord || 0); }, 0) + 1;
          var d2 = Object.assign({}, dados); delete d2.sel; d2.id = novoId; d2.ord = prox;
          var np = { id: novoId, ord: prox, data: d2, updated_at: agora(), updated_by: perfil.id };
          db.tabelas.pontos.push(np); emitir('pontos', 'INSERT', np, null);
        } else {
          var alvo = db.tabelas.pontos.filter(function (p) { return p.id === s.ponto_id; })[0];
          if (!alvo) return lancar('O ponto original não existe mais.');
          var d3 = Object.assign({}, dados); delete d3.id; delete d3.ord; delete d3.sel;
          var an = JSON.parse(JSON.stringify(alvo));
          alvo.data = Object.assign({}, alvo.data, d3); alvo.updated_at = agora(); alvo.updated_by = perfil.id;
          emitir('pontos', 'UPDATE', alvo, an);
        }
        var anS = JSON.parse(JSON.stringify(s));
        Object.assign(s, { status: 'aprovada', payload: dados, resolvido_por: perfil.id, resolvido_em: agora(), resposta: args.p_resposta || null });
        emitir('sugestoes', 'UPDATE', s, anS);
      } else if (args.p_acao === 'recusar') {
        var anR = JSON.parse(JSON.stringify(s));
        Object.assign(s, { status: 'recusada', resolvido_por: perfil.id, resolvido_em: agora(), resposta: args.p_resposta || null });
        emitir('sugestoes', 'UPDATE', s, anR);
      } else return lancar('Ação inválida.');
      return { status: 200, corpo: { ok: true }, salvar: true };
    }

    /* ---- admin_criar_usuario(p_email, p_senha, p_nome, p_papel) ---- */
    if (fn === 'admin_criar_usuario') {
      if (!ehAdmin(perfil)) return lancar('Apenas administrador.');
      var email = String(args.p_email || '').trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return lancar('E-mail inválido.');
      if (String(args.p_senha || '').length < 6) return lancar('A senha precisa ter pelo menos 6 caracteres.');
      if (['admin', 'comercial', 'operacional', 'manutencao'].indexOf(args.p_papel) < 0) return lancar('Função inválida.');
      if (db.users.some(function (u) { return u.email === email; })) return lancar('Este e-mail já tem cadastro.');
      var nome = String(args.p_nome || '').trim() || email.split('@')[0];
      var nu = { id: uuid(), email: email, senha: args.p_senha, nome: nome, criado_em: agora() };
      db.users.push(nu);
      var npf = { id: nu.id, email: email, nome: nome, papel: args.p_papel, ativo: true, criado_em: agora() };
      db.tabelas.profiles.push(npf); emitir('profiles', 'INSERT', npf, null);
      return { status: 200, corpo: nu.id, salvar: true };
    }

    /* ---- admin_redefinir_senha(p_id, p_senha) ---- */
    if (fn === 'admin_redefinir_senha') {
      if (!ehAdmin(perfil)) return lancar('Apenas administrador.');
      if (String(args.p_senha || '').length < 6) return lancar('A senha precisa ter pelo menos 6 caracteres.');
      var alvoU = db.users.filter(function (u) { return u.id === args.p_id; })[0];
      if (alvoU) alvoU.senha = args.p_senha;
      return { status: 204, corpo: null, salvar: true };
    }

    return { status: 404, corpo: { code: 'PGRST202', details: null, hint: null, message: 'Could not find the function public.' + fn + ' in the schema cache' } };
  }

  /* ====================================================================
   * 11) AUTH (GoTrue)
   * ==================================================================== */
  function lidarAuth(db, ctx) {
    var rota = ctx.partes[2] || '';                      // /auth/v1/<rota>
    var corpo = parseCorpo(ctx.corpo) || {};

    if (rota === 'token') {
      var tipo = ctx.params.get('grant_type');
      if (tipo === 'password') {
        var email = String(corpo.email || '').trim().toLowerCase();
        var u = db.users.filter(function (x) { return x.email === email; })[0];
        if (!u || u.senha !== corpo.password) return erroAuth(400, 'invalid_credentials', 'Invalid login credentials');
        return { status: 200, corpo: sessaoJson(u, db) };
      }
      if (tipo === 'refresh_token') {
        var m = /^rt\.([0-9a-f-]{36})\./.exec(corpo.refresh_token || '');
        var uu = m && db.users.filter(function (x) { return x.id === m[1]; })[0];
        if (!uu) return erroAuth(400, 'refresh_token_not_found', 'Invalid Refresh Token: Refresh Token Not Found');
        return { status: 200, corpo: sessaoJson(uu, db) };
      }
      return erroAuth(400, 'unsupported_grant_type', 'unsupported grant_type');
    }

    if (rota === 'user') {
      if (!ctx.id.user) return erroAuth(401, 'bad_jwt', 'invalid JWT: unable to parse or verify signature');
      if (ctx.metodo === 'PUT') {
        if (corpo.password) { ctx.id.user.senha = corpo.password; }
        if (corpo.data) { ctx.id.user.nome = corpo.data.nome || ctx.id.user.nome; }
        return { status: 200, corpo: usuarioJson(ctx.id.user, db), salvar: true };
      }
      return { status: 200, corpo: usuarioJson(ctx.id.user, db) };
    }

    if (rota === 'logout') return { status: 204, corpo: null };

    if (rota === 'signup') {                             // cadastro público: domínios permitidos + perfil "pendente"
      var em = String(corpo.email || '').trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return erroAuth(422, 'validation_failed', 'Unable to validate email address: invalid format');
      if (String(corpo.password || '').length < 6) return erroAuth(422, 'weak_password', 'Password should be at least 6 characters.');
      if (db.users.some(function (x) { return x.email === em; })) return erroAuth(422, 'user_already_exists', 'User already registered');
      var dominio = em.split('@')[1];
      if (db.dominios_permitidos.indexOf(dominio) < 0) return erroAuth(500, 'unexpected_failure', 'Database error saving new user');   // trigger checa_dominio
      var nome = (corpo.data && corpo.data.nome) || em.split('@')[0];
      var nu = { id: uuid(), email: em, senha: corpo.password, nome: nome, criado_em: agora() };
      db.users.push(nu);
      var npf = { id: nu.id, email: em, nome: nome, ativo: true, criado_em: agora(),
                  papel: db.admins_iniciais.indexOf(em) >= 0 ? 'admin' : 'pendente' };
      db.tabelas.profiles.push(npf); emitir('profiles', 'INSERT', npf, null);
      return { status: 200, corpo: sessaoJson(nu, db), salvar: true };
    }

    if (rota === 'settings') return { status: 200, corpo: { external: { email: true }, disable_signup: false, mailer_autoconfirm: true } };
    if (rota === 'recover' || rota === 'otp' || rota === 'resend') return { status: 200, corpo: {} };
    return erroAuth(404, 'not_found', 'Rota de auth não simulada: ' + rota);
  }

  /* ====================================================================
   * 12) STORAGE (bucket "fotos")
   * ==================================================================== */
  var PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><rect width="100%" height="100%" fill="#dfe6ee"/>' +
    '<text x="50%" y="50%" font-family="sans-serif" font-size="22" fill="#6b7a8c" text-anchor="middle">foto de teste</text></svg>');

  function blobParaDataUrl(blob) {
    return new Promise(function (ok, no) {
      var fr = new FileReader(); fr.onload = function () { ok(fr.result); }; fr.onerror = no; fr.readAsDataURL(blob);
    });
  }
  function dataUrlParaBlob(du) {
    var p = du.split(','), mime = /data:([^;]+)/.exec(p[0]); mime = mime ? mime[1] : 'application/octet-stream';
    var bin = atob(p[1]), arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  async function lidarStorage(db, ctx) {
    var resto = ctx.partes.slice(2);                     // [object, (public), bucket, ...caminho]
    // leitura pública
    if (ctx.metodo === 'GET' && resto[0] === 'object' && (resto[1] === 'public' || resto[1] === 'authenticated')) {
      var chave = resto.slice(2).map(decodeURIComponent).join('/');
      var obj = db.storage[chave];
      return { status: obj ? 200 : 404, blob: obj ? dataUrlParaBlob(obj.dataUrl) : null, corpo: obj ? null : { error: 'Not found', message: 'Object not found', statusCode: '404' } };
    }
    if (ctx.id.anon) return { status: 401, corpo: { statusCode: '401', error: 'Unauthorized', message: 'Unauthorized' } };
    var perfil = ctx.id.perfil;

    // upload (POST = novo; PUT = substituir)
    if (resto[0] === 'object' && (ctx.metodo === 'POST' || ctx.metodo === 'PUT')) {
      var bucket = resto[1], caminho = resto.slice(2).map(decodeURIComponent).join('/');
      var ehAdm = ehAdmin(perfil);
      var proprio = ativoCom(perfil) && caminho.indexOf('sugestoes/' + perfil.id + '/') === 0;
      if (bucket !== 'fotos') return { status: 404, corpo: { statusCode: '404', error: 'Bucket not found', message: 'Bucket not found' } };
      if (ctx.metodo === 'POST' && !(ehAdm || proprio)) return { status: 403, corpo: { statusCode: '403', error: 'Unauthorized', message: 'new row violates row-level security policy' } };
      if (ctx.metodo === 'PUT' && !ehAdm) return { status: 403, corpo: { statusCode: '403', error: 'Unauthorized', message: 'new row violates row-level security policy' } };
      var cheio = bucket + '/' + caminho;
      if (db.storage[cheio] && ctx.headers['x-upsert'] !== 'true' && ctx.metodo === 'POST')
        return { status: 400, corpo: { statusCode: '409', error: 'Duplicate', message: 'The resource already exists' } };
      var blob = null, c = ctx.corpoBruto;
      if (c instanceof FormData) { c.forEach(function (v) { if (v instanceof Blob) blob = v; }); }
      else if (c instanceof Blob) blob = c;
      else if (typeof c === 'string') blob = new Blob([c], { type: ctx.headers['content-type'] || 'text/plain' });
      else if (c && c.byteLength !== undefined) blob = new Blob([c], { type: ctx.headers['content-type'] || 'application/octet-stream' });
      if (!blob) return { status: 400, corpo: { statusCode: '400', error: 'Invalid', message: 'Arquivo ausente' } };
      db.storage[cheio] = { tipo: blob.type, dataUrl: await blobParaDataUrl(blob) };
      return { status: 200, corpo: { Id: uuid(), Key: cheio }, salvar: true };
    }
    // remover (DELETE /object/<bucket> com {prefixes:[...]})
    if (resto[0] === 'object' && ctx.metodo === 'DELETE') {
      if (!ehAdmin(perfil)) return { status: 200, corpo: [] };
      var bk = resto[1], alvos = (parseCorpo(ctx.corpo) || {}).prefixes || [resto.slice(2).join('/')];
      var apagados = [];
      alvos.forEach(function (p) { var k = bk + '/' + p; if (db.storage[k]) { delete db.storage[k]; apagados.push({ name: p, bucket_id: bk }); } });
      return { status: 200, corpo: apagados, salvar: true };
    }
    return { status: 200, corpo: [] };                   // listagens etc.: vazio
  }

  /* ====================================================================
   * 13) EDGE FUNCTIONS (players-status)
   * ==================================================================== */
  function lidarFuncao(db, ctx) {
    var nome = ctx.partes[2];
    if (nome !== 'players-status') return { status: 404, corpo: { message: 'Function not found' } };
    if (ctx.id.anon || !ctx.id.perfil) return { status: 401, corpo: { ok: false, erro: 'Não autorizado. Entre no sistema novamente.' } };
    if (!ehAdmin(ctx.id.perfil)) return { status: 403, corpo: { ok: false, erro: 'Somente o administrador pode ver os players.' } };
    return { status: 200, corpo: { ok: true, players: db.players, contas: [{ nome: 'conta-teste' }], total: db.players.length } };
  }

  /* ====================================================================
   * 14) ROTEADOR + fetch SUBSTITUTO
   * ==================================================================== */
  function normalizarHeaders(h) {
    var out = {};
    if (!h) return out;
    if (typeof Headers !== 'undefined' && h instanceof Headers) { h.forEach(function (v, k) { out[k.toLowerCase()] = v; }); return out; }
    if (Array.isArray(h)) { h.forEach(function (p) { out[String(p[0]).toLowerCase()] = p[1]; }); return out; }
    Object.keys(h).forEach(function (k) { out[k.toLowerCase()] = h[k]; });
    return out;
  }

  var CORS = { 'Access-Control-Allow-Origin': '*' };

  async function tratar(metodo, urlTexto, headers, corpoBruto) {
    var url = new URL(urlTexto);
    var partes = url.pathname.split('/').filter(Boolean);    // ["rest","v1","registros"]
    var db = ler();
    var ctx = {
      metodo: metodo, url: url, params: url.searchParams, headers: headers, partes: partes,
      corpoBruto: corpoBruto, corpo: (typeof corpoBruto === 'string') ? corpoBruto : null,
      id: identificar(db, headers)
    };

    var res;
    if (ctx.id.expirado) res = { status: 401, corpo: { code: 'PGRST301', details: null, hint: null, message: 'JWT expired' } };
    else if (ctx.id.invalido) res = { status: 401, corpo: { code: 'PGRST301', details: null, hint: null, message: 'JWT invalid' } };
    else if (partes[0] === 'auth')      res = lidarAuth(db, ctx);
    else if (partes[0] === 'rest' && partes[2] === 'rpc') res = lidarRpc(db, ctx);
    else if (partes[0] === 'rest')      res = lidarRest(db, ctx);
    else if (partes[0] === 'storage')   res = await lidarStorage(db, ctx);
    else if (partes[0] === 'functions') res = lidarFuncao(db, ctx);
    else res = { status: 404, corpo: { message: 'Rota não simulada: ' + url.pathname } };

    if (ehErro(res)) res = { status: res.status, corpo: res.corpo };
    if (res.status >= 300) cacheBruto = null;            // descarta alterações parciais em memória
    // Persiste se algo mudou (qualquer rota de escrita bem-sucedida)
    if (res.salvar || (metodo !== 'GET' && metodo !== 'HEAD' && res.status < 300)) salvar(db);
    return res;
  }

  function montarResposta(res) {
    var cab = Object.assign({}, CORS, res.cabec || {});
    if (res.blob) { cab['Content-Type'] = res.blob.type || 'application/octet-stream'; return new Response(res.blob, { status: res.status, headers: cab }); }
    if (res.corpo === null || res.corpo === undefined || res.status === 204) return new Response(null, { status: res.status === 200 && res.corpo == null ? 204 : res.status, headers: cab });
    cab['Content-Type'] = 'application/json';
    return new Response(JSON.stringify(res.corpo), { status: res.status, headers: cab });
  }

  function atraso() { return new Promise(function (r) { setTimeout(r, API.latencia); }); }

  window.fetch = async function (entrada, init) {
    var urlTexto = typeof entrada === 'string' ? entrada : (entrada && entrada.url) || String(entrada);
    if (urlTexto.indexOf(BASE) !== 0) return fetchOriginal ? fetchOriginal(entrada, init) : Promise.reject(new TypeError('fetch indisponível'));
    init = init || {};
    var metodo = String(init.method || (entrada && entrada.method) || 'GET').toUpperCase();
    var headers = normalizarHeaders(init.headers || (entrada && typeof entrada !== 'string' ? entrada.headers : null));
    var corpo = init.body;
    if (corpo === undefined && entrada && typeof entrada !== 'string' && typeof entrada.clone === 'function' && metodo !== 'GET' && metodo !== 'HEAD') {
      try { corpo = await entrada.clone().text(); } catch (e) { corpo = undefined; }
    }
    if (typeof URLSearchParams !== 'undefined' && corpo instanceof URLSearchParams) corpo = corpo.toString();
    await atraso();
    if (metodo === 'OPTIONS') return new Response(null, { status: 200, headers: CORS });
    try {
      var res = await tratar(metodo, urlTexto, headers, corpo);
      return montarResposta(res);
    } catch (e) {
      console.error('[teste] erro no mock:', e);
      return new Response(JSON.stringify({ code: 'MOCK', message: String(e && e.message || e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  };

  /* ====================================================================
   * 15) WebSocket FALSO (Realtime — protocolo Phoenix vsn 1.0.0)
   * ==================================================================== */
  function SocketFalso(url) {
    var self = this;
    this.url = url; this.readyState = 0; this.binaryType = 'blob'; this.protocol = ''; this.extensions = ''; this.bufferedAmount = 0;
    this._ouvintes = { open: [], message: [], close: [], error: [] };
    this._canais = {};                                  // topic -> {pg:[{id,event,schema,table,filter}], token}
    this._token = null;
    var q = /apikey=([^&]+)/.exec(url);
    this._token = q ? decodeURIComponent(q[1]) : null;
    sockets.push(this);
    setTimeout(function () { self.readyState = 1; self._disparar('open', { type: 'open' }); }, 5);
  }
  SocketFalso.CONNECTING = 0; SocketFalso.OPEN = 1; SocketFalso.CLOSING = 2; SocketFalso.CLOSED = 3;
  SocketFalso.prototype.CONNECTING = 0; SocketFalso.prototype.OPEN = 1; SocketFalso.prototype.CLOSING = 2; SocketFalso.prototype.CLOSED = 3;
  SocketFalso.prototype.addEventListener = function (t, f) { (this._ouvintes[t] = this._ouvintes[t] || []).push(f); };
  SocketFalso.prototype.removeEventListener = function (t, f) { this._ouvintes[t] = (this._ouvintes[t] || []).filter(function (x) { return x !== f; }); };
  SocketFalso.prototype._disparar = function (tipo, ev) {
    var h = this['on' + tipo]; if (typeof h === 'function') { try { h.call(this, ev); } catch (e) { console.error(e); } }
    (this._ouvintes[tipo] || []).forEach(function (f) { try { f(ev); } catch (e) { console.error(e); } });
  };
  SocketFalso.prototype._enviar = function (msg) {
    var self = this;
    setTimeout(function () { if (self.readyState === 1) self._disparar('message', { type: 'message', data: JSON.stringify(msg) }); }, 2);
  };
  SocketFalso.prototype.send = function (texto) {
    var m; try { m = JSON.parse(texto); } catch (e) { return; }
    var self = this;
    var resp = function (payload) { self._enviar({ topic: m.topic, event: 'phx_reply', payload: payload, ref: m.ref }); };
    if (m.event === 'heartbeat') return resp({ status: 'ok', response: {} });
    if (m.event === 'phx_join') {
      var cfg = (m.payload && m.payload.config) || {};
      var pgs = (cfg.postgres_changes || []).map(function (f, i) { return Object.assign({ id: Math.floor(Math.random() * 1e9) + i }, f); });
      this._canais[m.topic] = { pg: pgs, token: (m.payload && m.payload.access_token) || this._token };
      return resp({ status: 'ok', response: { postgres_changes: pgs } });
    }
    if (m.event === 'access_token') { if (this._canais[m.topic]) this._canais[m.topic].token = m.payload && m.payload.access_token; return resp({ status: 'ok', response: {} }); }
    if (m.event === 'phx_leave') { delete this._canais[m.topic]; return resp({ status: 'ok', response: {} }); }
    resp({ status: 'ok', response: {} });
  };
  SocketFalso.prototype.close = function () {
    if (this.readyState === 3) return;
    this.readyState = 3; var i = sockets.indexOf(this); if (i >= 0) sockets.splice(i, 1);
    this._disparar('close', { type: 'close', code: 1000, reason: '', wasClean: true });
  };
  /** Entrega um evento do banco aos canais que assinaram a tabela, respeitando a RLS de leitura. */
  SocketFalso.prototype._entregar = function (ev, db) {
    var self = this, topicos = Object.keys(this._canais);
    topicos.forEach(function (topic) {
      var c = self._canais[topic];
      var quem = null;
      try { var pl = b64urlLer(String(c.token).split('.')[1]); if (pl.role !== 'anon') quem = perfilDe(db, { id: pl.sub }); } catch (e) {}
      var linhaRef = ev.registro || ev.antigo;
      if (!linhaRef || !POLITICAS[ev.tabela] || !POLITICAS[ev.tabela].ver(quem, linhaRef)) return;
      var ids = c.pg.filter(function (f) {
        return f.schema === 'public' && f.table === ev.tabela && (f.event === '*' || f.event === ev.tipo);
      }).map(function (f) { return f.id; });
      if (!ids.length) return;
      self._enviar({ topic: topic, event: 'postgres_changes', ref: null, payload: {
        ids: ids,
        data: { schema: 'public', table: ev.tabela, commit_timestamp: agora(), type: ev.tipo, columns: [],
                record: ev.tipo === 'DELETE' ? {} : (ev.registro || {}), old_record: ev.antigo ? { id: ev.antigo.id, chave: ev.antigo.chave } : {}, errors: null }
      } });
    });
  };

  if (WebSocketOriginal) {
    window.WebSocket = new Proxy(WebSocketOriginal, {
      construct: function (alvo, args) {
        if (String(args[0]).indexOf('wss://teste.supabase.co') === 0 || String(args[0]).indexOf(BASE.replace('https', 'wss')) === 0) return new SocketFalso(String(args[0]));
        return new alvo(args[0], args[1], args[2]);
      }
    });
  } else window.WebSocket = SocketFalso;

  /* ====================================================================
   * 16) IMAGENS DO STORAGE: <img src="https://teste.supabase.co/storage/..."> não passa
   *     pelo fetch, então reescrevemos o src para a foto guardada (ou um quadro cinza).
   * ==================================================================== */
  function reescreverImagem(img) {
    var s = img.getAttribute && img.getAttribute('src');
    var pref = BASE + '/storage/v1/object/public/';
    if (!s || s.indexOf(pref) !== 0) return;
    var chave = s.slice(pref.length).split('?')[0].split('/').map(decodeURIComponent).join('/');
    var db = ler(), o = db.storage[chave];
    img.setAttribute('src', o ? o.dataUrl : PLACEHOLDER);
  }
  function varrer(no) {
    if (!no || no.nodeType !== 1) return;
    if (no.tagName === 'IMG') reescreverImagem(no);
    if (no.querySelectorAll) no.querySelectorAll('img').forEach(reescreverImagem);
  }
  try {
    new MutationObserver(function (lista) {
      lista.forEach(function (m) {
        if (m.type === 'attributes') reescreverImagem(m.target);
        else m.addedNodes.forEach(varrer);
      });
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['src'] });
  } catch (e) { /* sem MutationObserver: fotos novas aparecem como link quebrado */ }

  /* ====================================================================
   * 17) API PÚBLICA PARA O TESTADOR
   * ==================================================================== */
  window.MEGA_TESTE = {
    versao: API.versao,
    base: BASE,
    /** Volta tudo aos dados de fábrica (usuários, pontos, VTs, propostas...). */
    reset: function () {
      salvar(fabrica());
      try { localStorage.removeItem('mvt_ses'); } catch (e) {}
      return 'dados de teste restaurados';
    },
    /** Retorna o estado atual do banco de mentira (para inspeção). */
    db: function () { return ler(); },
    /** Usuários de teste disponíveis. */
    usuarios: function () { return (window.MEGA_TESTE_SEED ? window.MEGA_TESTE_SEED.usuarios : []).map(function (u) { return { email: u.email, senha: u.senha, papel: u.papel }; }); },
    latencia: function (ms) { API.latencia = ms; }
  };

  // Garante que o banco exista (e que o seed tenha sido carregado).
  try { ler(); } catch (e) { console.error(e); }
})();
