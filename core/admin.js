/* =====================================================================
   PAINEL DO ADMINISTRADOR (visual "vidro", só para o perfil admin)
   ---------------------------------------------------------------------
   - ADMIN.icone(nome)  -> ícone SVG usado na barra lateral e nos cartões
   - ADMIN.inicio(ctx)  -> monta a tela "Visão geral" com números e gráficos
   Os demais perfis NÃO usam este arquivo: continuam com o visual padrão.
   Tudo é lido do banco com o login do próprio administrador.
   ===================================================================== */
var ADMIN = (function () {
  var ICONES = {
    inicio:      '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    comercial:   '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/>',
    financeiro: '<circle cx="12" cy="12" r="9"/><path d="M14.6 9.2A2.8 2.2 0 0012 8c-1.5 0-2.6.8-2.6 2 0 2.8 5.2 1.4 5.2 4.2 0 1.2-1.2 2-2.6 2a2.9 2.2 0 01-2.6-1.2M12 6.5V8m0 8.2v1.3"/>',
    operacional: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5"/>',
    usuarios:    '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
    avisos:      '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    r2:          '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M8 13V8h2.5a1.6 1.6 0 0 1 0 3.2H8m2.8 0L12 13m2-4.4a1.7 1.7 0 0 1 3 1c0 1.3-3 2.1-3 3.4h3"/>',
    pi:          '<path d="M6 2h9l5 5v15H6z"/><path d="M15 2v5h5"/><path d="M9 12h8M9 16h8M9 8h3"/>',
    protocolo:   '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 14l2 2 4-4"/>',
    backup:      '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/><path d="M4 11.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    sair:        '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
    tv:          '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',
    led:         '<rect x="2.5" y="3" width="19" height="12" rx="1.5"/><path d="M8 15v6M16 15v6M5.5 21h13"/><g fill="currentColor" stroke="none"><circle cx="6.5" cy="6.8" r="1"/><circle cx="10.2" cy="6.8" r="1"/><circle cx="13.8" cy="6.8" r="1"/><circle cx="17.5" cy="6.8" r="1"/><circle cx="6.5" cy="11.2" r="1"/><circle cx="10.2" cy="11.2" r="1"/><circle cx="13.8" cy="11.2" r="1"/><circle cx="17.5" cy="11.2" r="1"/></g>',
    foto:        '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    lona:        '<rect x="3" y="4" width="18" height="11" rx="1"/><path d="M7 15v6M17 15v6M3 8h18"/>',
    pin:         '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    zap:         '<path d="M4 4h16v12H4z"/><path d="M9 20h6"/><path d="M8 9l2.5 2.5L16 7"/>',
    moto:        '<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M9 17h6l-3-7h4M14 10l2-3h2"/>',
    chave:       '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
    arquivo:     '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    chat:        '<path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12z"/>',
    seta:        '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>'
  };
  function icone(nome) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONES[nome] || '') + '</svg>';
  }

  var MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  function pad(n) { return ('0' + n).slice(-2); }
  function hojeISO() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function horasTxt(h) {
    h = Math.abs(h);
    if (h < 1) return 'menos de 1 h';
    if (h < 48) return Math.round(h) + ' h';
    return Math.round(h / 24) + ' dias';
  }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* número que "sobe" até o valor (respeita quem prefere menos movimento) */
  function contar(el, alvo) {
    var reduz = false; /* números sempre sobem animados */
    if (reduz || !isFinite(alvo)) { el.textContent = alvo; return; }
    var t0 = null, dur = 700;
    function passo(t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(alvo * e);
      if (p < 1) requestAnimationFrame(passo);
    }
    requestAnimationFrame(passo);
  }

  /* gráfico de barras (HTML/CSS: simples e sem distorção em qualquer tamanho de tela) */
  function barras(serie) {
    var max = Math.max.apply(null, serie.map(function (s) { return s.v; }).concat([1]));
    var cols = serie.map(function (s, i) {
      var pct = s.v ? Math.max(8, Math.round(s.v / max * 100)) : 2;
      return '<div class="gb-col" style="--i:' + i + '" title="' + esc(s.rot) + ': ' + s.v + ' proposta(s)' + (s.extra ? ' · ' + esc(s.extra) : '') + '">' +
        '<div class="gb-trilha"><div class="gb-bar' + (i === serie.length - 1 ? ' atual' : '') + '" style="--h:' + pct + '%"><span class="val">' + s.v + '</span></div></div>' +
        '<span class="rot">' + esc(s.rot) + '</span></div>';
    }).join('');
    return '<div class="graf-barras" role="img" aria-label="Propostas por mês"><div class="gb-grade"><i></i><i></i><i></i><i></i></div><div class="gb">' + cols + '</div></div>';
  }

  /* rosca (SVG) */
  function rosca(partes, total) {
    var R = 54, C = 2 * Math.PI * R, acc = 0, g = '<circle class="trilho-r" cx="70" cy="70" r="' + R + '"/>';
    partes.forEach(function (p, i) {
      if (!p.v) return;
      var len = C * (p.v / Math.max(total, 1));
      g += '<circle class="fatia ' + p.cls + '" cx="70" cy="70" r="' + R + '" stroke-dasharray="' + len.toFixed(2) + ' ' + (C - len).toFixed(2) + '" stroke-dashoffset="' + (-acc).toFixed(2) + '" style="--i:' + i + '"><title>' + esc(p.rot) + ': ' + p.v + '</title></circle>';
      acc += len;
    });
    return '<svg class="graf-rosca" viewBox="0 0 140 140" role="img" aria-label="Situação das campanhas">' + g + '</svg>';
  }

  /* ---------- tela "Visão geral" ---------- */
  function inicio(ctx) {
    var h = ctx.h, abrir = ctx.abrir, client = ctx.client;
    var d0 = new Date();
    var sau = h('div', { class: 'adm-sau' }), data = h('div', { class: 'adm-data' }), hora = h('div', { class: 'adm-hora' });
    function relogio() {
      var d = new Date();
      sau.textContent = ctx.saudacao() + (ctx.primeiro ? ', ' + ctx.primeiro : '');
      data.textContent = ctx.dataExtensa(d); hora.textContent = ctx.horaCurta(d);
    }
    relogio();
    var timer = setInterval(function () { if (!document.body.contains(hora)) { clearInterval(timer); return; } relogio(); }, 15000);

    function botao(rot, ico, cls, id) {
      var b = h('button', { class: 'adm-btn ' + cls, type: 'button', onclick: function () { abrir(id); } });
      b.innerHTML = icone(ico) + '<span>' + rot + '</span>'; return b;
    }

    function op(cmd) { return function () { abrir('operacional', function (fr) { try { fr.contentWindow.eval(cmd); } catch (e) {} }); }; }
    /* 🚦 cartões de atenção (semáforo) */
    function aten(ico, rot, acao, fn) {
      var c = h('button', { class: 'adm-at anim', type: 'button', onclick: fn });
      c.innerHTML = '<span class="at-top"><span class="at-luz"></span><span class="at-ico">' + icone(ico) + '</span><span class="at-rot">' + rot + '</span></span><span class="at-val">—</span><span class="at-sub">carregando…</span><span class="at-lk">' + acao + ' →</span>';
      return c;
    }
    function aSet(c, n, sub, cor) {
      contar(c.querySelector('.at-val'), n);
      c.querySelector('.at-sub').innerHTML = sub;
      c.classList.remove('r', 'y', 'g'); c.classList.add(cor);
    }
    function aFalhou(c, msg) { c.querySelector('.at-val').textContent = '—'; c.querySelector('.at-sub').textContent = msg || 'não consegui ler'; }
    var aFot = aten('foto', 'Fotos', 'Ver fotos', op("view='fp';fpF='p';render()"));
    var aEst = aten('lona', 'Estáticos', 'Instalação', op("view='i';render()"));
    var aPl = aten('led', 'Players', 'Players', op("view='pl';render()"));
    var aMan = aten('chave', 'Manutenção', 'Chamados', op("view='t';render()"));
    var aSug = aten('chat', 'Sugestões', 'Comercial', function () { abrir('comercial'); });
    aSug.style.display = 'none';
    /* ⚙️ administração */
    function adm(ico, cor, rot, botao, fn) {
      var c = h('div', { class: 'adm-ad anim ' + cor });
      c.innerHTML = '<span class="ad-ico">' + icone(ico) + '</span><span class="ad-tx"><b>' + rot + '</b><small class="ad-st">carregando…</small></span>';
      var b = h('button', { class: 'ad-bt', type: 'button', text: botao, onclick: fn });
      c.appendChild(b);
      c.addEventListener('click', function (ev) { if (ev.target !== b) fn(); });
      return c;
    }
    function adSt(c, t, alerta) { var s = c.querySelector('.ad-st'); s.innerHTML = t; s.classList.toggle('al', !!alerta); }
    var dUsu = adm('usuarios', 'p1', 'Usuários', '+ Novo', function () { abrir('usuarios'); });
    var dAvi = adm('avisos', 'p2', 'Avisos', 'Enviar', function () { abrir('avisos'); });
    var dPts = adm('pin', 'p4', 'Pontos e coordenadas', 'Abrir', op("view='a';adm='f';render()"));
    var dBkp = adm('backup', 'p3', 'Backup', 'Baixar', function () { abrir('backup'); });
    var dWpp = adm('chat', 'p4', 'Backup WhatsApp', 'Abrir', op("view='fv';fvAba='wpp';render()"));
    var dMot = adm('moto', 'p5', 'Motoboys e rotas', 'Abrir', op("view='a';adm='c';render()"));

    /* LEDs por propriedade: Mercado Central e Parque Guanabara são circuitos = 1 LED cada */
    /* LED por propriedade: Mercado Central (MEGA) e Parque Guanabara (MEGA/R2) são circuitos = 1 LED cada.
       Passando o mouse (ou tocando, no celular) abre a lista dos pontos. */
    var pop = null;
    function fechaPop() { if (pop) { pop.remove(); pop = null; } }
    function abrePop(box) {
      fechaPop();
      if (!box._lista) return;
      var base = box.closest('.adm') || document.body, rc = box.getBoundingClientRect();
      pop = h('div', { class: 'tl-pop ' + (box.classList.contains('t3') ? 't3' : box.classList.contains('t2') ? 't2' : 't1') });
      pop.innerHTML = '<div class="tl-pop-cab">' + esc(box.querySelector('.tl-rot').textContent) + ' · ' + esc(box.querySelector('.tl-val').textContent) + ' LED</div><div class="tl-pop-corpo">' + box._lista + '</div>';
      pop.addEventListener('pointerenter', function () { clearTimeout(box._t); });
      pop.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse') box._t = setTimeout(fechaPop, 150); });
      base.appendChild(pop);
      var w = Math.min(360, window.innerWidth - 24), x = Math.max(12, Math.min(rc.left, window.innerWidth - w - 12));
      pop.style.width = w + 'px'; pop.style.left = x + 'px'; pop.style.top = (rc.bottom + 8) + 'px';
      pop.style.maxHeight = Math.max(160, window.innerHeight - rc.bottom - 24) + 'px';
      pop._dono = box;
    }
    function telaBox(cls, rot) {
      var b = h('div', { class: 'tl-box ' + cls, tabindex: '0' });
      b.innerHTML = '<span class="tl-ico">' + icone('led') + '</span><span class="tl-txt"><span class="tl-rot">' + rot + '</span><span class="tl-val">—</span><span class="tl-sub">carregando…</span></span>';
      b.addEventListener('pointerenter', function (ev) { if (ev.pointerType !== 'mouse') return; clearTimeout(b._t); if (!pop || pop._dono !== b) { abrePop(b); b._abriu = Date.now(); } });
      b.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse') b._t = setTimeout(fechaPop, 150); });
      b.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var aberto = pop && pop._dono === b;
        if (!aberto) { abrePop(b); b._abriu = Date.now(); }
        else if (Date.now() - (b._abriu || 0) > 450) fechaPop(); /* segundo toque fecha */
      });
      return b;
    }
    document.addEventListener('click', function fora(ev) {
      if (!document.body.contains(telas)) { document.removeEventListener('click', fora); fechaPop(); return; }
      if (pop && !pop.contains(ev.target)) fechaPop();
    });
    var tMega = telaBox('t1', 'LED MEGA'), tR2 = telaBox('t2', 'LED MEGA/R2'), tSem = telaBox('t3', 'LED TERCEIROS');
    tSem.style.display = 'none';
    var telas = h('div', { class: 'adm-telas' }, [tMega, tR2, tSem]);
    window.addEventListener('resize', fechaPop);

    var raiz = h('div', { class: 'adm-pg v2' }, [
      h('div', { class: 'adm-cab v2 anim' }, [
        h('div', { class: 'adm-tit' }, [sau, h('h1', { html: 'Visão <i>geral</i>' }), data, ctx.climaEl ? ctx.climaEl('adm-local') : null]),
        h('div', { class: 'adm-dir' }, [hora, h('div', { class: 'adm-btns' }, [botao('Comercial', 'comercial', 'vidro', 'comercial'), botao('Operacional', 'operacional', 'rosa', 'operacional')])]),
        telas
      ]),
      h('div', { class: 'adm-sec anim', html: '🚦 Precisa da sua atenção' }),
      h('div', { class: 'adm-ats' }, [aFot, aEst, aPl, aMan, aSug]),
      h('div', { class: 'adm-sec anim', html: '⚙️ Administração' }),
      h('div', { class: 'adm-ads' }, [dUsu, dAvi, dPts, dBkp, dWpp, dMot])
    ]);
    raiz.querySelectorAll('.anim').forEach(function (el, i) { el.style.setProperty('--d', (i * 70) + 'ms'); });

    /* ----- dados (cada parte falha sozinha, sem derrubar o resto) ----- */
    var hoje = hojeISO(), dd = function (iso) { return Math.round((new Date(iso + 'T12:00:00') - new Date(hoje + 'T12:00:00')) / 864e5); };
    function dm(iso) { return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : ''; }

    (async function operacional() {
      try {
        var rs = await Promise.all([
          client.from('registros').select('chave,tipo,dados').in('tipo', ['vt', 'mn', 'es', 'ft', 'cfg']).eq('excluido', false),
          client.from('registros').select('chave').in('tipo', ['fx', 'vr']).eq('excluido', false)
        ]);
        if (rs[0].error) throw rs[0].error;
        var R = rs[0].data || [], ok = {}, ft = {}, agora = Date.now();
        (rs[1].data || []).forEach(function (x) { ok[x.chave.slice(3)] = 1; });
        R.forEach(function (x) { if (x.tipo === 'ft') ft[x.chave.slice(3)] = x.dados || {}; });
        /* fotos: mesma regra da tela Fotos por ponto (cliente no ar hoje) */
        var falta = {}, confere = {}, urg = 0;
        R.forEach(function (x) {
          if (x.tipo !== 'vt') return;
          var v = x.dados || {};
          if ((v.ini && v.ini > hoje) || (v.fim && v.fim < hoje) || (v.man && v.conc)) return;
          var dn = v.ini ? -dd(v.ini) : 0;
          (v.paineis || []).forEach(function (pid) {
            if (!ok[pid]) return;
            var st = (ft[v.id + '__' + pid] || {}).status || 'pendente';
            if (st === 'pendente' || st === 'refazer') { falta[pid] = 1; if (dn >= 3) urg++; }
            else if (st === 'feita') { confere[pid] = 1; if (dn >= 3) urg++; }
          });
        });
        var nF = Object.keys(falta).length, nC = Object.keys(confere).length;
        aSet(aFot, nF, nF ? 'pontos sem foto' + (nC ? ' · <b>' + nC + ' para conferir</b>' : '') + (urg ? ' · <b>' + urg + ' urgente' + (urg > 1 ? 's' : '') + '</b>' : '') : nC ? '<b>' + nC + ' para conferir</b>' : 'tudo com foto 🎉', nF ? 'r' : nC ? 'y' : 'g');
        /* estáticos de cliente: lona ainda não instalada (e campanha não terminou) */
        var est = R.filter(function (x) { var e = x.dados || {}; return x.tipo === 'es' && e.oc === 'cli' && e.ini && e.fim && !e.ret && !e.inst && e.fim >= hoje; })
          .map(function (x) { return x.dados; }).sort(function (a, b) { return a.ini.localeCompare(b.ini); });
        var retirar = R.filter(function (x) { var e = x.dados || {}; return x.tipo === 'es' && e.oc === 'cli' && e.inst && !e.ret && e.fim && dd(e.fim) <= 2; }).length;
        var atrE = est.filter(function (e) { return dd(e.ini) < 0; }).length, pertoE = est.filter(function (e) { return dd(e.ini) <= 2; }).length;
        aSet(aEst, est.length, est.length
          ? 'a instalar · ' + (atrE ? '<b>' + atrE + ' já deveria' + (atrE > 1 ? 'm' : '') + ' estar instalada' + (atrE > 1 ? 's' : '') + '</b>' : 'próxima em ' + dm(est[0].ini)) + (retirar ? ' · ' + retirar + ' para retirar' : '')
          : retirar ? retirar + ' lona(s) para retirar' : 'nenhuma lona para instalar', atrE || retirar ? 'r' : pertoE ? 'y' : est.length ? 'y' : 'g');
        /* manutenção */
        var abertas = R.filter(function (x) { return x.tipo === 'mn' && (x.dados || {}).status !== 'resolvida'; }).map(function (x) { return x.dados; });
        var atrM = abertas.filter(function (m) { return m.pz && m.pz < agora; }).length;
        aSet(aMan, abertas.length, abertas.length ? (abertas.length === 1 ? 'aberta' : 'abertas') + (atrM ? ' · <b>' + atrM + ' atrasada' + (atrM > 1 ? 's' : '') + '</b>' : ' · no prazo') : 'nenhum chamado aberto', atrM ? 'r' : abertas.length ? 'y' : 'g');
        /* administração */
        var cfg = R.filter(function (x) { return x.chave === 'cfg:base'; })[0], motos = cfg && cfg.dados && cfg.dados.motos;
        adSt(dMot, motos && motos.length ? esc(motos.join(' · ')) : 'nomes, partida e prioridades');
        adSt(dPts, Object.keys(ok).length + ' pontos cadastrados');
      } catch (e) {
        aFalhou(aFot); aFalhou(aEst); aFalhou(aMan);
      }
    })();

    /* players: 1 consulta a cada 10 min (o 4YouSee limita consultas seguidas) */
    (async function players() {
      var ch = null;
      try { ch = JSON.parse(localStorage.getItem('adm_pl') || 'null'); } catch (e) {}
      function mostra(d) {
        var L = (d && d.players) || [], fora = L.filter(function (p) { return p.minutos == null || p.minutos > 30; }), longe = fora.filter(function (p) { return p.minutos == null || p.minutos >= 24 * 60; });
        aSet(aPl, fora.length, fora.length ? 'fora do ar · de ' + L.length + (longe.length ? ' · <b>' + longe.length + ' há mais de 24 h</b>' : '') : 'todos os ' + L.length + ' no ar', longe.length ? 'r' : fora.length ? 'y' : 'g');
      }
      if (ch && Date.now() - ch.t < 10 * 6e4) return mostra(ch.d);
      try {
        var r = await client.functions.invoke('players-status', { body: {} });
        if (r.error || !r.data || !r.data.players) throw r.error || new Error('sem dados');
        try { localStorage.setItem('adm_pl', JSON.stringify({ t: Date.now(), d: { players: r.data.players.map(function (p) { return { minutos: p.minutos }; }) } })); } catch (e) {}
        mostra(r.data);
      } catch (e) {
        if (ch) mostra(ch.d); else aFalhou(aPl, 'abra Players para ver');
      }
    })();

    (async function administracao() {
      try {
        var u = await client.from('profiles').select('papel,ativo');
        if (u.error) throw u.error;
        var at = (u.data || []).filter(function (x) { return x.ativo && x.papel !== 'bloqueado'; }), mt = at.filter(function (x) { return x.papel === 'motoboy'; }).length, pend = (u.data || []).filter(function (x) { return x.papel === 'pendente'; }).length;
        adSt(dUsu, at.length + ' ativos' + (mt ? ' · ' + mt + ' motoboy' + (mt > 1 ? 's' : '') : '') + (pend ? ' · <b>' + pend + ' aguardando liberação</b>' : ''), pend);
      } catch (e) { adSt(dUsu, 'criar, bloquear e trocar papel'); }
      try {
        var ini = new Date(); ini.setHours(0, 0, 0, 0);
        var a = await client.from('avisos').select('id', { count: 'exact', head: true }).gte('criado_em', ini.toISOString());
        if (a.error) throw a.error;
        adSt(dAvi, a.count ? a.count + ' enviado' + (a.count > 1 ? 's' : '') + ' hoje' : 'nenhum enviado hoje');
      } catch (e) { adSt(dAvi, 'notificar todos, um papel ou uma pessoa'); }
      try {
        var w = await client.from('registros').select('em:dados->em').eq('chave', 'wpp:backup').maybeSingle();
        if (w.error) throw w.error;
        adSt(dWpp, w.data && w.data.em ? 'importado em ' + new Date(+w.data.em).toLocaleDateString('pt-BR') : 'ainda não importado');
      } catch (e) { adSt(dWpp, 'histórico de rotas do grupo'); }
      adSt(dBkp, 'cópia automática todo dia às 05:00');
      try {
        var s = await client.from('sugestoes').select('id', { count: 'exact', head: true }).eq('status', 'pendente');
        if (!s.error && s.count) { aSug.style.display = ''; aSet(aSug, s.count, 'sugestões do comercial aguardando você', 'y'); raiz.querySelector('.adm-ats').classList.add('cinco'); }
      } catch (e) {}
    })();

    (async function contarTelas() {
      /* Ordem em cada quadro: Mercado Central, painéis, bancas, Parque Guanabara (cada um aparece no quadro da sua propriedade) */
      var LED = { led_bh: 'p', led_rm: 'p', df_painel: 'p', banca_led: 'b' };
      /* Circuitos: 1 LED cada; o quadro (MEGA, MEGA/R2 ou Terceiros) vem da Propriedade do ponto cadastrada */
      var CIRC = { mercado: { nome: 'Circuito Mercado Central', faces: 8, ini: true }, guanabara: { nome: 'Parque Guanabara', faces: 10, ini: false } };
      function caixa(dono) { return dono === 'mega' ? 'm' : dono === 'mega_r2' ? 'r2' : 'sem'; }
      function novo() { return { p: [], b: [], ci: [], cf: [] }; }
      function nomePt(p) {
        var t = String(p.endereco || '').trim() || '(sem endereço)';
        if (p.bairro) t += ' · ' + p.bairro;
        if (p.cidade && !/belo horizonte/i.test(p.cidade)) t += ' · ' + p.cidade;
        return t;
      }
      function sub(c) { /* 2 linhas: MEGA = circuito em cima; MEGA/R2 = circuito embaixo */
        var q = [];
        if (c.p.length) q.push(c.p.length + (c.p.length === 1 ? ' painel' : ' painéis'));
        if (c.b.length) q.push(c.b.length + (c.b.length === 1 ? ' banca' : ' bancas'));
        var l = c.ci.map(esc).concat(q.length ? [q.join(' · ')] : []).concat(c.cf.map(esc));
        return l.map(function (x) { return x.replace('Circuito ', ''); }).join('<br>') || 'nenhum LED';
      }
      function lista(c) {
        var g = [];
        function circ(n) { var f = n === CIRC.mercado.nome ? CIRC.mercado.faces : CIRC.guanabara.faces; g.push('<div class="tl-g"><b>' + esc(n) + '</b><span class="tl-n">1 LED · circuito de ' + f + ' faces</span></div>'); }
        function bloco(rot, arr) {
          if (!arr.length) return;
          g.push('<div class="tl-g"><b>' + rot + '</b><span class="tl-n">' + arr.length + '</span><ol>' + arr.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ol></div>');
        }
        c.ci.forEach(circ); bloco('Painéis de LED', c.p); bloco('Bancas de LED', c.b); c.cf.forEach(circ);
        return g.join('') || '<div class="tl-g"><span class="tl-n">Nenhum LED cadastrado.</span></div>';
      }
      function pinta(box, c) {
        contar(box.querySelector('.tl-val'), c.p.length + c.b.length + c.ci.length + c.cf.length);
        box.querySelector('.tl-sub').innerHTML = sub(c);
        box._lista = lista(c);
      }
      try {
        var r = await client.from('pontos').select('ord,data').order('ord', { ascending: true });
        if (r.error) throw r.error;
        var t = { m: novo(), r2: novo(), sem: novo() }, votos = {};
        (r.data || []).forEach(function (x) {
          var p = x.data || {}, sec = p.secao || '', dono = p.dono || 'padrao';
          var c = CIRC[sec];
          if (c) { var v = votos[sec] || (votos[sec] = {}); v[caixa(dono)] = (v[caixa(dono)] || 0) + 1; return; } /* circuito: decide depois */
          if (!LED[sec]) return;
          /* pela Propriedade do ponto: MEGA, MEGA/R2; Terceiros e "Padrão" entram em LED TERCEIROS */
          t[caixa(dono)][LED[sec]].push(nomePt(p));
        });
        Object.keys(CIRC).forEach(function (sec) {
          var v = votos[sec]; if (!v) return;
          var k = Object.keys(v).sort(function (a, b) { return v[b] - v[a]; })[0]; /* propriedade da maioria das faces */
          t[k][CIRC[sec].ini ? 'ci' : 'cf'].push(CIRC[sec].nome);
        });
        pinta(tMega, t.m); pinta(tR2, t.r2);
        var nSem = t.sem.p.length + t.sem.b.length + t.sem.ci.length + t.sem.cf.length;
        if (nSem) {
          pinta(tSem, t.sem);
          tSem.style.display = ''; telas.classList.add('tres');
        }
      } catch (e) {
        [tMega, tR2].forEach(function (b) { b.querySelector('.tl-val').textContent = '—'; b.querySelector('.tl-sub').textContent = 'não consegui ler'; });
      }
    })();

    return raiz;
  }

  return { icone: icone, inicio: inicio };
})();
