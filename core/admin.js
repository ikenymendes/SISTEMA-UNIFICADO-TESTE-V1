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
    backup:      '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/><path d="M4 11.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    sair:        '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
    tv:          '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',
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
    var reduz = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
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

    function atalho(rot, ico, fn) {
      var b = h('button', { class: 'adm-atalho', type: 'button', onclick: fn });
      b.innerHTML = '<span class="ai">' + icone(ico) + '</span><span>' + rot + '</span>'; return b;
    }
    function kpi(ico, rot, cls, destino) {
      var c = h('button', { class: 'adm-card kpi ' + cls + ' anim', type: 'button', onclick: function () { abrir(destino); } });
      c.innerHTML = '<span class="kpi-ico">' + icone(ico) + '</span><span class="kpi-rot">' + rot + '</span><span class="kpi-val">—</span><span class="kpi-sub">carregando…</span>';
      return c;
    }
    var kCamp = kpi('tv', 'Campanhas no ar', 'k1', 'operacional');
    var kMan = kpi('chave', 'Manutenções abertas', 'k2', 'operacional');
    var kProp = kpi('arquivo', 'Propostas no mês', 'k3', 'comercial');
    var kSug = kpi('chat', 'Sugestões pendentes', 'k4', 'comercial');
    var kEst = kpi('arquivo', 'Estáticos com aviso', 'k5', 'operacional');
    kEst.onclick = function () { abrir('operacional', function (fr) { try { fr.contentWindow.eval("view='i';render()"); } catch (e) {} }); };
    function kSet(card, valor, sub, tom) {
      var v = card.querySelector('.kpi-val'), s = card.querySelector('.kpi-sub');
      if (valor == null) { v.textContent = '—'; } else contar(v, valor);
      s.innerHTML = sub || ''; if (tom) s.classList.add(tom);
    }

    var cGraf = h('section', { class: 'adm-card graf anim' });
    cGraf.innerHTML = '<header><div><h2>Propostas por mês</h2><p>Últimos 6 meses · gerados no Comercial</p></div></header><div class="graf-corpo"><div class="vazio">carregando…</div></div>';
    var cRos = h('section', { class: 'adm-card ros anim' });
    cRos.innerHTML = '<header><div><h2>Situação das campanhas</h2><p>VTs da Gestão Operacional</p></div></header><div class="ros-corpo"><div class="vazio">carregando…</div></div>';
    var cMan = h('section', { class: 'adm-card lista anim' });
    cMan.innerHTML = '<header><div><h2>Manutenções que pedem atenção</h2><p>Abertas, das mais atrasadas para as mais novas</p></div></header><ul class="lst"><li class="vazio">carregando…</li></ul>';
    var cSug = h('section', { class: 'adm-card lista anim' });
    cSug.innerHTML = '<header><div><h2>Sugestões aguardando você</h2><p>Pedidos do time comercial</p></div></header><ul class="lst"><li class="vazio">carregando…</li></ul>';

    /* LEDs por propriedade: Mercado Central e Parque Guanabara são circuitos = 1 LED cada */
    function telaBox(cls, rot) {
      var b = h('div', { class: 'tl-box ' + cls });
      b.innerHTML = '<span class="tl-ico">' + icone('tv') + '</span><span class="tl-txt"><span class="tl-rot">' + rot + '</span><span class="tl-val">—</span><span class="tl-sub">carregando…</span></span>';
      return b;
    }
    var tMega = telaBox('t1', 'LED MEGA'), tR2 = telaBox('t2', 'LED MEGA/R2');
    var telas = h('div', { class: 'adm-telas', title: 'Mercado Central e Parque Guanabara contam como 1 LED cada (são circuitos)' }, [tMega, tR2]);

    var raiz = h('div', { class: 'adm-pg' }, [
      h('div', { class: 'adm-cab anim' }, [
        h('div', { class: 'adm-tit' }, [sau, h('h1', { text: 'Visão geral' }), data, ctx.climaEl ? ctx.climaEl('adm-local') : null]),
        telas,
        h('div', { class: 'adm-dir' }, [hora, h('div', { class: 'adm-btns' }, [botao('Comercial', 'comercial', 'vidro', 'comercial'), botao('Operacional', 'operacional', 'rosa', 'operacional')])])
      ]),
      h('div', { class: 'adm-atalhos anim' }, [
        atalho('Montar proposta', 'arquivo', function () { abrir('comercial'); }),
        atalho('Instalar estático', 'operacional', function () { abrir('operacional', function (fr) { try { fr.contentWindow.eval("view='i';render()"); } catch (e) {} }); }),
        atalho('Financeiro', 'financeiro', function () { abrir('financeiro'); }),
        atalho('Players', 'tv', function () { abrir('operacional', function (fr) { try { fr.contentWindow.eval("view='pl';render()"); } catch (e) {} }); })
      ]),
      h('div', { class: 'adm-kpis' }, [kCamp, kMan, kEst, kProp, kSug]),
      h('div', { class: 'adm-linha' }, [cGraf, cRos]),
      h('div', { class: 'adm-linha dois' }, [cMan, cSug])
    ]);
    raiz.querySelectorAll('.anim').forEach(function (el, i) { el.style.setProperty('--d', (i * 70) + 'ms'); });

    /* ----- dados (cada parte falha sozinha, sem derrubar o resto) ----- */
    function falhou(card, msg) { var v = card.querySelector('.kpi-val'); if (v) { v.textContent = '—'; card.querySelector('.kpi-sub').textContent = msg || 'sem dados'; } }

    (async function operacional() {
      try {
        var r = await client.from('registros').select('tipo,dados').in('tipo', ['vt', 'mn', 'es']).eq('excluido', false);
        if (r.error) throw r.error;
        var hoje = hojeISO(), agora = Date.now(), noAr = 0, aIniciar = 0, fim = 0, abertas = [];
        (r.data || []).forEach(function (x) {
          var d = x.dados || {};
          if (x.tipo === 'vt') {
            if (d.ini && d.ini > hoje) aIniciar++; else if (d.fim && d.fim < hoje) fim++; else noAr++;
          } else if (x.tipo === 'mn' && d.status !== 'resolvida') abertas.push(d);
        });
        var avE = 0, dd = function (iso) { return Math.round((new Date(iso + 'T12:00:00') - new Date(hoje + 'T12:00:00')) / 864e5); };
        (r.data || []).forEach(function (x) {
          var e = x.dados || {};
          if (x.tipo !== 'es' || e.oc !== 'cli' || !e.ini || !e.fim || e.ret) return;
          var di = dd(e.ini), df = dd(e.fim);
          if (!e.inst ? (df < 0 || di <= 2) : df <= 2) avE++;
        });
        kSet(kEst, avE, avE ? 'instalar ou retirar lona' : 'tudo em dia', avE ? 'alerta' : 'bom');
        var atrasadas = abertas.filter(function (m) { return m.pz && m.pz < agora; });
        kSet(kCamp, noAr, aIniciar + ' a iniciar · ' + fim + ' encerradas');
        kSet(kMan, abertas.length, atrasadas.length ? '<b>' + atrasadas.length + ' atrasada(s)</b>' : 'nenhuma atrasada', atrasadas.length ? 'alerta' : 'bom');
        var tot = noAr + aIniciar + fim;
        cRos.querySelector('.ros-corpo').innerHTML = tot
          ? '<div class="ros-graf">' + rosca([{ v: noAr, rot: 'No ar', cls: 'f1' }, { v: aIniciar, rot: 'A iniciar', cls: 'f2' }, { v: fim, rot: 'Encerradas', cls: 'f3' }], tot) + '<div class="ros-centro"><b>' + tot + '</b><span>campanhas</span></div></div>' +
            '<ul class="leg"><li><i class="f1"></i>No ar<b>' + noAr + '</b></li><li><i class="f2"></i>A iniciar<b>' + aIniciar + '</b></li><li><i class="f3"></i>Encerradas<b>' + fim + '</b></li></ul>'
          : '<div class="vazio">Nenhuma campanha cadastrada ainda.</div>';
        setTimeout(function () { var g = cRos.querySelector('.graf-rosca'); if (g) g.classList.add('go'); }, 60);
        abertas.sort(function (a, b) { return (a.pz || 0) - (b.pz || 0); });
        var ul = cMan.querySelector('.lst');
        ul.innerHTML = abertas.length ? abertas.slice(0, 5).map(function (m) {
          var atr = m.pz && m.pz < agora, hrs = m.pz ? (m.pz - agora) / 36e5 : null;
          var chip = hrs == null ? '' : atr ? '<span class="chip ruim">atrasada há ' + horasTxt(hrs) + '</span>' : '<span class="chip">prazo em ' + horasTxt(hrs) + '</span>';
          return '<li><span class="pto ' + (atr ? 'ruim' : '') + '"></span><div><b>' + esc(m.def || 'Chamado de manutenção') + '</b><small>' + (m.status === 'eld' ? 'em atendimento' : 'pendente') + (m.moto ? ' · ' + esc(m.moto) : '') + '</small></div>' + chip + '</li>';
        }).join('') : '<li class="vazio">Nenhuma manutenção aberta. Tudo em dia.</li>';
      } catch (e) {
        falhou(kCamp, 'não consegui ler'); falhou(kMan, 'não consegui ler'); falhou(kEst, 'não consegui ler');
        cRos.querySelector('.ros-corpo').innerHTML = '<div class="vazio">Não consegui carregar a operação.</div>';
        cMan.querySelector('.lst').innerHTML = '<li class="vazio">Não consegui carregar.</li>';
      }
    })();

    (async function contarTelas() {
      var LED = { led_bh: 'p', led_rm: 'p', df_painel: 'p', banca_led: 'b' }, CIRC = { mercado: 1, guanabara: 1 };
      function sub(c) {
        var t = [];
        if (c.p) t.push(c.p + (c.p === 1 ? ' painel' : ' painéis'));
        if (c.b) t.push(c.b + (c.b === 1 ? ' banca' : ' bancas'));
        if (c.c) t.push(c.c + (c.c === 1 ? ' circuito' : ' circuitos'));
        return t.join(' · ') || 'nenhum LED';
      }
      function pinta(box, c) {
        contar(box.querySelector('.tl-val'), c.p + c.b + c.c);
        box.querySelector('.tl-sub').textContent = sub(c);
      }
      try {
        var r = await client.from('pontos').select('data');
        if (r.error) throw r.error;
        var m = { p: 0, b: 0, c: 0 }, r2 = { p: 0, b: 0, c: 0 }, circ = {};
        (r.data || []).forEach(function (x) {
          var p = x.data || {}, sec = p.secao || '', dono = p.dono || 'padrao';
          if (dono === 'terceiros') return;
          var alvo = dono === 'mega_r2' ? r2 : m;
          if (CIRC[sec]) { if (!circ[sec]) { circ[sec] = 1; m.c++; } return; } /* circuito: 1 LED, sempre MEGA */
          if (LED[sec]) alvo[LED[sec]]++;
        });
        pinta(tMega, m); pinta(tR2, r2);
      } catch (e) {
        [tMega, tR2].forEach(function (b) { b.querySelector('.tl-val').textContent = '—'; b.querySelector('.tl-sub').textContent = 'não consegui ler'; });
      }
    })();

    (async function comercial() {
      try {
        var r = await client.from('propostas').select('criado_em,total_negociado').order('criado_em', { ascending: false }).limit(3000);
        if (r.error) throw r.error;
        var meses = [], base = new Date(d0.getFullYear(), d0.getMonth(), 1);
        for (var i = 5; i >= 0; i--) { var m = new Date(base.getFullYear(), base.getMonth() - i, 1); meses.push({ k: m.getFullYear() + '-' + pad(m.getMonth() + 1), rot: MESES_CURTOS[m.getMonth()], v: 0, soma: 0 }); }
        (r.data || []).forEach(function (p) {
          var k = String(p.criado_em || '').slice(0, 7), m = meses.filter(function (x) { return x.k === k; })[0];
          if (m) { m.v++; m.soma += Number(p.total_negociado) || 0; }
        });
        meses.forEach(function (m) { m.extra = m.soma ? 'R$ ' + Math.round(m.soma).toLocaleString('pt-BR') : ''; });
        var atual = meses[5].v, ant = meses[4].v, dif = atual - ant;
        kSet(kProp, atual, ant || atual ? (dif >= 0 ? '▲ ' : '▼ ') + Math.abs(dif) + ' vs mês anterior' : 'sem propostas ainda', dif >= 0 ? 'bom' : 'alerta');
        var tem = meses.some(function (m) { return m.v; });
        cGraf.querySelector('.graf-corpo').innerHTML = tem ? barras(meses) : '<div class="vazio">Ainda não há propostas geradas.</div>';
        setTimeout(function () { var g = cGraf.querySelector('.graf-barras'); if (g) g.classList.add('go'); }, 60);
      } catch (e) {
        falhou(kProp, 'não consegui ler'); cGraf.querySelector('.graf-corpo').innerHTML = '<div class="vazio">Não consegui carregar as propostas.</div>';
      }
      try {
        var s = await client.from('sugestoes').select('tipo,criado_por_nome,criado_por_email,criado_em,status').eq('status', 'pendente').order('criado_em', { ascending: false }).limit(200);
        if (s.error) throw s.error;
        var lst = s.data || [];
        kSet(kSug, lst.length, lst.length ? 'aguardando aprovação' : 'nada pendente', lst.length ? 'alerta' : 'bom');
        cSug.querySelector('.lst').innerHTML = lst.length ? lst.slice(0, 5).map(function (x) {
          var quem = x.criado_por_nome || x.criado_por_email || 'Usuário', quando = x.criado_em ? horasTxt((Date.now() - new Date(x.criado_em).getTime()) / 36e5) : '';
          return '<li><span class="pto"></span><div><b>' + (x.tipo === 'adicionar' ? 'Adicionar ponto' : 'Alterar ponto') + '</b><small>' + esc(quem) + '</small></div><span class="chip">há ' + quando + '</span></li>';
        }).join('') : '<li class="vazio">Nenhuma sugestão pendente.</li>';
      } catch (e) {
        falhou(kSug, 'não consegui ler'); cSug.querySelector('.lst').innerHTML = '<li class="vazio">Não consegui carregar.</li>';
      }
    })();

    return raiz;
  }

  return { icone: icone, inicio: inicio };
})();
