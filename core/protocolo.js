/* =====================================================================
   PROTOCOLO DE ENTREGA (admin e gerente)
   - Formulário + pré-visualização no formato Mega OOH
   - Salvar em PDF (impressão do navegador) e em Word (.docx, editável)
   ===================================================================== */
var PROTOCOLO = (function () {
  'use strict';

  var A = 'core/assets/';
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var REM_PADRAO = {
    nome: 'Mega Mídia Comunicação Ltda.',
    cnpj: '30.754.263/0001-57',
    end: 'Rua Igaraçu, nº 544, sala 01 – Novo Eldorado',
    cid: 'Contagem/MG – CEP 32341-230'
  };
  var K_DEST = 'prot_destinos', K_NUM = 'prot_ultimo', K_REM = 'prot_rem';

  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ler(k, def) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? def : v; } catch (e) { return def; } }
  function gravar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function h(tag, at, filhos) {
    var el = document.createElement(tag);
    Object.keys(at || {}).forEach(function (k) {
      if (k === 'text') el.textContent = at[k];
      else if (k === 'html') el.innerHTML = at[k];
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), at[k]);
      else el.setAttribute(k, at[k]);
    });
    (filhos || []).forEach(function (f) { if (f) el.appendChild(f); });
    return el;
  }
  function dataBr(iso) { if (!iso) return ''; var p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function mesAno() { var d = new Date(); return MESES[d.getMonth()] + ' ' + d.getFullYear(); }
  function numTxt(d) { return 'Nº ' + [d.num, d.mes].filter(Boolean).join(' · '); }
  function nomeArq(d) {
    var limpa = function (s) { return String(s || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, ''); };
    return ['PROTOCOLO', limpa(d.num), limpa(d.dest)].filter(Boolean).join('_');
  }

  /* ---------------- página (pré-visualização e PDF) ---------------- */
  var CSS_PAGINA = [
    '.prt-pg{width:794px;height:1123px;background:#fff;position:relative;overflow:hidden;padding:60px;box-sizing:border-box;font-family:"Poppins",Arial,sans-serif;color:#000066;-webkit-print-color-adjust:exact;print-color-adjust:exact}',
    '.prt-pg *{box-sizing:border-box}',
    '.prt-pg .fx{position:absolute;right:0;top:0;width:260px}',
    '.prt-pg .lg{height:52px;display:block}',
    '.prt-pg .k{font-size:11px;letter-spacing:3px;font-weight:700;color:#ff0066}',
    '.prt-pg h1{font-size:40px;line-height:1.08;margin:6px 0 0;font-weight:700;color:#000066}',
    '.prt-pg .bar{width:60px;height:5px;background:#ff0066;border-radius:3px;margin:16px 0}',
    '.prt-pg .num{font-size:15px;color:#6b7090}',
    '.prt-pg .dois{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:34px}',
    '.prt-pg .card{border-radius:16px;padding:18px 22px;font-size:13.5px;line-height:1.6;color:#2a2e55;background:#f5f6fb}',
    '.prt-pg .card .k{display:block;margin-bottom:6px}',
    '.prt-pg .card b{color:#000066}',
    '.prt-pg .ref{background:#000066;color:#c9ccf2;margin-top:18px}',
    '.prt-pg .ref .t{font-size:17px;font-weight:600;color:#fff;line-height:1.4}',
    '.prt-pg .ref b{color:#fff}',
    '.prt-pg .obs{margin-top:14px;font-size:12.5px;color:#2a2e55;line-height:1.5}',
    '.prt-pg .ass{display:flex;flex-direction:column;gap:22px;margin-top:40px}',
    '.prt-pg .r2{display:grid;grid-template-columns:1.3fr 1fr;gap:26px}',
    '.prt-pg .l{font-size:10.5px;letter-spacing:2px;font-weight:700;color:#ff0066;text-transform:uppercase}',
    '.prt-pg .ln{border-bottom:1.5px solid #c9ccf2;height:34px;display:flex;align-items:flex-end;padding-bottom:4px;color:#2a2e55;font-size:13.5px}',
    '.prt-pg .ln.vz{color:#9a9dc0}.prt-pg .ln.big{height:56px}',
    '.prt-pg .foot{position:absolute;left:60px;right:60px;bottom:0;padding:16px 0;border-top:1px solid #eceef6;font-size:10.5px;color:#6b7090;display:flex;justify-content:space-between;align-items:center}',
    '.prt-pg .foot img{height:20px}'
  ].join('\n');

  function paginaHTML(d) {
    var rem = d.rem || REM_PADRAO;
    return '<div class="prt-pg">' +
      '<img class="fx" src="' + A + 'prot-faixas.png" alt="">' +
      '<img class="lg" src="' + A + 'logoC.png" alt="Mega OOH">' +
      '<div class="k" style="margin-top:70px">PROTOCOLO</div><h1>Protocolo de<br>entrega</h1><div class="bar"></div>' +
      '<div class="num">' + esc(numTxt(d)) + '</div>' +
      '<div class="dois"><div class="card"><span class="k">REMETENTE</span><b>' + esc(rem.nome) + '</b><br>CNPJ ' + esc(rem.cnpj) + '<br>' + esc(rem.end) + '<br>' + esc(rem.cid) + '</div>' +
      '<div class="card"><span class="k">DESTINATÁRIO</span><b>' + esc(d.dest || '—') + '</b>' + (d.ac ? '<br>A/C ' + esc(d.ac) : '') + (d.dend ? '<br>' + esc(d.dend) : '') + '</div></div>' +
      '<div class="card ref"><span class="k">REFERE-SE À ENTREGA DE</span><div class="t">' + esc(d.ref || '—') + '</div>' + (d.cli ? 'Cliente: <b>' + esc(d.cli) + '</b>' : '') + '</div>' +
      (d.obs ? '<div class="obs"><span class="l">Observações</span><br>' + esc(d.obs) + '</div>' : '') +
      '<div class="ass"><div class="r2"><div><span class="l">Recebido em</span><div class="ln' + (d.receb ? '' : ' vz') + '">' + (d.receb ? esc(dataBr(d.receb)) : '____ / ____ / ' + new Date().getFullYear()) + '</div></div><div><span class="l">RG</span><div class="ln"></div></div></div>' +
      '<div><span class="l">Responsável pelo recebimento (nome legível)</span><div class="ln"></div></div>' +
      '<div><span class="l">Assinatura</span><div class="ln big"></div></div></div>' +
      '<div class="foot"><span>' + esc(rem.nome) + ' · CNPJ ' + esc(rem.cnpj) + '</span><img src="' + A + 'logoC.png" alt=""></div>' +
      '</div>';
  }

  function fontesCSS() {
    var b = A + 'fonts/Poppins-';
    return [['Regular', 400], ['Medium', 500], ['Bold', 700]].map(function (f) {
      return '@font-face{font-family:"Poppins";src:url(' + b + f[0] + '.ttf) format("truetype");font-weight:' + f[1] + '}';
    }).join('');
  }

  /* ---------------- PDF: impressão de uma página A4 ---------------- */
  function salvarPDF(d) {
    var fr = document.createElement('iframe');
    fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(fr);
    var doc = fr.contentDocument;
    doc.open();
    doc.write('<!doctype html><html><head><meta charset="utf-8"><base href="' + location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, '') + '"><title>' + esc(nomeArq(d)) + '</title><style>' + fontesCSS() +
      '@page{size:A4;margin:0}html,body{margin:0;padding:0}body{width:210mm}.prt-pg{width:210mm!important;height:296.5mm!important}' + CSS_PAGINA + '</style></head><body>' + paginaHTML(d) + '</body></html>');
    doc.close();
    var titulo = document.title;
    function imprimir() {
      var w = fr.contentWindow;
      var imgs = Array.prototype.slice.call(doc.images).map(function (im) { return im.complete ? null : new Promise(function (r) { im.onload = im.onerror = r; }); }).filter(Boolean);
      Promise.all(imgs).then(function () { return doc.fonts && doc.fonts.ready; }).then(function () {
        document.title = nomeArq(d);
        w.focus(); w.print();
        setTimeout(function () { document.title = titulo; fr.remove(); }, 1500);
      });
    }
    if (doc.readyState === 'complete') setTimeout(imprimir, 150); else fr.onload = imprimir;
  }

  /* ---------------- Word (.docx, editável) ---------------- */
  var docxPronto = null;
  function carregarDocx() {
    if (window.docx) return Promise.resolve(window.docx);
    if (docxPronto) return docxPronto;
    docxPronto = new Promise(function (ok, erro) {
      var s = document.createElement('script');
      s.src = 'core/vendor/docx.umd.js?v=8.5.0';
      s.onload = function () { ok(window.docx); };
      s.onerror = function () { docxPronto = null; erro(new Error('Não consegui carregar o gerador de Word.')); };
      document.head.appendChild(s);
    });
    return docxPronto;
  }
  function bytes(url) { return fetch(url).then(function (r) { if (!r.ok) throw new Error('arquivo ' + url); return r.arrayBuffer(); }); }

  async function salvarWord(d) {
    var D = await carregarDocx();
    var imgs = await Promise.all([bytes(A + 'logoC.png'), bytes(A + 'prot-faixas.png'), bytes(A + 'prot-barra.png')]);
    var rem = d.rem || REM_PADRAO;
    var NAVY = '000066', PINK = 'FF0066', INK = '2A2E55', MUT = '6B7090', FONTE = 'Poppins';
    var semBorda = { top: { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' }, insideHorizontal: { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' }, insideVertical: { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' } };
    function T(txt, o) { o = o || {}; return new D.TextRun({ text: txt, font: FONTE, size: o.size || 21, bold: !!o.bold, color: o.color || INK, characterSpacing: o.sp || 0, break: o.br ? 1 : 0 }); }
    function P(runs, o) { o = o || {}; return new D.Paragraph({ children: runs, spacing: { before: o.antes || 0, after: o.depois == null ? 0 : o.depois, line: o.line || 288, lineRule: D.LineRuleType.AUTO }, border: o.borda, alignment: o.align }); }
    function rot(txt, antes) { return P([T(txt.toUpperCase(), { size: 15, bold: true, color: PINK, sp: 40 })], { antes: antes || 0, depois: 60 }); }
    function celula(filhos, fundo, larg) {
      return new D.TableCell({ children: filhos, width: { size: larg, type: D.WidthType.DXA }, shading: { type: D.ShadingType.CLEAR, color: 'auto', fill: fundo || 'FFFFFF' }, margins: { top: 260, bottom: 260, left: 320, right: 320 }, borders: semBorda });
    }
    function linha(valor, alto) {
      return P([T(valor || ' ', { size: 21, color: valor ? INK : '9A9DC0' })], { antes: alto ? 520 : 240, depois: 60, borda: { bottom: { style: D.BorderStyle.SINGLE, size: 10, color: 'C9CCF2', space: 4 } } });
    }
    var LARG = 9586; /* largura útil A4 com margens de 0,6" */
    var remP = [rot('Remetente'), P([T(rem.nome, { bold: true, color: NAVY })]), P([T('CNPJ ' + rem.cnpj)]), P([T(rem.end)]), P([T(rem.cid)])];
    var desP = [rot('Destinatário'), P([T(d.dest || '—', { bold: true, color: NAVY })])];
    if (d.ac) desP.push(P([T('A/C ' + d.ac)]));
    if (d.dend) desP.push(P([T(d.dend)]));
    var refP = [P([T('REFERE-SE À ENTREGA DE', { size: 15, bold: true, color: PINK, sp: 40 })], { depois: 60 }), P([T(d.ref || '—', { size: 26, bold: true, color: 'FFFFFF' })])];
    if (d.cli) refP.push(P([T('Cliente: ', { color: 'C9CCF2' }), T(d.cli, { bold: true, color: 'FFFFFF' })]));
    var ano = new Date().getFullYear();

    var corpo = [
      P([new D.ImageRun({ data: imgs[1], transformation: { width: 260, height: 300 }, floating: { horizontalPosition: { relative: D.HorizontalPositionRelativeFrom.PAGE, align: D.HorizontalPositionAlign.RIGHT }, verticalPosition: { relative: D.VerticalPositionRelativeFrom.PAGE, align: D.VerticalPositionAlign.TOP }, behindDocument: true, allowOverlap: true } }),
        new D.ImageRun({ data: imgs[0], transformation: { width: 181, height: 52 } })]),
      P([T('PROTOCOLO', { size: 16, bold: true, color: PINK, sp: 60 })], { antes: 1000, depois: 60 }),
      P([T('Protocolo de', { size: 60, bold: true, color: NAVY })], { line: 228 }),
      P([T('entrega', { size: 60, bold: true, color: NAVY })], { line: 228, depois: 200 }),
      P([new D.ImageRun({ data: imgs[2], transformation: { width: 60, height: 5 } })], { depois: 160 }),
      P([T(numTxt(d), { size: 23, color: MUT })], { depois: 420 }),
      new D.Table({ width: { size: LARG, type: D.WidthType.DXA }, columnWidths: [4693, 200, 4693], borders: semBorda, rows: [new D.TableRow({ children: [celula(remP, 'F5F6FB', 4693), celula([P([T('')])], 'FFFFFF', 200), celula(desP, 'F5F6FB', 4693)] })] }),
      P([T('')], { depois: 200 }),
      new D.Table({ width: { size: LARG, type: D.WidthType.DXA }, columnWidths: [LARG], borders: semBorda, rows: [new D.TableRow({ children: [celula(refP, NAVY, LARG)] })] })
    ];
    if (d.obs) corpo.push(rot('Observações', 260), P([T(d.obs)]));
    corpo.push(
      new D.Table({ width: { size: LARG, type: D.WidthType.DXA }, columnWidths: [5300, 400, 3886], borders: semBorda, rows: [new D.TableRow({ children: [
        new D.TableCell({ borders: semBorda, width: { size: 5300, type: D.WidthType.DXA }, children: [rot('Recebido em', 560), linha(d.receb ? dataBr(d.receb) : '____ / ____ / ' + ano)] }),
        new D.TableCell({ borders: semBorda, width: { size: 400, type: D.WidthType.DXA }, children: [P([T('')])] }),
        new D.TableCell({ borders: semBorda, width: { size: 3886, type: D.WidthType.DXA }, children: [rot('RG', 560), linha('')] })
      ] })] }),
      rot('Responsável pelo recebimento (nome legível)', 360), linha(''),
      rot('Assinatura', 360), linha('', true)
    );

    var doc = new D.Document({
      creator: 'Mega OOH', title: 'Protocolo de entrega',
      styles: { default: { document: { run: { font: FONTE } } } },
      sections: [{
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 864, bottom: 864, left: 1160, right: 1160, footer: 400 } } },
        footers: { default: new D.Footer({ children: [new D.Table({ width: { size: LARG, type: D.WidthType.DXA }, columnWidths: [7000, 2586], borders: semBorda, rows: [new D.TableRow({ children: [
          new D.TableCell({ borders: { top: { style: D.BorderStyle.SINGLE, size: 6, color: 'ECEEF6' }, bottom: semBorda.bottom, left: semBorda.left, right: semBorda.right }, width: { size: 7000, type: D.WidthType.DXA }, children: [P([T(rem.nome + ' · CNPJ ' + rem.cnpj, { size: 16, color: MUT })], { antes: 160 })] }),
          new D.TableCell({ borders: { top: { style: D.BorderStyle.SINGLE, size: 6, color: 'ECEEF6' }, bottom: semBorda.bottom, left: semBorda.left, right: semBorda.right }, width: { size: 2586, type: D.WidthType.DXA }, children: [P([new D.ImageRun({ data: imgs[0], transformation: { width: 70, height: 20 } })], { antes: 120, align: D.AlignmentType.RIGHT })] })
        ] })] })] }) },
        children: corpo
      }]
    });
    var blob = await D.Packer.toBlob(doc);
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nomeArq(d) + '.docx';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }

  /* ---------------- tela ---------------- */
  function tela(client, perfil) {
    var cli = client || null, souAdmin = perfil && perfil.papel === 'admin';
    if (!document.getElementById('prt-css')) {
      var st = document.createElement('style'); st.id = 'prt-css'; st.textContent = fontesCSS() + CSS_PAGINA; document.head.appendChild(st);
    }
    var ult = ler(K_NUM, 0);
    var d = { num: String(ult + 1).padStart(3, '0'), mes: mesAno(), dest: '', ac: '', dend: '', ref: '', cli: '', obs: '', receb: '', rem: Object.assign({}, REM_PADRAO, ler(K_REM, {})) };
    var destinos = ler(K_DEST, []);

    var prev = h('div', { class: 'prt-prev' }), escala = h('div', { class: 'prt-esc' });
    prev.appendChild(escala);
    function pinta() {
      escala.innerHTML = paginaHTML(d);
      var w = prev.clientWidth || 400; escala.style.transform = 'scale(' + Math.min(1, w / 794) + ')';
      prev.style.height = Math.ceil(1123 * Math.min(1, w / 794)) + 'px';
    }
    var campos = {};
    function campo(k, rot, o) {
      o = o || {};
      var el = o.area ? h('textarea', { rows: '2', placeholder: o.ph || '' }) : h('input', { type: o.tipo || 'text', placeholder: o.ph || '' });
      if (o.lista) el.setAttribute('list', o.lista);
      el.value = k.indexOf('rem.') === 0 ? d.rem[k.slice(4)] : d[k];
      el.addEventListener('input', function () {
        if (k.indexOf('rem.') === 0) d.rem[k.slice(4)] = el.value; else d[k] = el.value;
        if (k === 'dest') { var x = destinos.filter(function (q) { return q.dest === el.value; })[0]; if (x) { d.ac = x.ac || ''; d.dend = x.dend || ''; campos.ac.value = d.ac; campos.dend.value = d.dend; } }
        pinta();
      });
      campos[k] = el;
      return h('label', { class: 'prt-f' + (o.larga ? ' larga' : '') }, [h('span', { text: rot }), el]);
    }
    var dl = h('datalist', { id: 'prt-dests' });
    function pintaLista() { dl.innerHTML = ''; destinos.forEach(function (q) { dl.appendChild(h('option', { value: q.dest })); }); }
    pintaLista();

    function guardar() {
      var n = parseInt(d.num, 10); if (n > ler(K_NUM, 0)) gravar(K_NUM, n);
      if (d.dest) {
        destinos = destinos.filter(function (q) { return q.dest !== d.dest; });
        destinos.unshift({ dest: d.dest, ac: d.ac, dend: d.dend }); destinos = destinos.slice(0, 30);
        gravar(K_DEST, destinos); pintaLista();
      }
      var r = {}; Object.keys(REM_PADRAO).forEach(function (k) { if (d.rem[k] !== REM_PADRAO[k]) r[k] = d.rem[k]; }); gravar(K_REM, r);
      salvarNuvem();
    }
    /* histórico de 30 dias no Supabase (SQL 13) */
    var ultimoSalvo = '';
    async function salvarNuvem() {
      if (!cli) return;
      var copia = JSON.parse(JSON.stringify(d)), ass = JSON.stringify(copia);
      if (ass === ultimoSalvo) return; /* mesmo protocolo baixado em Word e PDF: guarda uma vez só */
      try { var r = await cli.from('protocolos').insert({ numero: d.num, dados: copia }); if (r.error) throw r.error; ultimoSalvo = ass; carregarHist(); }
      catch (e) { histMsg.textContent = /protocolos|does not exist|schema cache/i.test((e && e.message) || '') ? 'Para guardar o histórico, rode o arquivo supabase/13-protocolos.sql no Supabase.' : 'Não consegui guardar no histórico agora.'; }
    }
    var histLista = h('div', { class: 'prt-hist' }), histMsg = h('p', { class: 'prt-sub' });
    function quando(iso) { var x = new Date(iso); return x.toLocaleDateString('pt-BR') + ' ' + ('0' + x.getHours()).slice(-2) + ':' + ('0' + x.getMinutes()).slice(-2); }
    function carregaNoForm(q) {
      Object.keys(q).forEach(function (k) { d[k] = k === 'rem' ? Object.assign({}, REM_PADRAO, q.rem || {}) : q[k]; });
      Object.keys(campos).forEach(function (k) { campos[k].value = k.indexOf('rem.') === 0 ? (d.rem[k.slice(4)] || '') : (d[k] || ''); });
      ultimoSalvo = JSON.stringify(d); pinta(); form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    async function carregarHist() {
      if (!cli) { histMsg.textContent = ''; return; }
      try {
        var r = await cli.from('protocolos').select('id,numero,dados,criado_em').gte('criado_em', new Date(Date.now() - 30 * 864e5).toISOString()).order('criado_em', { ascending: false }).limit(200);
        if (r.error) throw r.error;
        var L = r.data || [];
        var maior = L.reduce(function (m, x) { var n = parseInt(x.numero, 10); return n > m ? n : m; }, 0);
        if (maior > ler(K_NUM, 0)) { gravar(K_NUM, maior); if (!d.dest && !d.ref) { d.num = String(maior + 1).padStart(3, '0'); campos.num.value = d.num; pinta(); } }
        histMsg.textContent = L.length ? 'Protocolos dos últimos 30 dias. Depois disso eles são apagados sozinhos.' : 'Nenhum protocolo nos últimos 30 dias.';
        histLista.innerHTML = '';
        L.forEach(function (x) {
          var q = x.dados || {};
          var linha = h('div', { class: 'prt-hl' }, [
            h('div', { class: 'prt-hi' }, [h('b', { text: 'Nº ' + (x.numero || '—') + ' · ' + (q.dest || '—') }), h('small', { text: (q.ref || '') + (q.cli ? ' · ' + q.cli : '') + ' · ' + quando(x.criado_em) })]),
            h('div', { class: 'prt-ha' }, [
              h('button', { type: 'button', class: 'prt-b sm', text: 'Abrir', onclick: function () { carregaNoForm(q); } }),
              h('button', { type: 'button', class: 'prt-b sm', text: 'PDF', onclick: function () { salvarPDF(q); } }),
              h('button', { type: 'button', class: 'prt-b sm', text: 'Word', onclick: function () { salvarWord(q).catch(function (e) { aviso('Não consegui gerar o Word: ' + (e && e.message || e), true); }); } }),
              souAdmin ? h('button', { type: 'button', class: 'prt-b sm x', title: 'Apagar do histórico', text: '×', onclick: async function () {
                if (!confirm('Apagar o protocolo Nº ' + (x.numero || '') + ' do histórico? Isso não pode ser desfeito.')) return;
                var r2 = await cli.from('protocolos').delete().eq('id', x.id); if (r2.error) aviso('Não consegui apagar: ' + r2.error.message, true); else carregarHist();
              } }) : null
            ])
          ]);
          histLista.appendChild(linha);
        });
      } catch (e) {
        histMsg.textContent = /protocolos|does not exist|schema cache/i.test((e && e.message) || '') ? 'Para guardar o histórico por 30 dias, rode o arquivo supabase/13-protocolos.sql no Supabase.' : 'Não consegui carregar o histórico agora.';
      }
    }
    var msg = h('div', { class: 'prt-msg' });
    function aviso(t, erro) { msg.textContent = t; msg.className = 'prt-msg' + (erro ? ' erro' : ' ok'); clearTimeout(aviso.t); aviso.t = setTimeout(function () { msg.textContent = ''; msg.className = 'prt-msg'; }, 5000); }
    function valida() { if (!d.dest || !d.ref) { aviso('Preencha pelo menos o destinatário e a que se refere a entrega.', true); return false; } return true; }

    var remBox = h('details', { class: 'prt-rem' }, [h('summary', { text: 'Remetente: ' + d.rem.nome + ' (editar)' }),
      h('div', { class: 'prt-grid' }, [campo('rem.nome', 'Empresa'), campo('rem.cnpj', 'CNPJ'), campo('rem.end', 'Endereço', { larga: true }), campo('rem.cid', 'Cidade / CEP', { larga: true })])]);

    var bWord = h('button', { type: 'button', class: 'prt-b pri', text: '⬇ Baixar Word (.docx)', onclick: function () {
      if (!valida()) return; guardar(); bWord.disabled = true; bWord.textContent = 'Gerando Word…';
      salvarWord(d).then(function () { aviso('Word gerado ✔'); }, function (e) { aviso('Não consegui gerar o Word: ' + (e && e.message || e), true); })
        .then(function () { bWord.disabled = false; bWord.textContent = '⬇ Baixar Word (.docx)'; });
    } });
    var bPdf = h('button', { type: 'button', class: 'prt-b nv', text: 'Salvar em PDF', onclick: function () { if (!valida()) return; guardar(); salvarPDF(d); aviso('Na janela que abrir, escolha “Salvar como PDF”.'); } });
    var bNovo = h('button', { type: 'button', class: 'prt-b', text: 'Novo protocolo', onclick: function () {
      ['dest', 'ac', 'dend', 'ref', 'cli', 'obs', 'receb'].forEach(function (k) { d[k] = ''; campos[k].value = ''; });
      d.num = String(ler(K_NUM, 0) + 1).padStart(3, '0'); campos.num.value = d.num; d.mes = mesAno(); campos.mes.value = d.mes; pinta();
    } });

    var form = h('section', { class: 'prt-card' }, [
      h('small', { class: 'prt-k', text: 'Documentos' }), h('h2', { html: 'Protocolo de <span>entrega</span>' }),
      h('p', { class: 'prt-sub', text: 'Preencha e baixe em Word (editável) ou PDF. Destinatários usados ficam salvos para a próxima vez.' }),
      h('div', { class: 'prt-grid' }, [
        campo('num', 'Número', { ph: 'Ex.: 041' }), campo('mes', 'Mês / ano'),
        campo('dest', 'Destinatário (empresa)', { ph: 'Ex.: R2 Mídia', lista: 'prt-dests', larga: true }),
        campo('ac', 'A/C (aos cuidados de)', { ph: 'Ex.: Guimarães' }), campo('cli', 'Cliente', { ph: 'Ex.: Vero' }),
        campo('dend', 'Endereço do destinatário', { ph: 'Rua, número – bairro, cidade/UF', larga: true }),
        campo('ref', 'Refere-se à entrega de', { ph: 'Ex.: Cartaz instalação BI 48 – Tereza Cristina', larga: true }),
        campo('obs', 'Observações (opcional)', { area: true, larga: true }),
        campo('receb', 'Recebido em (opcional — em branco para preencher à mão)', { tipo: 'date', larga: true })
      ]), dl, remBox,
      h('div', { class: 'prt-acoes' }, [bNovo, bPdf, bWord]), msg
    ]);
    var hist = h('section', { class: 'prt-card prt-histc' }, [h('small', { class: 'prt-k', text: 'Histórico' }), h('h2', { text: 'Protocolos salvos' }), histMsg, histLista]);
    var raiz = h('div', { class: 'prt' }, [h('div', { class: 'prt-col' }, [form, hist]), h('section', { class: 'prt-card prt-vis' }, [h('small', { class: 'prt-k', text: 'Pré-visualização' }), prev])]);
    carregarHist();
    raiz.atualizar = carregarHist;
    pinta();
    window.addEventListener('resize', pinta);
    setTimeout(pinta, 60);
    if (window.ResizeObserver) new ResizeObserver(function () { pinta(); }).observe(prev);
    return raiz;
  }

  return { tela: tela, salvarWord: salvarWord, salvarPDF: salvarPDF, paginaHTML: paginaHTML };
})();
