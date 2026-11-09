/* Sugestões: o comercial sugere adicionar/alterar pontos; o administrador confere e aplica. */
var SUG_CAMPOS=[['secao','Seção'],['dono','Propriedade'],['tipoTxt','Tipo exibido'],['endereco','Endereço'],['bairro','Bairro'],['cidade','Cidade'],['lat','Latitude'],['lng','Longitude'],['zoom','Zoom do mapa'],['tamanho','Tamanho'],['pixels','Pixels'],['veic','Veic./dia'],['publico','Público'],['fluxo','Fluxo/dia'],['impacto','Impacto semanal'],['sentido','Sentido'],['foto','Foto'],['mapa','Imagem do mapa']];
function sugCopia(p){ var o=JSON.parse(JSON.stringify(p||{})); delete o.id; delete o.ord; delete o.sel; return o; }
function sugVal(k,v){
  if(v==null||v==='') return '—';
  if(k==='secao') return secLabel(v);
  if(k==='dono') return donoNome(v);
  if(k==='foto'||k==='mapa'){ var a=Array.isArray(v)?v:[v]; return a.length+' imagem(ns)'; }
  return String(v);
}
function sugIgual(a,b){ return stable(a==null?'':a)===stable(b==null?'':b); }
function sugDiff(antes,depois){ var d={}; SUG_CAMPOS.forEach(function(c){ var k=c[0]; if(!sugIgual(antes&&antes[k],depois[k])) d[k]=depois[k]==null?null:depois[k]; }); return d; }

/* campos do ponto (mesmos da ficha do administrador) */
function formPonto(obj,semFoto){
  var g=h('div',{class:'grid'});
  var sel=grupoSelect(obj);
  sel.addEventListener('change',function(){ if((obj.secao==='metro'||obj.secao==='df_painel')&&!obj.cidade){ obj.cidade='Brasília-DF'; cid.value=obj.cidade; } });
  g.appendChild(field('Grupo / formato do ponto',sel)); g.appendChild(field('Tipo exibido no kit',tipoSelect(obj)));
  var ed=inp(obj,'endereco'), ba=inp(obj,'bairro'), cid=inp(obj,'cidade');
  g.appendChild(field('Endereço (título da ficha) *',ed)); g.appendChild(field('Bairro',ba)); g.appendChild(field('Cidade',cid));
  var lk=h('input',{type:'text',placeholder:'Cole o link completo do Google Maps ou "lat, long"'}), lat=inp(obj,'lat',{num:true}), lng=inp(obj,'lng',{num:true}), res=h('small',{text:''});
  lk.addEventListener('input',function(){ var r=parseMapsText(lk.value); if(r){ obj.lat=r.lat; obj.lng=r.lng; lat.value=r.lat; lng.value=r.lng; pm.update(); res.textContent='✓ Coordenadas encontradas: '+r.lat+' , '+r.lng; res.style.color='#2a9d6f'; } else { res.textContent=lk.value?'Não encontrei coordenadas neste link (use o link completo, não o curto).':''; res.style.color='#b0003a'; } });
  g.appendChild(field('Link do Google Maps (preenche lat/long)',h('div',{},[lk,res]),null,'wide'));
  g.appendChild(field('Latitude',lat)); g.appendChild(field('Longitude',lng));
  var pm=mapaPreview(obj); g.appendChild(pm.el); g.addEventListener('input',pm.update);
  [['tamanho','Tamanho (ex.: 9,00 x 3,00 m)'],['pixels','Formato em pixels (ex.: 2308 x 577)'],['veic','Veiculações/dia (bancas)'],['publico','Público (ex.: A, B, C e D)'],['fluxo','Fluxo de carros/dia'],['impacto','Impacto semanal'],['sentido','Sentido (ex.: Centro / Bairro)']].forEach(function(f){ g.appendChild(field(f[1],inp(obj,f[0]))); });
  if(semFoto) g.appendChild(h('p',{class:'hint wide',text:'A foto e a imagem do mapa do ponto só o administrador altera.'})); else g.appendChild(photosField('Foto do ponto',obj,'foto'));
  return g;
}

/* ---- comercial: abre o formulário de sugestão ---- */
function abrirFormSugestao(tipo,ponto){
  var alterar=tipo==='alterar';
  var antes=alterar?sugCopia(ponto):null;
  var obj=alterar?sugCopia(ponto):{secao:(grupoPorK(filtro||'')||GRUPOS[1]).sec[0],dono:(grupoPorK(filtro||'')||{}).r2?'mega_r2':'padrao',endereco:'',bairro:'',cidade:'Belo Horizonte',lat:null,lng:null,zoom:16,tamanho:'',pixels:'',veic:'',publico:'',fluxo:'',impacto:'',sentido:'',foto:null};
  var motivo=h('textarea',{rows:2,placeholder:alterar?'O que mudou e por quê? (ex.: tela trocada, endereço corrigido)':'De onde vem este ponto? (ex.: novo contrato, ponto do parceiro X)'});
  var st=h('p',{class:'status'});
  var corpo=[h('p',{class:'hint',text:alterar?'Altere só o que precisa. O administrador vai ver o antes e o depois e decidir.':'Preencha os dados do novo ponto. O administrador recebe o aviso, confere e cadastra.'}),formPonto(obj,alterar),field('Observação para o administrador',motivo,null,'wide'),st];
  abrirModal(alterar?'Sugerir alteração · '+(ponto.endereco||'ponto'):'Sugerir novo ponto',corpo,[
    function(fechar){ var b=h('button',{class:'btn pri',type:'button',text:'Enviar sugestão'}); b.addEventListener('click',async function(){
      var payload; if(alterar){ payload=sugDiff(antes,obj); delete payload.foto; delete payload.mapa; if(!Object.keys(payload).length){ st.textContent='Você não alterou nada.'; st.className='status err'; return; } }
      else { if(!String(obj.endereco||'').trim()){ st.textContent='Preencha o endereço.'; st.className='status err'; return; } payload=sugCopia(obj); }
      b.disabled=true; st.textContent='Enviando…'; st.className='status';
      try{ await Store.criarSugestao({tipo:alterar?'alterar':'adicionar',ponto_id:alterar?ponto.id:null,payload:payload,antes:alterar?antes:null,motivo:motivo.value.trim()}); fechar(); toast('Sugestão enviada. O administrador foi avisado.'); if(curTab==='minhas') showTab('minhas'); }
      catch(e){ st.textContent='Não foi possível enviar: '+erroMsg(e); st.className='status err'; b.disabled=false; } }); return b; },
    function(fechar){ return h('button',{class:'btn',type:'button',text:'Cancelar',onclick:fechar}); }
  ],true);
}

function badgeStatus(s){ return h('em',{class:'bst '+s,text:s==='pendente'?'Pendente':(s==='aprovada'?'Aprovada':'Recusada')}); }

/* tabela antes × depois */
function tabelaMudancas(s){
  var tb=h('table',{class:'ptab dif'}); var cab=s.tipo==='alterar'?['Campo','Antes','Sugerido']:['Campo','Sugerido']; tb.appendChild(h('thead',{},[h('tr',{},cab.map(function(x){ return h('th',{text:x}); }))])); var body=h('tbody'); tb.appendChild(body);
  SUG_CAMPOS.forEach(function(c){ var k=c[0], novo=s.payload[k]; if(s.tipo==='alterar'){ if(!(k in s.payload)) return; body.appendChild(h('tr',{},[h('td',{text:c[1]}),h('td',{class:'old',text:sugVal(k,s.antes&&s.antes[k])}),h('td',{class:'new',text:sugVal(k,novo)})])); }
    else { if(novo==null||novo==='') return; body.appendChild(h('tr',{},[h('td',{text:c[1]}),h('td',{class:'new',text:sugVal(k,novo)})])); } });
  return h('div',{class:'tw small'},[tb]);
}
function tituloSugestao(s){ var nome=(s.antes&&s.antes.endereco)||s.payload.endereco||'(sem endereço)'; return (s.tipo==='adicionar'?'➕ Adicionar ponto: ':'✏️ Alterar ponto: ')+nome; }

async function recarregarPontos(){
  ignorarRt=Date.now()+3000;
  clearTimeout(saveT); await syncOut();
  applyPontos(await Store.lerPontos());
}

/* ---- administrador: caixa de sugestões ---- */
function viewSugestoes(v){
  v.appendChild(h('h2',{text:'Sugestões do comercial'}));
  v.appendChild(h('p',{class:'hint',text:'O comercial não altera endereços direto: ele sugere e você decide. "Aprovar" aplica na hora no cadastro de pontos. "Editar e aprovar" deixa você ajustar antes. Quem sugeriu recebe o aviso da decisão.'}));
  var fs=h('select',{},[['pendente','Pendentes'],['aprovada','Aprovadas'],['recusada','Recusadas'],['','Todas']].map(function(o){ return h('option',{value:o[0],text:o[1]}); }));
  v.appendChild(h('div',{class:'bar'},[fs])); var box=h('div'); v.appendChild(box);
  async function carregar(){
    box.innerHTML=''; box.appendChild(h('p',{class:'hint',text:'Carregando…'})); var lista;
    try{ lista=await Store.listarSugestoes(fs.value||null); }catch(e){ box.innerHTML=''; box.appendChild(h('p',{class:'status err',text:'Não foi possível carregar: '+erroMsg(e)})); return; }
    box.innerHTML=''; if(!lista.length){ box.appendChild(h('p',{class:'hint',text:fs.value==='pendente'?'Nenhuma sugestão pendente. 🎉':'Nada por aqui.'})); return; }
    lista.forEach(function(s){ box.appendChild(cartaoSugestao(s,carregar)); });
  }
  fs.addEventListener('change',carregar); carregar();
}
function cartaoSugestao(s,recarregar){
  var c=h('div',{class:'sug'});
  c.appendChild(h('div',{class:'sughead'},[h('span',{class:'t',text:tituloSugestao(s)}),badgeStatus(s.status)]));
  c.appendChild(h('p',{class:'hint',text:'Por '+(s.criado_por_nome||s.criado_por_email||'—')+(s.criado_por_email?' ('+s.criado_por_email+')':'')+' · '+dataBR(s.criado_em)}));
  if(s.motivo) c.appendChild(h('p',{class:'motivo',text:'“'+s.motivo+'”'}));
  c.appendChild(tabelaMudancas(s));
  if(s.status!=='pendente'){ c.appendChild(h('p',{class:'hint',text:'Decidida em '+dataBR(s.resolvido_em)+(s.resposta?' · '+s.resposta:'')})); return c; }
  var st=h('p',{class:'status'}), bar=h('div',{class:'bar'});
  async function decidir(acao,payload,resposta){
    try{ ignorarRt=Date.now()+3000; await Store.resolverSugestao(s.id,acao,payload,resposta); if(acao==='aprovar') await recarregarPontos(); toast(acao==='aprovar'?'Sugestão aprovada e aplicada nos pontos.':'Sugestão recusada.'); atualizarPendentes(); recarregar(); }
    catch(e){ st.textContent='Não foi possível concluir: '+erroMsg(e); st.className='status err'; }
  }
  bar.appendChild(h('button',{class:'btn pri',type:'button',text:'✅ Aprovar e aplicar',onclick:function(){ decidir('aprovar',null,null); }}));
  bar.appendChild(h('button',{class:'btn',type:'button',text:'✏️ Editar e aprovar',onclick:function(){ editarEAprovar(s,decidir); }}));
  bar.appendChild(h('button',{class:'btn del',type:'button',text:'✖ Recusar',onclick:async function(){ var r=await pedirTexto('Recusar sugestão','Motivo (aparece para quem sugeriu)',false); if(r!==null) decidir('recusar',null,r||null); }}));
  c.appendChild(bar); c.appendChild(st); return c;
}
function editarEAprovar(s,decidir){
  var atual=s.tipo==='alterar'?D.pontos.filter(function(p){ return p.id===s.ponto_id; })[0]:null;
  var base=s.tipo==='alterar'?Object.assign(sugCopia(atual||s.antes),s.payload):Object.assign({},sugCopia(s.payload));
  var obj=JSON.parse(JSON.stringify(base)), st=h('p',{class:'status'});
  abrirModal('Editar antes de aprovar',[h('p',{class:'hint',text:'Ajuste o que for preciso. Ao aprovar, estes dados vão para o cadastro de pontos.'}),formPonto(obj),st],[
    function(fechar){ return h('button',{class:'btn pri',type:'button',text:'Aprovar com estas alterações',onclick:function(){ if(!String(obj.endereco||'').trim()){ st.textContent='Preencha o endereço.'; st.className='status err'; return; } fechar(); decidir('aprovar',sugCopia(obj),null); }}); },
    function(fechar){ return h('button',{class:'btn',type:'button',text:'Cancelar',onclick:fechar}); }
  ],true);
}

/* ---- comercial: minhas sugestões ---- */
function viewMinhasSugestoes(v){
  v.appendChild(h('h2',{text:'Minhas sugestões'}));
  v.appendChild(h('p',{class:'hint',text:'Acompanhe aqui o que você pediu ao administrador. Para sugerir, vá em "Pontos da proposta".'}));
  var box=h('div'); v.appendChild(box); box.appendChild(h('p',{class:'hint',text:'Carregando…'}));
  Store.listarSugestoes(null).then(function(lista){
    box.innerHTML=''; if(!lista.length){ box.appendChild(h('p',{class:'hint',text:'Você ainda não enviou sugestões.'})); return; }
    lista.forEach(function(s){ var c=h('div',{class:'sug'}); c.appendChild(h('div',{class:'sughead'},[h('span',{class:'t',text:tituloSugestao(s)}),badgeStatus(s.status)])); c.appendChild(h('p',{class:'hint',text:'Enviada em '+dataBR(s.criado_em)})); c.appendChild(tabelaMudancas(s)); if(s.status!=='pendente') c.appendChild(h('p',{class:'hint',text:'Resposta do administrador'+(s.resposta?': '+s.resposta:' (sem comentário)')})); box.appendChild(c); });
  }).catch(function(e){ box.innerHTML=''; box.appendChild(h('p',{class:'status err',text:'Não foi possível carregar: '+erroMsg(e)})); });
}


/* ======================================================================
   Sugestão inteligente de pontos a partir do pedido do cliente.
   Funciona no próprio navegador (sem custo): entende formato, região e
   quantidade no texto e escolhe os pontos por proximidade geográfica.
   ====================================================================== */
var IA_REGIOES=[
  {k:'centro-sul',nome:'Centro-Sul',al:['centro-sul','centro sul','centrosul'],c:[-19.9370,-43.9370],r:3.4},
  {k:'savassi',nome:'Savassi / Funcionários',al:['savassi','funcionarios','lourdes'],c:[-19.9380,-43.9345],r:1.7},
  {k:'centro',nome:'Centro',al:['hipercentro','praca sete','centro de bh','centro da cidade','regiao central','centro'],c:[-19.9191,-43.9386],r:1.7},
  {k:'pampulha',nome:'Pampulha',al:['pampulha'],c:[-19.862,-43.968],r:5.5},
  {k:'barreiro',nome:'Barreiro',al:['barreiro'],c:[-19.975,-44.02],r:5},
  {k:'venda-nova',nome:'Venda Nova',al:['venda nova'],c:[-19.812,-43.953],r:4.5},
  {k:'norte',nome:'Zona Norte',al:['zona norte','regiao norte'],c:[-19.835,-43.935],r:6},
  {k:'noroeste',nome:'Noroeste',al:['noroeste'],c:[-19.915,-43.985],r:3.8},
  {k:'oeste',nome:'Oeste',al:['zona oeste','regiao oeste','oeste'],c:[-19.945,-43.995],r:4.5},
  {k:'nordeste',nome:'Nordeste',al:['nordeste'],c:[-19.89,-43.915],r:4},
  {k:'leste',nome:'Leste',al:['zona leste','regiao leste','leste'],c:[-19.92,-43.915],r:3},
  {k:'sul',nome:'Zona Sul',al:['zona sul','regiao sul'],c:[-19.965,-43.95],r:4.2},
  {k:'buritis',nome:'Buritis',al:['buritis'],c:[-19.972,-43.962],r:2.4}
];
var IA_CIDADES=[['contagem','Contagem'],['betim','Betim'],['nova lima','Nova Lima'],['sabara','Sabará'],['vespasiano','Vespasiano'],['lagoa santa','Lagoa Santa'],['santa luzia','Santa Luzia'],['ibirite','Ibirité'],['ouro preto','Ouro Preto']];
function iaNorm(t){ return String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9\s\-\/]/g,' ').replace(/\s+/g,' ').trim(); }
function iaKm(a,b){ var R=6371, d2r=Math.PI/180, dl=(b[0]-a[0])*d2r, dn=(b[1]-a[1])*d2r, x=Math.sin(dl/2)*Math.sin(dl/2)+Math.cos(a[0]*d2r)*Math.cos(b[0]*d2r)*Math.sin(dn/2)*Math.sin(dn/2); return 2*R*Math.asin(Math.sqrt(x)); }
function iaEntender(texto){
  var t=' '+iaNorm(texto)+' ', ent={fmt:[],fmtTxt:[],reg:[],cidades:[],qtd:null,todos:false,circ:[],rest:'',avisos:[]}, w=t;
  function tem(re){ return re.test(t); }
  var banca=tem(/ bancas? /), painel=tem(/ (paine(l|is)|telas?|totens?) /), led=tem(/ leds? /), digital=tem(/ digitais? | digital /);
  if(tem(/ banca(s)? (de )?(revista|estatica)|estaticas? |jornaleir/)){ ent.fmt.push('revista'); ent.fmtTxt.push('bancas estáticas'); }
  if(banca&&!tem(/ banca(s)? (de )?(revista|estatica)/)){ ent.fmt.push('banca_mega','banca_r2'); ent.fmtTxt.push('bancas de LED'); }
  if((painel||led||digital)&&!tem(/ mega ?paine/)&&!tem(/ outdoor/)&&!tem(/ front ?light/)&&!(banca&&!painel)){ ent.fmt.push('led_mega','led_r2'); ent.fmtTxt.push('painéis de LED'); if(led&&!painel&&!banca){ ent.fmt.push('banca_mega','banca_r2'); ent.fmtTxt.push('bancas de LED'); } }
  if(led&&!banca&&!painel&&!ent.fmt.length){ ent.fmt.push('led_mega','led_r2','banca_mega','banca_r2'); ent.fmtTxt.push('painéis e bancas de LED'); }
  if(tem(/ outdoors? /)){ ent.fmt.push('outdoor'); ent.fmtTxt.push('outdoors'); }
  if(tem(/ mega ?paine/)){ ent.fmt.push('mensal'); ent.fmtTxt.push('mega painéis'); }
  if(tem(/ front ?light| frontlight/)){ ent.fmt.push('front'); ent.fmtTxt.push('frontlight'); }
  if(tem(/ empenas? /)){ ent.fmt.push('empena'); ent.fmtTxt.push('empenas'); }
  if(tem(/ metro /)){ ent.fmt.push('metro'); ent.fmtTxt.push('metrô'); }
  if(tem(/ (brasilia|df|distrito federal) /)){ ent.df=true; ent.fmt=['df_painel']; ent.fmtTxt=['painéis em Brasília']; }
  if(tem(/ mercado central /)){ ent.circ.push('mercado'); }
  if(tem(/ (parque )?guanabara /)){ ent.circ.push('guanabara'); }
  if(ent.df){ w=w.replace(/ (brasilia|df|distrito federal) /g,'  '); }
  ent.fmt=ent.fmt.filter(function(x,i,a){ return a.indexOf(x)===i; }); ent.fmtTxt=ent.fmtTxt.filter(function(x,i,a){ return a.indexOf(x)===i; });
  /* regiões: as mais específicas primeiro; o texto achado sai para não repetir ("centro-sul" não vira "centro") */
  var regs=IA_REGIOES.slice().sort(function(a,b){ return Math.max.apply(0,b.al.map(function(s){return s.length;}))-Math.max.apply(0,a.al.map(function(s){return s.length;})); });
  regs.forEach(function(r){ var hit=r.al.filter(function(s){ return w.indexOf(' '+s+' ')>=0; })[0]; if(hit){ ent.reg.push(r); w=w.split(' '+hit+' ').join('  '); } });
  IA_CIDADES.forEach(function(c){ if(w.indexOf(' '+c[0]+' ')>=0){ ent.cidades.push(c[1]); w=w.split(' '+c[0]+' ').join('  '); } });
  if(/ (regiao metropolitana|rmbh|grande bh|grande belo horizonte) /.test(w)){ ent.metro=true; }
  var m=t.match(/ (\d{1,3}) (pontos?|paine(?:l|is)|bancas?|telas?|locais|leds?|outdoors?|empenas?|totens?) /); if(m) ent.qtd=Math.min(60,+m[1]); else { var m2=t.match(/ (?:ate|uns|cerca de|aproximadamente) (\d{1,3}) /); if(m2) ent.qtd=Math.min(60,+m2[1]); }
  if(/ todos | todas /.test(t)) ent.todos=true;
  var stop=' algo mega metropolitana avenida av rua praca rodovia alameda mercado central guanabara parque brasilia distrito federal o a os as de do da dos das em no na nos nas para por com que quero queremos preciso precisamos cliente pediu pede criar crie criei credo montar monte sugira sugestao uma um uns umas ao aos e ou na regiao regiao pontos ponto paineis painel bancas banca leds led digital digitais outdoor outdoors belo horizonte bh cerca ate uns quantos pelo pela perto proximo proxima mais '.split(' ');
  ent.rest=w.split(' ').filter(function(x){ return x.length>=4&&stop.indexOf(x)<0&&!/^\d+$/.test(x); }).join(' ');
  return ent;
}
function iaSugerir(texto,limite){
  var ent=iaEntender(texto); var soCirc=!ent.fmt.length&&ent.circ.length; var pts=D.pontos.filter(function(p){ return CIRCUITOS.indexOf(p.secao)<0; }), notas=[];
  if(!ent.fmt.length&&!soCirc){ ent.fmt=['led_mega','led_r2','banca_mega','banca_r2']; ent.fmtTxt=['painéis e bancas de LED']; notas.push('Não identifiquei o formato no pedido, então considerei painéis e bancas de LED.'); }
  var base=soCirc?[]:pts.filter(function(p){ return ent.fmt.indexOf(grupoDe(p).k)>=0; });
  var cidadeBH=function(p){ return /belo horizonte/.test(iaNorm(p.cidade)); };
  var temLugar=ent.reg.length||ent.cidades.length||ent.metro, tokens=ent.rest?ent.rest.split(' '):[];
  var tokOk=tokens.filter(function(tk){ return base.some(function(p){ return iaNorm((p.endereco||'')+' '+(p.bairro||'')+' '+(p.cidade||'')).indexOf(tk)>=0; }); });
  var itens=[];
  base.forEach(function(p){
    var lat=parseFloat(p.lat), lng=parseFloat(p.lng), ok=false, sc=0, mot=[], txt=iaNorm((p.endereco||'')+' '+(p.bairro||'')+' '+(p.cidade||''));
    if(ent.reg.length){ ent.reg.forEach(function(r){ if(!isNaN(lat)&&!isNaN(lng)){ var d=iaKm(r.c,[lat,lng]); if(d<=r.r&&cidadeBH(p)){ ok=true; sc=Math.max(sc,1-d/r.r*0.8); mot.push(r.nome); } } else if(txt.indexOf(iaNorm(r.al[0]))>=0){ ok=true; sc=Math.max(sc,0.5); mot.push(r.nome); } }); }
    if(ent.cidades.length&&ent.cidades.some(function(c){ return iaNorm(p.cidade)===iaNorm(c); })){ ok=true; sc=Math.max(sc,0.7); mot.push(p.cidade); }
    if(ent.metro&&!cidadeBH(p)&&!/brasilia/.test(iaNorm(p.cidade))){ ok=true; sc=Math.max(sc,0.6); mot.push(p.cidade||'Região metropolitana'); }
    tokOk.forEach(function(tk){ if(txt.indexOf(tk)>=0){ ok=true; sc+=0.35; mot.push('"'+tk+'"'); } });
    if(!temLugar&&!tokOk.length){ ok=true; sc=0.4; if(cidadeBH(p)) sc+=0.1; }
    if(!ok) return;
    var ve=parseInt(String(p.veic||'').replace(/\D/g,''),10)||0; sc+=Math.min(ve,1000)/1000*0.15; if(p.foto&&!fotoAtencao(p)) sc+=0.1; 
    itens.push({p:p,sc:sc,mot:mot.filter(function(x,i,a){return a.indexOf(x)===i;}),ll:isNaN(lat)||isNaN(lng)?null:[lat,lng]});
  });
  itens.sort(function(a,b){ return b.sc-a.sc; });
  var n=limite||ent.qtd||8; if(ent.todos&&!ent.qtd) n=60;
  var esc=[]; itens.forEach(function(it){ if(esc.length>=n) return; var perto=it.ll&&esc.some(function(o){ return o.ll&&iaKm(o.ll,it.ll)<0.18; }); if(perto){ it.adiado=true; return; } esc.push(it); });
  if(esc.length<n) itens.forEach(function(it){ if(esc.length<n&&it.adiado) esc.push(it); });
  var total=itens.length;
  if(!soCirc&&!total){ if(!base.length) notas.push('Ainda não há pontos cadastrados nesse formato.'); else notas.push('Não encontrei pontos desse formato nessa região. Tente outra região ou outro formato.'); }
  if(!soCirc&&tokens.length&&!tokOk.length&&!temLugar&&ent.rest) notas.push('Não reconheci "'+ent.rest+'" como lugar. Usei só o formato.');
  if(ent.reg.length&&ent.reg.some(function(r){ return r.k!=='centro'&&r.k!=='savassi'; })) notas.push('A região é calculada por proximidade no mapa, não pelo limite oficial da regional.');
  return {ent:ent,itens:esc,total:total,notas:notas,n:n};
}
function iaBox(onApply){
  var box=h('div',{class:'iabox'});
  var ta=h('textarea',{rows:'2',placeholder:'Descreva o pedido do cliente. Ex.: LEDs na região Centro-Sul de Belo Horizonte'});
  var ex=h('div',{class:'iaex'}); ['LEDs na região Centro-Sul de BH','10 bancas de LED na Savassi','Painéis de LED na Pampulha','Outdoors em Contagem e Betim'].forEach(function(t){ ex.appendChild(h('button',{type:'button',class:'chip',text:t,onclick:function(){ ta.value=t; rodar(8); }})); });
  var go=h('button',{type:'button',class:'btn pri',text:'✨ Sugerir pontos',onclick:function(){ rodar(0); }}), out=h('div',{class:'iaout'}), head=h('div',{class:'iahead'},[h('b',{text:'Sugestão inteligente'}),h('span',{text:'Escreva o que o cliente pediu e o sistema escolhe os pontos.'})]);
  box.appendChild(head); box.appendChild(ta); box.appendChild(h('div',{class:'iabar'},[go])); box.appendChild(ex); box.appendChild(out);
  ta.addEventListener('keydown',function(e){ if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)) rodar(0); });
  function rodar(lim){ var txt=ta.value.trim(); out.innerHTML=''; if(!txt){ out.appendChild(h('p',{class:'hint',text:'Escreva o pedido do cliente primeiro.'})); return; }
    var r=iaSugerir(txt,lim||0), e=r.ent, ent=[]; if(e.fmtTxt.length) ent.push(e.fmtTxt.join(' + ')); if(e.circ.length) ent.push('circuito '+e.circ.map(function(k){return SEC[k].nome;}).join(' + ')); if(e.reg.length) ent.push(e.reg.map(function(x){return x.nome;}).join(' + ')); if(e.cidades.length) ent.push(e.cidades.join(' + ')); if(e.metro) ent.push('região metropolitana'); ent.push('até '+r.n+' pontos');
    out.appendChild(h('p',{class:'iaent'},[h('b',{text:'Entendi: '}),document.createTextNode(ent.join(' · '))]));
    r.notas.forEach(function(nt){ out.appendChild(h('p',{class:'hint',text:nt})); });
    var cks=[]; if(e.circ.length) e.circ.forEach(function(k){ out.appendChild(h('div',{class:'iarow circ'},[h('span',{class:'t'},[h('b',{text:'Circuito '+SEC[k].nome}),document.createTextNode(' · todas as telas juntas')])])); });
    r.itens.forEach(function(it){ var p=it.p, ck=h('input',{type:'checkbox'}); ck.checked=true; cks.push([ck,p]); out.appendChild(h('label',{class:'iarow'},[ck,h('span',{class:'t'},[h('b',{text:p.endereco||'(sem endereço)'}),document.createTextNode((p.bairro?' · '+p.bairro:'')+(p.cidade&&!/belo horizonte/i.test(p.cidade)?' · '+p.cidade:''))]),h('em',{text:grupoDe(p).nome}),h('small',{text:it.mot.join(' · ')+(p.veic?(it.mot.length?' · ':'')+p.veic+' veic./dia':'')})])); });
    if(!r.itens.length&&!e.circ.length) return;
    var bar=h('div',{class:'iabar'}); var add=h('button',{type:'button',class:'btn pri',text:'Adicionar à proposta',onclick:function(){ var n=0; cks.forEach(function(c){ if(c[0].checked){ c[1].sel=true; n++; } }); e.circ.forEach(function(k){ ptsOf(D,k).forEach(function(p){ p.sel=true; }); n++; }); dirty(); out.innerHTML=''; out.appendChild(h('p',{class:'status ok',text:'✓ '+n+' item'+(n>1?'s':'')+' adicionado'+(n>1?'s':'')+'. Confira na lista abaixo e continue.'})); if(onApply) onApply(); }});
    bar.appendChild(add); if(r.total>r.itens.length) bar.appendChild(h('button',{type:'button',class:'btn',text:'Mostrar mais pontos ('+(r.total-r.itens.length)+' disponíveis)',onclick:function(){ rodar(Math.min(60,r.n+8)); }})); bar.appendChild(h('button',{type:'button',class:'btn',text:'Descartar',onclick:function(){ out.innerHTML=''; }})); out.appendChild(bar);
    out.appendChild(h('p',{class:'hint',text:'É uma sugestão automática por formato e localização. Confira antes de enviar ao cliente.'})); }
  return box;
}
