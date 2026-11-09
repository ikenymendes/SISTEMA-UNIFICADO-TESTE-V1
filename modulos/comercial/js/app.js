/* Navegação por abas, entrada no sistema e avisos em tempo real. */
/* [id, rótulo, grupo, ícone] */
var TABS_ADMIN=[['kit','Kit','Cadastro','kit'],['pontos','Pontos','Cadastro','pin'],['fotos','Melhoria de fotos','Cadastro','cam'],['sug','Sugestões','Cadastro','chat'],['mercado','Mercado Central','Cadastro','bag'],['guanabara','Parque Guanabara','Cadastro','leaf'],['brasilia','Brasília','Cadastro','bldg'],['kitp','Mídia Kit personalizado','Gerar','kit'],['prop','Proposta','Gerar','tag'],['precos','Preços base','Propostas','tag'],['hist','Propostas','Propostas','clock'],['usuarios','Usuários','Administração','users']];
var TABS_COM=[['kitp','Mídia Kit personalizado','Gerar','kit'],['prop','Proposta','Gerar','tag'],['minhas','Minhas sugestões','Meu histórico','chat'],['hist','Minhas propostas','Meu histórico','clock']];
var ICONES={cam:'<path d="M4 8h3l2-3h6l2 3h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/><circle cx="12" cy="13" r="3.5"/>',dash:'<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
 kit:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/>',pin:'<path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
 chat:'<path d="M21 15a2 2 0 01-2 2H8l-5 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>',bag:'<path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18"/><path d="M16 10a4 4 0 01-8 0"/>',
 leaf:'<path d="M11 20A7 7 0 019.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z"/><path d="M2 21c0-3 1.9-5.5 6-7"/>',bldg:'<path d="M3 21h18M5 21V9l7-5 7 5v12"/><path d="M9 21v-6h6v6"/>',
 tag:'<path d="M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8z"/><circle cx="7.5" cy="7.5" r="1.2"/>',down:'<path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',users:'<path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8"/>'};
var TABS=TABS_ADMIN, uSub=[], unsubs=[], pendentes=0, ignorarRt=0, pollTimer=null;

function showTab(t){
  curTab=t; document.body.classList.remove('nav-open'); uSub.forEach(function(f){ try{f();}catch(e){} }); uSub=[];
  document.querySelectorAll('.tab,.bt').forEach(function(b){ if(b.dataset.t) b.classList.toggle('on',b.dataset.t===t); });
  var v=$('#view'); v.innerHTML='';
  var fn=({dash:viewDashboard,kit:viewKit,pontos:viewPontos,sel:viewSelecao,sug:viewSugestoes,minhas:viewMinhasSugestoes,hist:viewHistorico,usuarios:viewUsuarios,
    fotos:viewFotos,mercado:function(v){viewSchema(v,'mercado',MERC)},guanabara:function(v){viewSchema(v,'guanabara',GUAN)},brasilia:function(v){viewSchema(v,'brasilia',BRAS)},
    precos:viewPrecos,gerar:viewGerar,kitp:function(v){viewFluxo(v,'kitp')},prop:function(v){viewFluxo(v,'prop')}})[t];
  if(!fn) return; try{ fn(v); }catch(e){ console.error(e); v.appendChild(h('p',{class:'status err',text:'Erro ao abrir a aba: '+erroMsg(e)})); } window.scrollTo(0,0);
}

function montarCabecalho(){
  var who=$('#who'); who.innerHTML='';
  var ini=String(ME.nome||ME.email||'?').trim().charAt(0).toUpperCase();
  who.appendChild(h('span',{class:'av',text:ini}));
  who.appendChild(h('div',{class:'who'},[h('b',{text:ME.nome||ME.email,title:ME.email}),h('span',{text:ME.admin?'Administrador':'Comercial'})]));
  var bell=$('#bell'); bell.hidden=!ME.admin; bell.onclick=function(){ showTab('sug'); };
  $('#menu').onclick=function(){ document.body.classList.toggle('nav-open'); };
}
function montarAbas(){
  var nav=$('#tabs'); nav.innerHTML=''; var ult=null;
  TABS.forEach(function(t){
    if(t[2]&&t[2]!==ult){ nav.appendChild(h('div',{class:'grp',text:t[2]})); } ult=t[2];
    var b=h('button',{class:'tab',type:'button',onclick:function(){ showTab(t[0]); }}); b.dataset.t=t[0];
    b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+(ICONES[t[3]]||'')+'</svg><span class="lbl"></span><b class="cnt" hidden></b>';
    b.querySelector('.lbl').textContent=t[1]; nav.appendChild(b);
  });
  var sep=h('div',{class:'navsep'}); nav.appendChild(sep);
  var sb=h('button',{class:'tab sair',type:'button',onclick:sairDoGerador}); sb.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg><span class="lbl">Sair</span>'; nav.appendChild(sb);
  montarBarraInferior();
}
var BN_CURTO={fotos:'Fotos',kitp:'Mídia Kit',prop:'Proposta',dash:'Início',pontos:'Pontos',sel:'Pontos',sug:'Sugestões',precos:'Preços',gerar:'Gerar',minhas:'Sugestões',hist:'Propostas'};
function montarBarraInferior(){
  var bn=$('#bnav'); bn.innerHTML=''; var ids=ME.admin?['pontos','fotos','kitp','prop']:['kitp','prop','minhas','hist'];
  ids.forEach(function(id){ var t=TABS.filter(function(x){return x[0]===id})[0]; if(!t) return; var b=h('button',{type:'button',class:'bt',onclick:function(){ showTab(id); }}); b.dataset.t=id; b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+(ICONES[t[3]]||'')+'</svg><span></span><b class="cnt" hidden></b>'; b.querySelector('span').textContent=BN_CURTO[id]||t[1]; bn.appendChild(b); });
  if(ME.admin){ var m=h('button',{type:'button',class:'bt',onclick:function(){ document.body.classList.toggle('nav-open'); }}); m.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg><span>Mais</span>'; bn.appendChild(m); }
}

async function atualizarPendentes(){
  if(!ME.admin) return;
  try{ pendentes=await Store.contarPendentes(); }catch(e){ return; }
  var bn=$('#bellN'); if(bn){ bn.textContent=pendentes; $('#bell').classList.toggle('on',pendentes>0); }
  document.querySelectorAll('.tab[data-t=sug] .cnt,.bt[data-t=sug] .cnt').forEach(function(cnt){ cnt.textContent=pendentes; cnt.hidden=!pendentes; });
  document.title=(pendentes?'('+pendentes+') ':'')+'Gerador de Mídia Kit · Mega Mídia OOH';
}

function iniciarTempoReal(){
  unsubs.forEach(function(f){ try{f();}catch(e){} }); unsubs=[]; clearInterval(pollTimer);
  unsubs.push(Store.assinar('pontos',agendarRefetch));
  unsubs.push(Store.assinar('config',agendarRefetch));
  unsubs.push(Store.assinar('sugestoes',function(ev){
    var n=ev.new||{};
    if(ME.admin){
      if(ev.eventType==='INSERT'&&n.status==='pendente') toast('🔔 Nova sugestão de '+(n.criado_por_nome||n.criado_por_email||'um usuário')+': '+(n.tipo==='adicionar'?'adicionar ponto':'alterar ponto'));
      atualizarPendentes(); if(curTab==='sug') showTab('sug');
    } else if(ev.eventType==='UPDATE'&&n.criado_por===ME.uid&&n.status&&n.status!=='pendente'){
      toast('Sua sugestão foi '+(n.status==='aprovada'?'aprovada ✅':'recusada')+(n.resposta?': '+n.resposta:''),n.status!=='aprovada'); if(curTab==='minhas') showTab('minhas');
    }
  }));
  unsubs.push(Store.assinar('profiles',function(ev){
    if(ev.new&&ev.new.id===ME.uid&&ev.new.papel!==ME.papel){ toast('O seu acesso foi alterado pelo administrador. Recarregando…'); setTimeout(function(){ location.reload(); },1500); }
    else if(ME.admin&&curTab==='usuarios') showTab('usuarios');
  }));
  if(ME.admin) pollTimer=setInterval(atualizarPendentes,60000);
}

async function enterApp(){
  TABS=ME.admin?TABS_ADMIN:TABS_COM; montarCabecalho(); montarAbas();
  if(!synced){
    gate('Carregando pontos…','Buscando os dados compartilhados.');
    try{ await carregarDados(); synced=true; }
    catch(e){ gate('Não foi possível carregar os dados',[erroMsg(e),'Verifique a conexão. Nada foi alterado.'],[h('div',{class:'bar'},[h('button',{class:'btn pri',text:'Tentar de novo',onclick:enterApp}),h('button',{class:'btn',text:'Sair',onclick:sairDoGerador})])]); return; }
  }
  $('#gate').hidden=true; $('#banner').hidden=true;
  await boasVindas();
  iniciarTempoReal(); atualizarPendentes(); if(ME.admin) fqScan(contFotos);
  setSaved(ME.admin?'conectado':'seleção guardada neste navegador');
  showTab(ME.admin?'pontos':TABS[0][0]);
}

/* ---- janelas auxiliares ---- */
function abrirModal(titulo,corpo,botoes,largo){
  var ov=h('div',{class:'pinov modal'}), box=h('div',{class:'mbox'+(largo?' wide':'')});
  function fechar(){ document.removeEventListener('keydown',kd); ov.remove(); }
  function kd(e){ if(e.key==='Escape') fechar(); }
  box.appendChild(h('div',{class:'mhead'},[h('h3',{text:titulo}),h('button',{class:'mini',type:'button',text:'✕',onclick:fechar})]));
  var body=h('div',{class:'mbody'}); [].concat(corpo).forEach(function(c){ if(c) body.appendChild(c); }); box.appendChild(body);
  if(botoes&&botoes.length) box.appendChild(h('div',{class:'bar mfoot'},botoes.map(function(b){ return typeof b==='function'?b(fechar):b; })));
  ov.appendChild(box); document.body.appendChild(ov); document.addEventListener('keydown',kd);
  return {fechar:fechar,box:box};
}
function pedirTexto(titulo,dica,obrigatorio){
  return new Promise(function(res){
    var ta=h('textarea',{rows:3,placeholder:dica||''}), er=h('p',{class:'status err'});
    var m=abrirModal(titulo,[ta,er],[
      function(fechar){ return h('button',{class:'btn pri',type:'button',text:'Confirmar',onclick:function(){ if(obrigatorio&&!ta.value.trim()){ er.textContent='Escreva um texto.'; return; } fechar(); res(ta.value.trim()); }}); },
      function(fechar){ return h('button',{class:'btn',type:'button',text:'Cancelar',onclick:function(){ fechar(); res(null); }}); }
    ]);
    setTimeout(function(){ ta.focus(); },50);
  });
}
