/* =====================================================================
   PI DE REPASSE (pedido de inserção) — admin e gerente
   - Formulário + pré-visualização no formato Mega OOH (A4 deitado)
   - Salvar em PDF (impressão) e Word (.docx editável)
   - Histórico no Supabase (SQL 14) com numeração compartilhada
   Usa os estilos de formulário do Protocolo (prt-*).
   ===================================================================== */
var PI = (function () {
  'use strict';

  var A = 'core/assets/';
  var VEIC_PADRAO = {
    razao: 'MEGA MIDIA COMUNICAÇÃO EIRELLI', fantasia: 'MEGA MIDIA OOH', cnpj: '30.754.263/0001-57',
    ie: '003.216.791-00-10', cep: '32.341-230', cidade: 'Contagem', uf: 'MG', contato: 'Diego'
  };
  var COND_PADRAO = [
    'Não autorizamos e nos isentamos de responsabilidade sobre desconto de títulos / factoring e instituições financeiras.',
    'O pagamento será efetuado somente com checking fotográfico, identificado e datado, enviado até 05 dias úteis da colagem/veiculação.',
    'Qualquer ocorrência na exibição deverá ser comunicada imediatamente para se evitar possíveis descontos e abatimentos.',
    'Caso o material não seja entregue até o 1º dia de exibição, gentileza nos comunicar para que seja providenciado.'
  ].join('\n');
  var FAT = [['fliq', 'Faturar líquido'], ['fbru', 'Faturar bruto'], ['nfcli', 'Nota p/ cliente'], ['nfvei', 'Nota p/ veículo'],
    ['fcvei', 'Faturar c/ veículo'], ['fcag', 'Faturar c/ agência'], ['comag', 'Comissão p/ agência'], ['recibo', 'Recibo']];
  var K_EXI = 'pi_exibidoras', K_NUM = 'pi_ultimo', K_VEI = 'pi_veiculo';

  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ler(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function gravar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function h(tag, at, filhos) {
    var el = document.createElement(tag);
    Object.keys(at || {}).forEach(function (k) {
      if (k === 'text') el.textContent = at[k]; else if (k === 'html') el.innerHTML = at[k];
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), at[k]); else el.setAttribute(k, at[k]);
    });
    (filhos || []).forEach(function (f) { if (f) el.appendChild(f); });
    return el;
  }
  function num(v) { if (typeof v === 'number') return v; var s = String(v || '').replace(/[^\d,.-]/g, ''); if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.'); var n = parseFloat(s); return isNaN(n) ? 0 : n; }
  function brl(n) { return 'R$ ' + (Math.round(num(n) * 100) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function dataBr(iso) { if (!iso) return ''; var p = String(iso).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso; }
  function hoje() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function totais(d) {
    var bruto = (d.itens || []).reduce(function (a, it) { return a + num(it.qtd || 1) * num(it.valor); }, 0);
    var desc = num(d.desconto); return { bruto: bruto, desc: desc, liq: Math.max(0, bruto - desc) };
  }
  function nomeArq(d) {
    var l = function (s) { return String(s || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, ''); };
    return ['PI', l(d.num), l(d.exi && d.exi.fantasia), l(d.cliente)].filter(Boolean).join('_');
  }
  function periodo(d) { return d.ini || d.fim ? (dataBr(d.ini) || '__/__/____') + ' a ' + (dataBr(d.fim) || '__/__/____') : '—'; }

  /* ---------------- página (pré-visualização e PDF) ---------------- */
  var CSS = [
    '.pi-pg{width:1123px;min-height:794px;background:#fff;position:relative;overflow:hidden;padding:28px 40px 18px;box-sizing:border-box;font-family:"Poppins",Arial,sans-serif;color:#000066;font-size:11px;-webkit-print-color-adjust:exact;print-color-adjust:exact}',
    '.pi-pg *{box-sizing:border-box}',
    '.pi-pg .fx{position:absolute;right:0;top:0;width:118px}',
    '.pi-pg .topo{display:flex;align-items:flex-start;gap:22px;position:relative;z-index:1}',
    '.pi-pg .lg{height:40px;margin-top:2px}',
    '.pi-pg .tt{flex:1}.pi-pg .k{font-size:9px;letter-spacing:2.6px;font-weight:700;color:#ff0066}',
    '.pi-pg h1{margin:3px 0 0;font-size:25px;line-height:1.05;font-weight:700;color:#000066}',
    '.pi-pg .nbox{background:#000066;color:#fff;border-radius:14px;padding:10px 18px;min-width:190px;margin-right:96px}',
    '.pi-pg .nbox small{display:block;font-size:8.5px;letter-spacing:2px;font-weight:700;color:#ff7eb3}',
    '.pi-pg .nbox b{display:block;font-size:22px;line-height:1.15}.pi-pg .nbox span{font-size:10px;color:#c9ccf2}',
    '.pi-pg .bar{width:52px;height:4px;background:#ff0066;border-radius:3px;margin:8px 0 12px}',
    '.pi-pg .dois{display:grid;grid-template-columns:1fr 1fr;gap:14px}',
    '.pi-pg .card{background:#f5f6fb;border-radius:14px;padding:10px 16px}',
    '.pi-pg .card .k{display:block;margin-bottom:6px}',
    '.pi-pg .kv{display:grid;grid-template-columns:1fr 1fr;gap:3px 16px}',
    '.pi-pg .kv div{line-height:1.35;color:#2a2e55;min-width:0;overflow-wrap:anywhere}.pi-pg .kv i{font-style:normal;color:#8a8fb5;font-size:9px;letter-spacing:.5px;text-transform:uppercase;margin-right:4px}',
    '.pi-pg .kv .w{grid-column:1/-1}.pi-pg .kv b{color:#000066}',
    '.pi-pg .camp{display:grid;grid-template-columns:1.4fr 1.4fr .8fr 1.3fr;gap:16px;background:#000066;color:#fff;border-radius:14px;padding:9px 18px;margin-top:10px}',
    '.pi-pg .camp i{display:block;font-style:normal;font-size:8.5px;letter-spacing:2px;font-weight:700;color:#ff7eb3}',
    '.pi-pg .camp b{display:block;font-size:12.5px;line-height:1.25;margin-top:2px}',
    '.pi-pg table{width:100%;border-collapse:collapse;margin-top:8px}',
    '.pi-pg th{font-size:8.5px;letter-spacing:1.6px;font-weight:700;color:#6b7090;text-align:left;padding:7px 10px;border-bottom:1.5px solid #000066}',
    '.pi-pg td{padding:8px 10px;border-bottom:1px solid #eceef6;vertical-align:top;color:#2a2e55;font-size:11px;line-height:1.4}',
    '.pi-pg td b{color:#000066}.pi-pg .r{text-align:right;white-space:nowrap}.pi-pg .c{text-align:center}',
    '.pi-pg .chk{margin-top:6px;font-size:10px;color:#2a2e55}.pi-pg .chk b{color:#ff0066}',
    '.pi-pg .baixo{display:grid;grid-template-columns:1.35fr 1fr;gap:14px;margin-top:10px;align-items:start}',
    '.pi-pg .cond{font-size:9px;line-height:1.45;color:#4a4f78}.pi-pg .cond p{margin:0 0 2px}',
    '.pi-pg .pag{margin-top:8px;font-size:10.5px;color:#2a2e55;line-height:1.45}.pi-pg .pag b{color:#000066}',
    '.pi-pg .obs{margin-top:8px;display:inline-block;background:#fff0f6;color:#c4004e;font-weight:700;border-radius:99px;padding:4px 12px;font-size:10.5px}',
    '.pi-pg .tot{background:#f5f6fb;border-radius:14px;padding:10px 16px}',
    '.pi-pg .tot div{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #e3e5f2;font-size:11px;color:#2a2e55}',
    '.pi-pg .tot div.liq{border:0;margin-top:4px;background:#ff0066;color:#fff;border-radius:10px;padding:7px 12px;font-size:13px;font-weight:700}',
    '.pi-pg .venc{display:flex;justify-content:space-between;margin-top:6px;font-size:10.5px;color:#2a2e55}.pi-pg .venc b{color:#ff0066}',
    '.pi-pg .fat{display:grid;grid-template-columns:1fr 1fr;gap:2px 12px;margin-top:6px;font-size:9.5px;color:#2a2e55}',
    '.pi-pg .fat span:before{content:"";display:inline-block;width:9px;height:9px;border:1.3px solid #000066;border-radius:2px;margin-right:6px;vertical-align:-1px}',
    '.pi-pg .fat span.on:before{background:#ff0066;border-color:#ff0066;box-shadow:inset 0 0 0 1.5px #fff}',
    '.pi-pg .ass{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:26px}',
    '.pi-pg .ass div{border-top:1.4px solid #000066;padding-top:5px;font-size:9.5px;color:#2a2e55}.pi-pg .ass b{display:block;color:#000066;font-size:10.5px}',
    '.pi-pg .foot{margin-top:10px;padding-top:6px;border-top:1px solid #eceef6;font-size:9px;color:#8a8fb5;display:flex;justify-content:space-between}'
  ].join('\n');

  function paginaHTML(d) {
    var v = d.vei || VEIC_PADRAO, x = d.exi || {}, t = totais(d);
    var kv = function (rot, val, w) { return val ? '<div' + (w ? ' class="w"' : '') + '><i>' + rot + '</i>' + esc(val) + '</div>' : ''; };
    var itens = (d.itens || []).filter(function (it) { return it.local || num(it.valor); });
    var linhas = itens.map(function (it, i) {
      var q = num(it.qtd || 1);
      return '<tr><td class="c">' + ('0' + (i + 1)).slice(-2) + '</td><td><b>' + esc(it.local || '') + '</b>' + (it.det ? '<br>' + esc(it.det) : '') + '</td><td class="c">' + q + '</td><td class="r">' + brl(it.valor) + '</td><td class="r"><b>' + brl(q * num(it.valor)) + '</b></td></tr>';
    }).join('') || '<tr><td colspan="5" style="color:#9a9dc0">Nenhum local informado</td></tr>';
    var cond = String(d.cond || '').split('\n').filter(function (s) { return s.trim(); }).map(function (s) { return '<p>• ' + esc(s) + '</p>'; }).join('');
    var fat = FAT.map(function (f) { return '<span class="' + (d.fat && d.fat[f[0]] ? 'on' : '') + '">' + f[1] + '</span>'; }).join('');
    return '<div class="pi-pg">' +
      '<img class="fx" src="' + A + 'prot-faixas.png" alt="">' +
      '<div class="topo"><img class="lg" src="' + A + 'logoC.png" alt="Mega OOH"><div class="tt"><div class="k">PI DE REPASSE · ' + esc((d.tipoLoc || 'Locação de espaços publicitários').toUpperCase()) + '</div><h1>Pedido de Inserção</h1></div>' +
      '<div class="nbox"><small>P.I. Nº</small><b>' + esc(d.num || '—') + '</b><span>Emissão ' + esc(dataBr(d.emissao) || '') + '</span></div></div>' +
      '<div class="bar"></div>' +
      '<div class="dois"><div class="card"><span class="k">VEÍCULO</span><div class="kv">' +
        '<div class="w"><b>' + esc(v.razao) + '</b></div>' + kv('Fantasia', v.fantasia) + kv('CNPJ', v.cnpj) + kv('Insc. est.', v.ie) + kv('CEP', v.cep) +
        kv('Cidade', [v.cidade, v.uf].filter(Boolean).join(' / ')) + kv('Contato', v.contato) + '</div></div>' +
      '<div class="card"><span class="k">EXIBIDORA</span><div class="kv">' +
        '<div class="w"><b>' + esc(x.razao || x.fantasia || '—') + '</b></div>' + kv('Fantasia', x.fantasia) + kv('CNPJ', x.cnpj) + kv('Insc. est.', x.ie) +
        kv('Endereço', [x.end, x.bairro].filter(Boolean).join(' · '), true) + kv('Cidade', x.cidade) + kv('CEP', x.cep) +
        kv('Contato', x.contato) + kv('Telefone', [x.tel, x.cel].filter(Boolean).join(' · ')) + kv('E-mail', x.email, true) + '</div></div></div>' +
      '<div class="camp"><div><i>PRODUTO / CLIENTE</i><b>' + esc(d.cliente || '—') + '</b></div><div><i>CAMPANHA</i><b>' + esc(d.campanha || '—') + '</b></div>' +
        '<div><i>MATERIAL</i><b>' + esc(d.material || '—') + '</b></div><div><i>PERÍODO DE VEICULAÇÃO</i><b>' + esc(periodo(d)) + '</b></div></div>' +
      '<table><thead><tr><th class="c" style="width:44px">Item</th><th>Locais contratados</th><th class="c" style="width:60px">Qtd.</th><th class="r" style="width:130px">Valor unitário</th><th class="r" style="width:140px">Valor total</th></tr></thead><tbody>' + linhas + '</tbody></table>' +
      (d.checking ? '<div class="chk">Enviar checking fotográfico para: <b>' + esc(d.checking) + '</b></div>' : '') +
      '<div class="baixo"><div><span class="k">CONDIÇÕES GERAIS</span><div class="cond" style="margin-top:4px">' + cond + '</div>' +
        (d.pagamento ? '<div class="pag"><b>Forma de pagamento:</b> ' + esc(d.pagamento) + '</div>' : '') +
        ((d.obs || d.piCliente) ? '<div>' + (d.obs ? '<span class="obs">' + esc(d.obs) + '</span> ' : '') + (d.piCliente ? '<span class="pag" style="display:inline-block;margin-left:8px">PI do cliente nº <b>' + esc(d.piCliente) + '</b></span>' : '') + '</div>' : '') +
      '</div><div><div class="tot"><div><span>Valor bruto</span><b>' + brl(t.bruto) + '</b></div><div><span>Desconto</span><b>' + (t.desc ? '− ' + brl(t.desc) : '—') + '</b></div>' +
        '<div class="liq"><span>Valor líquido</span><span>' + brl(t.liq) + '</span></div></div>' +
        '<div class="venc"><span>Vencimento</span><b>' + esc(dataBr(d.venc) || '—') + '</b></div><div class="fat">' + fat + '</div></div></div>' +
      '<div class="ass"><div><b>Exibidora</b>Assinatura e carimbo · ' + esc(x.razao || x.fantasia || '') + '</div><div><b>Veículo</b>' + esc(v.razao) + ' · CNPJ ' + esc(v.cnpj) + '</div></div>' +
      '<div class="foot"><span>' + esc(v.fantasia || 'Mega Mídia OOH') + ' · CNPJ ' + esc(v.cnpj) + '</span><span>PI ' + esc(d.num || '') + ' · emitida em ' + esc(dataBr(d.emissao)) + '</span></div>' +
      '</div>';
  }
  function fontes() {
    var b = A + 'fonts/Poppins-';
    return [['Regular', 400], ['Medium', 500], ['Bold', 700]].map(function (f) { return '@font-face{font-family:"Poppins";src:url(' + b + f[0] + '.ttf) format("truetype");font-weight:' + f[1] + '}'; }).join('');
  }

  function salvarPDF(d) {
    var fr = document.createElement('iframe');
    fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(fr);
    var doc = fr.contentDocument; doc.open();
    doc.write('<!doctype html><html><head><meta charset="utf-8"><base href="' + location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, '') + '"><title>' + esc(nomeArq(d)) + '</title><style>' + fontes() +
      '@page{size:A4 landscape;margin:0}html,body{margin:0;padding:0}.pi-pg{width:297mm!important;min-height:0!important;max-height:none}' + CSS + '</style></head><body>' + paginaHTML(d) + '</body></html>');
    doc.close();
    var titulo = document.title;
    function imprimir() {
      var imgs = Array.prototype.slice.call(doc.images).map(function (im) { return im.complete ? null : new Promise(function (r) { im.onload = im.onerror = r; }); }).filter(Boolean);
      Promise.all(imgs).then(function () { return doc.fonts && doc.fonts.ready; }).then(function () {
        var pg = doc.querySelector('.pi-pg'), alt = pg && pg.scrollHeight, lim = 793; if (alt > lim) pg.style.zoom = String(Math.floor(lim / alt * 1000) / 1000);
        document.title = nomeArq(d); fr.contentWindow.focus(); fr.contentWindow.print();
        setTimeout(function () { document.title = titulo; fr.remove(); }, 1500);
      });
    }
    if (doc.readyState === 'complete') setTimeout(imprimir, 150); else fr.onload = imprimir;
  }

  /* ---------------- Word (.docx) ---------------- */
  var docxPronto = null;
  function carregarDocx() {
    if (window.docx) return Promise.resolve(window.docx);
    if (docxPronto) return docxPronto;
    docxPronto = new Promise(function (ok, erro) {
      var s = document.createElement('script'); s.src = 'core/vendor/docx.umd.js?v=8.5.0';
      s.onload = function () { ok(window.docx); }; s.onerror = function () { docxPronto = null; erro(new Error('Não consegui carregar o gerador de Word.')); };
      document.head.appendChild(s);
    });
    return docxPronto;
  }
  function bytes(u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error('arquivo ' + u); return r.arrayBuffer(); }); }

  async function salvarWord(d) {
    var D = await carregarDocx(), img = await Promise.all([bytes(A + 'logoC.png'), bytes(A + 'prot-faixas.png')]);
    var v = d.vei || VEIC_PADRAO, x = d.exi || {}, t = totais(d);
    var NAVY = '000066', PINK = 'FF0066', INK = '2A2E55', MUT = '6B7090', F = 'Poppins', LARG = 15138;
    var NB = { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    var semB = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };
    function T(s, o) { o = o || {}; return new D.TextRun({ text: String(s == null ? '' : s), font: F, size: o.size || 18, bold: !!o.bold, color: o.color || INK, characterSpacing: o.sp || 0 }); }
    function P(runs, o) { o = o || {}; return new D.Paragraph({ children: runs, alignment: o.align, spacing: { before: o.antes || 0, after: o.depois == null ? 0 : o.depois, line: 264, lineRule: D.LineRuleType.AUTO } }); }
    function rot(s) { return P([T(s.toUpperCase(), { size: 14, bold: true, color: PINK, sp: 30 })], { depois: 40 }); }
    function cel(filhos, larg, fundo, o) { o = o || {}; return new D.TableCell({ children: filhos, width: { size: larg, type: D.WidthType.DXA }, shading: fundo ? { type: D.ShadingType.CLEAR, color: 'auto', fill: fundo } : undefined, margins: { top: o.mv || 120, bottom: o.mv || 120, left: 180, right: 180 }, borders: o.bordas || semB, verticalAlign: o.va }); }
    function kvP(r, val) { return val ? P([T(r + ': ', { size: 15, color: MUT }), T(val, { size: 17 })]) : null; }
    function kv2() { var runs = []; for (var i = 0; i < arguments.length; i += 2) { if (!arguments[i + 1]) continue; if (runs.length) runs.push(T('    ', { size: 15 })); runs.push(T(arguments[i] + ': ', { size: 15, color: MUT })); runs.push(T(arguments[i + 1], { size: 16 })); } return runs.length ? P(runs) : null; }
    var vP = [rot('Veículo'), P([T(v.razao, { bold: true, color: NAVY })]), kv2('Fantasia', v.fantasia, 'CNPJ', v.cnpj), kv2('Insc. est.', v.ie, 'CEP', v.cep), kv2('Cidade', [v.cidade, v.uf].filter(Boolean).join(' / '), 'Contato', v.contato)].filter(Boolean);
    var xP = [rot('Exibidora'), P([T(x.razao || x.fantasia || '—', { bold: true, color: NAVY })]), kv2('CNPJ', x.cnpj, 'Insc. est.', x.ie), kv2('Endereço', [x.end, x.bairro].filter(Boolean).join(' · ')), kv2('Cidade', x.cidade, 'CEP', x.cep), kv2('Contato', x.contato, 'Tel.', [x.tel, x.cel].filter(Boolean).join(' · ')), kv2('E-mail', x.email)].filter(Boolean);
    var linhaB = { top: NB, left: NB, right: NB, bottom: { style: D.BorderStyle.SINGLE, size: 4, color: 'ECEEF6' } };
    var headB = { top: NB, left: NB, right: NB, bottom: { style: D.BorderStyle.SINGLE, size: 10, color: NAVY } };
    var CW = [900, 8838, 1000, 2100, 2300];
    var itens = (d.itens || []).filter(function (it) { return it.local || num(it.valor); });
    var rowsItens = [new D.TableRow({ children: ['Item', 'Locais contratados', 'Qtd.', 'Valor unitário', 'Valor total'].map(function (s, i) { return cel([P([T(s.toUpperCase(), { size: 13, bold: true, color: MUT, sp: 20 })], { align: i > 2 ? D.AlignmentType.RIGHT : (i === 0 || i === 2 ? D.AlignmentType.CENTER : undefined) })], CW[i], null, { bordas: headB, mv: 80 }); }) })]
      .concat(itens.map(function (it, i) {
        var q = num(it.qtd || 1), loc = [P([T(it.local || '', { bold: true, color: NAVY })])]; if (it.det) loc.push(P([T(it.det)]));
        return new D.TableRow({ children: [cel([P([T(('0' + (i + 1)).slice(-2))], { align: D.AlignmentType.CENTER })], CW[0], null, { bordas: linhaB }), cel(loc, CW[1], null, { bordas: linhaB }),
          cel([P([T(String(q))], { align: D.AlignmentType.CENTER })], CW[2], null, { bordas: linhaB }), cel([P([T(brl(it.valor))], { align: D.AlignmentType.RIGHT })], CW[3], null, { bordas: linhaB }),
          cel([P([T(brl(q * num(it.valor)), { bold: true, color: NAVY })], { align: D.AlignmentType.RIGHT })], CW[4], null, { bordas: linhaB })] });
      }));
    var campo = function (r, val) { return cel([P([T(r, { size: 13, bold: true, color: 'FF7EB3', sp: 20 })]), P([T(val || '—', { size: 19, bold: true, color: 'FFFFFF' })])], LARG / 4, NAVY); };
    var condP = String(d.cond || '').split('\n').filter(function (s) { return s.trim(); }).map(function (s) { return P([T('• ' + s, { size: 14, color: '4A4F78' })]); });
    var esq = [rot('Condições gerais')].concat(condP);
    if (d.pagamento) esq.push(P([T('Forma de pagamento: ', { bold: true, color: NAVY, size: 17 }), T(d.pagamento, { size: 17 })], { antes: 100 }));
    if (d.obs) esq.push(P([T(d.obs, { bold: true, color: 'C4004E', size: 17 })], { antes: 80 }));
    if (d.piCliente) esq.push(P([T('PI do cliente nº ', { size: 17 }), T(d.piCliente, { bold: true, color: NAVY, size: 17 })], { antes: 40 }));
    var totL = function (a, b, o) { o = o || {}; return new D.TableRow({ children: [cel([P([T(a, { bold: o.b, color: o.c || INK, size: o.s || 18 })])], 3000, o.f, { mv: 70 }), cel([P([T(b, { bold: true, color: o.c || NAVY, size: o.s || 18 })], { align: D.AlignmentType.RIGHT })], 2600, o.f, { mv: 70 })] }); };
    var dir = [new D.Table({ width: { size: 5600, type: D.WidthType.DXA }, columnWidths: [3000, 2600], borders: semB, rows: [totL('Valor bruto', brl(t.bruto), { f: 'F5F6FB' }), totL('Desconto', t.desc ? '− ' + brl(t.desc) : '—', { f: 'F5F6FB' }), totL('Valor líquido', brl(t.liq), { f: PINK, c: 'FFFFFF', b: true, s: 22 })] }),
      P([T('Vencimento: ', { size: 17 }), T(dataBr(d.venc) || '—', { bold: true, color: PINK, size: 17 })], { antes: 100 }),
      P([T(FAT.map(function (f) { return (d.fat && d.fat[f[0]] ? '☒ ' : '☐ ') + f[1]; }).join('    '), { size: 15 })], { antes: 60 })];
    var assB = { top: { style: D.BorderStyle.SINGLE, size: 10, color: NAVY }, bottom: NB, left: NB, right: NB };
    var doc = new D.Document({
      creator: 'Mega OOH', title: 'PI ' + (d.num || ''), styles: { default: { document: { run: { font: F } } } },
      sections: [{ properties: { page: { size: { width: 11906, height: 16838, orientation: D.PageOrientation.LANDSCAPE }, margin: { top: 480, bottom: 380, left: 850, right: 850 } } },
        children: [
          P([new D.ImageRun({ data: img[1], transformation: { width: 150, height: 173 }, floating: { horizontalPosition: { relative: D.HorizontalPositionRelativeFrom.PAGE, align: D.HorizontalPositionAlign.RIGHT }, verticalPosition: { relative: D.VerticalPositionRelativeFrom.PAGE, align: D.VerticalPositionAlign.TOP }, behindDocument: true, allowOverlap: true } }),
            new D.ImageRun({ data: img[0], transformation: { width: 139, height: 40 } })]),
          P([T('PI DE REPASSE · ' + String(d.tipoLoc || 'Locação de espaços publicitários').toUpperCase(), { size: 15, bold: true, color: PINK, sp: 40 })], { antes: 60 }),
          P([T('Pedido de Inserção', { size: 40, bold: true, color: NAVY }), T('     P.I. Nº ' + (d.num || '—') + '  ·  emissão ' + dataBr(d.emissao), { size: 20, color: MUT })], { depois: 100 }),
          new D.Table({ width: { size: LARG, type: D.WidthType.DXA }, columnWidths: [7469, 200, 7469], borders: semB, rows: [new D.TableRow({ children: [cel(vP, 7469, 'F5F6FB'), cel([P([T('')])], 200), cel(xP, 7469, 'F5F6FB')] })] }),
          P([T('')], { depois: 40 }),
          new D.Table({ width: { size: LARG, type: D.WidthType.DXA }, columnWidths: [LARG / 4, LARG / 4, LARG / 4, LARG / 4], borders: semB, rows: [new D.TableRow({ children: [campo('PRODUTO / CLIENTE', d.cliente), campo('CAMPANHA', d.campanha), campo('MATERIAL', d.material), campo('PERÍODO DE VEICULAÇÃO', periodo(d))] })] }),
          P([T('')], { depois: 60 }),
          new D.Table({ width: { size: LARG, type: D.WidthType.DXA }, columnWidths: CW, borders: semB, rows: rowsItens }),
          P(d.checking ? [T('Enviar checking fotográfico para: ', { size: 17 }), T(d.checking, { bold: true, color: PINK, size: 17 })] : [T('')], { antes: 60, depois: 80 }),
          new D.Table({ width: { size: LARG, type: D.WidthType.DXA }, columnWidths: [9238, 300, 5600], borders: semB, rows: [new D.TableRow({ children: [cel(esq, 9238, null, { mv: 0 }), cel([P([T('')])], 300), cel(dir, 5600, null, { mv: 0 })] })] }),
          P([T('', { size: 10 })], { depois: 120 }),
          new D.Table({ width: { size: LARG, type: D.WidthType.DXA }, columnWidths: [7069, 1000, 7069], borders: semB, rows: [new D.TableRow({ children: [
            cel([P([T('Exibidora', { bold: true, color: NAVY })]), P([T('Assinatura e carimbo · ' + (x.razao || x.fantasia || ''), { size: 15 })])], 7069, null, { bordas: assB, mv: 60 }), cel([P([T('')])], 1000),
            cel([P([T('Veículo', { bold: true, color: NAVY })]), P([T(v.razao + ' · CNPJ ' + v.cnpj, { size: 15 })])], 7069, null, { bordas: assB, mv: 60 })] })] })
        ] }]
    });
    var blob = await D.Packer.toBlob(doc), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nomeArq(d) + '.docx'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }

  /* ---------------- tela ---------------- */
  function tela(client, perfil) {
    var cli = client || null, souAdmin = perfil && perfil.papel === 'admin';
    if (!document.getElementById('pi-css')) { var st = document.createElement('style'); st.id = 'pi-css'; st.textContent = fontes() + CSS; document.head.appendChild(st); }
    function novo() {
      return { num: String(ler(K_NUM, 0) + 1).padStart(4, '0'), emissao: hoje(), tipoLoc: 'Locação de espaços publicitários', vei: Object.assign({}, VEIC_PADRAO, ler(K_VEI, {})),
        exi: {}, cliente: '', campanha: '', material: 'LED', ini: '', fim: '', itens: [{ qtd: 1, local: '', det: '', valor: '' }], checking: 'diego@megamidiaooh.com.br',
        cond: COND_PADRAO, desconto: '', pagamento: 'Depósito em conta bancária após recebimento da fatura / NF', obs: '', piCliente: '', venc: '', fat: { fliq: true, recibo: false } };
    }
    var d = novo(), exibidoras = ler(K_EXI, []);
    var prev = h('div', { class: 'prt-prev' }), escala = h('div', { class: 'pi-esc' }); prev.appendChild(escala);
    var ultW = 0;
    function pinta() {
      escala.innerHTML = paginaHTML(d);
      var w = prev.clientWidth || 500, s = Math.min(1, w / 1123); ultW = w;
      escala.style.transform = 'scale(' + s + ')'; prev.style.height = Math.ceil((escala.firstChild.offsetHeight || 794) * s) + 'px';
      resumo.textContent = 'Bruto ' + brl(totais(d).bruto) + '  ·  Líquido ' + brl(totais(d).liq);
    }
    var resumo = h('div', { class: 'pi-res' });
    var campos = {};
    function get(k) { var p = k.split('.'); return p.length > 1 ? (d[p[0]] || {})[p[1]] : d[k]; }
    function set(k, val) { var p = k.split('.'); if (p.length > 1) { d[p[0]] = d[p[0]] || {}; d[p[0]][p[1]] = val; } else d[k] = val; }
    function campo(k, rot, o) {
      o = o || {};
      var el = o.area ? h('textarea', { rows: String(o.rows || 2), placeholder: o.ph || '' }) : h('input', { type: o.tipo || 'text', placeholder: o.ph || '' });
      if (o.lista) el.setAttribute('list', o.lista);
      el.value = get(k) || '';
      el.addEventListener('input', function () {
        set(k, el.value);
        if (k === 'exi.fantasia') { var e = exibidoras.filter(function (q) { return q.fantasia === el.value; })[0]; if (e) { d.exi = Object.assign({}, e); Object.keys(campos).forEach(function (c) { if (c.indexOf('exi.') === 0) campos[c].value = get(c) || ''; }); } }
        pinta();
      });
      campos[k] = el;
      return h('label', { class: 'prt-f' + (o.larga ? ' larga' : '') }, [h('span', { text: rot }), el]);
    }
    var dl = h('datalist', { id: 'pi-exis' });
    function pintaLista() { dl.innerHTML = ''; exibidoras.forEach(function (q) { dl.appendChild(h('option', { value: q.fantasia })); }); }
    pintaLista();

    /* itens */
    var itBox = h('div', { class: 'pi-itens' });
    function pintaItens() {
      itBox.innerHTML = '';
      d.itens.forEach(function (it, i) {
        var mk = function (k, ph, cls, tipo) { var e = h('input', { type: tipo || 'text', placeholder: ph, class: cls || '' }); e.value = it[k] == null ? '' : it[k]; e.addEventListener('input', function () { it[k] = e.value; pinta(); }); return e; };
        itBox.appendChild(h('div', { class: 'pi-it' }, [
          h('span', { class: 'pi-n', text: ('0' + (i + 1)).slice(-2) }),
          h('div', { class: 'pi-loc' }, [mk('local', 'Local contratado (ex.: Painel de LED – Av. Cardeal Eugênio Pacelli, 1145 / Cidade Industrial – Contagem)'), mk('det', 'Detalhe (opcional — ex.: 30 dias · primeira venda 06/05 a 05/05)')]),
          mk('qtd', 'Qtd.', 'pi-q', 'number'), mk('valor', 'Valor unit. (R$)', 'pi-v'),
          h('button', { type: 'button', class: 'prt-b sm x', title: 'Tirar este local', text: '×', onclick: function () { d.itens.splice(i, 1); if (!d.itens.length) d.itens.push({ qtd: 1, local: '', det: '', valor: '' }); pintaItens(); pinta(); } })
        ]));
      });
    }
    pintaItens();

    var fatBox = h('div', { class: 'pi-fat' });
    FAT.forEach(function (f) {
      var c = h('input', { type: 'checkbox' }); c.checked = !!(d.fat && d.fat[f[0]]);
      c.addEventListener('change', function () { d.fat = d.fat || {}; d.fat[f[0]] = c.checked; pinta(); });
      campos['fat.' + f[0]] = c;
      fatBox.appendChild(h('label', {}, [c, h('span', { text: f[1] })]));
    });

    var msg = h('div', { class: 'prt-msg' });
    function aviso(t, erro) { msg.textContent = t; msg.className = 'prt-msg' + (erro ? ' erro' : ' ok'); clearTimeout(aviso.t); aviso.t = setTimeout(function () { msg.textContent = ''; msg.className = 'prt-msg'; }, 6000); }
    function valida() {
      if (!d.exi || !(d.exi.fantasia || d.exi.razao)) { aviso('Preencha a exibidora.', true); return false; }
      if (!d.itens.some(function (it) { return it.local; })) { aviso('Inclua pelo menos um local contratado.', true); return false; }
      return true;
    }
    var ultimoSalvo = '';
    async function salvarNuvem() {
      if (!cli) return;
      var c = JSON.parse(JSON.stringify(d)), s = JSON.stringify(c); if (s === ultimoSalvo) return;
      try { var r = await cli.from('pis').insert({ numero: d.num, dados: c }); if (r.error) throw r.error; ultimoSalvo = s; carregarHist(); }
      catch (e) { histMsg.textContent = /pis|does not exist|schema cache/i.test((e && e.message) || '') ? 'Para guardar o histórico, rode o arquivo supabase/14-pis.sql no Supabase.' : 'Não consegui guardar no histórico agora.'; }
    }
    function guardar() {
      var n = parseInt(d.num, 10); if (n > ler(K_NUM, 0)) gravar(K_NUM, n);
      if (d.exi && d.exi.fantasia) { exibidoras = exibidoras.filter(function (q) { return q.fantasia !== d.exi.fantasia; }); exibidoras.unshift(Object.assign({}, d.exi)); exibidoras = exibidoras.slice(0, 40); gravar(K_EXI, exibidoras); pintaLista(); }
      var r = {}; Object.keys(VEIC_PADRAO).forEach(function (k) { if (d.vei[k] !== VEIC_PADRAO[k]) r[k] = d.vei[k]; }); gravar(K_VEI, r);
      salvarNuvem();
    }
    function carregaNoForm(q, comoNovo) {
      d = Object.assign(novo(), JSON.parse(JSON.stringify(q)));
      if (comoNovo) { d.num = String(ler(K_NUM, 0) + 1).padStart(4, '0'); d.emissao = hoje(); }
      Object.keys(campos).forEach(function (k) { var el = campos[k]; if (el.type === 'checkbox') el.checked = !!(d.fat && d.fat[k.slice(4)]); else el.value = get(k) || ''; });
      ultimoSalvo = comoNovo ? '' : JSON.stringify(d); pintaItens(); pinta(); form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    var bWord = h('button', { type: 'button', class: 'prt-b pri', text: '⬇ Baixar Word (.docx)', onclick: function () {
      if (!valida()) return; guardar(); bWord.disabled = true; bWord.textContent = 'Gerando Word…';
      salvarWord(d).then(function () { aviso('Word gerado ✔'); }, function (e) { aviso('Não consegui gerar o Word: ' + (e && e.message || e), true); }).then(function () { bWord.disabled = false; bWord.textContent = '⬇ Baixar Word (.docx)'; });
    } });
    var bPdf = h('button', { type: 'button', class: 'prt-b nv', text: 'Salvar em PDF', onclick: function () { if (!valida()) return; guardar(); salvarPDF(d); aviso('Na janela que abrir, escolha “Salvar como PDF” (A4 deitado).'); } });
    var bNovo = h('button', { type: 'button', class: 'prt-b', text: 'Nova PI', onclick: function () { carregaNoForm(novo(), true); } });

    var veiBox = h('details', { class: 'prt-rem' }, [h('summary', { text: 'Veículo: ' + d.vei.razao + ' (editar)' }), h('div', { class: 'prt-grid' }, [
      campo('vei.razao', 'Razão social', { larga: true }), campo('vei.fantasia', 'Nome fantasia'), campo('vei.cnpj', 'CNPJ'), campo('vei.ie', 'Inscrição estadual'), campo('vei.cep', 'CEP'),
      campo('vei.cidade', 'Cidade'), campo('vei.uf', 'UF'), campo('vei.contato', 'Contato', { larga: true })])]);

    var form = h('section', { class: 'prt-card' }, [
      h('small', { class: 'prt-k', text: 'Documentos' }), h('h2', { html: 'PI de <span>repasse</span>' }),
      h('p', { class: 'prt-sub', text: 'Pedido de inserção para a exibidora. Exibidoras usadas ficam salvas para preencher sozinhas da próxima vez.' }),
      h('div', { class: 'prt-grid' }, [campo('num', 'P.I. nº'), campo('emissao', 'Data de emissão', { tipo: 'date' }), campo('tipoLoc', 'Tipo (aparece no topo)', { larga: true })]),
      veiBox,
      h('h3', { class: 'pi-h3', text: 'Exibidora' }),
      h('div', { class: 'prt-grid' }, [
        campo('exi.fantasia', 'Nome fantasia', { lista: 'pi-exis', ph: 'Ex.: MS Soluções e Instalações' }), campo('exi.razao', 'Razão social'),
        campo('exi.cnpj', 'CNPJ'), campo('exi.ie', 'Inscrição estadual'), campo('exi.end', 'Endereço', { larga: true }), campo('exi.bairro', 'Bairro'), campo('exi.cidade', 'Cidade / UF'),
        campo('exi.cep', 'CEP'), campo('exi.contato', 'Contato'), campo('exi.tel', 'Telefone'), campo('exi.cel', 'Celular'), campo('exi.email', 'E-mail', { larga: true })]), dl,
      h('h3', { class: 'pi-h3', text: 'Campanha' }),
      h('div', { class: 'prt-grid' }, [campo('cliente', 'Produto / cliente', { ph: 'Ex.: Hospital Materdei' }), campo('campanha', 'Campanha'), campo('material', 'Material', { ph: 'Ex.: LED' }),
        campo('piCliente', 'PI do cliente nº (opcional)'), campo('ini', 'Início da veiculação', { tipo: 'date' }), campo('fim', 'Fim da veiculação', { tipo: 'date' })]),
      h('h3', { class: 'pi-h3', text: 'Locais contratados' }), itBox,
      h('button', { type: 'button', class: 'prt-b sm', text: '＋ Adicionar local', onclick: function () { d.itens.push({ qtd: 1, local: '', det: '', valor: '' }); pintaItens(); pinta(); } }),
      h('h3', { class: 'pi-h3', text: 'Valores e pagamento' }),
      h('div', { class: 'prt-grid' }, [campo('desconto', 'Desconto (R$)', { ph: '0,00' }), campo('venc', 'Vencimento', { tipo: 'date' }),
        campo('pagamento', 'Forma de pagamento', { area: true, larga: true }), campo('obs', 'Observação em destaque (ex.: Considerar 30 dias)', { larga: true }),
        campo('checking', 'Enviar checking fotográfico para', { larga: true })]), resumo,
      h('div', { class: 'prt-f larga', style: 'margin-top:10px' }, [h('span', { text: 'Faturamento' }), fatBox]),
      h('details', { class: 'prt-rem' }, [h('summary', { text: 'Condições gerais (editar)' }), campo('cond', 'Uma condição por linha', { area: true, rows: 5, larga: true })]),
      h('div', { class: 'prt-acoes' }, [bNovo, bPdf, bWord]), msg
    ]);

    /* histórico */
    var histLista = h('div', { class: 'prt-hist' }), histMsg = h('p', { class: 'prt-sub' });
    function quando(iso) { var x = new Date(iso); return x.toLocaleDateString('pt-BR'); }
    async function carregarHist() {
      if (!cli) return;
      try {
        var r = await cli.from('pis').select('id,numero,dados,criado_em').order('criado_em', { ascending: false }).limit(200);
        if (r.error) throw r.error;
        var L = r.data || [], maior = L.reduce(function (m, x) { var n = parseInt(x.numero, 10); return n > m ? n : m; }, 0);
        if (maior > ler(K_NUM, 0)) { gravar(K_NUM, maior); if (!(d.exi && d.exi.fantasia) && !d.cliente) { d.num = String(maior + 1).padStart(4, '0'); campos.num.value = d.num; pinta(); } }
        histMsg.textContent = L.length ? 'PIs emitidas (as mais recentes primeiro).' : 'Nenhuma PI emitida ainda.';
        histLista.innerHTML = '';
        L.forEach(function (x) {
          var q = x.dados || {}, t = totais(q);
          histLista.appendChild(h('div', { class: 'prt-hl' }, [
            h('div', { class: 'prt-hi' }, [h('b', { text: 'PI ' + (x.numero || '—') + ' · ' + ((q.exi && (q.exi.fantasia || q.exi.razao)) || '—') }), h('small', { text: (q.cliente || '') + ' · ' + brl(t.liq) + ' · ' + quando(x.criado_em) })]),
            h('div', { class: 'prt-ha' }, [
              h('button', { type: 'button', class: 'prt-b sm', text: 'Abrir', onclick: function () { carregaNoForm(q, false); } }),
              h('button', { type: 'button', class: 'prt-b sm', text: 'Duplicar', title: 'Usar como base para uma PI nova', onclick: function () { carregaNoForm(q, true); } }),
              h('button', { type: 'button', class: 'prt-b sm', text: 'PDF', onclick: function () { salvarPDF(q); } }),
              souAdmin ? h('button', { type: 'button', class: 'prt-b sm x', text: '×', title: 'Apagar do histórico', onclick: async function () {
                if (!confirm('Apagar a PI ' + (x.numero || '') + ' do histórico? Isso não pode ser desfeito.')) return;
                var r2 = await cli.from('pis').delete().eq('id', x.id); if (r2.error) aviso('Não consegui apagar: ' + r2.error.message, true); else carregarHist();
              } }) : null])]));
        });
      } catch (e) { histMsg.textContent = /pis|does not exist|schema cache/i.test((e && e.message) || '') ? 'Para guardar o histórico de PIs, rode o arquivo supabase/14-pis.sql no Supabase.' : 'Não consegui carregar o histórico agora.'; }
    }
    var hist = h('section', { class: 'prt-card' }, [h('small', { class: 'prt-k', text: 'Histórico' }), h('h2', { text: 'PIs emitidas' }), histMsg, histLista]);
    var raiz = h('div', { class: 'prt pi' }, [h('div', { class: 'prt-col' }, [form, hist]), h('section', { class: 'prt-card prt-vis' }, [h('small', { class: 'prt-k', text: 'Pré-visualização (A4 deitado)' }), prev])]);
    pinta(); setTimeout(pinta, 80);
    if (window.ResizeObserver) new ResizeObserver(function () { if (Math.abs((prev.clientWidth || 0) - ultW) > 2) pinta(); }).observe(prev);
    carregarHist(); raiz.atualizar = carregarHist;
    return raiz;
  }

  return { tela: tela, paginaHTML: paginaHTML, salvarWord: salvarWord, salvarPDF: salvarPDF };
})();
