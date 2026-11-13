/* =====================================================================
   FINANCEIRO · faturamento dos checkings concluídos
   ---------------------------------------------------------------------
   Lê e grava pelas funções do banco fin_listar() e fin_registrar(): o
   financeiro só enxerga VTs com checking concluído e só consegue gravar
   a data do faturamento, o Nº da nota fiscal e o Nº da venda no Conta Azul. Esses campos (fat, fdt, nfn, vca)
   são os mesmos que a Gestão Operacional usa, então os dois lados ficam
   sempre iguais. Atualiza sozinho a cada 30 segundos.
   ===================================================================== */
(function () {
  'use strict';
  var MEGA = null;
  try { MEGA = window.parent !== window ? window.parent.MEGA : null; } catch (e) { MEGA = null; }
  var raiz = document.getElementById('raiz');
  var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var E = { rows: [], carregando: true, erro: '', aba: 'pend', q: '', edit: {}, draft: {}, busy: {}, msg: {}, quando: null, atualizando: false, adiado: false };

  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pad(n) { return ('0' + n).slice(-2); }
  function hoje() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fmt(iso) { return iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : ''; }
  function fmtCurto(iso) { return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : ''; }
  function diasDesde(iso) { if (!iso) return null; return Math.round((new Date(hoje() + 'T12:00:00') - new Date(iso.slice(0, 10) + 'T12:00:00')) / 864e5); }
  function txtDias(n) { return n <= 0 ? 'hoje' : n === 1 ? 'ontem' : 'há ' + n + ' dias'; }
  function saudacao() { var h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; }
  function primeiro() { try { var p = MEGA.perfil() || {}; var n = String(p.nome || p.email || '').split(/[ @.]/)[0]; return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase(); } catch (e) { return ''; } }
  function ok(v) { return !!(v.fat && v.fdt && String(v.nfn || '').trim()); }
  function pendentes() { return E.rows.filter(function (v) { return !ok(v); }).sort(function (a, b) { return String(a.chkd || '9').localeCompare(String(b.chkd || '9')); }); }
  function feitos() { return E.rows.filter(ok).sort(function (a, b) { return String(b.fdt).localeCompare(String(a.fdt)); }); }

  function toast(t, erro) {
    var el = document.getElementById('toast'); el.textContent = t; el.className = 'toast' + (erro ? ' err' : ''); el.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(function () { el.hidden = true; }, 3200);
  }

  /* ---------------- dados ---------------- */
  async function carregar(silencioso) {
    if (!MEGA) { E.carregando = false; E.erro = 'Abra o Financeiro por dentro do sistema (faça login primeiro).'; desenhar(); return; }
    if (E.atualizando) return; E.atualizando = true;
    if (!silencioso) { var b = document.querySelector('[data-a=atualizar]'); if (b) b.classList.add('gira'); }
    try {
      var r = await MEGA.client.rpc('fin_listar');
      if (r.error) throw r.error;
      E.rows = Array.isArray(r.data) ? r.data : []; E.erro = ''; E.quando = new Date();
    } catch (e) {
      var m = String((e && e.message) || e);
      E.erro = /fin_listar|function|schema cache|does not exist/i.test(m) ? 'O banco ainda não tem o Financeiro instalado. Rode o arquivo supabase/04-financeiro.sql no Supabase.' : 'Não consegui carregar agora (' + m + ').';
    }
    E.carregando = false; E.atualizando = false;
    if (silencioso && digitando()) { E.adiado = true; return; }
    desenhar();
  }
  function digitando() { var a = document.activeElement; return !!a && /^(INPUT|TEXTAREA)$/.test(a.tagName) && raiz.contains(a); }

  var semVca = false; /* banco ainda sem o SQL 15: grava sem o Nº da venda */
  async function gravar(chave, fdt, nfn, desfazer, vca) {
    E.busy[chave] = true; E.msg[chave] = ''; desenhar();
    try {
      var par = { p_chave: chave, p_fdt: fdt || '', p_nfn: nfn || '', p_desfazer: !!desfazer };
      if (!semVca) par.p_vca = vca || '';
      var r = await MEGA.client.rpc('fin_registrar', par);
      if (r.error && !semVca && /p_vca|function|schema cache|Could not find/i.test(r.error.message || '')) { semVca = true; delete par.p_vca; r = await MEGA.client.rpc('fin_registrar', par); if (!r.error && vca) toast('Faturamento salvo, mas o Nº da venda CA não: rode o SQL 15 no Supabase.', true); }
      if (r.error) throw r.error;
      var v = E.rows.filter(function (x) { return x.chave === chave; })[0];
      if (v) { if (desfazer) { v.fat = false; v.fdt = ''; v.nfn = ''; v.vca = ''; } else { v.fat = true; v.fdt = fdt; v.nfn = String(nfn).trim(); if (!semVca) v.vca = String(vca || '').trim(); } }
      delete E.edit[chave]; delete E.draft[chave];
      if (!(semVca && vca && !desfazer)) toast(desfazer ? 'Faturamento desfeito. O VT voltou para "A faturar".' : 'Faturamento registrado ✓ O Operacional já enxerga a nota.');
    } catch (e) {
      E.msg[chave] = String((e && e.message) || e).replace(/^.*?:\s*/, '');
    }
    delete E.busy[chave]; desenhar();
  }

  /* ---------------- desenho ---------------- */
  function kpi(cls, ico, rot, val, sub, tom, aba) {
    return '<button class="glass kpi ' + cls + ' anim" data-a="aba" data-v="' + aba + '" type="button"><span class="kpi-ico">' + ico + '</span><span class="kpi-rot">' + rot + '</span><span class="kpi-val" data-n="' + val + '">0</span><span class="kpi-sub ' + (tom || '') + '">' + sub + '</span></button>';
  }
  function meses() {
    var d = new Date(), base = new Date(d.getFullYear(), d.getMonth(), 1), out = [];
    for (var i = 5; i >= 0; i--) { var m = new Date(base.getFullYear(), base.getMonth() - i, 1); out.push({ k: m.getFullYear() + '-' + pad(m.getMonth() + 1), r: MESES[m.getMonth()], v: 0 }); }
    feitos().forEach(function (v) { var k = String(v.fdt).slice(0, 7); out.forEach(function (m) { if (m.k === k) m.v++; }); });
    return out;
  }
  function barras(ms) {
    var mx = Math.max.apply(null, ms.map(function (m) { return m.v; }).concat([1]));
    return '<div class="barras' + (E.animou ? ' go' : '') + '" id="barras"><div class="grade"><i></i><i></i><i></i><i></i></div><div class="cols">' + ms.map(function (m, i) {
      var h = m.v ? Math.max(10, Math.round(m.v / mx * 100)) : 2;
      return '<div class="col" style="--i:' + i + '"><div class="trilha"><div class="bar' + (i === ms.length - 1 ? ' atual' : '') + '" style="--h:' + h + '%"><span class="v">' + m.v + '</span></div></div><span class="r">' + m.r + '</span></div>';
    }).join('') + '</div></div>';
  }
  function rosca(p, f) {
    var tot = p + f, C = 2 * Math.PI * 52, len = tot ? C * f / tot : 0;
    return '<div class="rosca-corpo"><div class="rosca"><svg viewBox="0 0 132 132"><circle class="t" cx="66" cy="66" r="52"/><circle class="f1" cx="66" cy="66" r="52" stroke-dasharray="' + (E.animou ? len.toFixed(1) : '0') + ' ' + C.toFixed(1) + '" data-len="' + len.toFixed(1) + '" data-c="' + C.toFixed(1) + '"/></svg><div class="c"><div><b>' + (tot ? Math.round(f / tot * 100) : 0) + '%</b><br><span>faturado</span></div></div></div>' +
      '<ul class="legenda"><li><i style="background:#6ee7b7"></i>Faturados<b>' + f + '</b></li><li><i style="background:#ffffff40"></i>A faturar<b>' + p + '</b></li></ul></div>';
  }

  function itemPend(v) {
    var d = diasDesde(v.chkd), cl = d == null ? '' : d > 15 ? 'ruim' : d > 7 ? 'aviso' : 'bom';
    var dr = E.draft[v.chave] || {}, fdt = dr.fdt != null ? dr.fdt : hoje(), nfn = dr.nfn != null ? dr.nfn : (v.nfn || ''), vca = dr.vca != null ? dr.vca : (v.vca || '');
    var ev = v.tipo === 'evento';
    return '<article class="item anim" data-k="' + esc(v.chave) + '" style="--d:' + 0 + 'ms"><div class="topo"><div><h3>' + esc(v.cliente) + '</h3><div class="tags">' +
      (v.pi ? '<span class="tag">PI ' + esc(v.pi) + '</span>' : '') + (ev ? '<span class="tag ev">Evento' + (v.evento ? ': ' + esc(v.evento) : '') + '</span>' : '') +
      '<span class="tag">' + v.paineis + ' painel(is)</span></div></div>' + (d != null ? '<span class="chip ' + cl + '">Checking ' + txtDias(d) + '</span>' : '') + '</div>' +
      '<div class="meta">No ar ' + esc(fmtCurto(v.ini)) + ' → ' + esc(fmt(v.fim)) + (v.chkd ? ' · checking concluído em ' + esc(fmt(v.chkd)) : '') + '</div>' + form(v, fdt, nfn, 'Registrar faturamento', vca) + '</article>';
  }
  function form(v, fdt, nfn, rotulo, vca) {
    var busy = !!E.busy[v.chave];
    return '<form class="faz" data-k="' + esc(v.chave) + '" novalidate><label>Data do faturamento<input type="date" name="fdt" value="' + esc(fdt) + '"></label>' +
      '<label>Nº da nota fiscal<input type="text" name="nfn" inputmode="numeric" autocomplete="off" placeholder="Ex.: 4521" value="' + esc(nfn) + '"></label>' +
      '<label>Nº venda CA (Conta Azul)<input type="text" name="vca" inputmode="numeric" autocomplete="off" placeholder="Ex.: 1873" value="' + esc(vca || '') + '"></label>' +
      '<button class="btn-rosa" type="submit"' + (busy ? ' disabled' : '') + '>' + (busy ? 'Salvando…' : rotulo) + '</button></form>' +
      (E.msg[v.chave] ? '<p class="erro">' + esc(E.msg[v.chave]) + '</p>' : '');
  }
  function itemFeito(v) {
    if (E.edit[v.chave]) {
      var dr = E.draft[v.chave] || {};
      return '<article class="item" data-k="' + esc(v.chave) + '"><div class="topo"><div><h3>' + esc(v.cliente) + '</h3><div class="tags">' + (v.pi ? '<span class="tag">PI ' + esc(v.pi) + '</span>' : '') + '</div></div><button class="btn-suave" data-a="cancelar" data-v="' + esc(v.chave) + '" type="button">Cancelar</button></div><div class="meta">Corrigir a data ou o número da nota</div>' +
        form(v, dr.fdt != null ? dr.fdt : v.fdt, dr.nfn != null ? dr.nfn : v.nfn, 'Salvar alterações', dr.vca != null ? dr.vca : v.vca) + '</article>';
    }
    return '<article class="item" data-k="' + esc(v.chave) + '"><div class="topo"><div><h3>' + esc(v.cliente) + '</h3><div class="tags">' + (v.pi ? '<span class="tag">PI ' + esc(v.pi) + '</span>' : '') +
      (v.tipo === 'evento' ? '<span class="tag ev">Evento</span>' : '') + '<span class="tag">' + v.paineis + ' painel(is)</span></div></div><span class="chip bom">Processo concluído</span></div>' +
      '<div class="feito" style="margin-top:12px"><span class="ok">✓</span><div><div class="nf">NF ' + esc(v.nfn) + (v.vca ? ' · Venda CA ' + esc(v.vca) : '') + '</div><div class="dt">Faturado em ' + esc(fmt(v.fdt)) + '</div></div>' +
      '<div class="acoes"><button class="btn-suave" data-a="editar" data-v="' + esc(v.chave) + '" type="button">Editar</button><button class="btn-suave perigo" data-a="desfazer" data-v="' + esc(v.chave) + '" type="button">Desfazer</button></div></div>' +
      (E.msg[v.chave] ? '<p class="erro">' + esc(E.msg[v.chave]) + '</p>' : '') + '</article>';
  }

  function desenhar() {
    var d = new Date(), P = pendentes(), F = feitos();
    if (E.carregando) { raiz.innerHTML = '<main class="pg"><div class="glass carreg">Carregando faturamentos…</div></main>'; return; }
    if (E.erro && !E.rows.length) { raiz.innerHTML = '<main class="pg"><div class="glass cab"><div><h1>Financeiro</h1><p class="sub">' + esc(E.erro) + '</p></div><button class="btn-vidro" data-a="atualizar" type="button">↻ Tentar de novo</button></div></main>'; return; }
    var antigo = P.reduce(function (m, v) { var n = diasDesde(v.chkd); return n != null && n > m ? n : m; }, 0);
    var espera = P.filter(function (v) { var n = diasDesde(v.chkd); return n != null && n > 7; }).length;
    var mm = meses(), atual = mm[5].v, ant = mm[4].v;
    var pct = E.rows.length ? Math.round(F.length / E.rows.length * 100) : 0;
    var q = E.q.trim().toLowerCase();
    var lista = (E.aba === 'pend' ? P : F).filter(function (v) { return !q || (v.cliente + ' ' + v.pi + ' ' + v.nfn + ' ' + (v.vca || '') + ' ' + v.evento).toLowerCase().indexOf(q) >= 0; });
    var itens = lista.map(E.aba === 'pend' ? itemPend : itemFeito).join('');
    if (!itens) itens = '<div class="vazio"><b>' + (q ? 'Nada encontrado' : E.aba === 'pend' ? 'Tudo faturado 🎉' : 'Nenhum faturamento ainda') + '</b>' + (q ? 'Tente outro nome, PI ou número da nota.' : E.aba === 'pend' ? 'Não há checkings concluídos esperando nota fiscal.' : 'Quando você registrar a primeira nota, ela aparece aqui.') + '</div>';

    var foco = null; // preserva o foco ao redesenhar a busca
    raiz.innerHTML = '<main class="pg">' +
      '<header class="glass cab anim"><div><p class="oi">' + saudacao() + (primeiro() ? ', ' + esc(primeiro()) : '') + '</p><h1>Financeiro</h1><p class="sub">Checkings concluídos esperando data de faturamento e nota fiscal.</p></div>' +
      '<div class="cab-dir"><span class="atual">Atualizado às ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ' · atualiza sozinho</span><button class="btn-vidro" data-a="atualizar" type="button"><span class="ic">↻</span> Atualizar</button></div></header>' +
      '<section class="kpis">' +
        kpi('k1', '🧾', 'A faturar', P.length, P.length ? 'mais antigo: checking ' + txtDias(antigo) : 'nenhum pendente', P.length && antigo > 7 ? 'alerta' : 'bom', 'pend') +
        kpi('k2', '✅', 'Faturados no mês', atual, ant || atual ? (atual >= ant ? '▲ ' : '▼ ') + Math.abs(atual - ant) + ' vs mês anterior' : 'sem faturamentos ainda', atual >= ant ? 'bom' : '', 'feito') +
        kpi('k3', '⏰', 'Esperando +7 dias', espera, espera ? 'checking concluído há mais de 7 dias' : 'ninguém esperando demais', espera ? 'alerta' : 'bom', 'pend') +
        kpi('k4', '📊', 'Total faturado', F.length, pct + '% dos checkings concluídos', '', 'feito') +
      '</section>' +
      '<section class="linha"><div class="glass card anim"><h2>Faturamentos por mês</h2><p class="leg-t">Notas registradas nos últimos 6 meses</p>' + barras(mm) + '</div>' +
      '<div class="glass card anim"><h2>Situação geral</h2><p class="leg-t">Todos os checkings concluídos</p>' + rosca(P.length, F.length) + '</div></section>' +
      '<section class="glass lista anim"><div class="ferr"><div class="abas" role="tablist"><button class="aba ' + (E.aba === 'pend' ? 'on' : '') + '" data-a="aba" data-v="pend" type="button">A faturar<b>' + P.length + '</b></button><button class="aba ' + (E.aba === 'feito' ? 'on' : '') + '" data-a="aba" data-v="feito" type="button">Faturados<b>' + F.length + '</b></button></div>' +
      '<div class="busca"><input id="busca" type="search" placeholder="Buscar cliente, PI, nº da nota ou venda CA" value="' + esc(E.q) + '" autocomplete="off"></div></div>' +
      (E.aba === 'pend' ? '<p class="dica">Preencha a <b>data</b> e o <b>número da nota</b> e toque em “Registrar faturamento”. O VT passa para Faturados e o Operacional vê na hora.</p>' : '<p class="dica">Notas já registradas. Use Editar para corrigir ou Desfazer para voltar o VT para “A faturar”.</p>') +
      '<div class="itens">' + itens + '</div></section></main>';

    raiz.classList.toggle('quieto', !!E.animou);
    animar(); E.animou = true;
    var bs = document.getElementById('busca');
    if (bs && E.focoBusca) { bs.focus(); try { bs.setSelectionRange(bs.value.length, bs.value.length); } catch (e) {} }
  }
  function animar() {
    document.querySelectorAll('.anim').forEach(function (el, i) { el.style.setProperty('--d', Math.min(i, 10) * 60 + 'ms'); });
    document.querySelectorAll('.kpi-val').forEach(function (el) {
      var alvo = +el.getAttribute('data-n') || 0, t0 = performance.now(), dur = 800;
      if (E.animou) { el.textContent = alvo; return; }
      (function passo(t) { var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(alvo * e); if (p < 1) requestAnimationFrame(passo); })(t0);
    });
    setTimeout(function () {
      var b = document.getElementById('barras'); if (b) b.classList.add('go');
      var c = document.querySelector('.rosca .f1'); if (c) c.setAttribute('stroke-dasharray', c.getAttribute('data-len') + ' ' + c.getAttribute('data-c'));
    }, 60);
  }

  /* ---------------- eventos ---------------- */
  raiz.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-a]'); if (!el) return;
    var a = el.getAttribute('data-a'), v = el.getAttribute('data-v');
    if (a === 'aba') { E.aba = v; E.q = ''; desenhar(); }
    else if (a === 'atualizar') { carregar(false); }
    else if (a === 'editar') { E.edit[v] = true; desenhar(); }
    else if (a === 'cancelar') { delete E.edit[v]; delete E.draft[v]; E.msg[v] = ''; desenhar(); }
    else if (a === 'desfazer') {
      var linha = E.rows.filter(function (x) { return x.chave === v; })[0];
      if (linha && window.confirm('Desfazer o faturamento de ' + linha.cliente + '? O VT volta para "A faturar" e a nota é apagada dos dois lados.')) gravar(v, '', '', true);
    }
  });
  raiz.addEventListener('input', function (ev) {
    var t = ev.target;
    if (t.id === 'busca') { E.q = t.value; E.focoBusca = true; desenhar(); return; }
    var f = t.closest && t.closest('form.faz'); if (!f) return;
    var k = f.getAttribute('data-k'); E.draft[k] = E.draft[k] || {}; E.draft[k][t.name] = t.value;
  });
  raiz.addEventListener('focusin', function (ev) { E.focoBusca = ev.target.id === 'busca'; });
  raiz.addEventListener('focusout', function () { setTimeout(function () { if (E.adiado && !digitando()) { E.adiado = false; desenhar(); } }, 50); });
  raiz.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var f = ev.target, k = f.getAttribute('data-k'), fdt = f.elements.fdt.value, nfn = f.elements.nfn.value.trim(), vca = f.elements.vca ? f.elements.vca.value.trim() : '';
    if (!fdt) { E.msg[k] = 'Escolha a data do faturamento.'; desenhar(); return; }
    if (!nfn) { E.msg[k] = 'Informe o número da nota fiscal.'; E.draft[k] = { fdt: fdt, nfn: '', vca: vca }; desenhar(); return; }
    gravar(k, fdt, nfn, false, vca);
  });

  /* atualização automática */
  setInterval(function () { if (!document.hidden) carregar(true); }, 30000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) carregar(true); });
  desenhar(); carregar(false);
})();
