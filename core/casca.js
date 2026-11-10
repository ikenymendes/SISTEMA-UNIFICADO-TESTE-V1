/* =====================================================================
   CASCA DO SISTEMA MEGA
   ---------------------------------------------------------------------
   - Um único login (Supabase Auth) para os dois sistemas.
   - Lê o perfil (papel) do usuário e monta a interface dele:
       admin       -> barra no topo com Comercial · Operacional · Usuários · Backup
       comercial   -> só o sistema Comercial, em tela cheia
       operacional -> só a Gestão Operacional, em tela cheia
       manutencao  -> Gestão Operacional (a tela de chamados do celular)
       financeiro  -> Financeiro (faturamento dos checkings concluídos)
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
    { email: 'manutencao@teste.com',  nome: 'Manutenção',    desc: 'só os chamados (celular)' },
    { email: 'financeiro@teste.com',  nome: 'Financeiro',    desc: 'só faturamentos' }
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
  var saindo = false;
  async function sair(mensagem) {
    if (saindo) return; saindo = true;           // evita clique duplo
    clearInterval(vigia);
    aviso('Saindo…');
    /* não deixa o "Sair" travar se o servidor demorar: espera no máximo 1,5 s e limpa o login deste navegador */
    try { await Promise.race([client.auth.signOut(), new Promise(function (r) { setTimeout(r, 1500); })]); } catch (e) {}
    try { sessionStorage.removeItem('mega_bv'); } catch (e) {}
    try { Object.keys(localStorage).forEach(function (k) { if (/^sb-.*-auth-token/.test(k)) localStorage.removeItem(k); }); } catch (e) {}
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
      h('div', { class: 'cartao' }, [logo('branca'), form].concat(extra).concat([h('div', { class: 'versao', text: 'versão 09/11 · 02:10' })]))
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
    boasVindas();
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
    document.querySelectorAll('.barra .item, .folha .opcao, .trilho .it').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-id') === id); });
    var t = document.querySelector('.menu-m .atual'); if (t && infoItem(id)) t.textContent = infoItem(id).rotulo;
  }

  function fecharFolha() { var f = document.querySelector('.folha'); if (f) f.hidden = true; var m = document.querySelector('.menu-m'); if (m) m.setAttribute('aria-expanded', 'false'); }

  function saudacao() {
    var hr = new Date().getHours();
    return hr < 12 ? 'Bom dia' : hr < 18 ? 'Boa tarde' : 'Boa noite';
  }
  var DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  function dataExtensa(d) { return DIAS[d.getDay()].replace(/^./, function (c) { return c.toUpperCase(); }) + ', ' + d.getDate() + ' de ' + MESES[d.getMonth()]; }
  function horaCurta(d) { return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }

  /* Cidade (pelo IP) e temperatura agora. Quem estiver em Contagem ganha a brincadeira 🎃.
     Fica guardado por 30 min na sessão para não consultar a cada tela. */
  var CLIMA_EMO = function (c, dia) {
    if (c === 0) return dia ? '☀️' : '🌙'; if (c <= 2) return dia ? '🌤️' : '☁️'; if (c === 3) return '☁️';
    if (c === 45 || c === 48) return '🌫️'; if (c >= 51 && c <= 67) return '🌧️'; if (c >= 71 && c <= 77) return '❄️';
    if (c >= 80 && c <= 82) return '🌦️'; if (c >= 95) return '⛈️'; return '🌡️';
  };
  var climaPend = null;
  function clima(cb) {
    try { var c = JSON.parse(sessionStorage.getItem('mega_clima') || 'null'); if (c && Date.now() - c.t < 18e5) { cb(c.txt); return; } } catch (e) {}
    if (!climaPend) climaPend = (async function () {
      var loc = null;
      try { var r = await fetch('https://ipwho.is/?fields=success,city,latitude,longitude&lang=pt-BR'); var j = await r.json(); if (j && j.success !== false && j.city) loc = { cidade: j.city, lat: j.latitude, lng: j.longitude }; } catch (e) {}
      if (!loc) { try { var r2 = await fetch('https://ipapi.co/json/'); var j2 = await r2.json(); if (j2 && j2.city) loc = { cidade: j2.city, lat: j2.latitude, lng: j2.longitude }; } catch (e) {} }
      if (!loc) return '';
      var nome = /^contagem$/i.test(String(loc.cidade).trim()) ? 'CONTAGEM DAS ABÓBORAS 🎃' : loc.cidade, temp = '';
      try { var w = await (await fetch('https://api.open-meteo.com/v1/forecast?latitude=' + loc.lat + '&longitude=' + loc.lng + '&current=temperature_2m,weather_code,is_day&timezone=auto')).json();
        if (w && w.current && w.current.temperature_2m != null) temp = Math.round(w.current.temperature_2m) + '°C ' + CLIMA_EMO(w.current.weather_code, w.current.is_day); } catch (e) {}
      var txt = '📍 ' + nome + (temp ? '  ·  ' + temp : '');
      try { sessionStorage.setItem('mega_clima', JSON.stringify({ t: Date.now(), txt: txt })); } catch (e) {}
      return txt;
    })();
    climaPend.then(function (t) { if (t) cb(t); });
  }
  function climaEl(cls) { var el = h('div', { class: cls }); clima(function (t) { el.textContent = t; el.classList.add('ok'); }); return el; }

  /* Início: a MESMA tela para todos os perfis (muda só o que aparece nos atalhos) */
  /* Boas-vindas rápida (~2 s): saudação, data e hora, em vidro suave com as cores Mega. Uma vez por entrada. */
  function boasVindas() {
    try { if (sessionStorage.getItem('mega_bv')) return; sessionStorage.setItem('mega_bv', '1'); } catch (e) {}
    var d = new Date(), pn = primeiroNome();
    var el = h('div', { class: 'bv', role: 'status' }, [
      h('div', { class: 'bv-bg' }),
      h('div', { class: 'bv-card' }, [
        logo('branca'),
        h('div', { class: 'bv-sau', text: saudacao() + (pn ? ', ' + pn : '') }),
        h('div', { class: 'bv-hora', text: horaCurta(d) }),
        h('div', { class: 'bv-data', text: dataExtensa(d) }),
        climaEl('bv-local'),
        h('div', { class: 'bv-barra' }, [h('i')])
      ])
    ]);
    document.body.appendChild(el);
    var fim = function () { if (!el.parentNode) return; el.classList.add('sai'); setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 450); };
    el.addEventListener('click', fim);
    setTimeout(fim, 2000);
  }

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
    var sau = h('div', { class: 'sau' }), hora = h('div', { class: 'relogio' }), data = h('div', { class: 'data' });
    function relogio() {
      var d = new Date();
      sau.textContent = saudacao() + (primeiro ? ', ' + primeiro : '');
      hora.textContent = horaCurta(d); data.textContent = dataExtensa(d);
    }
    relogio();
    var timer = setInterval(function () { if (!document.body.contains(hora)) { clearInterval(timer); return; } relogio(); }, 15000);
    return h('div', { class: 'conteudo inicio' + (cartoes.length === 1 ? ' um' : '') }, [
      h('div', { class: 'topo-inicio' }, [sau, hora, data, climaEl('ini-local')]),
      h('div', { class: 'atalhos' }, cartoes)
    ]);
  }

  function primeiroNome() {
    var p = String(perfil.nome || perfil.email || '').split(/[ @.]/)[0];
    return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
  }

  /* Interface do ADMINISTRADOR: barra lateral de vidro + painel com números e gráficos (core/admin.js) */
  function montarAdmin(perm) {
    var app = limparTela(); app.className = 'com-admin';
    var tema = (typeof ADMIN_TEMA !== 'undefined' && ADMIN_TEMA === 'branco') ? 'branco' : 'vidro';
    var adm = h('div', { class: 'adm tema-' + tema });
    var ordem = ordemItens(perm);
    var trilho = h('nav', { class: 'trilho', 'aria-label': 'Menu principal' });
    trilho.appendChild(h('img', { class: 'marca', src: 'core/assets/logoW.png', alt: 'Mega', title: 'Visão geral', onclick: function () { abrir('inicio'); } }));
    var folha = h('div', { class: 'folha', hidden: 'hidden' });
    var viuSep = false;
    ordem.forEach(function (id) {
      var i = infoItem(id);
      if (!viuSep && AREAS[id] && id !== 'inicio') { viuSep = true; trilho.appendChild(h('div', { class: 'sep-t' })); folha.appendChild(h('div', { class: 'linha' })); }
      var b = h('button', { class: 'it', 'data-id': id, type: 'button', title: i.descricao, onclick: function () { abrir(id); } });
      b.innerHTML = ADMIN.icone(id) + '<span>' + (id === 'inicio' ? 'Visão geral' : i.rotulo) + '</span>';
      trilho.appendChild(b);
      folha.appendChild(h('button', { class: 'opcao', 'data-id': id, type: 'button', onclick: function () { fecharFolha(); abrir(id); } }, [h('b', { text: id === 'inicio' ? 'Visão geral' : i.rotulo }), h('small', { text: i.descricao })]));
    });
    var sairT = h('button', { class: 'sair-t', type: 'button', title: 'Sair', onclick: function () { sair(); } }); sairT.innerHTML = ADMIN.icone('sair');
    trilho.appendChild(h('div', { class: 'fim' }, [h('div', { class: 'avatar', title: (perfil.nome || perfil.email) + ' · ' + perm.rotulo, text: (primeiroNome() || 'A').charAt(0) }), sairT]));

    folha.appendChild(h('div', { class: 'linha' }));
    folha.appendChild(h('div', { class: 'quem', text: (perfil.nome || perfil.email) + ' · ' + perm.rotulo }));
    folha.appendChild(h('button', { class: 'opcao sair-m', type: 'button', onclick: function () { sair(); } }, [h('b', { text: 'Sair' })]));
    var menuM = h('button', { class: 'menu-m', type: 'button', 'aria-expanded': 'false', onclick: function (ev) {
      ev.stopPropagation(); var abre = folha.hidden; folha.hidden = !abre; menuM.setAttribute('aria-expanded', String(abre));
    } }, [h('span', { class: 'atual', text: 'Visão geral' }), h('span', { class: 'chev', text: '▾' })]);
    document.addEventListener('click', function (ev) { if (!folha.hidden && !folha.contains(ev.target)) fecharFolha(); });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') fecharFolha(); });
    var topoM = h('div', { class: 'topo-m' }, [h('img', { src: 'core/assets/logoW.png', alt: 'Mega', onclick: function () { abrir('inicio'); } }), menuM]);

    adm.appendChild(h('div', { class: 'fundo' }));
    adm.appendChild(trilho); adm.appendChild(topoM); adm.appendChild(folha);
    adm.appendChild(h('div', { class: 'palco', id: 'palco' }));
    app.appendChild(adm);

    if (teste) {
      document.body.appendChild(h('div', { class: 'faixa-teste' }, [
        h('span', { text: 'Ambiente de testes · você está como ' + perm.rotulo }),
        h('button', { text: 'Trocar de perfil', onclick: function () { sair(); } })
      ]));
    }
    abrir(perm.inicial);
  }

  function montarInterface(perm) {
    if (perfil.papel === 'admin' && typeof ADMIN !== 'undefined') return montarAdmin(perm);
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
    if ((ehModulo && perm.modulos.indexOf(id) < 0) || (ehArea && perm.areas.indexOf(id) < 0) || (!ehModulo && !ehArea)) return;

    moduloAtual = id;
    marcar(id);
    Object.keys(painéis).forEach(function (k) { painéis[k].hidden = (k !== id); });

    if (!painéis[id]) {
      var painel = h('div', { class: 'painel' });
      if (ehModulo) {
        painel.appendChild(h('div', { class: 'carregando', text: 'Carregando ' + MODULOS[id].rotulo + '…' }));
        var f = h('iframe', { src: MODULOS[id].url, title: MODULOS[id].rotulo, allow: 'clipboard-write; fullscreen; geolocation' });
        f.addEventListener('load', function () { painel.classList.add('pronto'); if (aoPronto) aoPronto(f); });
        painel.appendChild(f);
      } else if (id === 'inicio') {
        painel.classList.add('area', 'pronto');
        if (perfil.papel === 'admin' && typeof ADMIN !== 'undefined') {
          painel.appendChild(ADMIN.inicio({ h: h, client: client, primeiro: primeiroNome(), abrir: abrir, saudacao: saudacao, dataExtensa: dataExtensa, horaCurta: horaCurta, climaEl: climaEl }));
        } else {
          painel.classList.add('inicio-' + (typeof INICIO_ESTILO !== 'undefined' ? INICIO_ESTILO : 'claro'));
          painel.appendChild(telaInicio(perm));
        }
      } else if (id === 'backup') {
        painel.classList.add('area', 'pronto');
        painel.appendChild(BACKUP.tela(client));
      } else if (id === 'usuarios') {
        painel.classList.add('area', 'pronto');
        painel.appendChild(USUARIOS.tela(client, perfil.id));      } else if (id === 'avisos' && typeof AVISOS !== 'undefined') {
        painel.classList.add('area', 'pronto');
        painel.appendChild(AVISOS.tela(client, perfil));
      }
      painéis[id] = painel;
      $('#palco').appendChild(painel);
    } else if (aoPronto) {
      var fr = painéis[id].querySelector('iframe'); if (fr) aoPronto(fr);
    }
    if (id === 'backup') BACKUP.atualizar && BACKUP.atualizar();
    if (id === 'usuarios') USUARIOS.atualizar();
    if (id === 'avisos' && typeof AVISOS !== 'undefined') AVISOS.atualizar();
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
