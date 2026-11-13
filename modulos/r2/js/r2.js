/* =====================================================================
   R2 · gerador de mídia kit e checking no modelo R2 Mídia OOH
   - Lê os pontos do Comercial (só leitura) e as fotos da biblioteca
   - Mídia kit: capa, nossos pontos, separadores, fichas, relação, contracapa
   - Checking: capa da campanha, fotos de cada ponto (com data), contracapa
   - Saída: PowerPoint (editável) e PDF. Nada é gravado no banco.
   ===================================================================== */
(function () {
  'use strict';
  var MEGA = null;
  try { MEGA = window.parent !== window ? window.parent.MEGA : null; } catch (e) { MEGA = null; }
  var raiz = document.getElementById('raiz');
  var W = 11.693, H = 8.27, PH = H * 6372225 / 7562850; /* A4 deitado, área da foto igual ao modelo R2 */
  var RAZAO = 'R2 Mídia · CNPJ 47.292.892/0001-05';
  var LIB = '../comercial/assets/lib/';
  var SEC = {
    led_bh: ['Painéis de LED', 'Belo Horizonte', 'Painel de LED'], led_rm: ['Painéis de LED', 'Região Metropolitana', 'Painel de LED'],
    banca_led: ['Bancas de LED', 'Belo Horizonte', 'Banca de LED'], empena: ['Empena', 'Belo Horizonte', 'Empena'],
    front: ['Painéis frontlight', '', 'Frontlight'], mensal: ['Mega painéis', '', 'Mega painel'], outdoor: ['Outdoor', '', 'Outdoor'],
    revista: ['Bancas estáticas', '', 'Banca estática'], mercado: ['Mercado Central', 'Belo Horizonte', 'Painel de LED'],
    guanabara: ['Parque Guanabara', 'Belo Horizonte', 'Circuito de LED'], metro: ['Metrô-DF', 'Brasília', 'Mídia no metrô'],
    df_painel: ['Painéis de LED', 'Brasília', 'Painel de LED'], rj: ['Painéis de LED', 'Rio de Janeiro', 'Painel de LED']
  };
  var ORDEM = ['led_bh', 'empena', 'banca_led', 'led_rm', 'mercado', 'guanabara', 'front', 'mensal', 'outdoor', 'revista', 'rj', 'df_painel', 'metro'];
  var RM = ['Nova Lima', 'Contagem', 'Betim', 'Lagoa Santa', 'Sabará', 'Santa Luzia', 'Ribeirão das Neves', 'Vespasiano'];

  var E = {
    modo: 'kit', pontos: [], libMap: {}, carregando: true, erro: '', filtro: 'r2', q: '', sel: {}, fotosCk: {}, avulsos: [],
    kit: { ano: 'MÍDIA KIT ' + new Date().getFullYear(), titulo: 'Painéis e Bancas de LED', sub: 'Belo Horizonte e Região Metropolitana', razao: RAZAO, nossos: true, relacao: true },
    ck: { cliente: '', campanha: '', agencia: '', pi: '', ini: '', fim: '', praca: 'Belo Horizonte', data: hoje(), razao: RAZAO },
    gerando: false
  };

  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pad(n) { return ('0' + n).slice(-2); }
  function hoje() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function br(iso) { return iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : (iso || ''); }
  function toast(t, erro) { var el = document.getElementById('toast'); el.textContent = t; el.className = 'toast' + (erro ? ' err' : ''); el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { el.hidden = true; }, 3800); }
  function tx(v) { return (typeof v === 'string' ? v : v == null ? '' : String(v)).trim(); }
  function f0(p) { var f = p.foto; return Array.isArray(f) ? f[0] : f; }

  /* ---------------- dados ---------------- */
  async function carregar() {
    if (!MEGA) { E.carregando = false; E.erro = 'Abra por dentro do sistema (faça login primeiro).'; desenhar(); return; }
    try {
      var r = await MEGA.client.from('pontos').select('id,ord,data').order('ord');
      if (r.error) throw r.error;
      E.pontos = (r.data || []).map(function (x) { var p = x.data || {}; p.id = p.id || x.id; return p; }).filter(function (p) { return p && p.secao; });
      try { var c = await MEGA.client.from('config').select('data').eq('id', 'main').maybeSingle(); E.libMap = (c.data && c.data.data && c.data.data.libMap) || {}; } catch (e) {}
      E.pontos.forEach(function (p) { if (p.dono === 'mega_r2' && p.secao !== 'guanabara') E.sel[p.id] = true; });
    } catch (e) { E.erro = 'Não consegui carregar os pontos (' + ((e && e.message) || e) + ').'; }
    E.carregando = false; desenhar(); preview();
  }
  function srcFoto(k) {
    if (!k) return '';
    if (/^data:/.test(k)) return k;
    if (E.libMap[k] && E.libMap[k] !== k) return srcFoto(E.libMap[k]);
    if (String(k).indexOf('sb:') === 0) { try { return MEGA.client.storage.from('fotos').getPublicUrl(String(k).slice(3)).data.publicUrl; } catch (e) { return ''; } }
    return LIB + k;
  }
  var cacheImg = {};
  function carregaImg(src) {
    if (!src) return Promise.resolve(null);
    if (cacheImg[src]) return cacheImg[src];
    cacheImg[src] = new Promise(function (ok) { var im = new Image(); if (/^https?:/i.test(src)) im.crossOrigin = 'anonymous'; im.onload = function () { ok(im); }; im.onerror = function () { ok(null); }; im.src = src; });
    return cacheImg[src];
  }
  /* recorta a foto no formato pedido (respeitando o ajuste/giro salvo no Comercial) e devolve JPEG */
  var cacheCorte = {};
  async function corte(src, ratio, aj, largura) {
    var key = src + '|' + ratio.toFixed(3) + '|' + JSON.stringify(aj || {}) + '|' + (largura || 1600);
    if (cacheCorte[key]) return cacheCorte[key];
    var im = await carregaImg(src); if (!im) return null;
    aj = aj || {};
    var rot = ((aj.r || 0) % 360 + 360) % 360, base = im;
    if (rot) { var c0 = document.createElement('canvas'), q = rot === 90 || rot === 270; c0.width = q ? im.height : im.width; c0.height = q ? im.width : im.height; var x0 = c0.getContext('2d'); x0.translate(c0.width / 2, c0.height / 2); x0.rotate(rot * Math.PI / 180); x0.drawImage(im, -im.width / 2, -im.height / 2); base = c0; }
    var iw = base.width, ih = base.height, z = Math.max(1, (aj.z || 100) / 100), fx = (aj.x == null ? 50 : aj.x) / 100, fy = (aj.y == null ? 50 : aj.y) / 100, cw, ch;
    if (iw / ih > ratio) { ch = ih / z; cw = ch * ratio; } else { cw = iw / z; ch = cw / ratio; }
    var sx = Math.min(Math.max(0, (iw - cw) * fx), iw - cw), sy = Math.min(Math.max(0, (ih - ch) * fy), ih - ch);
    var L = largura || 1600, cv = document.createElement('canvas'); cv.width = L; cv.height = Math.round(L / ratio);
    var x = cv.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(base, sx, sy, cw, ch, 0, 0, cv.width, cv.height);
    var out; try { out = cv.toDataURL('image/jpeg', 0.86); } catch (e) { out = null; }
    cacheCorte[key] = out; return out;
  }
  async function dataUrl(src) {
    var im = await carregaImg(src); if (!im) return null;
    var cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight; cv.getContext('2d').drawImage(im, 0, 0);
    return cv.toDataURL(/\.png$/i.test(src) ? 'image/png' : 'image/jpeg', 0.9);
  }

  function todos() { return E.pontos.concat(E.avulsos); }
  function visiveis() {
    var q = E.q.toLowerCase();
    return todos().filter(function (p) {
      if (E.filtro === 'r2' && !(p.dono === 'mega_r2' || p.avulso)) return false;
      if (E.filtro === 'mega' && !(p.dono === 'mega' || p.dono === 'mega_r2' || p.avulso)) return false;
      return !q || (p.endereco + ' ' + (p.bairro || '') + ' ' + (p.cidade || '')).toLowerCase().indexOf(q) >= 0;
    });
  }
  function grupoDe(p) {
    if (p.avulso) return 'avulso';
    if (p.secao === 'led_bh' && RM.indexOf(p.cidade) >= 0) return 'led_rm';
    return p.secao;
  }
  function nomeGrupo(g) { return g === 'avulso' ? ['Outros pontos', '', 'Painel de LED'] : (SEC[g] || [g, '', 'Painel de LED']); }
  function selecionados() {
    var L = todos().filter(function (p) { return E.sel[p.id]; });
    var gs = {}; L.forEach(function (p) { var g = grupoDe(p); (gs[g] = gs[g] || []).push(p); });
    var ord = ORDEM.concat(Object.keys(gs).filter(function (g) { return ORDEM.indexOf(g) < 0; }));
    return ord.filter(function (g) { return gs[g]; }).map(function (g) { return { g: g, nome: nomeGrupo(g)[0], regiao: nomeGrupo(g)[1], L: gs[g] }; });
  }
  function tipoDe(p) { return tx(p.tipoTxt) || (SEC[p.secao] ? SEC[p.secao][2] : 'Painel de LED'); }
  function locDe(p) {
    var b = tx(p.bairro), c = tx(p.cidade);
    return [tx(p.endereco), b && b !== c ? b : '', c].filter(Boolean).join(' – ');
  }

  /* ---------------- slides (primitivos em polegadas) ---------------- */
  function S(fundo) { return { fundo: fundo || null, it: [] }; }
  function T(s, x, y, w, h, linhas, o) { s.it.push({ t: 'tx', x: x, y: y, w: w, h: h, linhas: linhas, o: o || {} }); }
  function R(s, x, y, w, h, cor, o) { s.it.push({ t: 'rt', x: x, y: y, w: w, h: h, cor: cor, o: o || {} }); }
  function I(s, x, y, w, h, src) { s.it.push({ t: 'im', x: x, y: y, w: w, h: h, src: src }); }
  function run(t, o) { return Object.assign({ t: t }, o || {}); }
  var BR = 'FFFFFF', ROSA = 'FFD6CC';

  async function montar() {
    var A = { fundo: 'assets/r2-fundo.jpg', barra: 'assets/r2-barra.jpg', logo: 'assets/r2-logo.png' };
    var lg = await carregaImg(A.logo), lr = lg ? lg.naturalWidth / lg.naturalHeight : 1.36;
    function logo(s, x, y, h) { I(s, x, y, h * lr, h, A.logo); return h * lr; }
    var out = [], G = selecionados(), tot = G.reduce(function (a, g) { return a + g.L.length; }, 0);

    if (E.modo === 'kit') {
      var k = E.kit;
      var s = S(A.fundo); logo(s, 0.75, 0.7, 1.55);
      T(s, 0.75, 3.0, 9, 0.4, [[run(k.ano, { s: 16, b: 1, sp: 6 })]]);
      T(s, 0.75, 3.45, 10.2, 1.7, [[run(k.titulo, { s: 40, b: 1 })], [run(k.sub, { s: 22 })]]);
      var cont = G.map(function (g) { return g.L.length + ' ' + (g.L.length > 1 ? g.nome.toLowerCase() : g.nome.toLowerCase().replace(/^painéis/, 'painel').replace(/^bancas/, 'banca')) + (g.regiao && g.g === 'led_rm' ? ' (RM)' : ''); });
      T(s, 0.75, 6.35, 10.2, 0.8, [[run(tot + ' pontos' + (cont.length ? '  ·  ' + cont.join('  ·  ') : ''), { s: 14 })], [run(k.razao, { s: 11, c: ROSA })]]);
      out.push(s);

      if (k.nossos && G.length) {
        s = S(A.fundo);
        T(s, 0.75, 0.6, 8, 0.35, [[run('NOSSOS PONTOS', { s: 13, b: 1, sp: 5 })]]);
        T(s, 0.75, 0.95, 8.8, 0.7, [[run(tot + ' pontos' + (k.sub ? ' · ' + k.sub : ''), { s: 22, b: 1 })]]);
        logo(s, W - 1.55, 0.55, 0.75);
        var cols = G.slice(0, 4), n = cols.length, gap = 0.2, cw = (W - 1.5 - gap * (n - 1)) / n;
        cols.forEach(function (g, i) {
          var x = 0.75 + i * (cw + gap), y = 1.95, ch = Math.min(5.6, 1.4 + g.L.length * 0.26);
          R(s, x, y, cw, ch, 'FFFFFF', { a: 86, r: 0.12 });
          T(s, x + 0.22, y + 0.2, cw - 0.44, 0.8, [[run(String(g.L.length), { s: 28, b: 1 })], [run(g.nome + (g.regiao ? ' · ' + g.regiao : ''), { s: 11, b: 1 })]]);
          T(s, x + 0.22, y + 1.15, cw - 0.44, ch - 1.25, g.L.map(function (p) { return [run('• ' + tx(p.endereco) + (g.g === 'led_rm' && p.cidade ? ' (' + p.cidade + ')' : ''), { s: g.L.length > 14 ? 8.5 : 10 })]; }));
        });
        out.push(s);
      }
      var num = 0;
      for (var gi = 0; gi < G.length; gi++) {
        var g = G[gi];
        s = S(A.fundo);
        if (g.regiao) T(s, 0.75, 2.55, 10, 0.4, [[run(g.regiao.toUpperCase(), { s: 14, b: 1, sp: 4 })]]);
        T(s, 0.75, 3.0, 10, 1.0, [[run(g.nome, { s: 46, b: 1 })]]);
        T(s, 0.75, 4.05, 10, 0.5, [[run(g.L.length + ' ponto' + (g.L.length > 1 ? 's' : ''), { s: 18 })]]);
        logo(s, W - 1.55, 0.55, 0.75);
        out.push(s);
        for (var pi = 0; pi < g.L.length; pi++) {
          var p = g.L[pi]; num++;
          s = S(null);
          var ft = await corte(srcFoto(f0(p)), W / PH, p.fotoAj, 1800);
          if (ft) I(s, 0, 0, W, PH, ft); else R(s, 0, 0, W, PH, 'D9D2D2');
          I(s, 0, PH, W, H - PH, A.barra);
          R(s, 0.35, 0.3, 1.55, 0.42, 'C8102E', { a: 8, r: 0.08 });
          T(s, 0.35, 0.3, 1.55, 0.42, [[run(pad(num) + ' / ' + tot, { s: 13, b: 1 })]], { al: 'c', va: 'm' });
          ficha(s, p, logo);
          T(s, 0.12, H - 0.27, 6, 0.2, [[run(k.razao, { s: 8, c: 'FFC8BD' })]]);
          out.push(s);
        }
      }
      if (k.relacao && tot) {
        var todosP = []; G.forEach(function (g) { g.L.forEach(function (p) { todosP.push([p, g.g]); }); });
        var porPag = 21;
        for (var ini = 0; ini < todosP.length; ini += porPag) {
          s = S(A.fundo);
          T(s, 0.6, 0.45, 8, 0.35, [[run('RELAÇÃO DE PONTOS', { s: 13, b: 1, sp: 5 })]]);
          logo(s, W - 1.35, 0.3, 0.55);
          var cwid = [0.45, 3.5, 2.2, 1.35, 1.12, 1.17], tw = W - 1.2, sum = cwid.reduce(function (a, b) { return a + b; }, 0);
          cwid = cwid.map(function (c) { return c * tw / sum; });
          var rows = [['Nº', 'Endereço', 'Bairro / cidade', 'Formato', 'Latitude', 'Longitude']].concat(todosP.slice(ini, ini + porPag).map(function (pp, i) {
            var p = pp[0], b = tx(p.bairro), c = tx(p.cidade);
            return [pad(ini + i + 1), tx(p.endereco) + (pp[1] === 'empena' ? ' (empena)' : pp[1] === 'banca_led' ? ' (banca)' : ''), (b && b !== c ? b + ' · ' : '') + c, tx(p.tamanho) || '—', p.lat ? (+p.lat).toFixed(6) : '—', p.lng ? (+p.lng).toFixed(6) : '—'];
          }));
          var rh = 0.29;
          rows.forEach(function (row, r) {
            var y = 0.95 + r * rh, x = 0.6;
            R(s, x, y, tw, rh, r === 0 ? '8F0B10' : (r % 2 ? 'FFFFFF' : 'FBEEEC'));
            row.forEach(function (v, c) { T(s, x + 0.06, y, cwid[c] - 0.1, rh, [[run(v, { s: 8.5, b: r === 0 ? 1 : 0, c: r === 0 ? 'FFFFFF' : '331A1A' })]], { va: 'm', corta: true }); x += cwid[c]; });
          });
          out.push(s);
        }
      }
      s = S(A.fundo); var lw = 1.7 * lr; logo(s, (W - lw) / 2, 1.6, 1.7);
      T(s, 0.5, 4.0, W - 1, 1.3, [[run('Obrigado!', { s: 30, b: 1 })], [run(k.razao, { s: 16 })]], { al: 'c' });
      out.push(s);
    } else {
      var c = E.ck, per = c.ini || c.fim ? br(c.ini) + ' a ' + br(c.fim) : '';
      var s2 = S(A.fundo); logo(s2, 0.75, 0.7, 1.55);
      T(s2, 0.75, 2.75, 9, 0.4, [[run('RELATÓRIO FOTOGRÁFICO · CHECKING', { s: 15, b: 1, sp: 5 })]]);
      T(s2, 0.75, 3.2, 10.2, 1.9, [[run(c.cliente || 'Cliente', { s: 40, b: 1 })]].concat(c.campanha ? [[run(c.campanha, { s: 22 })]] : []));
      var info = [['Agência', c.agencia], ['PI', c.pi], ['Período', per], ['Praça', c.praca], ['Pontos', String(G.reduce(function (a, g) { return a + g.L.filter(function (p) { return (E.fotosCk[p.id] || []).length; }).length; }, 0) || '')]].filter(function (x) { return tx(x[1]); });
      T(s2, 0.75, 5.35, 10.2, 1.4, info.map(function (x) { return [run(x[0] + ': ', { s: 13, b: 1 }), run(x[1], { s: 13 })]; }));
      T(s2, 0.75, H - 0.6, 10, 0.3, [[run(c.razao, { s: 11, c: ROSA })]]);
      out.push(s2);
      var n2 = 0, nf = 0;
      G.forEach(function (g) { g.L.forEach(function (p) { nf += (E.fotosCk[p.id] || []).length; }); });
      for (var gj = 0; gj < G.length; gj++) {
        for (var pj = 0; pj < G[gj].L.length; pj++) {
          var q = G[gj].L[pj], fs = E.fotosCk[q.id] || [];
          for (var fi = 0; fi < fs.length; fi++) {
            n2++;
            var sl = S(null), ft2 = await corte(fs[fi].src, W / PH, null, 1800);
            if (ft2) I(sl, 0, 0, W, PH, ft2); else R(sl, 0, 0, W, PH, 'D9D2D2');
            I(sl, 0, PH, W, H - PH, A.barra);
            T(sl, W - 3.1, PH - 0.5, 2.85, 0.4, [[run(br(fs[fi].data || c.data), { s: 15, b: 1 })]], { al: 'r', va: 'm', sombra: true });
            R(sl, 0.35, 0.3, 1.55, 0.42, 'C8102E', { a: 8, r: 0.08 });
            T(sl, 0.35, 0.3, 1.55, 0.42, [[run(pad(n2) + ' / ' + nf, { s: 13, b: 1 })]], { al: 'c', va: 'm' });
            var y0 = PH + 0.14;
            T(sl, 0.12, y0, 5.6, 1.0, [[run('Tipo: ', { s: 11, b: 1 }), run(tipoDe(q), { s: 11 })], [run('Formato: ', { s: 11, b: 1 }), run(tx(q.tamanho) || '—', { s: 11 })], [run('Localização: ', { s: 11, b: 1 }), run(locDe(q), { s: 11 })]]);
            var dir = [[run('Cliente: ', { s: 10, b: 1 }), run(c.cliente || '—', { s: 10 })]];
            if (c.campanha) dir.push([run('Campanha: ', { s: 10, b: 1 }), run(c.campanha, { s: 10 })]);
            if (per) dir.push([run('Período: ', { s: 10, b: 1 }), run(per, { s: 10 })]);
            T(sl, 5.9, y0 + 0.02, 3.4, 1.0, dir);
            logo(sl, 10.26, 7.216, 0.685);
            T(sl, 0.12, H - 0.27, 6, 0.2, [[run(c.razao, { s: 8, c: 'FFC8BD' })]]);
            out.push(sl);
          }
        }
      }
      s2 = S(A.fundo); var lw2 = 1.7 * lr; logo(s2, (W - lw2) / 2, 1.6, 1.7);
      T(s2, 0.5, 4.0, W - 1, 1.3, [[run('Obrigado!', { s: 30, b: 1 })], [run(c.razao, { s: 16 })]], { al: 'c' });
      out.push(s2);
    }
    return out;
  }
  function ficha(s, p, logo) {
    var y = PH + 0.14;
    T(s, 0.12, y, 4.9, 1.0, [[run('Tipo: ', { s: 11, b: 1 }), run(tipoDe(p), { s: 11 })], [run('Formato: ', { s: 11, b: 1 }), run(tx(p.tamanho) || '—', { s: 11 })], [run('Localização: ', { s: 11, b: 1 }), run(locDe(p), { s: 11 })]]);
    var c2 = [], c3 = [];
    if (tx(p.sentido)) c2.push([run('Sentido: ', { s: 10, b: 1 }), run(tx(p.sentido), { s: 10 })]);
    if (tx(p.publico)) c2.push([run('Público: ', { s: 10, b: 1 }), run(tx(p.publico), { s: 10 })]);
    if (tx(p.pixels)) c2.push([run('Resolução: ', { s: 10, b: 1 }), run(tx(p.pixels), { s: 10 })]);
    if (tx(p.fluxo)) c3.push([run('Fluxo/dia: ', { s: 10, b: 1 }), run(tx(p.fluxo) + ' veículos', { s: 10 })]);
    if (tx(p.impacto)) c3.push([run('Impacto semanal: ', { s: 10, b: 1 }), run(tx(p.impacto), { s: 10 })]);
    if (tx(p.veic) && p.secao !== 'empena') c3.push([run('Inserções/dia: ', { s: 10, b: 1 }), run(tx(p.veic), { s: 10 })]);
    if (c2.length) T(s, 5.15, y + 0.02, 2.0, 1.0, c2);
    if (c3.length) T(s, 7.2, y + 0.02, 2.95, 1.0, c3);
    logo(s, 10.26, 7.216, 0.685);
  }

  /* ---------------- desenho no canvas (prévia e PDF) ---------------- */
  async function pinta(sl, cv, larg) {
    var k = larg / W; cv.width = Math.round(W * k); cv.height = Math.round(H * k);
    var x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height);
    if (sl.fundo) { var bg = await carregaImg(sl.fundo); if (bg) x.drawImage(bg, 0, 0, cv.width, cv.height); }
    for (var i = 0; i < sl.it.length; i++) {
      var it = sl.it[i];
      if (it.t === 'im') { var im = await carregaImg(it.src); if (im) x.drawImage(im, it.x * k, it.y * k, it.w * k, it.h * k); }
      else if (it.t === 'rt') {
        x.save(); x.globalAlpha = 1 - (it.o.a || 0) / 100; x.fillStyle = '#' + it.cor;
        var r = (it.o.r || 0) * k; x.beginPath(); if (x.roundRect) x.roundRect(it.x * k, it.y * k, it.w * k, it.h * k, r); else x.rect(it.x * k, it.y * k, it.w * k, it.h * k); x.fill(); x.restore();
      } else if (it.t === 'tx') texto(x, it, k);
    }
  }
  function fonte(r, k) { return (r.b ? 'bold ' : '') + (r.s * k / 72) + 'px Arial, Helvetica, sans-serif'; }
  function texto(x, it, k) {
    var maxW = it.w * k, linhas = [];
    it.linhas.forEach(function (par) {
      /* quebra o parágrafo em linhas respeitando a largura */
      var palavras = []; par.forEach(function (r) { String(r.t).split(/(\s+)/).forEach(function (w) { if (w) palavras.push({ w: w, r: r }); }); });
      var atual = [], larg = 0, alt = Math.max.apply(null, par.map(function (r) { return r.s; }));
      palavras.forEach(function (pw) {
        x.font = fonte(pw.r, k); x.letterSpacing = (pw.r.sp ? pw.r.sp * k / 72 : 0) + 'px';
        var w = x.measureText(pw.w).width;
        if (larg + w > maxW && atual.length && !/^\s+$/.test(pw.w) && !it.o.corta) { linhas.push({ p: atual, h: alt }); atual = []; larg = 0; }
        if (!atual.length && /^\s+$/.test(pw.w)) return;
        atual.push({ w: pw.w, r: pw.r, l: w }); larg += w;
      });
      linhas.push({ p: atual, h: alt });
    });
    var lh = function (l) { return l.h * 1.2 * k / 72; }, totH = linhas.reduce(function (a, l) { return a + lh(l); }, 0);
    var y = it.y * k; if (it.o.va === 'm') y += (it.h * k - totH) / 2;
    x.save(); x.beginPath(); x.rect(it.x * k - 2, it.y * k - 4, maxW + 4, Math.max(it.h * k, totH) + 8); if (it.o.corta) x.clip();
    if (it.o.sombra) { x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 6; }
    linhas.forEach(function (l) {
      var w = l.p.reduce(function (a, q) { return a + q.l; }, 0), xx = it.x * k;
      if (it.o.al === 'c') xx += (maxW - w) / 2; else if (it.o.al === 'r') xx += maxW - w;
      y += lh(l); var base = y - lh(l) * 0.22;
      l.p.forEach(function (q) { x.font = fonte(q.r, k); x.letterSpacing = (q.r.sp ? q.r.sp * k / 72 : 0) + 'px'; x.fillStyle = '#' + (q.r.c || BR); x.fillText(q.w, xx, base); xx += q.l; });
    });
    x.restore();
  }

  /* ---------------- PowerPoint ---------------- */
  async function pptx(slides, nome) {
    var P = new PptxGenJS(); P.defineLayout({ name: 'A4D', width: W, height: H }); P.layout = 'A4D'; P.author = 'R2 Mídia'; P.title = nome;
    var cache = {};
    async function d(src) { if (/^data:/.test(src)) return src; if (!cache[src]) cache[src] = await dataUrl(src); return cache[src]; }
    for (var i = 0; i < slides.length; i++) {
      var sl = slides[i], s = P.addSlide();
      if (sl.fundo) { var bd = await d(sl.fundo); if (bd) s.background = { data: bd }; }
      for (var j = 0; j < sl.it.length; j++) {
        var it = sl.it[j];
        if (it.t === 'im') { var dd = await d(it.src); if (dd) s.addImage({ data: dd, x: it.x, y: it.y, w: it.w, h: it.h }); }
        else if (it.t === 'rt') s.addShape(it.o.r ? P.ShapeType.roundRect : P.ShapeType.rect, { x: it.x, y: it.y, w: it.w, h: it.h, fill: { color: it.cor, transparency: it.o.a || 0 }, line: { type: 'none' }, rectRadius: it.o.r || 0 });
        else if (it.t === 'tx') {
          var arr = [];
          it.linhas.forEach(function (par, pi) {
            par.forEach(function (r, ri) { arr.push({ text: r.t, options: { fontFace: 'Arial', fontSize: r.s, bold: !!r.b, color: r.c || BR, charSpacing: r.sp || 0, breakLine: ri === par.length - 1 && pi < it.linhas.length - 1 } }); });
          });
          s.addText(arr, { x: it.x, y: it.y, w: it.w, h: it.h, margin: 0, valign: it.o.va === 'm' ? 'middle' : 'top', align: it.o.al === 'c' ? 'center' : it.o.al === 'r' ? 'right' : 'left', fit: 'none', paraSpaceAfter: 0, lineSpacingMultiple: 1.0, shadow: it.o.sombra ? { type: 'outer', color: '000000', opacity: 0.55, blur: 4, offset: 1, angle: 45 } : undefined });
        }
      }
    }
    await P.writeFile({ fileName: nome + '.pptx' });
  }
  async function pdf(slides, nome) {
    var J = window.jspdf.jsPDF, doc = new J({ orientation: 'landscape', unit: 'in', format: [W, H] }), cv = document.createElement('canvas');
    for (var i = 0; i < slides.length; i++) {
      await pinta(slides[i], cv, 1754);
      if (i) doc.addPage([W, H], 'landscape');
      doc.addImage(cv.toDataURL('image/jpeg', 0.88), 'JPEG', 0, 0, W, H);
    }
    doc.save(nome + '.pdf');
  }
  function nomeArq() {
    var l = function (s) { return String(s || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, ''); };
    return E.modo === 'kit' ? 'MIDIA_KIT_R2_' + new Date().getFullYear() : ['CHECKING_R2', l(E.ck.cliente), l(E.ck.pi)].filter(Boolean).join('_');
  }
  async function gerar(tipo) {
    if (E.gerando) return;
    var G = selecionados(); if (!G.length) { toast('Selecione pelo menos um ponto.', true); return; }
    if (E.modo === 'ck') {
      if (!tx(E.ck.cliente)) { toast('Preencha o cliente.', true); return; }
      var semF = G.reduce(function (a, g) { return a.concat(g.L.filter(function (p) { return !(E.fotosCk[p.id] || []).length; })); }, []);
      if (semF.length === G.reduce(function (a, g) { return a + g.L.length; }, 0)) { toast('Adicione as fotos do checking nos pontos.', true); return; }
      if (semF.length && !confirm(semF.length + ' ponto(s) sem foto ficarão de fora. Gerar mesmo assim?')) return;
    }
    E.gerando = true; desenhar();
    try { var sl = await montar(); if (tipo === 'pptx') await pptx(sl, nomeArq()); else await pdf(sl, nomeArq()); toast((tipo === 'pptx' ? 'PowerPoint' : 'PDF') + ' gerado ✓'); }
    catch (e) { toast('Não consegui gerar: ' + ((e && e.message) || e), true); }
    E.gerando = false; desenhar();
  }

  /* ---------------- prévia ---------------- */
  var prevTimer = null, prevVez = 0;
  function preview() {
    clearTimeout(prevTimer);
    prevTimer = setTimeout(async function () {
      var vez = ++prevVez, box = document.getElementById('prev'); if (!box) return;
      var sl = await montar(); if (vez !== prevVez) return;
      box.innerHTML = '';
      document.getElementById('nsl').textContent = sl.length + ' página' + (sl.length > 1 ? 's' : '');
      for (var i = 0; i < sl.length && i < 40; i++) {
        if (vez !== prevVez) return;
        var fig = document.createElement('figure'), cv = document.createElement('canvas'); fig.appendChild(cv);
        var cap = document.createElement('figcaption'); cap.textContent = 'Página ' + (i + 1); fig.appendChild(cap); box.appendChild(fig);
        await pinta(sl[i], cv, 520);
      }
      if (sl.length > 40) { var m = document.createElement('p'); m.className = 'res'; m.textContent = '+ ' + (sl.length - 40) + ' páginas (aparecem no arquivo).'; box.appendChild(m); }
    }, 350);
  }

  /* ---------------- tela ---------------- */
  function campo(grp, k, rot, o) {
    o = o || {}; var v = E[grp][k];
    return '<label class="f' + (o.w ? ' w' : '') + '">' + rot + '<input data-g="' + grp + '" data-k="' + k + '" type="' + (o.tipo || 'text') + '" value="' + esc(v) + '" placeholder="' + esc(o.ph || '') + '"></label>';
  }
  function desenhar() {
    var sc = document.querySelector('.lista') ? document.querySelector('.lista').scrollTop : 0;
    if (E.carregando) { raiz.innerHTML = '<div class="vazio">Carregando pontos…</div>'; return; }
    var cfg = E.modo === 'kit'
      ? '<h2>Capa</h2><div class="grid">' + campo('kit', 'ano', 'Texto pequeno', { w: 1 }) + campo('kit', 'titulo', 'Título', { w: 1 }) + campo('kit', 'sub', 'Subtítulo', { w: 1 }) + campo('kit', 'razao', 'Razão social (capa, fichas e final)', { w: 1 }) + '</div>' +
        '<label class="chk"><input type="checkbox" data-c="nossos"' + (E.kit.nossos ? ' checked' : '') + '> Página “Nossos pontos”</label>' +
        '<label class="chk"><input type="checkbox" data-c="relacao"' + (E.kit.relacao ? ' checked' : '') + '> Relação de pontos com latitude e longitude</label>'
      : '<h2>Campanha</h2><div class="grid">' + campo('ck', 'cliente', 'Cliente', { w: 1 }) + campo('ck', 'campanha', 'Campanha', { w: 1 }) + campo('ck', 'agencia', 'Agência') + campo('ck', 'pi', 'PI') +
        campo('ck', 'ini', 'Início', { tipo: 'date' }) + campo('ck', 'fim', 'Fim', { tipo: 'date' }) + campo('ck', 'praca', 'Praça') + campo('ck', 'data', 'Data padrão das fotos', { tipo: 'date' }) + campo('ck', 'razao', 'Razão social', { w: 1 }) + '</div>' +
        '<p class="res">Em cada ponto marcado, toque em “＋ Fotos” para colocar as fotos do checking. A data de cada foto pode ser ajustada embaixo dela.</p>';
    var vis = visiveis(), gs = {}; vis.forEach(function (p) { var g = grupoDe(p); (gs[g] = gs[g] || []).push(p); });
    var ord = ORDEM.concat(Object.keys(gs).filter(function (g) { return ORDEM.indexOf(g) < 0; })).filter(function (g) { return gs[g]; });
    var lista = ord.map(function (g) {
      var ng = nomeGrupo(g);
      return '<div class="grp"><span>' + esc(ng[0] + (ng[1] ? ' · ' + ng[1] : '')) + ' (' + gs[g].length + ')</span><button data-a="todos" data-v="' + g + '" type="button">marcar/desmarcar</button></div>' +
        gs[g].map(function (p) {
          var on = !!E.sel[p.id], src = srcFoto(f0(p)), fts = E.fotosCk[p.id] || [];
          return '<div class="pt" data-a="sel" data-v="' + esc(p.id) + '"><input type="checkbox"' + (on ? ' checked' : '') + ' tabindex="-1">' +
            (src ? '<img loading="lazy" src="' + esc(src) + '" alt="">' : '<span class="sf"></span>') +
            '<div><b>' + esc(p.endereco || '(sem endereço)') + '</b><small>' + esc([tx(p.bairro), tx(p.cidade)].filter(Boolean).join(' · ')) + (p.dono === 'mega_r2' ? ' · MEGA/R2' : p.avulso ? ' · avulso' : '') + '</small></div>' +
            (E.modo === 'ck' && on ? '<div class="fotos">' + fts.map(function (f, i) { return '<span class="th"><img src="' + f.src + '" alt=""><button type="button" data-a="tirafoto" data-v="' + esc(p.id) + '|' + i + '">×</button><input type="date" data-a="datafoto" data-v="' + esc(p.id) + '|' + i + '" value="' + esc(f.data) + '"></span>'; }).join('') +
              '<label>＋ Fotos<input type="file" accept="image/*" multiple data-a="fotos" data-v="' + esc(p.id) + '"></label></div>' : '') + '</div>';
        }).join('');
    }).join('') || '<div class="vazio">Nenhum ponto encontrado.</div>';
    var nSel = todos().filter(function (p) { return E.sel[p.id]; }).length;
    raiz.innerHTML = '<main class="pg"><section class="card"><div class="cab"><img src="assets/r2-logo.png" alt="R2"><div><h1>Gerador R2</h1><p>Mídia kit e checking no modelo R2 Mídia OOH</p></div></div>' +
      '<div class="tabs"><button data-a="modo" data-v="kit" class="' + (E.modo === 'kit' ? 'on' : '') + '" type="button">Mídia kit</button><button data-a="modo" data-v="ck" class="' + (E.modo === 'ck' ? 'on' : '') + '" type="button">Checking</button></div>' +
      (E.erro ? '<div class="aviso">' + esc(E.erro) + '</div>' : '') + cfg +
      '<h2>Pontos <span style="font-weight:400;color:#7a6666">· ' + nSel + ' selecionado(s)</span></h2>' +
      '<div class="filtros"><button data-a="filtro" data-v="r2" class="' + (E.filtro === 'r2' ? 'on' : '') + '" type="button">MEGA/R2</button><button data-a="filtro" data-v="mega" class="' + (E.filtro === 'mega' ? 'on' : '') + '" type="button">Mega</button><button data-a="filtro" data-v="todos" class="' + (E.filtro === 'todos' ? 'on' : '') + '" type="button">Todos</button></div>' +
      '<input class="busca" id="busca" type="search" placeholder="Buscar endereço, bairro ou cidade" value="' + esc(E.q) + '">' +
      '<div class="lista">' + lista + '</div>' +
      '<details class="avulso"><summary>＋ Ponto avulso (não fica salvo)</summary><div class="grid" style="margin-top:8px">' +
      '<label class="f w">Endereço<input id="av_end"></label><label class="f">Bairro<input id="av_bai"></label><label class="f">Cidade<input id="av_cid" value="Belo Horizonte"></label>' +
      '<label class="f">Tipo<input id="av_tipo" value="Painel de LED"></label><label class="f">Formato<input id="av_fmt" placeholder="Ex.: 9 x 3 m"></label>' +
      '<label class="f w">Foto (mídia kit)<input id="av_foto" type="file" accept="image/*"></label></div><div class="acoes"><button class="b" data-a="avulso" type="button">Adicionar ponto</button></div></details>' +
      '<div class="acoes"><button class="b esc" data-a="gerar" data-v="pdf" type="button"' + (E.gerando ? ' disabled' : '') + '>' + (E.gerando ? 'Gerando…' : 'Baixar PDF') + '</button><button class="b pri" data-a="gerar" data-v="pptx" type="button"' + (E.gerando ? ' disabled' : '') + '>' + (E.gerando ? 'Gerando…' : 'Baixar PowerPoint') + '</button></div>' +
      '</section><section class="card"><h2>Prévia <span id="nsl" style="font-weight:400;color:#7a6666"></span></h2><div class="prev" id="prev"></div></section></main>';
    var l = document.querySelector('.lista'); if (l) l.scrollTop = sc;
    if (E.focoBusca) { var b = document.getElementById('busca'); b.focus(); b.setSelectionRange(b.value.length, b.value.length); }
  }

  function lerArquivo(f) { return new Promise(function (ok) { var r = new FileReader(); r.onload = function () { ok(r.result); }; r.readAsDataURL(f); }); }
  async function reduzir(du) { var im = await carregaImg(du); if (!im) return du; var L = 2200, k = Math.min(1, L / Math.max(im.naturalWidth, im.naturalHeight)); if (k === 1 && du.length < 2.5e6) return du; var cv = document.createElement('canvas'); cv.width = Math.round(im.naturalWidth * k); cv.height = Math.round(im.naturalHeight * k); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); return cv.toDataURL('image/jpeg', 0.88); }
  function dataArq(f) { var d = new Date(f.lastModified || Date.now()); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  raiz.addEventListener('click', async function (ev) {
    var el = ev.target.closest('[data-a]'); if (!el) return;
    var a = el.getAttribute('data-a'), v = el.getAttribute('data-v');
    if (a === 'fotos' || a === 'datafoto') return;
    if (a === 'sel') { if (ev.target.closest('.fotos')) return; E.sel[v] = !E.sel[v]; desenhar(); preview(); }
    else if (a === 'modo') { E.modo = v; desenhar(); preview(); }
    else if (a === 'filtro') { E.filtro = v; desenhar(); }
    else if (a === 'todos') { var L = visiveis().filter(function (p) { return grupoDe(p) === v; }), on = !L.every(function (p) { return E.sel[p.id]; }); L.forEach(function (p) { E.sel[p.id] = on; }); desenhar(); preview(); }
    else if (a === 'tirafoto') { var pr = v.split('|'); (E.fotosCk[pr[0]] || []).splice(+pr[1], 1); desenhar(); preview(); }
    else if (a === 'gerar') gerar(v);
    else if (a === 'avulso') {
      var end = document.getElementById('av_end').value.trim(); if (!end) { toast('Preencha o endereço.', true); return; }
      var fi = document.getElementById('av_foto').files[0], foto = fi ? await reduzir(await lerArquivo(fi)) : '';
      var p = { id: 'av' + Date.now(), avulso: true, secao: 'avulso', endereco: end, bairro: document.getElementById('av_bai').value.trim(), cidade: document.getElementById('av_cid').value.trim(), tipoTxt: document.getElementById('av_tipo').value.trim(), tamanho: document.getElementById('av_fmt').value.trim(), foto: foto };
      E.avulsos.push(p); E.sel[p.id] = true; toast('Ponto adicionado.'); desenhar(); preview();
    }
  });
  raiz.addEventListener('input', function (ev) {
    var t = ev.target;
    if (t.id === 'busca') { E.q = t.value; E.focoBusca = true; desenhar(); return; }
    var g = t.getAttribute('data-g'); if (g) { E[g][t.getAttribute('data-k')] = t.value; preview(); }
  });
  raiz.addEventListener('focusout', function (ev) { if (ev.target.id === 'busca') E.focoBusca = false; });
  raiz.addEventListener('change', async function (ev) {
    var t = ev.target, a = t.getAttribute('data-a');
    if (t.getAttribute('data-c')) { E.kit[t.getAttribute('data-c')] = t.checked; preview(); return; }
    if (a === 'datafoto') { var pr = t.getAttribute('data-v').split('|'), f = (E.fotosCk[pr[0]] || [])[+pr[1]]; if (f) { f.data = t.value; preview(); } return; }
    if (a === 'fotos') {
      var id = t.getAttribute('data-v'), L = E.fotosCk[id] = E.fotosCk[id] || [];
      for (var i = 0; i < t.files.length; i++) { var fl = t.files[i]; L.push({ src: await reduzir(await lerArquivo(fl)), data: E.ck.data || dataArq(fl) }); }
      desenhar(); preview();
    }
  });

  desenhar(); carregar();
})();
