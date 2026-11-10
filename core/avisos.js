/* =====================================================================
   AVISOS · notificação do navegador
   - O ADMIN escreve um aviso (área "Avisos") e escolhe para quem vai.
   - Quem está com o sistema aberto (no navegador ou no app instalado,
     mesmo em segundo plano) recebe a notificação do navegador e um
     cartão dentro do sistema. Com o sistema totalmente fechado, o aviso
     aparece assim que a pessoa abrir.
   - Banco: supabase/09-avisos.sql
   ===================================================================== */
var AVISOS = (function () {
  var DESTINOS = [['todos', 'Todos'], ['motoboy', 'Motoboys'], ['operacional', 'Operacional'], ['manutencao', 'Manutenção'], ['comercial', 'Comercial'], ['financeiro', 'Financeiro']];
  var ROT_DEST = { todos: 'Todos', admin: 'Administradores', comercial: 'Comercial', gerente_comercial: 'Gerente comercial', operacional: 'Operacional', manutencao: 'Manutenção', motoboy: 'Motoboys', financeiro: 'Financeiro' };
  var ABRIR = [['', 'Só o aviso'], ['pm', 'Fotos perto de você'], ['fp', 'Fotos por ponto'], ['t', 'Manutenção'], ['comercial', 'Comercial'], ['financeiro', 'Financeiro']];
  var MODELOS = [
    ['📷 Fotos urgentes hoje', 'Fotos urgentes hoje', 'Temos fotos pendentes que precisam ser feitas ainda hoje. Confira a lista no app.', 'motoboy', 'pm'],
    ['🎬 Troca de vídeo', 'Troca de vídeo', 'O cliente trocou o vídeo. Refazer as fotos dos pontos dessa campanha, por favor.', 'motoboy', 'pm'],
    ['🔧 Manutenção', 'Chamado de manutenção', 'Abrimos um chamado de manutenção. Veja os detalhes no sistema.', 'manutencao', 't'],
    ['📍 Passar na base', 'Passar na base', 'Passe na base hoje, por favor.', 'motoboy', '']
  ];

  function h(tag, attrs, filhos) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') el.className = attrs[k]; else if (k === 'text') el.textContent = attrs[k];
      else if (k === 'html') el.innerHTML = attrs[k];
      else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), attrs[k]); else el.setAttribute(k, attrs[k]);
    });
    (filhos || []).forEach(function (f) { if (f) el.appendChild(f); });
    return el;
  }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function quando(iso) {
    var d = new Date(iso), hoje = new Date(), ont = new Date(Date.now() - 864e5);
    var hh = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === hoje.toDateString()) return 'hoje ' + hh;
    if (d.toDateString() === ont.toDateString()) return 'ontem ' + hh;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + hh;
  }
  function msg(e) { return (e && (e.message || e.details)) || String(e); }

  /* ------------------------------------------------------------------
     RECEBER (todos os perfis)
     ------------------------------------------------------------------ */
  var visto = 0, busy = false, pilha = null, euId = '';
  function chave() { return 'avisos_visto_' + euId; }
  function pra(a, eu) { return a.destino === 'todos' || a.destino === eu.papel || (a.destino === 'usuario' && a.destino_id === eu.id); }

  function podeNotificar() { return 'Notification' in window && Notification.permission === 'granted'; }
  /* notificação do navegador (usa o service worker quando existe: funciona também no Android e no app instalado) */
  function notificar(titulo, texto, tag, abrir) {
    if (!podeNotificar()) return;
    var op = { body: texto || '', icon: 'core/assets/app/icone-192.png', badge: 'core/assets/app/icone-192.png', tag: tag, data: { abrir: abrir || '' } };
    var sw = navigator.serviceWorker;
    (sw ? sw.getRegistration() : Promise.resolve(null)).then(function (rg) {
      if (rg) return rg.showNotification(titulo, op);
      var n = new Notification(titulo, op); n.onclick = function () { window.focus(); abrirDestino(abrir); n.close(); };
    }).catch(function () {});
  }

  function abrirDestino(x) {
    if (!x || typeof MEGA === 'undefined') return;
    if (x === 'comercial' || x === 'financeiro') return MEGA.abrir(x);
    MEGA.abrir('operacional', function (fr) {
      try { fr.contentWindow.eval("view='" + x + "';render()"); } catch (e) {}
    });
  }

  function cartao(a) {
    if (!pilha) { pilha = h('div', { class: 'avs-pilha', 'aria-live': 'polite' }); document.body.appendChild(pilha); }
    var c = h('div', { class: 'avs-card' });
    c.innerHTML = '<span class="avs-ico">🔔</span><div class="avs-tx"><b>' + esc(a.titulo) + '</b>' + (a.texto ? '<p>' + esc(a.texto) + '</p>' : '') +
      '<small>' + esc(a.criado_por_nome || 'Admin') + ' · ' + quando(a.criado_em) + '</small></div>';
    var acoes = h('div', { class: 'avs-ac' });
    if (a.abrir) acoes.appendChild(h('button', { type: 'button', class: 'ok', text: 'Abrir', onclick: function () { abrirDestino(a.abrir); c.remove(); } }));
    acoes.appendChild(h('button', { type: 'button', class: 'x', 'aria-label': 'Fechar', text: '×', onclick: function () { c.remove(); } }));
    c.appendChild(acoes);
    pilha.prepend(c);
  }

  async function buscar() {
    if (busy || typeof MEGA === 'undefined') return;
    var cli = MEGA.client, eu = MEGA.perfil && MEGA.perfil();
    if (!cli || !eu || !eu.id || !eu.ativo) return;
    if (euId !== eu.id) { euId = eu.id; visto = 0; }
    if (!visto) {
      try { visto = +localStorage.getItem(chave()) || 0; } catch (e) {}
      if (!visto) visto = Date.now() - 12 * 36e5; /* primeira vez: só as últimas 12 horas */
    }
    busy = true;
    try {
      var r = await cli.from('avisos').select('*').gt('criado_em', new Date(visto).toISOString()).order('criado_em', { ascending: true }).limit(20);
      if (r.error) throw r.error;
      (r.data || []).forEach(function (a) {
        visto = Math.max(visto, new Date(a.criado_em).getTime());
        if (!pra(a, eu)) return;
        if (a.criado_por === eu.id && a.destino !== 'usuario') return; /* não avisa quem enviou (só no teste "para mim") */
        cartao(a);
        notificar('Mega · ' + a.titulo, a.texto, 'aviso-' + a.id, a.abrir);
        cli.from('avisos_lidos').insert({ aviso_id: a.id }).then(function () {}, function () {});
      });
      try { localStorage.setItem(chave(), String(visto)); } catch (e) {}
    } catch (e) { /* sem a tabela (SQL 09 não rodado) ou sem internet: tenta depois */ }
    busy = false;
  }

  /* convite para ligar as notificações neste aparelho (precisa de um toque da pessoa) */
  function convite() {
    if (!('Notification' in window) || Notification.permission !== 'default') return;
    if (typeof MEGA === 'undefined' || !MEGA.perfil || !MEGA.perfil()) return;
    try { if (Date.now() < (+localStorage.getItem('avisos_convite_ate') || 0)) return; } catch (e) {}
    if (document.querySelector('.avs-conv')) return;
    var c = h('div', { class: 'avs-conv' });
    c.innerHTML = '<span class="avs-ico">🔔</span><div class="avs-tx"><b>Receber avisos da Mega neste aparelho?</b><small>Você é avisado quando chegar um recado ou uma foto para validar.</small></div>';
    var adiar = function (d) { try { localStorage.setItem('avisos_convite_ate', String(Date.now() + d * 864e5)); } catch (e) {} c.remove(); };
    c.appendChild(h('div', { class: 'avs-ac' }, [
      h('button', { type: 'button', class: 'ok', text: 'Ativar', onclick: function () {
        Notification.requestPermission().then(function (p) { adiar(p === 'granted' ? 3650 : 30); if (p === 'granted') notificar('Mega · Avisos ativados', 'Você vai receber os avisos neste aparelho.', 'avisos-ok'); });
      } }),
      h('button', { type: 'button', class: 'x', 'aria-label': 'Agora não', text: '×', onclick: function () { adiar(7); } })
    ]));
    document.body.appendChild(c);
  }

  function iniciar() {
    setInterval(buscar, 30000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) buscar(); });
    window.addEventListener('focus', buscar);
    /* espera o login terminar */
    var tent = 0, t = setInterval(function () {
      tent++;
      if (typeof MEGA !== 'undefined' && MEGA.perfil && MEGA.perfil()) {
        clearInterval(t); buscar(); setTimeout(convite, 4000);
        var p = new URLSearchParams(location.search).get('abrir'); if (p) setTimeout(function () { abrirDestino(p); }, 1500);
      } else if (tent > 600) clearInterval(t);
    }, 1000);
    /* clique na notificação com o sistema aberto */
    if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', function (ev) {
      if (ev.data && ev.data.tipo === 'abrir') abrirDestino(ev.data.abrir);
    });
  }

  /* ------------------------------------------------------------------
     ENVIAR (área "Avisos" do admin)
     ------------------------------------------------------------------ */
  var cliA = null, raiz = null, usuarios = [], histEl = null;
  function tela(client, perfil) {
    cliA = client;
    var dest = 'motoboy', abrir = 'pm';
    var tit = h('input', { type: 'text', maxlength: '120', placeholder: 'Ex.: Troca de vídeo urgente' });
    var txt = h('textarea', { maxlength: '600', rows: '4', placeholder: 'Escreva o recado…' });
    var pessoa = h('select', {}, [h('option', { value: '', text: 'Pessoa específica…' })]);
    var chips = h('div', { class: 'avs-chips' }), chA = h('div', { class: 'avs-chips' });
    var info = h('span', { class: 'avs-mu', text: '' }), st = h('div', { class: 'avs-st' });

    function pintaChips() {
      chips.innerHTML = ''; DESTINOS.forEach(function (d) {
        chips.appendChild(h('button', { type: 'button', class: dest === d[0] && !pessoa.value ? 'on' : '', text: d[1], onclick: function () { dest = d[0]; pessoa.value = ''; pintaChips(); conta(); } }));
      });
      chips.appendChild(pessoa);
      chA.innerHTML = ''; ABRIR.forEach(function (d) {
        chA.appendChild(h('button', { type: 'button', class: abrir === d[0] ? 'on' : '', text: d[1], onclick: function () { abrir = d[0]; pintaChips(); } }));
      });
    }
    function alvo() { return pessoa.value ? { destino: 'usuario', destino_id: pessoa.value } : { destino: dest, destino_id: null }; }
    function conta() {
      var a = alvo(), n = usuarios.filter(function (u) {
        if (!u.ativo || u.papel === 'pendente' || u.papel === 'bloqueado') return false;
        if (a.destino === 'usuario') return u.id === a.destino_id;
        return (a.destino === 'todos' || u.papel === a.destino) && u.id !== perfil.id;
      }).length;
      info.textContent = 'Vai para ' + n + (n === 1 ? ' pessoa' : ' pessoas') + ' · chega para quem estiver com o sistema aberto (ou assim que abrir)';
    }
    pessoa.addEventListener('change', function () { pintaChips(); conta(); });

    async function enviar(paraMim) {
      var t = tit.value.trim();
      if (!t) { st.textContent = 'Escreva o título do aviso.'; st.className = 'avs-st err'; tit.focus(); return; }
      var a = paraMim ? { destino: 'usuario', destino_id: perfil.id } : alvo();
      st.textContent = 'Enviando…'; st.className = 'avs-st';
      try {
        var r = await cliA.from('avisos').insert({ titulo: t, texto: txt.value.trim() || null, destino: a.destino, destino_id: a.destino_id, abrir: abrir || null, criado_por_nome: perfil.nome || perfil.email });
        if (r.error) throw r.error;
        st.textContent = paraMim ? '✔ Teste enviado para você. Ele aparece em alguns segundos.' : '✔ Aviso enviado.'; st.className = 'avs-st ok';
        if (!paraMim) { tit.value = ''; txt.value = ''; }
        if (paraMim) setTimeout(buscar, 1500);
        historico();
      } catch (e) {
        st.textContent = /relation .*avisos|does not exist/i.test(msg(e)) ? 'Falta rodar o arquivo supabase/09-avisos.sql no Supabase.' : 'Não consegui enviar: ' + msg(e);
        st.className = 'avs-st err';
      }
    }

    var mods = h('div', { class: 'avs-mods' }, MODELOS.map(function (m) {
      return h('button', { type: 'button', text: m[0], onclick: function () { tit.value = m[1]; txt.value = m[2]; dest = m[3]; abrir = m[4]; pessoa.value = ''; pintaChips(); conta(); } });
    }));
    histEl = h('div', { class: 'avs-hist' }, [h('div', { class: 'avs-mu', text: 'carregando…' })]);
    var perm = h('div', { class: 'avs-perm' });
    function pintaPerm() {
      if (!('Notification' in window)) { perm.textContent = 'Este navegador não mostra notificações. Os avisos aparecem dentro do sistema.'; return; }
      if (Notification.permission === 'granted') { perm.innerHTML = '🔔 Notificações ativadas neste aparelho.'; return; }
      perm.innerHTML = '';
      perm.appendChild(h('span', { text: Notification.permission === 'denied' ? 'As notificações estão bloqueadas neste navegador (libere no cadeado da barra de endereço).' : 'As notificações ainda não estão ativadas neste aparelho.' }));
      if (Notification.permission === 'default') perm.appendChild(h('button', { type: 'button', text: 'Ativar aqui', onclick: function () { Notification.requestPermission().then(pintaPerm); } }));
    }
    pintaPerm();

    raiz = h('div', { class: 'avs' }, [
      h('div', { class: 'avs-in' }, [
        h('section', { class: 'avs-box' }, [
          h('small', { class: 'avs-k', text: 'Admin' }),
          h('h1', { html: '🔔 Enviar <i>aviso</i>' }),
          h('label', { text: 'Para quem' }), chips,
          h('label', { text: 'Título' }), tit,
          h('label', { text: 'Mensagem' }), txt,
          h('label', { text: 'Modelos rápidos' }), mods,
          h('label', { text: 'Ao tocar, abrir' }), chA,
          h('div', { class: 'avs-row' }, [info, h('div', { class: 'avs-bts' }, [
            h('button', { type: 'button', class: 'sec', text: 'Testar em mim', onclick: function () { enviar(true); } }),
            h('button', { type: 'button', class: 'pri', text: 'Enviar agora', onclick: function () { enviar(false); } })
          ])]),
          st, perm
        ]),
        h('section', { class: 'avs-box' }, [h('small', { class: 'avs-k', text: 'Histórico' }), h('h2', { text: 'Últimos avisos' }), histEl])
      ])
    ]);
    pintaChips();
    carregarUsuarios().then(function () {
      usuarios.filter(function (u) { return u.ativo && u.papel !== 'pendente' && u.papel !== 'bloqueado'; })
        .sort(function (a, b) { return String(a.nome || a.email).localeCompare(String(b.nome || b.email)); })
        .forEach(function (u) { pessoa.appendChild(h('option', { value: u.id, text: (u.nome || u.email) + ' · ' + (ROT_DEST[u.papel] || u.papel) })); });
      conta();
    });
    historico();
    return raiz;
  }
  async function carregarUsuarios() {
    try { var r = await cliA.from('profiles').select('id,nome,email,papel,ativo'); if (!r.error) usuarios = r.data || []; } catch (e) {}
  }
  async function historico() {
    if (!histEl || !cliA) return;
    try {
      var r = await cliA.from('avisos').select('*').order('criado_em', { ascending: false }).limit(20);
      if (r.error) throw r.error;
      var L = r.data || [], ids = L.map(function (a) { return a.id; }), lidos = {};
      if (ids.length) {
        var l = await cliA.from('avisos_lidos').select('aviso_id').in('aviso_id', ids);
        (l.data || []).forEach(function (x) { lidos[x.aviso_id] = (lidos[x.aviso_id] || 0) + 1; });
      }
      var nomeDe = function (id) { var u = usuarios.filter(function (x) { return x.id === id; })[0]; return u ? (u.nome || u.email) : 'uma pessoa'; };
      histEl.innerHTML = L.length ? L.map(function (a) {
        var para = a.destino === 'usuario' ? nomeDe(a.destino_id) : (ROT_DEST[a.destino] || a.destino);
        return '<div class="avs-h"><div><b>' + esc(a.titulo) + '</b>' + (a.texto ? '<small>' + esc(a.texto) + '</small>' : '') + '</div><span>' + esc(para) + ' · ' + quando(a.criado_em) + '<br><em>' + (lidos[a.id] || 0) + ' receberam</em></span></div>';
      }).join('') : '<div class="avs-mu">Nenhum aviso enviado ainda.</div>';
    } catch (e) {
      histEl.innerHTML = '<div class="avs-mu">' + (/avisos|does not exist/i.test(msg(e)) ? 'Falta rodar o arquivo supabase/09-avisos.sql no Supabase.' : 'Não consegui carregar o histórico.') + '</div>';
    }
  }
  function atualizar() { historico(); }

  return { iniciar: iniciar, tela: tela, atualizar: atualizar, notificar: notificar, buscar: buscar };
})();
AVISOS.iniciar();
