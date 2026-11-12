/* Pontos personalizados (terceiros): pontos avulsos só para uma proposta.
   Nunca vão para o banco. Ficam guardados só nesta aba do navegador (somem ao fechá-la). */
var TMP_KEY = 'com_tmp_pts', tmpAvisouCota = false;

function tmpPts() { return (D.pontos || []).filter(function (p) { return p.tmp; }); }
function tmpLer() {
  try {
    var o = JSON.parse(sessionStorage.getItem(TMP_KEY) || 'null'); if (!o) return [];
    D.lib = D.lib || {}; Object.keys(o.lib || {}).forEach(function (k) { D.lib[k] = o.lib[k]; });
    return (o.pts || []).map(function (p) { p.tmp = true; return p; });
  } catch (e) { return []; }
}
function tmpGuardar() {
  try {
    var pts = tmpPts(), lib = {};
    pts.forEach(function (p) { [].concat(p.foto || [], p.mapa || []).forEach(function (k) { if (k && D.lib && D.lib[k]) lib[k] = D.lib[k]; }); });
    if (!pts.length) { sessionStorage.removeItem(TMP_KEY); return; }
    sessionStorage.setItem(TMP_KEY, JSON.stringify({ pts: pts, lib: lib }));
  } catch (e) {
    if (!tmpAvisouCota) { tmpAvisouCota = true; toast('As fotos dos pontos personalizados são grandes demais para guardar: se recarregar a página, elas se perdem. O restante continua normal.', true); }
  }
}
function tmpNovo(o) {
  return Object.assign({ id: 't' + newId(), tmp: true, dono: 'terceiros', secao: 'led_bh', sel: true, endereco: '', bairro: '', cidade: '' }, o || {});
}

/* busca latitude/longitude pelo endereço (OpenStreetMap), quando não houver link do Maps */
function tmpBuscaBtn(p, aoAchar) {
  var msg = h('small', { class: 'tmpgeo-msg' });
  var b = h('button', { type: 'button', class: 'btn', text: '📍 Buscar coordenadas pelo endereço', onclick: async function () {
    var q = [p.endereco, p.bairro, p.cidade].filter(Boolean).join(', ');
    if (!q) { msg.textContent = 'Preencha o endereço (e, se puder, bairro e cidade).'; return; }
    b.disabled = true; msg.textContent = 'Procurando…';
    try {
      var r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&accept-language=pt-BR&q=' + encodeURIComponent(q));
      var j = await r.json();
      if (j && j[0]) { p.lat = +(+j[0].lat).toFixed(6); p.lng = +(+j[0].lon).toFixed(6); p.llAprox = true; aoAchar({ lat: p.lat, lng: p.lng }); dirty(); msg.textContent = '✓ Posição aproximada encontrada. Para ficar exata, cole o link do Google Maps.'; }
      else msg.textContent = 'Não achei esse endereço. Confira a escrita ou cole o link do Google Maps.';
    } catch (e) { msg.textContent = 'Sem conexão com o serviço de mapas agora. Use o link do Google Maps.'; }
    b.disabled = false;
  } });
  return field('Sem o link?', h('div', { class: 'tmpgeo' }, [b, msg]), null, 'wide');
}

function viewPers(v) {
  v.appendChild(h('h2', { text: 'Pontos personalizados (terceiros)' }));
  v.appendChild(h('p', { class: 'hint', text: 'Para propostas com pontos que não são da Mega. Tudo é editável: formato, endereço, link do Google Maps (puxa a latitude e a longitude sozinho), tamanho, pixels, impacto, fotos etc. Estes pontos NÃO ficam salvos no sistema: valem só nesta aba do navegador e somem quando você fecha a aba.' }));
  var pts = tmpPts();

  var acoes = h('div', { class: 'bar tmpbar' });
  acoes.appendChild(h('button', { type: 'button', class: 'btn pri', text: '＋ Novo ponto', onclick: function () { var p = tmpNovo(); D.pontos.push(p); ordenaPts(D); dirty(); tmpAbrir = p.id; showTab('pers'); } }));
  if (pts.length) {
    acoes.appendChild(h('button', { type: 'button', class: 'btn', text: 'Montar proposta só com estes', onclick: function () { D.pontos.forEach(function (p) { p.sel = !!p.tmp; }); dirty(); FLUXO.prop = 0; showTab('prop'); } }));
    acoes.appendChild(h('button', { type: 'button', class: 'btn', text: 'Montar proposta junto com os nossos', onclick: function () { pts.forEach(function (p) { p.sel = true; }); dirty(); FLUXO.prop = 0; showTab('prop'); } }));
    acoes.appendChild(h('button', { type: 'button', class: 'btn', text: 'Apagar todos', onclick: function () { if (!confirm('Tirar todos os ' + pts.length + ' pontos personalizados?')) return; D.pontos = D.pontos.filter(function (p) { return !p.tmp; }); dirty(); showTab('pers'); } }));
  }
  v.appendChild(acoes);

  /* colar vários de uma vez: endereço ; link do Google Maps (opcional) */
  var bulk = h('textarea', { rows: 3, placeholder: 'Colar vários pontos, um por linha:  Endereço ; link do Google Maps (opcional)\nEx.: Av. Brasil, 1500 – Funcionários ; https://www.google.com/maps/place/...' });
  var bk = h('details', { class: 'pt tmpbulk' }, [h('summary', {}, [h('span', { class: 't', text: 'Colar vários de uma vez' })]),
    h('div', { class: 'grid' }, [field('Um ponto por linha', bulk, 'O formato padrão é Painel de LED; depois troque em cada ponto, se precisar.', 'wide'),
      h('button', { type: 'button', class: 'btn pri', text: 'Criar pontos', onclick: function () {
        var n = 0; bulk.value.split('\n').map(function (l) { return l.trim(); }).filter(Boolean).forEach(function (l) {
          var parts = l.split(/\s*;\s*|\s+\|\s+/), end = parts[0], ll = null;
          parts.slice(1).forEach(function (x) { ll = ll || parseMapsText(x); });
          if (!ll && /maps|@-?\d/.test(end)) { ll = parseMapsText(end); if (ll) end = ''; }
          var p = tmpNovo({ endereco: end }); if (ll) { p.lat = ll.lat; p.lng = ll.lng; } D.pontos.push(p); n++;
        });
        if (!n) return; ordenaPts(D); dirty(); toast(n + ' ponto(s) criado(s)'); showTab('pers');
      } })])]);
  v.appendChild(bk);

  var list = h('div', { class: 'plist' }); v.appendChild(list);
  if (!pts.length) list.appendChild(h('p', { class: 'hint', text: 'Nenhum ponto personalizado ainda. Clique em “＋ Novo ponto” ou cole vários de uma vez.' }));
  pts.forEach(function (p) { var c = pointCard(p, D.pontos.indexOf(p)); c.classList.add('tmp'); if (tmpAbrir === p.id || !p.endereco) c.open = true; list.appendChild(c); });
  if (tmpAbrir) { var alvo = list.querySelector('details.tmp[open]'); tmpAbrir = null; if (alvo) setTimeout(function () { var x = alvo.querySelector('input[type=text]'); alvo.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50); }
}
var tmpAbrir = null;
