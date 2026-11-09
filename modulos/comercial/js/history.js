/* Backup das propostas geradas (sem fotos: só locais e valores praticados) + tela de histórico. */

/* chamado por generate() a cada PPTX/PDF gerado */
async function logProposta(formato,mode){
  try{
    var prop=(mode==='proposta'), kitp=(mode==='kit');
    var rows=prop?(window.LAST_ROWS||[]):[];
    var pts=(prop||kitp)?D.pontos.filter(function(p){ return p.sel; }):[];
    var locais=pts.map(function(p){ return {secao:p.secao,secao_nome:grupoDe(p).nome,endereco:p.endereco||'',bairro:p.bairro||'',cidade:p.cidade||'',lat:p.lat==null||p.lat===''?null:+p.lat,lng:p.lng==null||p.lng===''?null:+p.lng,tamanho:p.tamanho||'',pixels:p.pixels||'',veic:p.veic||'',publico:p.publico||'',fluxo:p.fluxo||'',impacto:p.impacto||'',sentido:p.sentido||'',dono:donoDe(p),valor_tabela:p.preco==null||p.preco===''?null:vlr(p.preco)}; });
    var tt=0,tn=0;
    var valores=rows.map(function(c){ tt+=c.tabela; tn+=c.final; var o={nome:c.nome,pontos:c.pontos,periodo:c.periodo,insercoes_por_ativo:c.insPor,insercoes_total:c.insN,tabela:c.tabela,desconto:c.desc,negociado:c.neg,final:c.final}; if(window.JUST_DESC&&c.desc>(num(D.descAlerta)||20)) o.justificativa=window.JUST_DESC; return o; });
    await Store.salvarProposta({tipo:prop?'proposta':'kit_completo',formato:formato,cliente:D.kit.cliente||null,titulo:D.kit.titulo||null,n_locais:(prop||kitp)?pts.length:D.pontos.length,modo_valor:D.modoGeral,comissao:num(D.comissao),bv:num(D.bv),total_tabela:tt,total_negociado:tn,locais:locais,valores:valores});
    return ' · backup da proposta salvo';
  }catch(e){
    console.error(e); toast('Atenção: o arquivo foi gerado, mas o backup da proposta NÃO foi salvo ('+erroMsg(e)+').',true);
    return ' · ATENÇÃO: backup NÃO salvo';
  }
}

function brlN(v){ return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function csvCel(v){ if(v==null) return ''; if(typeof v==='number') return String(v).replace('.',','); v=String(v).replace(/\r?\n/g,' '); return /[;"]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; }
function csvTexto(cab,linhas){ return '﻿'+[cab].concat(linhas).map(function(l){ return l.map(csvCel).join(';'); }).join('\r\n')+'\r\n'; }
function baixarTexto(nome,texto,mime){ return download(new Blob([texto],{type:mime||'text/plain;charset=utf-8'}),nome); }
function carimbo(){ var d=new Date(); return d.getFullYear()+('0'+(d.getMonth()+1)).slice(-2)+('0'+d.getDate()).slice(-2); }

function exportarPropostas(lista,tipo){
  if(tipo==='json'){ baixarTexto('backup-propostas-'+carimbo()+'.json',JSON.stringify(lista,null,2),'application/json'); return; }
  var base=function(p){ return [p.id,dataBR(p.criado_em),p.cliente||'',p.criado_por_nome||'',p.criado_por_email||'',p.tipo,p.formato]; };
  var cabBase=['id_proposta','data','cliente','gerada_por','e-mail','tipo','formato'];
  if(tipo==='locais'){
    var ls=[]; lista.forEach(function(p){ (p.locais||[]).forEach(function(l){ ls.push(base(p).concat([l.secao_nome||l.secao,l.endereco,l.bairro,l.cidade,l.lat,l.lng,l.tamanho,l.pixels,l.veic,l.publico,l.fluxo,l.impacto,l.sentido,l.dono||'padrao'])); }); });
    baixarTexto('propostas-locais-'+carimbo()+'.csv',csvTexto(cabBase.concat(['formato_do_ponto','endereco','bairro','cidade','latitude','longitude','tamanho','pixels','veiculacoes_dia','publico','fluxo_dia','impacto_semanal','sentido','propriedade']),ls),'text/csv;charset=utf-8'); return;
  }
  var vs=[]; lista.forEach(function(p){ (p.valores||[]).forEach(function(v){ vs.push(base(p).concat([p.modo_valor,p.comissao,p.bv,v.nome,v.pontos,v.periodo,v.insercoes_por_ativo,v.insercoes_total,v.tabela,v.desconto,v.negociado,v.final])); }); });
  baixarTexto('propostas-valores-'+carimbo()+'.csv',csvTexto(cabBase.concat(['valor_bruto_ou_liquido','comissao_%','bv_%','linha','pontos','periodo','insercoes_por_ativo','insercoes_total','valor_tabela','desconto_%','valor_negociado','valor_final']),vs),'text/csv;charset=utf-8');
}

function viewHistorico(v){
  var adm=ME.admin;
  v.appendChild(h('h2',{text:adm?'Propostas geradas · backup':'Minhas propostas'}));
  v.appendChild(h('p',{class:'hint',text:'A cada PowerPoint ou PDF gerado, o sistema guarda os locais incluídos e os valores praticados (tabela, desconto e negociado). As fotos não são guardadas. Ninguém consegue editar ou apagar este histórico.'}));
  var tipo=h('select',{},[['proposta','Propostas'],['kit_completo','Mídia kit completo'],['','Tudo']].map(function(o){ return h('option',{value:o[0],text:o[1]}); }));
  var per=h('select',{},[['0','Todo o período'],['7','Últimos 7 dias'],['30','Últimos 30 dias'],['90','Últimos 90 dias']].map(function(o){ return h('option',{value:o[0],text:o[1]}); }));
  var usr=h('select',{},[h('option',{value:'',text:'Todos os usuários'})]);
  var busca=h('input',{type:'search',placeholder:'🔍 Cliente ou endereço',class:'busca'});
  var barra=h('div',{class:'bar'},[tipo,per]); if(adm) barra.appendChild(usr); barra.appendChild(busca); v.appendChild(barra);
  var acoes=h('div',{class:'bar'}); v.appendChild(acoes);
  var resumo=h('p',{class:'hint'}); v.appendChild(resumo);
  var tw=h('div',{class:'tw'}); v.appendChild(tw);
  var todos=[], filtrada=[];
  function filtrar(){
    var q=busca.value.trim().toLowerCase(), lim=+per.value?Date.now()-(+per.value)*864e5:0;
    filtrada=todos.filter(function(p){
      if(tipo.value&&p.tipo!==tipo.value) return false; if(adm&&usr.value&&p.criado_por!==usr.value) return false; if(lim&&new Date(p.criado_em).getTime()<lim) return false;
      if(q){ var t=((p.cliente||'')+' '+(p.titulo||'')+' '+(p.locais||[]).map(function(l){ return l.endereco+' '+l.bairro; }).join(' ')).toLowerCase(); if(!q.split(/\s+/).every(function(w){ return t.indexOf(w)>=0; })) return false; }
      return true; });
    desenhar();
  }
  function desenhar(){
    var tot=filtrada.reduce(function(a,p){ return a+Number(p.total_negociado||0); },0);
    resumo.textContent=filtrada.length+' registro(s)'+(tipo.value!=='kit_completo'?' · soma dos valores negociados: '+brlN(tot):'');
    tw.innerHTML=''; if(!filtrada.length){ tw.appendChild(h('p',{class:'hint pad',text:'Nenhuma proposta encontrada.'})); return; }
    var t=h('table',{class:'ptab'}), cab=['Data','Cliente / campanha'].concat(adm?['Gerada por']:[]).concat(['Tipo','Formato','Locais','Total negociado','']);
    t.appendChild(h('thead',{},[h('tr',{},cab.map(function(x){ return h('th',{text:x}); }))])); var tb=h('tbody'); t.appendChild(tb);
    filtrada.forEach(function(p){
      var det=h('tr',{class:'detrow',hidden:'hidden'}), tdd=h('td',{colspan:String(cab.length)}); det.appendChild(tdd);
      var btn=h('button',{class:'mini',type:'button',text:'ver detalhes',onclick:function(){ if(det.hidden){ tdd.innerHTML=''; tdd.appendChild(detalheProposta(p)); det.hidden=false; btn.textContent='ocultar'; } else { det.hidden=true; btn.textContent='ver detalhes'; } }});
      var cels=[h('td',{text:dataBR(p.criado_em)}),h('td',{text:p.cliente||(p.titulo||'—')})]; if(adm) cels.push(h('td',{text:p.criado_por_nome||p.criado_por_email||'—'}));
      cels.push(h('td',{text:p.tipo==='proposta'?'Proposta':'Kit completo'}),h('td',{text:String(p.formato).toUpperCase()}),h('td',{text:String(p.n_locais)}),h('td',{class:'calc',text:p.tipo==='proposta'?brlN(p.total_negociado):'—'}),h('td',{},[btn]));
      tb.appendChild(h('tr',{},cels)); tb.appendChild(det);
    });
    tw.appendChild(t);
  }
  acoes.appendChild(h('button',{class:'btn',type:'button',text:'⬇ Backup completo (JSON)',onclick:function(){ exportarPropostas(filtrada,'json'); }}));
  acoes.appendChild(h('button',{class:'btn',type:'button',text:'⬇ Planilha de locais (CSV)',onclick:function(){ exportarPropostas(filtrada,'locais'); }}));
  acoes.appendChild(h('button',{class:'btn',type:'button',text:'⬇ Planilha de valores (CSV)',onclick:function(){ exportarPropostas(filtrada,'valores'); }}));
  [tipo,per,usr].forEach(function(e){ e.addEventListener('change',filtrar); }); busca.addEventListener('input',filtrar);
  tw.appendChild(h('p',{class:'hint pad',text:'Carregando…'}));
  Store.listarPropostas('*').then(function(d){
    todos=d; if(adm){ var vistos={}; d.forEach(function(p){ if(!vistos[p.criado_por]){ vistos[p.criado_por]=1; usr.appendChild(h('option',{value:p.criado_por,text:p.criado_por_nome||p.criado_por_email||p.criado_por})); } }); }
    filtrar();
  }).catch(function(e){ tw.innerHTML=''; tw.appendChild(h('p',{class:'status err pad',text:'Não foi possível carregar: '+erroMsg(e)})); });
}

function detalheProposta(p){
  var w=h('div',{class:'det'});
  if(p.tipo!=='proposta'){ w.appendChild(h('p',{class:'hint',text:'Mídia kit completo gerado com '+p.n_locais+' pontos. Este tipo não guarda a lista de locais nem valores.'})); return w; }
  w.appendChild(h('h3',{text:'Valores praticados · '+(p.modo_valor==='liquido'?'líquido de comissão ('+(p.comissao||0)+'%)'+(p.bv?' e BV ('+p.bv+'%)':''):'bruto')}));
  var tv=h('table',{class:'ptab'}); tv.appendChild(h('thead',{},[h('tr',{},['Formato','Pontos','Período','Inserções','Tabela','Desc.','Negociado','Final'].map(function(x){ return h('th',{text:x}); }))])); var b1=h('tbody'); tv.appendChild(b1);
  (p.valores||[]).forEach(function(r){ b1.appendChild(h('tr',{},[r.nome,String(r.pontos),r.periodo||'',String(r.insercoes_total||'—'),brlN(r.tabela),(r.desconto||0)+'%',brlN(r.negociado),brlN(r.final)].map(function(x){ return h('td',{text:x}); }))); });
  b1.appendChild(h('tr',{class:'tot'},['Total','','','',brlN(p.total_tabela),'','',brlN(p.total_negociado)].map(function(x){ return h('td',{text:x}); })));
  w.appendChild(h('div',{class:'tw small'},[tv]));
  (p.valores||[]).filter(function(r){ return r.justificativa; }).forEach(function(r){ w.appendChild(h('p',{class:'hint',text:'Justificativa de desconto · '+r.nome+' ('+(r.desconto||0)+'%): '+r.justificativa})); });
  w.appendChild(h('h3',{text:'Locais incluídos ('+(p.locais||[]).length+')'}));
  var tl=h('table',{class:'ptab'}); tl.appendChild(h('thead',{},[h('tr',{},['Formato','Endereço','Bairro','Cidade','Tamanho'].map(function(x){ return h('th',{text:x}); }))])); var b2=h('tbody'); tl.appendChild(b2);
  (p.locais||[]).forEach(function(l){ b2.appendChild(h('tr',{},[l.secao_nome||l.secao,l.endereco,l.bairro,l.cidade,l.tamanho].map(function(x){ return h('td',{text:x||''}); }))); });
  w.appendChild(h('div',{class:'tw small'},[tl]));
  return w;
}
