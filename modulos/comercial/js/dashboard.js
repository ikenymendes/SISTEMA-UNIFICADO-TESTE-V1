/* Dashboard do administrador: quantas propostas, de quem, quem mais gera, valores e pontos mais usados. */
function dbContar(lista,fn){ var m={}; lista.forEach(function(x){ var k=fn(x); if(k==null||k==='') return; m[k]=(m[k]||0)+1; }); return m; }
function dbTop(m,n){ return Object.keys(m).map(function(k){ return [k,m[k]]; }).sort(function(a,b){ return b[1]-a[1]; }).slice(0,n); }
function dbBarras(titulo,sub,linhas,opts){
  opts=opts||{}; var mx=Math.max.apply(null,linhas.map(function(l){ return l.v; }).concat([1]));
  var c=h('div',{class:'dcard'}); c.appendChild(h('h3',{text:titulo})); if(sub) c.appendChild(h('p',{class:'hint',text:sub}));
  if(!linhas.length){ c.appendChild(h('p',{class:'hint',text:'Sem dados no período.'})); return c; }
  linhas.forEach(function(l,i){
    var row=h('div',{class:'hb',title:l.tip||(l.nome+': '+l.v)});
    row.appendChild(h('span',{class:'hl',text:(opts.trofeu&&i===0?'🏆 ':'')+l.nome}));
    var tr=h('div',{class:'ht'}); tr.appendChild(h('i',{style:'width:'+Math.max(2,l.v/mx*100)+'%'+(i===0&&opts.destaque?';background:var(--pink)':'')})); row.appendChild(tr);
    row.appendChild(h('b',{text:l.rot!=null?l.rot:String(l.v)})); c.appendChild(row);
  });
  return c;
}
function dbKpi(rot,valor,sub){ return h('div',{class:'kpi'},[h('span',{class:'kl',text:rot}),h('b',{class:'kv',text:valor}),sub?h('small',{text:sub}):null]); }

function viewDashboard(v){
  v.appendChild(h('h2',{text:'Dashboard'}));
  v.appendChild(h('p',{class:'hint',text:'Visão do que a equipe comercial está gerando. Os números vêm do backup das propostas e das sugestões de pontos.'}));
  var per=h('select',{},[['30','Últimos 30 dias'],['7','Últimos 7 dias'],['90','Últimos 90 dias'],['0','Todo o período']].map(function(o){ return h('option',{value:o[0],text:o[1]}); }));
  v.appendChild(h('div',{class:'bar'},[per])); var box=h('div'); v.appendChild(box);
  var dados=null;
  function desenhar(){
    var dias=+per.value, agora=Date.now(), ini=dias?agora-dias*864e5:0, iniAnt=dias?ini-dias*864e5:0;
    var all=dados.propostas, noPer=all.filter(function(p){ return new Date(p.criado_em).getTime()>=ini; }), ant=dias?all.filter(function(p){ var t=new Date(p.criado_em).getTime(); return t>=iniAnt&&t<ini; }):[];
    var props=noPer.filter(function(p){ return p.tipo==='proposta'; }), kits=noPer.filter(function(p){ return p.tipo==='kit_completo'; }), propAnt=ant.filter(function(p){ return p.tipo==='proposta'; });
    var valor=props.reduce(function(a,p){ return a+Number(p.total_negociado||0); },0), nLoc=props.reduce(function(a,p){ return a+(p.n_locais||0); },0);
    var sug=dados.sugestoes.filter(function(s){ return new Date(s.criado_em).getTime()>=ini; });
    var comerciais=dados.usuarios.filter(function(u){ return u.papel==='comercial'; }), ativos={}; props.forEach(function(p){ ativos[p.criado_por]=1; });
    var variacao=''; if(dias){ variacao=propAnt.length?((props.length-propAnt.length)/propAnt.length*100):null; variacao=variacao==null?(props.length?'sem período anterior para comparar':''):((variacao>=0?'+':'')+Math.round(variacao)+'% vs. período anterior ('+propAnt.length+')'); }
    box.innerHTML='';
    var k=h('div',{class:'kpis'}); box.appendChild(k);
    k.appendChild(dbKpi('Propostas geradas',String(props.length),variacao));
    k.appendChild(dbKpi('Valor negociado',brlN(valor),props.length?'média de '+brlN(valor/props.length)+' por proposta':''));
    k.appendChild(dbKpi('Locais por proposta',props.length?(nLoc/props.length).toFixed(1).replace('.',','):'—',nLoc+' locais no total'));
    k.appendChild(dbKpi('Mídia kit completo',String(kits.length),'gerações sem preço'));
    k.appendChild(dbKpi('Comerciais ativos',Object.keys(ativos).length+' de '+comerciais.length,'geraram ao menos 1 proposta'));
    k.appendChild(dbKpi('Sugestões pendentes',String(dados.sugestoes.filter(function(s){ return s.status==='pendente'; }).length),sug.length+' no período'));

    var g=h('div',{class:'dgrid'}); box.appendChild(g);
    /* ranking por usuário */
    var porU={}; props.forEach(function(p){ var n=p.criado_por_nome||p.criado_por_email||'—'; var o=porU[p.criado_por]=porU[p.criado_por]||{nome:n,n:0,val:0}; o.n++; o.val+=Number(p.total_negociado||0); });
    var rank=Object.keys(porU).map(function(id){ return porU[id]; }).sort(function(a,b){ return b.n-a.n||b.val-a.val; });
    g.appendChild(dbBarras('Quem mais gera propostas','Quantidade de propostas por usuário',rank.slice(0,10).map(function(o){ return {nome:o.nome,v:o.n,rot:o.n+' · '+brlN(o.val),tip:o.nome+': '+o.n+' proposta(s), '+brlN(o.val)}; }),{trofeu:true,destaque:true}));
    /* por dia / semana */
    var cc=h('div',{class:'dcard'}); cc.appendChild(h('h3',{text:'Propostas ao longo do tempo'})); cc.appendChild(h('p',{class:'hint',text:dias&&dias<=30?'Por dia':'Por semana'}));
    var buckets=[], passo=(dias&&dias<=30)?864e5:7*864e5, fim=agora, de=dias?ini:(all.length?Math.min.apply(null,all.map(function(p){ return new Date(p.criado_em).getTime(); })):agora-30*864e5);
    var d0=new Date(de); d0.setHours(0,0,0,0); for(var t=d0.getTime();t<=fim;t+=passo) buckets.push({t:t,n:0});
    props.forEach(function(p){ var t=new Date(p.criado_em).getTime(), i=Math.min(buckets.length-1,Math.max(0,Math.floor((t-d0.getTime())/passo))); if(buckets[i]) buckets[i].n++; });
    var mxb=Math.max.apply(null,buckets.map(function(b){ return b.n; }).concat([1])), col=h('div',{class:'cols'});
    buckets.slice(-60).forEach(function(b){ var dt=new Date(b.t); var tip=(passo===864e5?dt.toLocaleDateString('pt-BR'):'Semana de '+dt.toLocaleDateString('pt-BR'))+': '+b.n+' proposta(s)'; col.appendChild(h('div',{class:'col',title:tip},[h('i',{style:'height:'+(b.n?Math.max(4,b.n/mxb*100):0)+'%'}),h('small',{text:b.n?String(b.n):''})])); });
    cc.appendChild(col); cc.appendChild(h('div',{class:'colax'},[h('small',{text:new Date(buckets[Math.max(0,buckets.length-60)].t).toLocaleDateString('pt-BR')}),h('small',{text:'hoje'})])); g.appendChild(cc);
    /* formato do arquivo */
    var fm=dbContar(noPer,function(p){ return String(p.formato).toUpperCase(); });
    g.appendChild(dbBarras('Formato do arquivo','PowerPoint × PDF (propostas e kits)',Object.keys(fm).map(function(k){ return {nome:k,v:fm[k]}; }).sort(function(a,b){ return b.v-a.v; })));
    /* formatos de mídia mais incluídos */
    var sc={}; props.forEach(function(p){ var vistos={}; (p.locais||[]).forEach(function(l){ var n=l.secao_nome||l.secao; if(!n) return; sc[n]=(sc[n]||0)+1; }); });
    g.appendChild(dbBarras('Formatos de mídia mais incluídos','Locais nas propostas, por seção',dbTop(sc,8).map(function(x){ return {nome:x[0],v:x[1]}; })));
    /* pontos mais usados */
    var pt={}; props.forEach(function(p){ (p.locais||[]).forEach(function(l){ var n=(l.endereco||'')+(l.bairro?' · '+l.bairro:''); if(n) pt[n]=(pt[n]||0)+1; }); });
    g.appendChild(dbBarras('Pontos mais ofertados','Em quantas propostas cada ponto entrou',dbTop(pt,10).map(function(x){ return {nome:x[0].length>46?x[0].slice(0,45)+'…':x[0],v:x[1],tip:x[0]+': '+x[1]+' proposta(s)'}; })));
    /* clientes */
    var cl=dbContar(props,function(p){ return (p.cliente||'').trim(); });
    g.appendChild(dbBarras('Clientes com mais propostas','Campo "Cliente / campanha" da proposta',dbTop(cl,8).map(function(x){ return {nome:x[0],v:x[1]}; })));
    /* sugestões */
    var sg={}; sug.forEach(function(s){ var n=s.criado_por_nome||s.criado_por_email||'—'; var o=sg[n]=sg[n]||{n:0,ap:0,rec:0,pe:0}; o.n++; if(s.status==='aprovada') o.ap++; else if(s.status==='recusada') o.rec++; else o.pe++; });
    g.appendChild(dbBarras('Sugestões de pontos por usuário','Enviadas no período · aprovadas / recusadas / pendentes',Object.keys(sg).map(function(n){ return {nome:n,v:sg[n].n,rot:sg[n].n+' · '+sg[n].ap+'/'+sg[n].rec+'/'+sg[n].pe}; }).sort(function(a,b){ return b.v-a.v; }).slice(0,8)));
    /* tabela por usuário (versão em tabela do ranking) */
    var tc=h('div',{class:'dcard wide'}); tc.appendChild(h('h3',{text:'Resumo por usuário'}));
    var t=h('table',{class:'ptab'}); t.appendChild(h('thead',{},[h('tr',{},['Usuário','Propostas','Valor negociado','Média por proposta','Última proposta'].map(function(x){ return h('th',{text:x}); }))])); var tb=h('tbody'); t.appendChild(tb);
    if(!rank.length) tb.appendChild(h('tr',{},[h('td',{colspan:'5',text:'Nenhuma proposta no período.'})]));
    Object.keys(porU).map(function(id){ var ult=0; props.forEach(function(p){ if(p.criado_por===id){ var x=new Date(p.criado_em).getTime(); if(x>ult) ult=x; } }); var o=porU[id]; return {nome:o.nome,n:o.n,val:o.val,ult:ult}; }).sort(function(a,b){ return b.n-a.n; }).forEach(function(o){ tb.appendChild(h('tr',{},[o.nome,String(o.n),brlN(o.val),brlN(o.val/o.n),dataBR(o.ult)].map(function(x){ return h('td',{text:x}); }))); });
    tc.appendChild(h('div',{class:'tw small'},[t])); box.appendChild(tc);
  }
  per.addEventListener('change',function(){ if(dados) desenhar(); });
  box.appendChild(h('p',{class:'hint',text:'Carregando…'}));
  Promise.all([
    Store.listarPropostas('id,tipo,formato,cliente,n_locais,total_negociado,total_tabela,criado_por,criado_por_nome,criado_por_email,criado_em,locais'),
    Store.listarSugestoes(null), Store.listarUsuarios()
  ]).then(function(r){ dados={propostas:r[0],sugestoes:r[1],usuarios:r[2]}; desenhar(); })
    .catch(function(e){ box.innerHTML=''; box.appendChild(h('p',{class:'status err',text:'Não foi possível carregar o dashboard: '+erroMsg(e)})); });
}
