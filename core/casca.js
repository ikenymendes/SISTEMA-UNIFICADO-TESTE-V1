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
    if (/rate limit|too many|429/i.test(m)) return 'Muitas tentativas de entrar. Aguarde alguns minutos e tente de novo.';
    return m;
  }

  /* ---------- limite de tentativas de login (neste aparelho) ----------
     5 erros seguidos → espera 30 s; cada novo erro dobra a espera (até 15 min).
     Acertar a senha zera. O limite de verdade fica no Supabase (Auth → Rate Limits). */
  var TRAVA = 'mega_lg_trava';
  function travaLer() { try { return JSON.parse(localStorage.getItem(TRAVA) || '{}'); } catch (e) { return {}; } }
  function travaGravar(t) { try { localStorage.setItem(TRAVA, JSON.stringify(t)); } catch (e) {} }
  function travaFalta() { var t = travaLer(); return t.ate && t.ate > Date.now() ? Math.ceil((t.ate - Date.now()) / 1000) : 0; }
  function travaErro() {
    var t = travaLer(); t.n = (t.n || 0) + 1;
    if (t.n >= 5) t.ate = Date.now() + Math.min(900, 30 * Math.pow(2, t.n - 5)) * 1000;
    travaGravar(t);
  }
  function travaZerar() { try { localStorage.removeItem(TRAVA); } catch (e) {} }
  function travaTxt(s) { return s >= 60 ? Math.ceil(s / 60) + ' min' : s + ' s'; }

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
    try { await Promise.race([client.auth.signOut({ scope: 'local' }), new Promise(function (r) { setTimeout(r, 1500); })]); } catch (e) {}
    try { sessionStorage.removeItem('mega_bv'); sessionStorage.removeItem('mega_aba'); } catch (e) {}
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

  function marcaMega(cls) {
    return h('div', { class: cls || 'mg-logo' }, [
      h('img', { class: 'm', src: 'core/assets/marca.png', alt: '' }),
      h('img', { class: 'p', src: 'core/assets/palavra.png', alt: 'Mega Mídia OOH' })
    ]);
  }

  /* rastro "cometa": uma trilha rosa suave segue o mouse por trás do cartão de vidro e vai sumindo */
  function seguirMouse(tela, luz) {
    if (!window.matchMedia || !matchMedia('(any-pointer: fine)').matches) return;
    var cv = h('canvas', {}); luz.appendChild(cv);
    var c = cv.getContext('2d'), W = 0, H = 0, pts = [], p = null, alvo = null, parado = 0;
    function tam() { var d = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; c.setTransform(d, 0, 0, d, 0, 0); }
    tam(); window.addEventListener('resize', tam);
    tela.addEventListener('pointermove', function (ev) { alvo = { x: ev.clientX, y: ev.clientY }; if (!p) p = { x: alvo.x, y: alvo.y }; tela.classList.add('mouse'); });
    tela.addEventListener('pointerleave', function () { tela.classList.remove('mouse'); });
    (function passo() {
      if (!document.body.contains(tela)) return;
      if (p && alvo) {
        p.x += (alvo.x - p.x) * 0.22; p.y += (alvo.y - p.y) * 0.22;
        var mov = Math.abs(alvo.x - p.x) + Math.abs(alvo.y - p.y) > .5;
        if (mov || parado++ < 2) pts.push({ x: p.x, y: p.y, v: 1 }); if (mov) parado = 0;
      }
      c.clearRect(0, 0, W, H);
      pts.forEach(function (q) { q.v *= 0.93; });
      pts = pts.filter(function (q) { return q.v > 0.04; });
      pts.forEach(function (q) {
        var r = 18 + 70 * q.v, g = c.createRadialGradient(q.x, q.y, 0, q.x, q.y, r);
        g.addColorStop(0, 'rgba(255,61,134,' + (0.10 * q.v) + ')'); g.addColorStop(1, 'rgba(255,61,134,0)');
        c.fillStyle = g; c.beginPath(); c.arc(q.x, q.y, r, 0, 6.3); c.fill();
      });
      requestAnimationFrame(passo);
    })();
  }

  /* fumaça rosa atrás do vidro do admin: uma tela bem pequena (barata) ampliada e desfocada pelo CSS,
     com algumas nuvens rosa/roxas seguindo caminhos suaves. Para sozinha quando a aba fica escondida. */
  function fumacaRosa(cv) {
    var W = 96, H = 60, x = cv.getContext && cv.getContext('2d');
    if (!x) return;
    cv.width = W; cv.height = H;
    var cores = ['255,0,102', '255,61,134', '192,38,211', '255,0,102', '124,58,237', '255,92,154'];
    var P = [];
    for (var i = 0; i < 8; i++) P.push({ ax: Math.random() * 6.28, ay: Math.random() * 6.28, sx: .00012 + Math.random() * .00016, sy: .0001 + Math.random() * .00014,
      r: 16 + Math.random() * 20, c: cores[i % cores.length], cx: .15 + Math.random() * .7, cy: .15 + Math.random() * .7 });
    var ult = 0;
    (function quadro(t) {
      if (!document.body.contains(cv)) return;
      requestAnimationFrame(quadro);
      if (t - ult < 40) return; /* ~25 quadros por segundo: suave e leve */
      ult = t;
      x.clearRect(0, 0, W, H); x.globalCompositeOperation = 'lighter';
      for (var k = 0; k < P.length; k++) {
        var p = P[k],
          px = (p.cx + .4 * Math.sin(t * p.sx + p.ax) + .16 * Math.sin(t * p.sx * 2.3 + k)) * W,
          py = (p.cy + .36 * Math.cos(t * p.sy + p.ay) + .14 * Math.sin(t * p.sy * 1.7 + k * 2)) * H,
          r = p.r * (1 + .25 * Math.sin(t * .0004 + k));
        var g = x.createRadialGradient(px, py, 0, px, py, r);
        g.addColorStop(0, 'rgba(' + p.c + ',.24)'); g.addColorStop(1, 'rgba(' + p.c + ',0)');
        x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 6.29); x.fill();
      }
    })(0);
  }

  /* ao entrar: os campos descem e o cartão se dissolve; em seguida vem a boas-vindas com o "M" acendendo */
  function abertura(tela) {
    return new Promise(function (ok) {
      if (!tela) return ok();
      tela.classList.add('saindo');
      setTimeout(ok, 620);
    });
  }

  function telaLogin(mensagem) {
    var app = limparTela();
    var emailSalvo = ''; try { emailSalvo = localStorage.getItem('mega_email') || ''; } catch (e) {}
    var inEmail = h('input', { type: 'email', id: 'em', autocomplete: 'username', required: 'required', value: emailSalvo, placeholder: 'seu e-mail', 'aria-label': 'E-mail', inputmode: 'email', autocapitalize: 'off', spellcheck: 'false' });
    var inSenha = h('input', { type: 'password', id: 'se', autocomplete: 'current-password', required: 'required', placeholder: 'sua senha', 'aria-label': 'Senha' });
    var lembrar = h('input', { type: 'checkbox', id: 'lb' }); var lx = ''; try { lx = localStorage.getItem('mega_email_x'); } catch (e) {} lembrar.checked = !!emailSalvo || !lx;
    var erro = h('div', { class: 'erro', hidden: 'hidden', role: 'alert' });
    var btn = h('button', { class: 'btn', type: 'submit' }, [h('span', { text: 'Entrar' }), h('span', { class: 'seta', text: '→' })]);
    var olho = h('button', { class: 'olho', type: 'button', title: 'Mostrar senha', 'aria-label': 'Mostrar senha', text: '👁', onclick: function () {
      var ver = inSenha.type === 'password'; inSenha.type = ver ? 'text' : 'password'; olho.classList.toggle('on', ver); olho.title = ver ? 'Esconder senha' : 'Mostrar senha'; inSenha.focus();
    } });

    var relogio = null;
    function esperar() {
      var f = travaFalta();
      clearInterval(relogio);
      if (!f) { btn.disabled = false; btn.firstChild.textContent = 'Entrar'; return false; }
      btn.disabled = true;
      erro.textContent = 'Muitas tentativas com senha errada. Tente de novo em ' + travaTxt(f) + '.'; erro.hidden = false;
      btn.firstChild.textContent = 'Aguarde ' + travaTxt(f);
      relogio = setInterval(function () {
        var g = travaFalta();
        if (!document.body.contains(btn)) return clearInterval(relogio);
        if (!g) { clearInterval(relogio); btn.disabled = false; btn.firstChild.textContent = 'Entrar'; erro.hidden = true; return; }
        btn.firstChild.textContent = 'Aguarde ' + travaTxt(g);
        erro.textContent = 'Muitas tentativas com senha errada. Tente de novo em ' + travaTxt(g) + '.';
      }, 1000);
      return true;
    }

    async function entrar(email, senha) {
      if (esperar()) return;
      btn.disabled = true; btn.firstChild.textContent = 'Entrando…'; erro.hidden = true;
      try {
        var r = await client.auth.signInWithPassword({ email: email.trim(), password: senha });
        if (r.error) {
          if (/invalid login|invalid_credentials/i.test(r.error.message || '')) travaErro();
          throw r.error;
        }
        travaZerar();
        try {
          if (lembrar.checked) { localStorage.setItem('mega_email', email.trim()); localStorage.removeItem('mega_email_x'); }
          else { localStorage.removeItem('mega_email'); localStorage.setItem('mega_email_x', '1'); }
        } catch (e) {}
        sessaoAtual = r.data.session;
        await abertura(tela);
        await depoisDoLogin();
      } catch (e) {
        erro.textContent = msgErro(e); erro.hidden = false;
        btn.disabled = false; btn.firstChild.textContent = 'Entrar';
        cartao.classList.remove('treme'); void cartao.offsetWidth; cartao.classList.add('treme');
        esperar();
      }
    }

    var campo = function (ico, input, extra) { return h('label', { class: 'campo' }, [h('span', { class: 'ico', text: ico, 'aria-hidden': 'true' }), input].concat(extra || [])); };
    var form = h('form', { onsubmit: function (ev) { ev.preventDefault(); entrar(inEmail.value, inSenha.value); } }, [
      h('h1', {}, [document.createTextNode('Olá! '), h('i', { text: 'Bem-vindo' })]),
      h('p', { class: 'sub', text: 'Entre com o e-mail e a senha que o administrador criou para você.' }),
      campo('✉️', inEmail),
      campo('🔒', inSenha, [olho]),
      h('label', { class: 'lembrar' }, [lembrar, h('span', { class: 'caixa', 'aria-hidden': 'true' }), h('span', { text: 'Lembrar meu e-mail' })]),
      erro, btn
    ]);

    if (mensagem) { erro.textContent = mensagem; erro.hidden = false; }
    setTimeout(esperar, 0); /* se este aparelho ainda estiver na espera, já mostra a contagem */

    var extra = [];
    if (teste) {
      var grade = h('div', { class: 'grade' }, USUARIOS_TESTE.map(function (u) {
        return h('button', { type: 'button', onclick: function () { entrar(u.email, 'teste123'); } }, [h('span', { text: u.nome }), h('small', { text: u.desc })]);
      }));
      extra.push(h('div', { class: 'teste-box' }, [h('b', { text: 'Ambiente de testes · entrar como' }), grade]));
    }

    var cartao = h('div', { class: 'cartao' }, [form].concat(extra));
    var luz = h('div', { class: 'lg-luz', 'aria-hidden': 'true' });
    var tela = h('div', { class: 'login' }, [
      h('div', { class: 'lg-bl b1' }), h('div', { class: 'lg-bl b2' }), h('div', { class: 'lg-bl b3' }), luz, h('div', { class: 'lg-grade' }),
      h('div', { class: 'lg-in' }, [
        marcaMega('mg-logo'),
        cartao,
        h('div', { class: 'versao', text: 'Mega Mídia OOH · sistema unificado · versão 11/11' })
      ])
    ]);
    app.appendChild(tela);
    seguirMouse(tela, luz);
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
    /* luz do "circuito": corre pelo fio até o item escolhido */
    document.querySelectorAll('.trilho.circ .c-grp').forEach(function (g) {
      var on = g.querySelector('.it.on'); g.classList.toggle('tem', !!on);
      if (on) g.querySelector('.c-pulso').style.top = (on.offsetTop + 6) + 'px';
    });
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
    var d = new Date(), pn = primeiroNome(), moto = perfil && perfil.papel === 'motoboy';
    var dem = h('div', { class: 'bv-dem' });
    var el = h('div', { class: 'bv' + (moto ? ' moto' : ''), role: 'status' }, [
      h('div', { class: 'bv-bg' }), h('div', { class: 'lg-grade' }), h('div', { class: 'bv-halo' }),
      h('div', { class: 'bv-top' }, [
        h('div', { class: 'bv-mk' }, [h('img', { src: 'core/assets/marca.png', alt: '' })]),
        h('img', { class: 'bv-pl', src: 'core/assets/palavra.png', alt: 'Mega Mídia OOH' }),
        h('div', { class: 'bv-sau' }, pn ? [document.createTextNode((moto ? 'Bem-vindo' : saudacao()) + ', '), h('i', { text: pn }), document.createTextNode(' 👋')] : [document.createTextNode(saudacao() + ' 👋')]),
        h('div', { class: 'bv-hora', text: horaCurta(d) }),
        h('div', { class: 'bv-data', text: dataExtensa(d) }),
        climaEl('bv-local')
      ]),
      moto ? dem : h('div', { class: 'bv-barra' }, [h('i')])
    ]);
    document.body.appendChild(el);
    var fim = function () { if (!el.parentNode) return; el.classList.add('sai'); setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 450); };
    if (!moto) { el.addEventListener('click', fim); setTimeout(fim, 3200); return; }

    /* motoboy: depois da animação mostra as demandas do dia */
    var kpi = function (cls, rot) { var b = h('b', { text: '–' }); return { el: h('div', { class: 'k ' + cls }, [b, h('span', { text: rot })]), b: b }; };
    var kp = kpi('p', 'pontos para visitar'), kf = kpi('f', 'fotos pendentes'), ka = kpi('a', '⚠ atrasadas (3+ dias)'), kr = kpi('r', 'para refazer');
    var tit = h('h3', { text: 'Bora fazer as fotos? 📸' });
    var go = h('button', { class: 'go', type: 'button', text: 'Começar pelo mais perto →', onclick: fim });
    dem.appendChild(h('small', { text: 'SUAS DEMANDAS DE HOJE' }));
    dem.appendChild(tit);
    dem.appendChild(h('div', { class: 'g' }, [kp.el, kf.el, ka.el, kr.el]));
    dem.appendChild(go);
    var conta = function (k, n) {
      var i = 0, passo = Math.max(1, Math.ceil(n / 25));
      if (!n) { k.b.textContent = '0'; return; }
      var t = setInterval(function () { i = Math.min(n, i + passo); k.b.textContent = i; if (i >= n) clearInterval(t); }, Math.max(30, 700 / Math.min(n, 25)));
    };
    var dados = demandasMotoboy();
    setTimeout(function () {
      el.classList.add('fase2');
      dados.then(function (r) {
        if (!r) { tit.textContent = 'Suas fotos estão te esperando 📸'; [kp, kf, ka, kr].forEach(function (k) { k.b.textContent = '·'; }); return; }
        if (!r.fotos) { tit.textContent = 'Tudo em dia por aqui! 🎉'; go.textContent = 'Ver minhas fotos →'; }
        conta(kp, r.pontos); conta(kf, r.fotos); conta(ka, r.atr); conta(kr, r.rf);
        if (!r.atr) ka.el.classList.add('zero');
      });
    }, 3200);
  }

  /* mesmas regras da tela "Fotos perto de você": cliente no ar hoje, foto pendente ou para refazer, sem problema relatado */
  async function demandasMotoboy() {
    try {
      var hoje = (function () { var x = new Date(); return new Date(x - x.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); })();
      var rs = await Promise.all([
        client.from('registros').select('chave,tipo,dados').in('tipo', ['vt', 'ft']).eq('excluido', false),
        client.from('registros').select('chave').in('tipo', ['fx', 'vr']).eq('excluido', false)
      ]);
      if (rs[0].error || rs[1].error) return null;
      var pontos = {}, fotos = {}, ok = {};
      rs[1].data.forEach(function (r) { ok[r.chave.split(':').slice(1).join(':')] = 1; });
      rs[0].data.forEach(function (r) { if (r.tipo === 'ft') fotos[r.chave.slice(3)] = r.dados || {}; });
      var res = { pontos: 0, fotos: 0, atr: 0, rf: 0 };
      rs[0].data.forEach(function (r) {
        if (r.tipo !== 'vt') return;
        var v = r.dados || {};
        if (v.man && v.conc) return;
        if ((v.ini && v.ini > hoje) || (v.fim && v.fim < hoje)) return;
        var dias = v.ini ? Math.round((new Date(hoje + 'T12:00:00') - new Date(v.ini + 'T12:00:00')) / 864e5) : 0;
        (v.paineis || []).forEach(function (pid) {
          if (!ok[pid]) return;
          var f = fotos[v.id + '__' + pid] || {}, st = f.status || 'pendente';
          if ((st !== 'pendente' && st !== 'refazer') || f.prob) return;
          res.fotos++; pontos[pid] = 1;
          if (st === 'refazer') res.rf++;
          if (dias >= 3) res.atr++;
        });
      });
      res.pontos = Object.keys(pontos).length;
      return res;
    } catch (e) { return null; }
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
    var trilho = h('nav', { class: 'trilho circ', 'aria-label': 'Menu principal' });
    var topoT = h('div', { class: 'c-marca', title: 'Visão geral', onclick: function () { abrir('inicio'); } }, [h('img', { src: 'core/assets/marca.png', alt: 'Mega' }), h('div', {}, [h('b', { text: 'Mega OOH' }), h('span', { text: 'Administração' })])]);
    trilho.appendChild(topoT);
    var lista = h('div', { class: 'c-lista' }); trilho.appendChild(lista);
    var folha = h('div', { class: 'folha', hidden: 'hidden' });
    /* grupos do menu: cada um com a sua cor ("circuito") */
    var GRUPOS = [
      { n: 'Geral', c: '#ff4d8d', ids: ['inicio', 'avisos'] },
      { n: 'Módulos', c: '#5cc8ff', ids: ['comercial', 'operacional', 'financeiro'] },
      { n: 'Ferramentas', c: '#ffb547', ids: ['r2', 'pi', 'protocolo'] },
      { n: 'Sistema', c: '#b98cff', ids: ['usuarios', 'backup'] }
    ];
    var usados = {};
    GRUPOS.forEach(function (g) { g.ids = g.ids.filter(function (id) { return ordem.indexOf(id) >= 0; }); g.ids.forEach(function (id) { usados[id] = 1; }); });
    var resto = ordem.filter(function (id) { return !usados[id]; });
    if (resto.length) GRUPOS[1].ids = GRUPOS[1].ids.concat(resto);
    GRUPOS.forEach(function (g) {
      if (!g.ids.length) return;
      var gr = h('div', { class: 'c-grp', style: '--c:' + g.c }, [h('i', { class: 'c-pulso' }), h('h5', {}, [h('i'), h('span', { text: g.n })])]);
      folha.appendChild(h('div', { class: 'f-grp', style: '--c:' + g.c, text: g.n }));
      g.ids.forEach(function (id) {
        var i = infoItem(id), nome = id === 'inicio' ? 'Visão geral' : i.rotulo;
        var b = h('button', { class: 'it', 'data-id': id, type: 'button', title: i.descricao, onclick: function () { abrir(id); } });
        b.innerHTML = '<span class="ic">' + ADMIN.icone(id) + '</span><span class="tx">' + nome + '</span>';
        gr.appendChild(b);
        folha.appendChild(h('button', { class: 'opcao', 'data-id': id, type: 'button', style: '--c:' + g.c, onclick: function () { fecharFolha(); abrir(id); } }, [h('b', { text: nome }), h('small', { text: i.descricao })]));
      });
      lista.appendChild(gr);
    });
    var sairT = h('button', { class: 'sair-t', type: 'button', title: 'Sair', onclick: function () { sair(); } }); sairT.innerHTML = ADMIN.icone('sair');
    trilho.appendChild(h('div', { class: 'c-rod' }, [h('div', { class: 'avatar', text: (primeiroNome() || 'A').charAt(0) }), h('div', { class: 'quem-t' }, [h('b', { text: primeiroNome() || 'Admin' }), h('span', { text: perm.rotulo })]), sairT]));

    folha.appendChild(h('div', { class: 'linha' }));
    folha.appendChild(h('div', { class: 'quem', text: (perfil.nome || perfil.email) + ' · ' + perm.rotulo }));
    folha.appendChild(h('button', { class: 'opcao sair-m', type: 'button', onclick: function () { sair(); } }, [h('b', { text: 'Sair' })]));
    var menuM = h('button', { class: 'menu-m', type: 'button', 'aria-expanded': 'false', onclick: function (ev) {
      ev.stopPropagation(); var abre = folha.hidden; folha.hidden = !abre; menuM.setAttribute('aria-expanded', String(abre));
    } }, [h('span', { class: 'atual', text: 'Visão geral' }), h('span', { class: 'chev', text: '▾' })]);
    document.addEventListener('click', function (ev) { if (!folha.hidden && !folha.contains(ev.target)) fecharFolha(); });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') fecharFolha(); });
    var topoM = h('div', { class: 'topo-m' }, [h('img', { src: 'core/assets/logoW.png', alt: 'Mega', onclick: function () { abrir('inicio'); } }), menuM]);

    var fum = h('canvas', { class: 'fumaca', 'aria-hidden': 'true' });
    adm.appendChild(h('div', { class: 'fundo' }, [fum]));
    fumacaRosa(fum);
    adm.appendChild(trilho); adm.appendChild(topoM); adm.appendChild(folha);
    adm.appendChild(h('div', { class: 'palco', id: 'palco' }));
    app.appendChild(adm);

    if (teste) {
      document.body.appendChild(h('div', { class: 'faixa-teste' }, [
        h('span', { text: 'Ambiente de testes · você está como ' + perm.rotulo }),
        h('button', { text: 'Trocar de perfil', onclick: function () { sair(); } })
      ]));
    }
    abrirInicial(perm);
  }

  function montarInterface(perm) {
    if (perfil.papel === 'admin' && typeof ADMIN !== 'undefined') return montarAdmin(perm);
    var app = limparTela();
    /* motoboy: o módulo ocupa a tela inteira (tem o próprio topo com Sair) */
    var comBarra = perfil.papel !== 'motoboy' && (perm.modulos.length > 1 || perm.areas.length > 0);
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

    abrirInicial(perm);
  }

  function pode(id) {
    var perm = PERMISSOES[perfil.papel];
    var ehModulo = !!MODULOS[id], ehArea = !!AREAS[id];
    return !((ehModulo && perm.modulos.indexOf(id) < 0) || (ehArea && perm.areas.indexOf(id) < 0) || (!ehModulo && !ehArea));
  }

  /* Volta para a aba em que a pessoa estava (F5 não leva mais para a Visão geral) e,
     depois, deixa os outros módulos carregando em segundo plano para a troca ser instantânea. */
  function abrirInicial(perm) {
    var salvo = ''; try { salvo = sessionStorage.getItem('mega_aba') || ''; } catch (e) {}
    abrir(salvo && pode(salvo) ? salvo : perm.inicial);
    var fila = perm.modulos.filter(function (m) { return !painéis[m]; }), passo = 0;
    function proximo() {
      var m = fila.shift(); if (!m) return;
      if (!painéis[m]) criarPainel(m, null, true);
      setTimeout(function () { (window.requestIdleCallback || function (f) { setTimeout(f, 1); })(proximo); }, 1800);
    }
    /* no celular não pré-carrega (economiza dados e memória); lá cada módulo continua aberto depois da 1ª visita */
    if (window.matchMedia && matchMedia('(min-width: 900px)').matches) setTimeout(proximo, 2500);
  }

  /* Abre (e mantém vivo) um módulo ou área. Módulos sem permissão nunca são baixados. */
  function abrir(id, aoPronto) {
    if (!pode(id)) return;
    moduloAtual = id;
    marcar(id);
    try { sessionStorage.setItem('mega_aba', id); } catch (e) {}
    if (!painéis[id]) criarPainel(id, aoPronto, false);
    else if (aoPronto) { var fr = painéis[id].querySelector('iframe'); if (fr) aoPronto(fr); }
    Object.keys(painéis).forEach(function (k) { painéis[k].classList.toggle('fora', k !== id); });
    if (id === 'backup') BACKUP.atualizar && BACKUP.atualizar();
    if (id === 'usuarios') USUARIOS.atualizar();
    if (id === 'avisos' && typeof AVISOS !== 'undefined') AVISOS.atualizar();
    if (id === 'pi' && painéis[id] && painéis[id].firstChild && painéis[id].firstChild.atualizar) painéis[id].firstChild.atualizar();
    if (id === 'protocolo' && painéis[id] && painéis[id].firstChild && painéis[id].firstChild.atualizar) painéis[id].firstChild.atualizar();
  }

  function criarPainel(id, aoPronto, fundo) {
    var perm = PERMISSOES[perfil.papel], ehModulo = !!MODULOS[id];
    {
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
        painel.appendChild(USUARIOS.tela(client, perfil.id));      } else if (id === 'pi' && typeof PI !== 'undefined') {
        painel.classList.add('area', 'pronto');
        painel.appendChild(PI.tela(client, perfil));
      } else if (id === 'protocolo' && typeof PROTOCOLO !== 'undefined') {
        painel.classList.add('area', 'pronto');
        painel.appendChild(PROTOCOLO.tela(client, perfil));
      } else if (id === 'avisos' && typeof AVISOS !== 'undefined') {
        painel.classList.add('area', 'pronto');
        painel.appendChild(AVISOS.tela(client, perfil));
      }
      if (fundo) painel.classList.add('fora');
      painéis[id] = painel;
      $('#palco').appendChild(painel);
    }
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
