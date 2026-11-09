/* =====================================================================
   CASCA DO SISTEMA MEGA
   ---------------------------------------------------------------------
   - Um único login (Supabase Auth) para os dois sistemas.
   - Lê o perfil (papel) do usuário e monta a interface dele:
       admin       -> barra no topo com Comercial · Operacional · Usuários · Backup
       comercial   -> só o sistema Comercial, em tela cheia
       operacional -> só a Gestão Operacional, em tela cheia
       manutencao  -> Gestão Operacional (a tela de chamados do celular)
   - Só carrega (baixa) o módulo que o perfil pode usar.
   - Oferece a "ponte" (window.MEGA) que os módulos usam para pegar a
     sessão, renovar o login e sair.
   ===================================================================== */
var MEGA = (function () {
  var cfg = window.MEGA_CONFIG || {};
  var client = null;          // cliente Supabase único (compartilhado com os módulos)
  var perfil = null;          // linha de public.profiles do usuário logado
  var sessaoAtual = null;     // última sessão conhecida (leitura síncrona para o Operacional)
  var painéis = {};           // módulos já abertos: { id: elemento }
  var moduloAtual = null;
  var vigia = null;

  var teste = !!cfg.MODO_TESTE;
  var USUARIOS_TESTE = [
    { email: 'admin@teste.com',       nome: 'Administrador', desc: 'vê tudo' },
    { email: 'comercial@teste.com',   nome: 'Comercial',     desc: 'só o sistema comercial' },
    { email: 'operacional@teste.com', nome: 'Operacional',   desc: 'só a gestão operacional' },
    { email: 'manutencao@teste.com',  nome: 'Manutenção',    desc: 'só os chamados (celular)' }
  ];

  /* ---------- utilidades ---------- */
  function $(sel, raiz) { return (raiz || document).querySelector(sel); }
  function h(tag, attrs, filhos) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'text') el.textContent = attrs[k];
      else if (k === 'html') el.innerHTML = attrs[k];
      else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), attrs[k]);
      else el.setAttribute(k, attrs[k]);
    });
    (filhos || []).forEach(function (f) { if (f) el.appendChild(f); });
    return el;
  }
  function aviso(texto, erro) {
    var a = $('#aviso'); a.textContent = texto; a.className = 'aviso on' + (erro ? ' err' : '');
    clearTimeout(aviso.t); aviso.t = setTimeout(function () { a.className = 'aviso'; }, 4200);
  }
  function limparTela() { var app = $('#app'); app.innerHTML = ''; app.className = ''; return app; }
  function configurado() {
    return cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !/COLE_AQUI/.test(cfg.SUPABASE_URL + cfg.SUPABASE_ANON_KEY);
  }
  function msgErro(e) {
    var m = (e && (e.message || e.error_description)) || String(e || '');
    if (/invalid login|invalid_credentials|Invalid login/i.test(m)) return 'E-mail ou senha incorretos.';
    if (/failed to fetch|network/i.test(m)) return 'Sem conexão com o servidor. Verifique a internet.';
    return m;
  }

  /* ---------- ponte com os módulos (usada pelo Operacional e pelo Comercial) ---------- */
  function paraFormatoOperacional(s) {
    if (!s) return null;
    return {
      access: s.access_token, refresh: s.refresh_token,
      exp: (s.expires_at ? s.expires_at * 1000 : Date.now() + 3600000),
      uid: s.user && s.user.id, email: s.user && s.user.email
    };
  }
  /* Sessão em leitura imediata. */
  function sessao() { return paraFormatoOperacional(sessaoAtual); }
  /* Renova se estiver perto de vencer; devolve a sessão (ou null se caiu). */
  async function renovarSessao() {
    try {
      var r = await client.auth.getSession();
      var s = r.data && r.data.session;
      if (s && s.expires_at * 1000 - Date.now() > 60000) { sessaoAtual = s; return paraFormatoOperacional(s); }
      var n = await client.auth.refreshSession();
      if (n.error || !n.data.session) return null;
      sessaoAtual = n.data.session;
      return paraFormatoOperacional(sessaoAtual);
    } catch (e) { return null; }
  }
  async function sair(mensagem) {
    clearInterval(vigia);
    try { await client.auth.signOut(); } catch (e) {}
    try { sessionStorage.removeItem('mk_bv'); } catch (e) {}
    try { sessionStorage.setItem('mega_msg', mensagem || ''); } catch (e) {}
    location.reload();
  }

  /* ---------- telas ---------- */
  function logo(cor) { return h('img', { src: 'core/assets/' + (cor === 'branca' ? 'logoW.png' : 'logoC.png'), alt: 'Mega Mídia OOH' }); }

  function telaAviso(titulo, texto, botoes) {
    var app = limparTela();
    app.appendChild(h('div', { class: 'cartao-central' }, [
      h('div', { class: 'cartao' }, [logo(), h('h1', { text: titulo }), h('p', { text: texto }), h('div', { class: 'acoes' }, botoes || [])])
    ]));
  }

  function telaLogin(mensagem) {
    var app = limparTela();
    var emailSalvo = ''; try { emailSalvo = localStorage.getItem('mega_email') || ''; } catch (e) {}
    var inEmail = h('input', { type: 'email', id: 'em', autocomplete: 'username', required: 'required', value: emailSalvo, placeholder: 'voce@megamidiaooh.com.br' });
    var inSenha = h('input', { type: 'password', id: 'se', autocomplete: 'current-password', required: 'required', placeholder: '••••••••' });
    var lembrar = h('input', { type: 'checkbox', id: 'lb' }); lembrar.checked = !!emailSalvo;
    var erro = h('div', { class: 'erro', hidden: 'hidden' });
    var btn = h('button', { class: 'btn', type: 'submit', text: 'Entrar' });

    async function entrar(email, senha) {
      btn.disabled = true; btn.textContent = 'Entrando…'; erro.hidden = true;
      try {
        var r = await client.auth.signInWithPassword({ email: email.trim(), password: senha });
        if (r.error) throw r.error;
        try { if (lembrar.checked) localStorage.setItem('mega_email', email.trim()); else localStorage.removeItem('mega_email'); } catch (e) {}
        sessaoAtual = r.data.session;
        await depoisDoLogin();
      } catch (e) {
        erro.textContent = msgErro(e); erro.hidden = false;
        btn.disabled = false; btn.textContent = 'Entrar';
      }
    }

    var form = h('form', { onsubmit: function (ev) { ev.preventDefault(); entrar(inEmail.value, inSenha.value); } }, [
      h('h1', { text: 'Entrar' }),
      h('p', { class: 'sub', text: 'Use o e-mail e a senha criados pelo administrador.' }),
      h('label', { for: 'em', text: 'E-mail' }), inEmail,
      h('label', { for: 'se', text: 'Senha' }), inSenha,
      h('label', { class: 'lembrar' }, [lembrar, h('span', { text: 'Lembrar meu e-mail' })]),
      erro, btn
    ]);

    if (mensagem) { erro.textContent = mensagem; erro.hidden = false; }

    var extra = [];
    if (teste) {
      var grade = h('div', { class: 'grade' }, USUARIOS_TESTE.map(function (u) {
        return h('button', { type: 'button', onclick: function () { entrar(u.email, 'teste123'); } }, [h('span', { text: u.nome }), h('small', { text: u.desc })]);
      }));
      extra.push(h('div', { class: 'teste-box' }, [h('b', { text: 'Ambiente de testes · entrar como' }), grade]));
    }

    app.appendChild(h('div', { class: 'login' }, [
      h('div', { class: 'cartao' }, [logo('colorida'), form].concat(extra))
    ]));
    inEmail.value ? inSenha.focus() : inEmail.focus();
  }

  /* ---------- carregar perfil e montar a interface ---------- */
  async function carregarPerfil() {
    var u = sessaoAtual.user;
    var r = await client.from('profiles').select('id,email,nome,papel,ativo').eq('id', u.id).maybeSingle();
    if (r.error) throw r.error;
    return r.data;
  }

  async function depoisDoLogin() {
    var p;
    try { p = await carregarPerfil(); }
    catch (e) {
      telaAviso('Não foi possível verificar o seu acesso', msgErro(e), [
        h('button', { class: 'btn', text: 'Tentar de novo', onclick: depoisDoLogin }),
        h('button', { class: 'btn cinza', text: 'Sair', onclick: function () { sair(); } })
      ]);
      return;
    }
    if (!p) return telaAviso('Seu usuário ainda não tem perfil', 'Fale com o administrador.', [h('button', { class: 'btn cinza', text: 'Sair', onclick: function () { sair(); } })]);
    perfil = p;
    var perm = PERMISSOES[p.papel];
    if (!p.ativo || p.papel === 'bloqueado') {
      return telaAviso('Acesso bloqueado', 'O administrador bloqueou o acesso de ' + p.email + '.', [h('button', { class: 'btn cinza', text: 'Sair', onclick: function () { sair(); } })]);
    }
    if (!perm) {
      return telaAviso('Aguardando liberação', 'Você entrou como ' + p.email + '. O administrador precisa liberar o seu acesso. Depois toque em atualizar.', [
        h('button', { class: 'btn', text: 'Já fui liberado · atualizar', onclick: depoisDoLogin }),
        h('button', { class: 'btn cinza', text: 'Sair', onclick: function () { sair(); } })
      ]);
    }
    montarInterface(perm);
    vigiarPerfil();
  }

  /* Se o administrador mudar o perfil ou desativar o usuário, a tela se ajusta sozinha. */
  function vigiarPerfil() {
    clearInterval(vigia);
    vigia = setInterval(async function () {
      if (document.hidden) return;
      try {
        var p = await carregarPerfil();
        if (!p || !p.ativo || p.papel !== perfil.papel) {
          aviso('O seu acesso foi alterado pelo administrador.', true);
          setTimeout(function () { location.reload(); }, 1500);
        }
      } catch (e) { /* sem conexão: tenta na próxima */ }
    }, 30000);
  }

  /* ordem do menu do administrador: Início · módulos · (Usuários · Backup) */
  function ordemItens(perm) {
    var l = [];
    if (perm.areas.indexOf('inicio') >= 0) l.push('inicio');
    perm.modulos.forEach(function (id) { l.push(id); });
    perm.areas.forEach(function (id) { if (id !== 'inicio') l.push(id); });
    return l;
  }
  function infoItem(id) { return MODULOS[id] || AREAS[id]; }

  /* marca o item ativo (barra do computador) e o nome da seção (menu do celular) */
  function marcar(id) {
    document.querySelectorAll('.barra .item, .folha .opcao').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-id') === id); });
    var t = document.querySelector('.menu-m .atual'); if (t && infoItem(id)) t.textContent = infoItem(id).rotulo;
  }

  function fecharFolha() { var f = document.querySelector('.folha'); if (f) f.hidden = true; var m = document.querySelector('.menu-m'); if (m) m.setAttribute('aria-expanded', 'false'); }

  function saudacao() {
    var hr = new Date().getHours();
    return hr < 12 ? 'Bom dia' : hr < 18 ? 'Boa tarde' : 'Boa noite';
  }

  /* Início do administrador: a mesma tela sempre, com atalhos para tudo */
  function telaInicio(perm) {
    var primeiro = String(perfil.nome || perfil.email || '').split(/[ @.]/)[0];
    primeiro = primeiro.charAt(0).toUpperCase() + primeiro.slice(1).toLowerCase();
    var cartoes = ordemItens(perm).filter(function (id) { return id !== 'inicio'; }).map(function (id) {
      var i = infoItem(id);
      return h('button', { class: 'atalho', type: 'button', onclick: function () { abrir(id); } }, [
        h('span', { class: 'bolinha', text: i.rotulo.charAt(0) }),
        h('span', { class: 'txt' }, [h('b', { text: i.rotulo }), h('small', { text: i.descricao })]),
        h('span', { class: 'seta', text: '›' })
      ]);
    });
    return h('div', { class: 'conteudo inicio' }, [
      h('h1', { text: saudacao() + (primeiro ? ', ' + primeiro : '') }),
      h('p', { class: 'sub', text: 'O que você quer abrir?' }),
      h('div', { class: 'atalhos' }, cartoes)
    ]);
  }

  function montarInterface(perm) {
    var app = limparTela();
    var comBarra = perm.modulos.length > 1 || perm.areas.length > 0;   // só o administrador
    if (comBarra) app.className = 'com-barra';

    var palco = h('div', { class: 'palco', id: 'palco' });

    if (comBarra) {
      var ordem = ordemItens(perm);
      var itens = h('div', { class: 'itens' });
      var folha = h('div', { class: 'folha', hidden: 'hidden' });
      var viuSep = false;
      ordem.forEach(function (id) {
        var i = infoItem(id);
        if (!viuSep && AREAS[id] && id !== 'inicio') { viuSep = true; itens.appendChild(h('span', { class: 'sep' })); folha.appendChild(h('div', { class: 'linha' })); }
        itens.appendChild(h('button', { class: 'item', 'data-id': id, text: i.rotulo, title: i.descricao, onclick: function () { abrir(id); } }));
        folha.appendChild(h('button', { class: 'opcao', 'data-id': id, onclick: function () { fecharFolha(); abrir(id); } }, [h('b', { text: i.rotulo }), h('small', { text: i.descricao })]));
      });
      folha.appendChild(h('div', { class: 'linha' }));
      folha.appendChild(h('div', { class: 'quem', text: (perfil.nome || perfil.email) + ' · ' + perm.rotulo }));
      folha.appendChild(h('button', { class: 'opcao sair-m', onclick: function () { sair(); } }, [h('b', { text: 'Sair' })]));

      var menuM = h('button', { class: 'menu-m', type: 'button', 'aria-expanded': 'false', onclick: function (ev) {
        ev.stopPropagation(); var abre = folha.hidden; folha.hidden = !abre; menuM.setAttribute('aria-expanded', String(abre));
      } }, [h('span', { class: 'atual', text: 'Início' }), h('span', { class: 'chev', text: '▾' })]);
      document.addEventListener('click', function (ev) { if (!folha.hidden && !folha.contains(ev.target)) fecharFolha(); });
      document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') fecharFolha(); });

      app.appendChild(h('div', { class: 'barra' }, [
        h('img', { class: 'marca', src: 'core/assets/logoW.png', alt: 'Mega', title: 'Início', onclick: function () { abrir('inicio'); } }),
        itens,
        menuM,
        h('div', { class: 'eu' }, [
          h('span', { class: 'nome', text: perfil.nome || perfil.email }),
          h('span', { class: 'selo', text: perm.rotulo }),
          h('button', { class: 'sair', text: 'Sair', onclick: function () { sair(); } })
        ])
      ]));
      app.appendChild(folha);
    }
    app.appendChild(palco);

    if (teste) {
      document.body.appendChild(h('div', { class: 'faixa-teste' }, [
        h('span', { text: 'Ambiente de testes · você está como ' + perm.rotulo }),
        h('button', { text: 'Trocar de perfil', onclick: function () { sair(); } })
      ]));
    }

    abrir(perm.inicial);
  }

  /* Abre (e mantém vivo) um módulo ou área. Módulos sem permissão nunca são baixados. */
  function abrir(id, aoPronto) {
    var perm = PERMISSOES[perfil.papel];
    var ehModulo = !!MODULOS[id], ehArea = !!AREAS[id];
    if (id === 'usuarios') {                       // Usuários vive dentro do Comercial (aba "Usuários")
      if (perm.areas.indexOf('usuarios') < 0) return;
      return irParaUsuarios();
    }
    if ((ehModulo && perm.modulos.indexOf(id) < 0) || (ehArea && perm.areas.indexOf(id) < 0) || (!ehModulo && !ehArea)) return;

    moduloAtual = id;
    marcar(id);
    Object.keys(painéis).forEach(function (k) { painéis[k].hidden = (k !== id); });

    if (!painéis[id]) {
      var painel = h('div', { class: 'painel' });
      if (ehModulo) {
        painel.appendChild(h('div', { class: 'carregando', text: 'Carregando ' + MODULOS[id].rotulo + '…' }));
        var f = h('iframe', { src: MODULOS[id].url, title: MODULOS[id].rotulo, allow: 'clipboard-write; fullscreen' });
        f.addEventListener('load', function () { painel.classList.add('pronto'); if (aoPronto) aoPronto(f); });
        painel.appendChild(f);
      } else if (id === 'inicio') {
        painel.classList.add('area', 'pronto');
        painel.appendChild(telaInicio(perm));
      } else if (id === 'backup') {
        painel.classList.add('area', 'pronto');
        painel.appendChild(BACKUP.tela(client));
      }
      painéis[id] = painel;
      $('#palco').appendChild(painel);
    } else if (aoPronto) {
      var fr = painéis[id].querySelector('iframe'); if (fr) aoPronto(fr);
    }
    if (id === 'backup') BACKUP.atualizar && BACKUP.atualizar();
  }

  /* "Usuários" abre o Comercial já na aba de usuários (a mesma tela cria e gerencia todos os perfis). */
  function irParaUsuarios() {
    abrir('comercial', function (f) {
      var tentativas = 0;
      (function tentar() {
        var w = f.contentWindow, ok = false;
        try { ok = w && w.ME && w.ME.admin && typeof w.showTab === 'function' && w.entered; } catch (e) {}
        if (ok) { w.showTab('usuarios'); return; }
        if (++tentativas < 80) setTimeout(tentar, 250);
      })();
    });
    marcar('usuarios');
  }

  /* ---------- início ---------- */
  async function iniciar() {
    if (!configurado()) {
      return telaAviso('Falta configurar o Supabase', 'Abra o arquivo config.js e cole a "Project URL" e a "anon key" (Supabase → Project Settings → API). Veja o passo a passo no LEIA-ME.', []);
    }
    if (!window.supabase) {
      return telaAviso('Não foi possível iniciar', 'A biblioteca do Supabase não carregou. Recarregue a página.', [h('button', { class: 'btn', text: 'Recarregar', onclick: function () { location.reload(); } })]);
    }
    client = window.supabase.createClient(String(cfg.SUPABASE_URL).trim(), String(cfg.SUPABASE_ANON_KEY).trim(), {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
    /* mantém a cópia síncrona da sessão sempre atualizada (renovações automáticas) */
    client.auth.onAuthStateChange(function (evento, s) { if (s) sessaoAtual = s; });

    var msg = ''; try { msg = sessionStorage.getItem('mega_msg') || ''; sessionStorage.removeItem('mega_msg'); } catch (e) {}
    try {
      var r = await client.auth.getSession();
      if (r.data && r.data.session) { sessaoAtual = r.data.session; return depoisDoLogin(); }
    } catch (e) { /* cai no login */ }
    telaLogin(msg);
  }

  return {
    iniciar: iniciar,
    abrir: abrir,
    /* --- ponte para os módulos --- */
    get client() { return client; },
    sessao: sessao,
    renovarSessao: renovarSessao,
    sair: sair,
    perfil: function () { return perfil; }
  };
})();
