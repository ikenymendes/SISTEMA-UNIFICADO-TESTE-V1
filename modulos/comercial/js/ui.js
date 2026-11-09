/* Telas do gerador (comuns a administrador e comercial). */
var curTab='kit';
function viewSelecao(v,embed){
  if(!embed){ v.appendChild(h('h2',{text:'Pontos da proposta'}));
  v.appendChild(h('p',{class:'hint',text:'Marque os pontos que entram na proposta personalizada.'})); }
  var iaSlot=h('div'); if(embed) v.appendChild(iaSlot);
  var bar=h('div',{class:'bar'}), fsel=h('select',{},[h('option',{value:'',text:'Todas as seções'})].concat(GRUPOS.map(function(g){ var o=h('option',{value:g.k,text:g.nome}); if(filtro===g.k) o.selected=true; return o; })));
  var bs=h('input',{type:'search',placeholder:'🔍 Buscar endereço ou bairro',class:'busca'}); bs.value=busca;
  var fdn=filtroDonoSel(function(){ draw(); });
  bar.appendChild(fsel); bar.appendChild(fdn); bar.appendChild(bs); bar.appendChild(h('button',{class:'btn',type:'button',text:'➕ Sugerir novo ponto',onclick:function(){ abrirFormSugestao('adicionar',null); }})); v.appendChild(bar);
  v.appendChild(h('p',{class:'hint',text:'Você não altera endereços diretamente. Para incluir ou corrigir um ponto, use "Sugerir": o administrador recebe o aviso, confere e aplica.'}));
  var mk=h('input',{type:'checkbox'}), mtx=h('span',{}); v.appendChild(h('label',{class:'selall'},[mk,mtx]));
  var list=h('div',{class:'plist'}); v.appendChild(list);
  var fab=h('button',{type:'button',class:'fab btn pri'}); if(!embed) v.appendChild(fab);
  function vis(){ return D.pontos.filter(function(p){ return CIRCUITOS.indexOf(p.secao)<0&&matchP(p); }); }
  function circ(){ return CIRCUITOS.filter(function(k){ if(!ptsOf(D,k).length) return false; if(filtro&&filtro!==k) return false; if(filtroDono&&!ptsOf(D,k).some(function(p){return donoDe(p)===filtroDono;})) return false; if(!busca) return true; var t=('circuito '+secLabel(k)+' '+((D[k]&&D[k].circuito)||'')+' '+((D[k]&&D[k].endereco)||'')+(k==='mercado'?' av. augusto de lima centro':'')).toLowerCase(); return busca.toLowerCase().split(/\s+/).every(function(w){ return t.indexOf(w)>=0; }); }); }
  function circSel(k){ var a=ptsOf(D,k); return a.length>0&&a.every(function(p){ return p.sel; }); }
  function contaSel(){ return D.pontos.filter(function(p){ return p.sel&&CIRCUITOS.indexOf(p.secao)<0; }).length+CIRCUITOS.filter(function(k){ return ptsOf(D,k).length&&circSel(k); }).length; }
  function desenhaCirc(){ var cs=circ(); cs.forEach(function(k){ var ck=h('input',{type:'checkbox'}); ck.checked=circSel(k); ck.addEventListener('change',function(){ ptsOf(D,k).forEach(function(p){ p.sel=ck.checked; }); dirty(); ref(); }); var fk=D[k]&&D[k].fotos&&D[k].fotos[0]; var kids=[ck]; if(fk&&libSrc(fk)) kids.push(h('img',{class:'sth',src:libSrc(fk)})); kids.push(h('span',{class:'t'},[h('b',{text:'Circuito '+SEC[k].nome}),document.createTextNode(' · '+((D[k]&&D[k].circuito)||'')+' · todas as telas juntas')])); kids.push(h('em',{text:secLabel(k)})); list.appendChild(h('label',{class:'srow circ'},kids)); }); return cs.length; }
  function ref(){ var Lst=vis(), nc=circ(), items=Lst.length+nc.length, n=Lst.filter(function(p){return p.sel}).length+nc.filter(circSel).length; mk.checked=items>0&&n===items; mk.indeterminate=n>0&&n<items; var tot=contaSel(); fab.textContent=tot?'Continuar com '+tot+' ponto'+(tot>1?'s':'')+' · Preços':'Marque os pontos da proposta'; fab.disabled=!tot; if(window.__onSel) window.__onSel(tot); mtx.textContent='Selecionar todos'+(filtro?' desta seção':'')+'  ·  '+n+' de '+items+' marcados  ('+tot+' no total)'; }
  function draw(){ list.innerHTML=''; var n=0, ncirc=desenhaCirc(); vis().forEach(function(p){ n++; var ck=h('input',{type:'checkbox'}); ck.checked=!!p.sel; ck.addEventListener('change',function(){ p.sel=ck.checked; dirty(); ref(); }); var fk=Array.isArray(p.foto)?p.foto[0]:p.foto; var kids=[ck]; if(fk&&libSrc(fk)) kids.push(h('img',{class:'sth',src:libSrc(fk)})); kids.push(h('span',{class:'t',text:(p.endereco||'(sem endereço)')+(p.bairro?' · '+p.bairro:'')})); kids.push(qBadge(p)); kids.push(h('em',{text:secLabel(p.secao)})); if(donoDe(p)!=='padrao') kids.push(h('em',{class:'dono d-'+donoDe(p),text:donoNome(donoDe(p))})); kids.push(h('button',{class:'mini',type:'button',text:'✏️ sugerir alteração',title:'Pedir ao administrador para alterar este ponto',onclick:function(e){ e.preventDefault(); e.stopPropagation(); abrirFormSugestao('alterar',p); }})); list.appendChild(h('label',{class:'srow'},kids)); }); if(!n&&!ncirc) list.appendChild(h('p',{class:'hint',text:'Nenhum ponto encontrado.'})); ref(); }
  if(embed) iaSlot.appendChild(iaBox(function(){ draw(); }));
  fsel.addEventListener('change',function(){ filtro=fsel.value; draw(); });
  bs.addEventListener('input',function(){ busca=bs.value; draw(); });
  mk.addEventListener('change',function(){ var val=mk.checked; vis().forEach(function(p){ p.sel=val; }); circ().forEach(function(k){ ptsOf(D,k).forEach(function(p){ p.sel=val; }); }); dirty(); draw(); });
  draw();
}

/* ---- usuários (admin) ---- */
/* trava de segurança: conferência de preços antes de gerar a proposta */
function confirmarPrecos(mode,slides){ return new Promise(function(res){
  if(mode!=='proposta'){ res(true); return; }
  var rows=window.LAST_ROWS||[], lim=num(D.descAlerta)||20, liq=D.modoGeral==='liquido', R=function(v){ return 'R$ '+(+v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); };
  var avisos=[], tt=0, tn=0, tf=0;
  rows.forEach(function(r){ tt+=r.tabela; tn+=r.neg; tf+=r.final; if(!(r.tabela>0)) avisos.push(['bad','"'+r.nome+'" está sem valor de tabela.']); if(r.desc>lim) avisos.push(['warn','"'+r.nome+'": desconto de '+String(r.desc).replace('.',',')+'% (acima de '+lim+'%).']); if(r.desc<0) avisos.push(['bad','"'+r.nome+'": desconto negativo.']); if(!r.pontos) avisos.push(['warn','"'+r.nome+'" está com 0 pontos.']); });
  if(!rows.length) avisos.push(['bad','Nenhuma linha de preço entrou na proposta.']);
  if(!String(D.kit.cliente||'').trim()) avisos.push(['warn','Cliente não informado: a proposta sairá sem o nome do cliente.']);
  if(liq) avisos.push(['info','Valores líquidos: comissão da agência '+String(D.comissao).replace('.',',')+'%'+(num(D.bv)?' e BV '+String(D.bv).replace('.',',')+'%':'')+' já descontados do valor final.']);
  var np=(typeof PAG!=='undefined'&&PAG.off&&PAG.off.size)?PAG.off.size:0; if(np) avisos.push(['info',np+' página'+(np>1?'s':'')+' removida'+(np>1?'s':'')+' da proposta.']);
  var ov=h('div',{class:'pinov'}), box=h('div',{class:'pinbox conf'});
  function close(v){ document.removeEventListener('keydown',kd); ov.remove(); res(v); } function kd(e){ if(e.key==='Escape') close(false); }
  box.appendChild(h('h3',{text:'Conferir antes de gerar'})); box.appendChild(h('p',{class:'pind',text:'Cliente: '+(D.kit.cliente||'—')+' · '+slides.length+' páginas'}));
  var tb=h('table',{class:'ctab'}); tb.appendChild(h('thead',{},[h('tr',{},['Formato','Tabela','Desc.','Negociado'].concat(liq?['Líquido']:[]).map(function(t,i){ return h('th',{class:i?'n':'',text:t}); }))]));
  var tbody=h('tbody'); rows.forEach(function(r){ var a=[r.nome,R(r.tabela),String(r.desc).replace('.',',')+'%',R(r.neg)]; if(liq) a.push(R(r.final)); tbody.appendChild(h('tr',{class:(r.desc>lim||!(r.tabela>0))?'al':''},a.map(function(t,i){ return h('td',{class:i?'n':'',text:t}); }))); });
  var ta=['Total',R(tt),tt?String(Math.round((1-tn/tt)*10000)/100).replace('.',',')+'%':'—',R(tn)]; if(liq) ta.push(R(tf)); tbody.appendChild(h('tr',{class:'tot'},ta.map(function(t,i){ return h('td',{class:i?'n':'',text:t}); }))); tb.appendChild(tbody); box.appendChild(h('div',{class:'cwrap'},[tb]));
  if(avisos.length){ var ul=h('div',{class:'cav'}); avisos.forEach(function(a){ ul.appendChild(h('div',{class:'ca '+a[0],text:(a[0]==='info'?'ℹ ':'⚠ ')+a[1]})); }); box.appendChild(ul); }
  var altos=rows.filter(function(r){ return r.desc>lim; }), jt=h('textarea',{rows:'2',placeholder:'Ex.: cliente fechou 6 meses; aprovado pelo gestor.'}); window.JUST_DESC='';
  if(altos.length){ box.appendChild(h('label',{class:'f'},[h('span',{text:'Justificativa do desconto acima de '+lim+'% (obrigatória)'}),jt])); }
  var ck=h('input',{type:'checkbox'}), lab=h('label',{class:'cck'},[ck,h('span',{text:'Conferi os valores, descontos e condições desta proposta.'})]); box.appendChild(lab);
  var ok=h('button',{class:'btn pri',type:'button',text:'Gerar proposta',disabled:true,onclick:function(){ close(true); }}), no=h('button',{class:'btn',type:'button',text:'Voltar e corrigir',onclick:function(){ close(false); }});
  function lib(){ window.JUST_DESC=jt.value.trim(); ok.disabled=!(ck.checked&&(!altos.length||jt.value.trim().length>=8)); } ck.addEventListener('change',lib); jt.addEventListener('input',lib);
  box.appendChild(h('div',{class:'bar'},[no,ok])); ov.appendChild(box); ov.addEventListener('click',function(e){ if(e.target===ov) close(false); }); document.addEventListener('keydown',kd); document.body.appendChild(ov); });
}
function askPin(titulo,detalhe){ return new Promise(function(res){
  var code=String(Math.floor(1000+Math.random()*9000)), ov=h('div',{class:'pinov'}), box=h('div',{class:'pinbox'}), msg=h('p',{class:'pinmsg',text:''}), ip=h('input',{type:'text',inputmode:'numeric',maxlength:'4',placeholder:'0000',class:'pinin'});
  function close(v){ document.removeEventListener('keydown',kd); ov.remove(); res(v); }
  function ok(){ if(ip.value.trim()===code) close(true); else { msg.textContent='Código incorreto. Digite exatamente o código mostrado.'; ip.value=''; ip.focus(); } }
  function kd(e){ if(e.key==='Escape') close(false); if(e.key==='Enter') ok(); }
  box.appendChild(h('h3',{text:titulo||'Confirmar exclusão'})); if(detalhe) box.appendChild(h('p',{class:'pind',text:detalhe}));
  box.appendChild(h('p',{class:'pinl',text:'Para confirmar, digite o código:'})); box.appendChild(h('div',{class:'pincode',text:code})); box.appendChild(ip); box.appendChild(msg);
  box.appendChild(h('div',{class:'bar'},[h('button',{class:'btn del',text:'Excluir',onclick:ok}),h('button',{class:'btn',text:'Cancelar',onclick:function(){ close(false); }})]));
  ov.appendChild(box); document.body.appendChild(ov); document.addEventListener('keydown',kd); setTimeout(function(){ ip.focus(); },50); }); }
function h(tag,attrs,kids){ var e=document.createElement(tag); attrs=attrs||{}; Object.keys(attrs).forEach(function(k){ if(k==='class') e.className=attrs[k]; else if(k==='text') e.textContent=attrs[k]; else if(k.slice(0,2)==='on') e.addEventListener(k.slice(2),attrs[k]); else if(k==='value') e.value=attrs[k]; else e.setAttribute(k,attrs[k]); }); (kids||[]).forEach(function(c){ if(c!=null) e.appendChild(typeof c==='string'?document.createTextNode(c):c); }); return e; }
function field(label,input,hint,cls){ return h('label',{class:'f '+(cls||'')},[h('span',{text:label}),input,hint?h('small',{text:hint}):null]); }
function getp(o,p){ return p.split('.').reduce(function(a,k){return a[k]},o); }
function setp(o,p,v){ var ks=p.split('.'), l=ks.pop(); ks.reduce(function(a,k){return a[k]},o)[l]=v; }
function inp(obj,path,o){ o=o||{}; var i=h(o.area?'textarea':'input',{type:o.type||'text',rows:o.rows||3}); i.value=getp(obj,path)==null?'':getp(obj,path); i.addEventListener('input',function(){ var v=i.value; if(o.num) v=v===''?null:parseFloat(String(v).replace(',','.')); setp(obj,path,v); if(o.onchange) o.onchange(v); dirty(); }); return i; }
function pairsText(a){ return (a||[]).map(function(r){ return Array.isArray(r)?r.join(' | '):r; }).join('\n'); }
function parsePairs(t){ return t.split('\n').map(function(l){return l.trim()}).filter(Boolean).map(function(l){ return l.split('|').map(function(x){return x.trim()}); }); }
function schemaField(obj,s){
  var path=s[0], type=s[1], label=s[2], cur=getp(obj,path), i;
  if(type==='text') return field(label,inp(obj,path));
  if(type==='num') return field(label,inp(obj,path,{num:true}));
  if(type==='area') return field(label,inp(obj,path,{area:true,rows:4}),null,'wide');
  if(type==='fotos') return photosField(label,obj,path);
  var conv={pairs:[pairsText,parsePairs],rows:[pairsText,parsePairs],pair:[function(a){return (a||[]).join(' | ')},function(t){return t.split('|').map(function(x){return x.trim()})}],
    strs:[function(a){return (a||[]).join(', ')},function(t){return t.split(',').map(function(x){return x.trim()}).filter(Boolean)}],
    nums:[function(a){return (a||[]).join(', ')},function(t){return t.split(',').map(function(x){return parseFloat(x.trim())}).filter(function(x){return !isNaN(x)})}]}[type];
  i=h('textarea',{rows:type==='pairs'||type==='rows'?(s[3]||6):2}); i.value=conv[0](cur); i.addEventListener('input',function(){ setp(obj,path,conv[1](i.value)); dirty(); });
  return field(label,i,s[4],'wide');
}
/* ajuste do enquadramento da foto na ficha (foco, zoom ou foto inteira) com prévia ao vivo (sem canvas: usa a própria foto) */
var cropRect=window.cropRect||function(aw,ah,aspect,aj){ var z=Math.max(100,Math.min(300,+aj.z||100))/100, sw,sh; if(aw/ah>aspect){ sh=ah; sw=sh*aspect; } else { sw=aw; sh=sw/aspect; } sw/=z; sh/=z; var fx=aj.x==null?50:+aj.x, fy=aj.y==null?50:+aj.y; return {sx:(aw-sw)*fx/100,sy:(ah-sh)*fy/100,sw:sw,sh:sh}; };
function fotoAjuste(p){
  var AR=6.5/4.85, w=h('div',{class:'fajuste'}), box=h('div',{class:'fprev'}), aviso=h('span',{class:'faviso',text:'Carregando a foto…'}), nat=null, im=new Image();
  box.appendChild(aviso);
  function aj(){ if(!p.fotoAj) p.fotoAj={x:50,y:50,z:100,inteira:false}; return p.fotoAj; }
  /* a foto é o fundo da caixa: tamanho e posição em %, igual ao recorte que vai para o PowerPoint/PDF */
  function draw(){ if(!nat) return; var a=aj(), st=box.style; aviso.hidden=true; st.backgroundRepeat='no-repeat';
    if(a.inteira){ st.backgroundSize='contain'; st.backgroundPosition='center'; return; }
    var r=cropRect(nat.w,nat.h,AR,a); st.backgroundSize=(nat.w/r.sw*100)+'% '+(nat.h/r.sh*100)+'%'; st.backgroundPosition=(a.x==null?50:a.x)+'% '+(a.y==null?50:a.y)+'%'; }
  function load(){ var k=Array.isArray(p.foto)?p.foto[0]:p.foto, src=k&&libSrc(k); nat=null; box.style.backgroundImage='none'; if(!src){ aviso.hidden=false; aviso.textContent='Este ponto não tem foto.'; return; } aviso.hidden=false; aviso.textContent='Carregando a foto…';
    im=new Image(); im.onload=function(){ nat={w:im.naturalWidth,h:im.naturalHeight}; box.style.backgroundImage='url("'+src+'")'; draw(); }; im.onerror=function(){ aviso.hidden=false; aviso.textContent='Não foi possível carregar a foto.'; }; im.src=src; }
  function sl(rot,key,min,max){ var s=h('input',{type:'range',step:1}); s.min=min; s.max=max; s.value=aj()[key]==null?(key==='z'?100:50):aj()[key]; var f=function(){ aj()[key]=+s.value; draw(); dirty(); }; s.addEventListener('input',f); s.addEventListener('change',f); return h('label',{class:'frow'},[h('span',{text:rot}),s]); }
  var inteira=h('input',{type:'checkbox'}); inteira.checked=!!(p.fotoAj&&p.fotoAj.inteira); inteira.addEventListener('change',function(){ aj().inteira=inteira.checked; draw(); dirty(); });
  var reset=h('button',{type:'button',class:'btn',text:'Restaurar',onclick:function(){ delete p.fotoAj; dirty(); var par=wr.parentNode; if(par) par.replaceChild(fotoAjuste(p),wr); }});
  w.appendChild(box); w.appendChild(h('div',{class:'fctl'},[sl('← Esquerda · Direita →','x',0,100),sl('↑ Cima · Baixo ↓','y',0,100),sl('Zoom','z',100,300),h('label',{class:'chk'},[inteira,h('span',{text:'Mostrar a foto inteira (sem cortar)'})]),reset]));
  load(); document.addEventListener('fotochg',function f(){ if(box.isConnected){ box.__c=1; load(); } else if(box.__c){ document.removeEventListener('fotochg',f); } });
  var wr=h('div',{class:'f wide'},[h('span',{text:'Enquadramento da foto no kit'}),w,h('small',{text:'Mexa nos controles até o painel aparecer inteiro. Vale para a ficha deste ponto no PowerPoint e no PDF.'})]); return wr; }
function photosField(label,obj,path){
  var wrap=h('div',{class:'photos'}), fi=h('input',{type:'file',accept:'image/*',multiple:'multiple'}); 
  function draw(){ wrap.innerHTML=''; var arr=getp(obj,path); if(!Array.isArray(arr)){ arr=arr?[arr]:[]; }
    arr.forEach(function(k,ix){ wrap.appendChild(h('span',{class:'thumb'},[h('img',{src:libSrc(k)}),h('b',{text:'×',title:'remover',onclick:function(){ askPin('Remover foto','A foto será retirada deste ponto.').then(function(ok){ if(!ok) return; arr.splice(ix,1); setp(obj,path,Array.isArray(getp(obj,path))?arr:(arr[0]||null)); draw(); dirty(); }); }})])); }); }
  fi.addEventListener('change',async function(){ var arr=getp(obj,path); var multi=Array.isArray(arr); arr=multi?arr:(arr?[arr]:[]); try{ for(var f of fi.files){ var k=await addPhoto(f); arr.push(k); } }catch(e){ toast(e.message||String(e),true); } if(!multi) arr=arr.slice(-1); setp(obj,path,multi?arr:(arr[0]||null)); fi.value=''; draw(); dirty(); });
  var qi=h('p',{class:'qinfo'});
  function qupd(){ if(path!=='foto'){ return; } var k=fotoKey(obj); qi.className='qinfo'; if(!k){ qi.textContent='⚠ Sem foto neste ponto.'; qi.classList.add('bad'); return; } qi.textContent='Verificando a foto…'; fqCheck(k).then(function(q){ if(!q){ qi.textContent=''; return; } if(q.low){ qi.textContent='⚠ Foto em baixa qualidade ('+q.w+'×'+q.h+' px). Substitua por uma foto maior (mínimo '+FQ_MIN_W+'×'+FQ_MIN_H+') para não sair borrada no kit.'; qi.classList.add('bad'); } else { qi.textContent='✓ Qualidade boa ('+q.w+'×'+q.h+' px)'; qi.classList.add('good'); } }); }
  var _d=draw; draw=function(){ _d(); qupd(); document.dispatchEvent(new Event('fotochg')); };
  draw(); return field(label,h('div',{},[fi,wrap,path==='foto'?qi:null]),null,'wide');
}

function viewKit(v){ migKit(D);
  var K=D.kit, g=h('div',{class:'grid'});
  [['titulo','text','Título do kit (nome do arquivo)'],['ano','text','Ano da capa'],['frase1','text','Capa · frase 1'],['frase2','text','Capa · frase 2'],['subtitulo','text','Capa · subtítulo'],['selo','text','Capa · linha inferior'],['capaTexto','area','Capa · texto sobre a Mega'],['capaPilares','strs','Capa · 3 pilares (separe por vírgula)'],['capaStats','pairs','Capa · 3 números: valor | rótulo (use "auto" para contar os pontos)',3],['sobre','area','Texto "Quem somos"'],['fotoCapa','fotos','Foto da capa (opcional; sem foto a capa mostra o texto sobre a Mega)'],['fotoContra','fotos','Foto da contracapa (opcional)'],['investTitulo','text','Página de investimento · título'],['pagamento','text','Forma de pagamento'],['validade','text','Validade da proposta']].forEach(function(s){ g.appendChild(schemaField(K,s)); });
  v.appendChild(h('h2',{text:'Dados gerais do kit'})); v.appendChild(g);
  v.appendChild(h('h3',{text:'Responsável padrão (contracapa)'})); var g2=h('div',{class:'grid'}); [['nome','text','Nome'],['cargo','text','Cargo'],['email','text','E-mail'],['tel1','text','Telefone / WhatsApp'],['tel2','text','Telefone fixo'],['site','text','Site']].forEach(function(s){ g2.appendChild(schemaField(K.resp,s)); }); v.appendChild(g2);
  v.appendChild(h('h3',{text:'Faixas de especificação (4 itens por página)'})); var g3=h('div',{class:'grid'});
  g3.appendChild(schemaField(D.specChips,['led','pairs','Painéis de LED: valor | rótulo',4])); g3.appendChild(schemaField(D.specChips,['banca','pairs','Bancas de LED: valor | rótulo',4])); v.appendChild(g3);
  var sel=h('select',{},[['esri_street','Ruas (Esri) · padrão'],['esri_gray','Cinza claro (Esri)'],['osm','OpenStreetMap']].map(function(o){ var op=h('option',{value:o[0],text:o[1]}); if(mapSt(D.mapStyle)===o[0]) op.selected=true; return op; })); sel.addEventListener('change',function(){ D.mapStyle=sel.value; dirty(); });
  
  v.appendChild(h('h3',{text:'Textos das capas (separadores de praça e formato)'})); v.appendChild(h('p',{class:'hint',text:'Cada capa mostra um texto sobre a praça ou o formato, 3 números e 3 destaques. Use "auto" no número para contar os pontos cadastrados.'}));
  SEQ.map(function(i){return SEPS[i-1]}).forEach(function(sp){ var info=sepInfo(D,sp.i), det=h('details',{class:'pt'}), sm=h('summary',{},[h('span',{class:'t',text:NP(sp.i)+' · '+sp.title.replace('\n',' ')})]); det.appendChild(sm); var gg=h('div',{class:'grid',style:'padding:12px 16px'}); gg.appendChild(schemaField(info,['texto','area','Texto'])); gg.appendChild(schemaField(info,['stats','pairs','3 números: valor | rótulo',3])); gg.appendChild(schemaField(info,['bullets','rows','3 destaques (um por linha)',3])); det.appendChild(gg); v.appendChild(det); });
}
var MERC=[['circuito','text','Nome do circuito (ex.: Circuito de 8 telas de LED)'],['nTelas','num','Nº de telas (usado na tabela de preços)'],['lat','num','Latitude do Mercado'],['lng','num','Longitude do Mercado'],['fotos','fotos','Fotos do Mercado (a 1ª aparece na página de abertura e no separador)'],['texto','area','Texto de abertura'],['tiles','pairs','6 indicadores — um por linha: valor | rótulo',6],['pill1','text','Selo 1'],['pill2','text','Selo 2'],['destaque','pair','Destaque: título | texto'],
 ['demo.tiles','pairs','Perfil demográfico · 4 indicadores: valor | rótulo',4],['demo.faixaCats','strs','Faixa etária · categorias (separe por vírgula)'],['demo.faixa','nums','Faixa etária · valores (%)'],['demo.genero','nums','Gênero · Feminino, Masculino (%)'],['demo.classes','nums','Classe social A–E (%)'],['demo.renda','nums','Renda média por classe A–E (R$, decimais com ponto)'],['demo.intCats','strs','Top 5 interesses · nomes'],['demo.intVals','nums','Top 5 interesses · quantidades'],
 ['specs','rows','Especificações: Ponto | Qtd. | Tamanho | Formato (px)',5],['dims','strs','Medidas do desenho (largura, altura)'],['caption','text','Legenda do desenho'],['chips','pairs','Faixa de 4 itens: valor | rótulo',4]];
var GUAN=[['circuito','text','Nome do circuito'],['nTelas','num','Nº de telas (tabela de preços)'],['lat','num','Latitude do parque (confira!)'],['lng','num','Longitude do parque (confira!)'],['endereco','text','Endereço'],['fotoParque','fotos','Foto do parque para a abertura (opcional; sem foto usa a ilustração)'],['fotos','fotos','Outras fotos do parque (reserva)'],['texto','area','Texto de abertura'],['tiles','pairs','3 indicadores: valor | rótulo',3],['quem','strs','Quem visita (separe por vírgula)'],['porque','text','Por que anunciar'],
 ['demo.faixaCats','strs','Faixa etária · categorias'],['demo.faixa','nums','Faixa etária · valores (%)'],['demo.classes','nums','Classe social A–E (%)'],['demo.genero','nums','Gênero · Mulheres, Homens (%)'],['demo.audiencia','pairs','Audiência: rótulo | valor',3],['specs','rows','Especificações: Ponto | Tamanho | Formato (px)',4],['caption','text','Legenda do desenho'],['chips','pairs','Faixa de 4 itens: valor | rótulo',4]];
var BRAS=[['tiles','pairs','6 indicadores do Metrô-DF: valor | rótulo',6],['genero','nums','Gênero · Feminino, Masculino (%)'],['generoNota','text','Nota do gráfico de gênero'],['fonte','text','Fonte da pesquisa'],['texto','area','Texto sobre o público do metrô'],['formatos','pairs','Formatos de mídia no metrô (5): nome | descrição',6],['dims','strs','Medidas do painel de LED (largura, altura)'],['veic','text','Inserções por dia (painéis)'],['caption','text','Legenda do desenho'],['painelChips','pairs','Faixa de 4 itens: valor | rótulo',4]];
function viewSchema(v,key,schema){ v.appendChild(h('h2',{text:key==='mercado'?'Mercado Central':(key==='guanabara'?'Parque Guanabara':'Brasília · Metrô-DF e painéis')})); v.appendChild(h('p',{class:'hint',text:'Já vem preenchido com os dados do mídia kit atual. Altere o que mudou.'})); var g=h('div',{class:'grid'}); schema.forEach(function(s){ g.appendChild(schemaField(D[key],s)); }); v.appendChild(g); }

/* ---------- pontos ---------- */
var filtro='', busca='', filtroDono='', filtroQ=false;
/* ===== validador de fotos: avisa quando a foto é pequena demais para o kit ===== */
var FQ={}, FQ_MIN_W=1000, FQ_MIN_H=650;
function fotoKey(p){ var k=Array.isArray(p.foto)?p.foto[0]:p.foto; return k||''; }
function fqCheck(k){ if(!k) return Promise.resolve(null); if(FQ[k]) return Promise.resolve(FQ[k]); var src=libSrc(k); if(!src) return Promise.resolve(null);
  return new Promise(function(res){ var im=new Image(); im.onload=function(){ var w=im.naturalWidth,hh=im.naturalHeight; FQ[k]={w:w,h:hh,low:(w<FQ_MIN_W||hh<FQ_MIN_H)}; res(FQ[k]); }; im.onerror=function(){ res(null); }; im.src=src; }); }
function fotoAtencao(p){ var k=fotoKey(p); if(!k) return 'sem'; var q=FQ[k]; return q&&q.low?'baixa':''; }
function fotoMsg(p){ var a=fotoAtencao(p); if(a==='sem') return 'Este ponto não tem foto.'; var q=FQ[fotoKey(p)]; return a==='baixa'?'Foto em baixa qualidade ('+q.w+'×'+q.h+' px). Substitua por uma foto maior (mínimo '+FQ_MIN_W+'×'+FQ_MIN_H+').':''; }
function qBadge(p){ var s=h('span',{class:'qwarn'}); s.hidden=true;
  function upd(){ if(!s.isConnected&&s.__ok){ document.removeEventListener('fotochg',upd); return; } var a=fotoAtencao(p); s.hidden=!a; if(a){ s.textContent=a==='sem'?'⚠ sem foto':'⚠ foto baixa'; s.title=fotoMsg(p); } }
  upd(); fqCheck(fotoKey(p)).then(function(){ s.__ok=1; upd(); }); document.addEventListener('fotochg',upd); return s; }
var fqScanning=false;
function fqScan(done){ if(fqScanning) return; fqScanning=true; var ks=D.pontos.map(fotoKey).filter(function(k,i,a){ return k&&!FQ[k]&&a.indexOf(k)===i; }), i=0;
  function next(){ if(i>=ks.length){ fqScanning=false; if(done) done(); return; } var k=ks[i++]; fqCheck(k).then(next); } for(var c=0;c<4;c++) next(); if(!ks.length){ fqScanning=false; if(done) done(); } }
function fqConta(pts){ return (pts||D.pontos).filter(function(p){ return fotoAtencao(p); }).length; }
var TIPOS_KIT=['Outdoor','Mega Painel','Front','Frontlight','Empena','Painel de LED','Banca de LED','Banca estática','Painel digital'];
function tipoSelect(p,after){ var s=h('select',{},[h('option',{value:'',text:'Automático (pelo grupo)'})].concat(TIPOS_KIT.map(function(t){return h('option',{value:t,text:t});}))); if(p.tipoTxt&&TIPOS_KIT.indexOf(p.tipoTxt)<0) s.appendChild(h('option',{value:p.tipoTxt,text:p.tipoTxt})); s.value=p.tipoTxt||''; s.addEventListener('change',function(){ if(s.value) p.tipoTxt=s.value; else delete p.tipoTxt; if(after) after(); }); return s; }
function grupoSelect(p,after){ var cur=grupoDe(p).k; var s=h('select',{},GRUPOS.map(function(g){ var o=h('option',{value:g.k,text:g.nome}); if(g.k===cur) o.selected=true; return o; })); s.addEventListener('change',function(){ aplicaGrupo(p,s.value); if(after) after(); }); return s; }
function matchP(p){ if(filtro&&grupoDe(p).k!==filtro) return false; if(filtroQ&&!fotoAtencao(p)) return false; if(filtroDono&&donoDe(p)!==filtroDono) return false; if(!busca) return true; var t=[p.endereco,p.bairro,p.cidade,secLabel(p.secao)].join(' ').toLowerCase(); return busca.toLowerCase().split(/\s+/).every(function(w){ return t.indexOf(w)>=0; }); }
function secLabel(k){ return SEC[k]?SEC[k].nome+(SEC[k].praca?' · '+SEC[k].praca:''):k; }
function novoPontoPanel(){
  var np={secao:(grupoPorK(filtro||'')||GRUPOS[1]).sec[0],dono:(grupoPorK(filtro||'')||{}).r2?'mega_r2':'padrao',endereco:'',bairro:'',cidade:'Belo Horizonte',lat:null,lng:null,zoom:16,tamanho:'',pixels:'',veic:'',publico:'',fluxo:'',impacto:'',sentido:'',foto:null};
  var d=h('details',{class:'pt novo',id:'novoponto'}); d.open=true; d.appendChild(h('summary',{},[h('span',{class:'t',text:'➕ Adicionar novo ponto'})]));
  var g=h('div',{class:'grid'}), msg=h('p',{class:'status'});
  var sel=grupoSelect(np); sel.addEventListener('change',function(){ if(np.secao==='metro'||np.secao==='df_painel'){ np.cidade='Brasília-DF'; cid.value=np.cidade; } });
  g.appendChild(field('Seção / formato do ponto',sel,'Painel de LED, banca de LED, empena, frontlight, painel mensal, banca estática, Metrô-DF…')); g.appendChild(field('Tipo exibido no kit',tipoSelect(np))); g.appendChild(donoField(np));
  var ed=inp(np,'endereco'), ba=inp(np,'bairro'), cid=inp(np,'cidade');
  g.appendChild(field('Endereço (título da ficha) *',ed)); g.appendChild(field('Bairro',ba)); g.appendChild(field('Cidade',cid));
  var lk=h('input',{type:'text',placeholder:'Cole o link completo do Google Maps ou "lat, long"'}), lat=inp(np,'lat',{num:true}), lng=inp(np,'lng',{num:true}), res=h('small',{text:''});
  function ok(r){ np.lat=r.lat; np.lng=r.lng; lat.value=r.lat; lng.value=r.lng; res.textContent='✓ Coordenadas encontradas: '+r.lat+' , '+r.lng; res.style.color='#2a9d6f'; lk.style.borderColor='#2a9d6f'; if(typeof pm!=='undefined') pm.update(); }
  lk.addEventListener('input',function(){ var r=parseMapsText(lk.value); if(r) ok(r); else { res.textContent=lk.value?'Não encontrei coordenadas neste link (links curtos maps.app.goo.gl não funcionam: abra o ponto no Maps e copie o link completo da barra do navegador).':''; res.style.color='#b0003a'; lk.style.borderColor=''; } });
  g.appendChild(field('Link do Google Maps (busca lat/long sozinho)',h('div',{},[lk,res]),null,'wide'));
  var bt=h('button',{class:'btn',text:'🔎 Buscar pelo endereço',onclick:async function(){ var q=[np.endereco,np.bairro,np.cidade].filter(Boolean).join(', '); if(!np.endereco){ res.textContent='Digite o endereço primeiro.'; res.style.color='#b0003a'; return; } res.textContent='Buscando…'; res.style.color=''; try{ var r=await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q='+encodeURIComponent(q)); var j=await r.json(); if(j&&j[0]) ok({lat:+(+j[0].lat).toFixed(7),lng:+(+j[0].lon).toFixed(7)}); else { res.textContent='Endereço não encontrado: use o link do Maps.'; res.style.color='#b0003a'; } }catch(e){ res.textContent='Sem conexão com o serviço de busca: use o link do Maps.'; res.style.color='#b0003a'; } }});
  
  g.appendChild(field('Latitude',lat)); g.appendChild(field('Longitude',lng)); var pm=mapaPreview(np); g.appendChild(pm.el); g.addEventListener('input',pm.update);
  [['tamanho','Tamanho (ex.: 9,00 x 3,00 m)'],['pixels','Formato em pixels (ex.: 2308 x 577)'],['veic','Veiculações/dia (bancas)'],['publico','Público (ex.: A, B, C e D)'],['fluxo','Fluxo de carros/dia'],['impacto','Impacto semanal'],['sentido','Sentido (ex.: Centro / Bairro)']].forEach(function(f){ g.appendChild(field(f[1],inp(np,f[0]))); });
  g.appendChild(photosField('Foto do ponto',np,'foto')); g.appendChild(photosField('Imagem do mapa (opcional)',np,'mapa'));
  d.appendChild(g);
  var bar=h('div',{class:'bar'}); bar.appendChild(h('button',{class:'btn pri big',text:'Adicionar ponto',onclick:function(){ if(!String(np.endereco||'').trim()){ msg.textContent='Preencha o endereço.'; msg.className='status err'; return; } var c=JSON.parse(JSON.stringify(np)); c.id=newId(); c.sel=true; D.pontos.push(c); dirty(); filtro=c.secao; showTab('pontos'); var s=$('#fotomsg'); if(s) s.textContent='Ponto adicionado: '+c.endereco+(c.lat==null?' (sem coordenadas, o mapa não vai aparecer)':'')+'.'; setTimeout(function(){ var cs=document.querySelectorAll('details.pt:not(.novo)'); var last=cs[cs.length-1]; if(last){ last.open=true; last.scrollIntoView({block:'center'}); } },200); }})); bar.appendChild(msg); d.appendChild(bar);
  return d;
}
function viewPontos(v){
  v.appendChild(h('h2',{text:'Painel de pontos'})); v.appendChild(h('p',{class:'hint',text:'Cada ponto vira uma ficha no kit. Adicione pontos novos, troque a foto, escolha a seção/formato e cole o link do Maps para buscar latitude e longitude. Exclusões pedem um código de confirmação.'})); v.appendChild(novoPontoPanel());
  var bar=h('div',{class:'bar'}), fsel=h('select',{},[h('option',{value:'',text:'Todas as seções'})].concat(GRUPOS.map(function(g){ var o=h('option',{value:g.k,text:g.nome}); if(filtro===g.k) o.selected=true; return o; })));
  fsel.addEventListener('change',function(){ filtro=fsel.value; showTab('pontos'); });
  bar.appendChild(fsel); bar.appendChild(filtroDonoSel(function(){ showTab('pontos'); }));
  fqScan(function(){ contFotos(); });
  var bs=h('input',{type:'search',placeholder:'🔍 Buscar endereço ou bairro',class:'busca'}); bs.value=busca; bs.addEventListener('input',function(){ busca=bs.value; if(window.drawList) window.drawList(); }); bar.appendChild(bs);
  function setSel(v){ D.pontos.forEach(function(p){ if(!filtro||grupoDe(p).k===filtro) p.sel=v; }); dirty(); showTab('pontos'); }
  bar.appendChild(h('button',{class:'btn',text:'✓ Marcar todos'+(filtro?' desta seção':''),onclick:function(){ setSel(true); }}));
  bar.appendChild(h('button',{class:'btn',text:'Limpar marcação',onclick:function(){ setSel(false); }}));
  bar.appendChild(h('button',{class:'btn pri',text:'+ Novo ponto',onclick:function(){ var f=$('#novoponto'); f.open=true; f.scrollIntoView({behavior:'smooth',block:'start'}); setTimeout(function(){ var i=f.querySelector('input[type=text]'); if(i) i.focus(); },300); }}));
  bar.appendChild(h('button',{class:'btn',text:'Importar planilha (colar)',onclick:function(){ $('#imp').classList.toggle('show'); }}));
  var fl=h('input',{type:'file',accept:'image/*',multiple:'multiple'}); fl.addEventListener('change',async function(){ var n=0; try{ for(var f of fl.files){ var kk=await addPhoto(f); D.libMap=D.libMap||{}; D.libMap[f.name]=kk; n++; } }catch(e){ toast(e.message||String(e),true); } dirty(); $('#fotomsg').textContent=n+' foto(s) adicionadas à biblioteca. Use o nome do arquivo na planilha ou escolha em cada ponto.'; showTab('pontos'); });
  bar.appendChild(h('label',{class:'btn'},['Fotos em lote',fl])); v.appendChild(bar); v.appendChild(h('p',{id:'fotomsg',class:'hint'}));
  var cnt=GRUPOS.map(function(g){ var n=ptsOf(D,g.k).length; return n?g.nome+': '+n:null; }).filter(Boolean).join('  ·  ')||'Nenhum ponto cadastrado ainda.'; v.appendChild(h('p',{class:'hint',text:'Total: '+D.pontos.length+' pontos · '+D.pontos.filter(function(p){return p.sel}).length+' marcados para a proposta   —   '+cnt}));
  var vis=function(){ return D.pontos.filter(matchP); };
  var mk=h('input',{type:'checkbox'}), mtx=h('span',{});
  function refMaster(){ var L=vis(), n=L.filter(function(p){return p.sel}).length; mk.checked=L.length>0&&n===L.length; mk.indeterminate=n>0&&n<L.length; mtx.textContent='Selecionar todos'+(filtro?' desta seção':'')+'  ·  '+n+' de '+L.length+' marcados  ('+D.pontos.filter(function(p){return p.sel}).length+' no total)'; }
  mk.addEventListener('change',function(){ var val=mk.checked; vis().forEach(function(p){ p.sel=val; }); document.querySelectorAll('details.pt input[type=checkbox]').forEach(function(c){ if(c.closest('details.pt').style.display!=='none') c.checked=val; }); var cv=CIRCUITOS.filter(function(k){ return vis().some(function(p){ return p.secao===k; }); }); cv.forEach(function(k){ setCircuito(D,k,val); }); dirty(); if(cv.length){ var y0=window.scrollY; showTab('pontos'); window.scrollTo(0,y0); } else refMaster(); });
  window.refMaster=refMaster;
  v.appendChild(h('label',{class:'selall'},[mk,mtx])); refMaster();
  // importação
  var imp=h('div',{id:'imp',class:'imp'}), ta=h('textarea',{rows:6,placeholder:'Cole aqui as linhas copiadas do Excel (sem cabeçalho). Colunas: Seção | Endereço | Bairro | Cidade | Link do Maps ou "lat, long" | Tamanho | Pixels | Veic./dia | Público | Fluxo/dia | Impacto semanal | Sentido | Nome do arquivo da foto'});
  imp.appendChild(h('p',{class:'hint',html:null,text:'Seção aceita: LED BH, LED RM, Banca LED, Empena, Frontlight, Mensal, Revista. Para as fotos, use "Fotos em lote" e escreva o nome do arquivo na última coluna.'}));
  imp.appendChild(ta); imp.appendChild(h('button',{class:'btn pri',text:'Importar',onclick:function(){ var n=importText(ta.value); ta.value=''; dirty(); $('#fotomsg').textContent=n+' ponto(s) importado(s).'; showTab('pontos'); }}));
  imp.appendChild(h('button',{class:'btn',text:'Baixar modelo (CSV)',onclick:function(){ var csv='﻿Seção;Endereço;Bairro;Cidade;Link ou lat,long;Tamanho;Pixels;Veic./dia;Público;Fluxo/dia;Impacto semanal;Sentido;Foto\r\nLED BH;Av. Exemplo, 1000;Centro;Belo Horizonte;-19.9231747, -43.943164;9,00 x 3,00 m;2308 x 577;500;A, B, C e D;50.000;350.000;Centro / Bairro;foto1.jpg\r\n'; download(new Blob([csv],{type:'text/csv'}),'modelo-pontos.csv'); }}));
  v.appendChild(imp);
  var list=h('div',{class:'plist'});
  function drawList(){ list.innerHTML=''; var n=0; D.pontos.forEach(function(p,ix){ if(!matchP(p)) return; n++; list.appendChild(pointCard(p,ix)); }); if(!n) list.appendChild(h('p',{class:'hint',text:'Nenhum ponto encontrado.'})); if(window.refMaster) window.refMaster(); }
  drawList(); v.appendChild(list); window.drawList=drawList;
}
function normSec(s){ s=String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); if(/rm|metropol/.test(s)&&/led|painel/.test(s)) return 'led_rm'; if(/banca/.test(s)&&/(revista|estatic)/.test(s)) return 'revista'; if(/revista/.test(s)) return 'revista'; if(/banca/.test(s)) return 'banca_led'; if(/empena/.test(s)) return 'empena'; if(/front/.test(s)) return 'front'; if(/outdoor/.test(s)) return 'outdoor'; if(/mensal|mega/.test(s)) return 'mensal'; return 'led_bh'; }
function importText(t){ var n=0; t.split(/\r?\n/).forEach(function(line){ if(!line.trim()) return; var c=line.indexOf('\t')>=0?line.split('\t'):line.split(';'); c=c.map(function(x){return x.trim()}); if(/^se[cç][aã]o$/i.test(c[0])) return; var ll=parseMapsText(c[4]||'');
  D.pontos.push({id:newId(),sel:true,secao:normSec(c[0]),endereco:c[1]||'',bairro:c[2]||'',cidade:c[3]||'',lat:ll?ll.lat:null,lng:ll?ll.lng:null,zoom:16,tamanho:c[5]||'',pixels:c[6]||'',veic:c[7]||'',publico:c[8]||'',fluxo:c[9]||'',impacto:c[10]||'',sentido:c[11]||'',foto:(c[12]&&libSrc(c[12]))?(D.libMap&&D.libMap[c[12]]||c[12]):null}); n++; }); return n; }
function pointCard(p,ix){
  var d=h('details',{class:'pt'}), sm=h('summary'), title=h('span',{class:'t'}), badge=h('em',{text:SEC[p.secao]?SEC[p.secao].nome:''});
  function upd(){ title.textContent=(p.endereco||'(sem endereço)')+(p.bairro?' · '+p.bairro:''); badge.textContent=grupoDe(p).nome+(donoDe(p)!=='padrao'?' · '+donoNome(donoDe(p)):''); st.textContent=(p.lat!=null&&!isNaN(p.lat))?'📍 mapa ok':'sem coordenadas'; st.className='st '+((p.lat!=null&&!isNaN(p.lat))?'ok':'no'); }
  var st=h('span',{class:'st'}); var ck=h('input',{type:'checkbox',title:'Incluir na proposta'}); ck.checked=!!p.sel; ck.addEventListener('click',function(e){ e.stopPropagation(); }); ck.addEventListener('change',function(){ if(CIRCUITOS.indexOf(p.secao)>=0){ setCircuito(D,p.secao,ck.checked); dirty(); var y=window.scrollY; showTab('pontos'); window.scrollTo(0,y); return; } p.sel=ck.checked; dirty(); if(window.refMaster) window.refMaster(); }); var cl=h('label',{class:'ck',title:'Incluir na proposta'},[ck,h('span',{text:'proposta'})]); cl.addEventListener('click',function(e){ e.stopPropagation(); }); sm.appendChild(cl); sm.appendChild(badge); sm.appendChild(title); sm.appendChild(st);
  sm.appendChild(h('button',{class:'mini',text:'duplicar',onclick:function(e){ e.preventDefault(); var c=JSON.parse(JSON.stringify(p)); c.id=newId(); D.pontos.splice(ix+1,0,c); dirty(); showTab('pontos'); }}));
  sm.appendChild(qBadge(p)); sm.appendChild(h('button',{class:'mini del',text:'excluir',onclick:function(e){ e.preventDefault(); askPin('Excluir ponto',(p.endereco||'(sem endereço)')+' · '+secLabel(p.secao)).then(function(ok){ if(!ok) return; var k=D.pontos.indexOf(p); if(k>=0) D.pontos.splice(k,1); dirty(); showTab('pontos'); }); }}));
  var fk=Array.isArray(p.foto)?p.foto[0]:p.foto; if(fk&&libSrc(fk)) sm.insertBefore(h('img',{class:'sth',src:libSrc(fk)}),sm.firstChild);
  d.appendChild(sm);
  var g=h('div',{class:'grid'});
  var sel=grupoSelect(p,function(){ upd(); dirty(); }); g.appendChild(field('Grupo / formato',sel)); g.appendChild(field('Tipo exibido no kit',tipoSelect(p,function(){ dirty(); }),'Aparece como "Tipo" na ficha do ponto. Automático usa o padrão do grupo.')); g.appendChild(donoField(p,function(){ sel.value=grupoDe(p).k; upd(); }));
  function I(path,label,o){ o=o||{}; o.onchange=upd; return field(label,inp(p,path,o),o.hint); }
  g.appendChild(I('endereco','Endereço (título da ficha)')); g.appendChild(I('bairro','Bairro')); g.appendChild(I('cidade','Cidade'));
  var lk=h('input',{type:'text',placeholder:'Cole o link completo do Google Maps ou "lat, long"'}); var lat=inp(p,'lat',{num:true,onchange:upd}), lng=inp(p,'lng',{num:true,onchange:upd});
  lk.addEventListener('input',function(){ var r=parseMapsText(lk.value); if(r){ p.lat=r.lat; p.lng=r.lng; lat.value=r.lat; lng.value=r.lng; upd(); dirty(); pm.update(); lk.style.borderColor='#2a9d6f'; } else lk.style.borderColor=''; });
  g.appendChild(field('Link do Google Maps (preenche lat/long)',lk,'Link curto (maps.app.goo.gl) não funciona: abra e copie o endereço completo da barra.','wide'));
  g.appendChild(field('Latitude',lat)); g.appendChild(field('Longitude',lng)); g.appendChild(I('zoom','Zoom do mapa (13–19)',{num:true})); var pm=mapaPreview(p); g.appendChild(pm.el); g.addEventListener('input',pm.update);
  g.appendChild(I('tamanho','Tamanho (ex.: 9,00 x 3,00 m)')); g.appendChild(I('pixels','Formato em pixels (ex.: 2308 x 577)')); g.appendChild(I('veic','Veiculações/dia (bancas)')); g.appendChild(I('publico','Público (ex.: A, B, C e D)')); g.appendChild(I('fluxo','Fluxo de carros/dia')); g.appendChild(I('impacto','Impacto semanal')); g.appendChild(I('sentido','Sentido (ex.: Centro / Bairro)')); g.appendChild(I('preco','Valor de tabela deste endereço (R$)',{num:true,hint:'Usado nas propostas de empenas, frontlight, mega painéis, bancas estáticas e Metrô-DF.'}));
  g.appendChild(photosField('Foto do ponto',p,'foto')); g.appendChild(fotoAjuste(p)); g.appendChild(photosField('Imagem do mapa (opcional; envie um print do mapa do ponto)',p,'mapa')); d.appendChild(g); upd(); return d;
}

/* ---------- preços ---------- */
function viewPrecos(v,embed){ migPrecos(D);
  if(!embed) v.appendChild(h('h2',{text:'Tabela de preços e investimento'}));
  v.appendChild(h('p',{class:'hint dica-longa',text:'Preencha valor de tabela e desconto: o valor negociado, o total e a página de Investimento Total são calculados sozinhos. O valor é bruto ou líquido para todas as linhas (campo acima). Pontos vêm da contagem dos pontos cadastrados (Mercado Central e Parque Guanabara usam o número de telas). Inserções: digite por ativo/tela e o total é calculado (pontos × inserções).'}));
  var top=h('div',{class:'grid'}), ms=h('select',{},[['bruto','Bruto'],['liquido','Líquido (desconta comissão da agência e BV)']].map(function(o){ var op=h('option',{value:o[0],text:o[1]}); if(D.modoGeral===o[0]) op.selected=true; return op; })); ms.addEventListener('change',function(){ D.modoGeral=ms.value; dirty(); recalc(); });
  top.appendChild(field('Valor padrão do kit',ms)); top.appendChild(field('Comissão da agência (%)',inp(D,'comissao',{num:true,onchange:recalc}))); top.appendChild(field('BV à parte (%)',inp(D,'bv',{num:true,onchange:recalc}))); if(ME.admin) top.appendChild(field('Alertar desconto acima de (%)',inp(D,'descAlerta',{num:true}))); v.appendChild(top);
  var tb=h('table',{class:'ptab'}); tb.appendChild(h('thead',{},[h('tr',{},['Formato','Pontos','Período','Inserções por ativo/tela','Total inserções','Valor tabela (R$)','Desconto (%)','Valor negociado','',''].map(function(t){return h('th',{text:t})}))]));
  var body=h('tbody'); tb.appendChild(body); var foot=h('tfoot'); tb.appendChild(foot);
  function recalc(){ if(window.__onPreco) window.__onPreco(); var tt=0,tn=0; D.precos.forEach(function(r,i){ var c=calcPreco(D,r); tt+=c.tabela; tn+=c.final; var cell=body.children[i]&&body.children[i].querySelector('.val'); if(cell) cell.textContent=brl(c.final); var pc=body.children[i]&&body.children[i].querySelector('.pts'); if(pc) pc.placeholder=String(c.pontos); var ic=body.children[i]&&body.children[i].querySelector('.ins'); if(ic) ic.textContent=c.insercoes; var tcl=body.children[i]&&body.children[i].querySelector('.tabcalc'); if(tcl) tcl.textContent=c.tabela?brl(c.tabela):'por endereço'; }); foot.innerHTML=''; foot.appendChild(h('tr',{},[h('td',{text:'Total'}),h('td'),h('td'),h('td'),h('td'),h('td',{text:brl(tt)}),h('td'),h('td',{text:brl(tn)}),h('td'),h('td')])); }
  function row(r,i){ var tr=h('tr'); if(embed&&r.auto&&!r.auto.split(',').some(function(k){ return ptsOf(D,k).some(function(p){return p.sel;}); })) tr.className='vazio'; function td(x){ var t=h('td'); t.appendChild(x); tr.appendChild(t); }
    var nt=h('td'); nt.appendChild(inp(r,'nome')); if(GRUPO_NOVOS[r.auto]) nt.appendChild(h('small',{class:'dono d-'+(r.auto.slice(-2)==='r2'?'mega_r2':'mega'),text:'interno: '+grupoPorK(r.auto).nome})); tr.appendChild(nt); var pi=inp(r,'pontos'); pi.className='pts'; td(pi); td(inp(r,'periodo')); td(inp(r,'insPor',{onchange:recalc})); var ti=h('td',{class:'calc ins'}); tr.appendChild(ti); if(ehEstatico(r)){ var tc=h('td',{class:'calc tabcalc'}); tr.appendChild(tc); } else td(inp(r,'tabela',{onchange:recalc})); td(inp(r,'desc',{onchange:recalc}));
    var cs=h('td',{class:'calc val'}); tr.appendChild(cs);
    if(!ME.admin){ td(h('span')); td(h('span')); return tr; }
    td(h('button',{class:'mini',text:'↑',onclick:function(){ if(i>0){ D.precos.splice(i-1,0,D.precos.splice(i,1)[0]); dirty(); showTab(curTab); } }})); td(h('button',{class:'mini del',text:'×',onclick:function(){ askPin('Excluir linha de preço',r.nome).then(function(ok){ if(!ok) return; var k=D.precos.indexOf(r); if(k>=0) D.precos.splice(k,1); dirty(); showTab(curTab); }); }})); return tr; }
  window.__recalcPrecos=recalc; var ROT=['Formato','Pontos','Período','Inserções por ativo/tela','Total inserções','Valor tabela (R$)','Desconto (%)','Valor negociado']; D.precos.forEach(function(r,i){ var tr=row(r,i); ROT.forEach(function(l,k){ if(tr.children[k]) tr.children[k].setAttribute('data-l',l); }); body.appendChild(tr); }); v.appendChild(h('div',{class:'tw'},[tb])); recalc();
  v.appendChild(blocoEnderecos());
  if(!ME.admin) v.appendChild(h('button',{class:'btn',text:'Restaurar valores da tabela base',onclick:function(){ restorePrecos(); showTab(curTab); }}));
  if(ME.admin) v.appendChild(h('button',{class:'btn',text:'+ Adicionar linha',onclick:function(){ D.precos.push({nome:'Nova linha',auto:'',pontos:'',periodo:'4 semanas',insercoes:'',insPor:'',v2:1,tabela:'',desc:'',modo:'geral'}); dirty(); showTab(curTab); }}));
}

function filtroDonoSel(onchg){ var s=h('select',{},[h('option',{value:'',text:'Todas as propriedades'})].concat(DONOS.map(function(d){ var o=h('option',{value:d[0],text:d[1]}); if(filtroDono===d[0]) o.selected=true; return o; }))); s.addEventListener('change',function(){ filtroDono=s.value; onchg(); }); return s; }
function donoField(p,onchg){ var s=h('select',{},DONOS.map(function(d){ var o=h('option',{value:d[0],text:d[1]}); if(donoDe(p)===d[0]) o.selected=true; return o; })); s.addEventListener('change',function(){ p.dono=s.value; if(onchg) onchg(); dirty(); }); return field('Propriedade do ponto',s,'MEGA, MEGA/R2 (sócio), Terceiros ou Padrão.'); }

/* ---------- preço por endereço (empenas, outdoors e demais estáticos) ---------- */
function blocoEnderecos(){
  var w=h('section',{class:'endpr'}); var algum=false;
  w.appendChild(h('h3',{text:'Preço por endereço'}));
  w.appendChild(h('p',{class:'hint',text:ME.admin?'Cada ponto estático tem o seu valor de tabela, de acordo com o endereço. Defina aqui; nas propostas o valor da linha é a soma dos endereços escolhidos.':'Os pontos estáticos escolhidos entram na proposta com o valor de tabela de cada endereço, definido pelo administrador. O desconto da linha vale para o conjunto.'}));
  ESTATICOS.forEach(function(k){
    var lista=ME.admin?ptsOf(D,k):selEstaticos(D,k); if(!lista.length) return; algum=true;
    var g=h('div',{class:'endgrp'}); g.appendChild(h('h4',{text:secLabel(k)+(ME.admin?'':' · '+lista.length+' escolhido'+(lista.length>1?'s':''))}));
    lista.forEach(function(p){
      var nome=(p.endereco||'(sem endereço)')+(p.bairro?' · '+p.bairro:'');
      var val;
      if(ME.admin){ val=inp(p,'preco',{num:true,onchange:function(){ if(window.__recalcPrecos) window.__recalcPrecos(); }}); val.placeholder='R$ 0,00'; val.inputMode='decimal'; }
      else val=h('b',{class:p.preco?'':'sem',text:p.preco?brl(vlr(p.preco)):'sem preço definido'});
      g.appendChild(h('div',{class:'endrow'+(ME.admin&&p.sel?' on':'')},[h('span',{class:'t',text:nome}),val]));
    });
    w.appendChild(g);
  });
  if(!algum) w.appendChild(h('p',{class:'hint',text:ME.admin?'Nenhum ponto estático cadastrado.':'Nenhum ponto estático escolhido. Quando você marcar empenas, outdoors, frontlight ou bancas estáticas, o valor de cada endereço aparece aqui.'}));
  return w;
}

/* ---------- gerar ---------- */
function viewGerar(v){
  v.appendChild(h('h2',{text:'Gerar'}));
  v.appendChild(h('p',{class:'hint',text:'Os mapas são gerados na hora a partir das coordenadas (precisa de internet). O PowerPoint sai 100% editável; o PDF sai direto, pronto para enviar.'}));
  var nsel=D.pontos.filter(function(p){return p.sel}).length;
  var g=h('div',{class:'gcards'});
  var c1=h('div',{class:'gcard'},[h('h3',{text:'Mídia kit completo'}),h('p',{class:'hint',text:'Todos os '+D.pontos.length+' pontos cadastrados, com todas as páginas: Mercado Central, Parque Guanabara e Brasília. Sem preços: tabela de preços e investimento só entram na proposta.'})]);
  var b1=h('div',{class:'bar'}); b1.appendChild(h('button',{class:'btn pri big',text:'⬇ PowerPoint',onclick:function(){ generate('pptx','completo'); }})); b1.appendChild(h('button',{class:'btn big',text:'⬇ PDF',onclick:function(){ generate('pdf','completo'); }})); b1.appendChild(h('button',{class:'btn',text:'Prévia',onclick:function(){ generate('prev','completo'); }})); c1.appendChild(b1);
  var c2=h('div',{class:'gcard'},[h('h3',{text:'Proposta personalizada'}),h('p',{class:'hint',text:nsel+' ponto(s) marcado(s) na aba de pontos. Só entram as seções, especificações e os preços dos pontos escolhidos (tabela de preços e investimento). Escolha os pontos na aba "Pontos da proposta".'})]);
  c2.appendChild(field('Cliente / campanha (aparece na capa)',inp(D.kit,'cliente')));
  var b2=h('div',{class:'bar'}); b2.appendChild(h('button',{class:'btn pri big',text:'⬇ PowerPoint',onclick:function(){ generate('pptx','proposta'); }})); b2.appendChild(h('button',{class:'btn big',text:'⬇ PDF',onclick:function(){ generate('pdf','proposta'); }})); b2.appendChild(h('button',{class:'btn',text:'Prévia',onclick:function(){ generate('prev','proposta'); }})); c2.appendChild(b2);
  g.appendChild(c1); g.appendChild(c2); v.appendChild(g);
  v.appendChild(h('p',{id:'gstatus',class:'status'}));
  v.appendChild(h('div',{id:'prev',class:'prev'}));
}


/* ---------- Fluxo guiado do comercial: 2 abas (Mídia Kit personalizado · Proposta) ---------- */
var FLUXO={kitp:0,prop:0};
function viewFluxo(v,tipo){
  var prop=tipo==='prop', mode=prop?'proposta':'kit';
  var passos=prop?[['cliente','Cliente'],['pontos','Pontos'],['precos','Preços'],['gerar','Gerar']]:[['cliente','Cliente'],['pontos','Pontos'],['gerar','Gerar']];
  var i=Math.max(0,Math.min(FLUXO[tipo]||0,passos.length-1)), id=passos[i][0];
  function ir(n){ FLUXO[tipo]=n; showTab(tipo); }
  function nSel(){ return D.pontos.filter(function(p){return p.sel}).length; }
  window.__onSel=null; window.__onPreco=null;
  v.appendChild(h('h2',{text:prop?'Gerar proposta':'Gerar mídia kit personalizado'}));
  v.appendChild(h('p',{class:'hint',text:prop?'Mídia kit com os pontos escolhidos mais a tabela de preços e o investimento.':'Mídia kit só com os pontos escolhidos, sem preços.'}));
  var DICA={cliente:'Diga para quem é a proposta.',pontos:'Escolha os pontos. Dica: descreva o pedido do cliente e deixe o sistema sugerir.',precos:'Confira os valores de tabela e os descontos.',gerar:'Revise e baixe o arquivo.'};
  var st=h('div',{class:'steps'}); passos.forEach(function(p,k){ st.appendChild(h('button',{type:'button',class:'step'+(k===i?' on':'')+(k<i?' ok':''),onclick:function(){ ir(k); }},[h('i',{text:k<i?'✓':String(k+1)}),h('span',{text:p[1]})])); }); v.appendChild(st); v.appendChild(h('p',{class:'stepinfo',text:'Passo '+(i+1)+' de '+passos.length+' · '+DICA[id]}));
  var panel=h('div',{class:'fpanel'}); v.appendChild(panel);
  var next=h('button',{type:'button',class:'btn pri big',text:'Continuar'});
  if(id==='cliente'){
    panel.appendChild(h('h3',{text:'Para quem é?'}));
    var ic=inp(D.kit,'cliente',{onchange:function(){ vc(); }}); panel.appendChild(field('Cliente / campanha (aparece na capa)',ic,prop?'Obrigatório na proposta.':'Pode deixar em branco se ainda não tem o nome do cliente.'));
    function vc(){ if(prop){ var ok=!!String(D.kit.cliente||'').trim(); next.disabled=!ok; next.textContent=ok?'Continuar':'Informe o cliente para continuar'; } } setTimeout(vc,0);
    if(!prop) panel.appendChild(h('button',{type:'button',class:'btn',text:'Quero o mídia kit completo (todos os pontos)',onclick:function(){ window.__completo=1; FLUXO[tipo]=passos.length-1; showTab(tipo); }}));
  } else if(id==='pontos'){
    panel.appendChild(h('h3',{text:'Quais pontos entram?'}));
    window.__onSel=function(n){ next.disabled=!n; next.textContent=n?'Continuar · '+n+(n>1?' pontos':' ponto'):'Escolha um ponto'; };
    viewSelecao(panel,true);
  } else if(id==='precos'){
    var avp=h('p',{class:'qinfo bad'}); avp.hidden=true;
    window.__onPreco=function(){ var f=[]; D.precos.forEach(function(r){ if(r.auto&&!r.auto.split(',').some(function(k){ return ptsOf(D,k).some(function(p){return p.sel;}); })) return; if(!(calcPreco(D,r).tabela>0)) f.push(r.nome); }); avp.hidden=!f.length; avp.textContent=f.length?'⚠ Falta o valor de tabela em: '+f.join(', ')+'.':''; next.disabled=!!f.length; next.textContent=f.length?'Preencha os valores para continuar':'Continuar'; };
    panel.appendChild(avp);
    panel.appendChild(h('h3',{text:'Valores da proposta'}));
    panel.appendChild(h('p',{class:'hint',text:'Aparecem só os formatos dos pontos que você escolheu. Preencha o valor de tabela e o desconto; o total é calculado sozinho.'}));
    viewPrecos(panel,true); setTimeout(function(){ if(window.__onPreco) window.__onPreco(); },0);
  } else {
    var comp=!prop&&window.__completo, n=nSel(), tot=0;
    if(prop) D.precos.forEach(function(r){ if(!r.auto||r.auto.split(',').some(function(k){ return ptsOf(D,k).some(function(p){return p.sel;}); })) tot+=calcPreco(D,r).final; });
    var sm=h('div',{class:'resumo'},[h('div',{},[h('b',{text:D.kit.cliente||'(sem cliente)'}),h('span',{text:'cliente / campanha'})]),h('div',{},[h('b',{text:String(comp?D.pontos.length:n)}),h('span',{text:comp?'pontos (todos)':'pontos escolhidos'})])]);
    if(prop) sm.appendChild(h('div',{},[h('b',{text:brl(tot)}),h('span',{text:'investimento ('+(D.modoGeral==='liquido'?'líquido':'bruto')+')'})]));
    panel.appendChild(h('h3',{text:'Tudo pronto'})); panel.appendChild(sm);
    var qa=h('p',{class:'qinfo bad'}); qa.hidden=true; panel.appendChild(qa); (function(){ var escolhidos=comp?D.pontos:D.pontos.filter(function(p){return p.sel}); function qu(){ var n=fqConta(escolhidos); qa.hidden=!n; qa.textContent='⚠ '+n+' ponto'+(n>1?'s':'')+' com foto em baixa qualidade ou sem foto. Peça ao administrador para substituir antes de enviar ao cliente.'; } fqScan(qu); qu(); })();
    var md=comp?'completo':mode, b=h('div',{class:'bar'});
    b.appendChild(h('button',{class:'btn pri big',text:'⬇ PowerPoint',onclick:function(){ generate('pptx',md); }})); b.appendChild(h('button',{class:'btn big',text:'⬇ PDF',onclick:function(){ generate('pdf',md); }})); b.appendChild(h('button',{class:'btn',text:'Prévia',onclick:function(){ generate('prev',md); }})); panel.appendChild(b);
    panel.appendChild(h('p',{class:'hint',text:'Dica: clique em Prévia para ver as páginas e remover as que não quiser antes de baixar. O PowerPoint sai editável; o PDF sai pronto para enviar.'}));
    panel.appendChild(h('p',{id:'gstatus',class:'status'})); panel.appendChild(h('div',{id:'prev',class:'prev'}));
  }
  var nav=h('div',{class:'fnav'});
  if(i>0) nav.appendChild(h('button',{type:'button',class:'btn big',text:'← Voltar',onclick:function(){ window.__completo=0; ir(i-1); }}));
  if(i<passos.length-1){ next.onclick=function(){ ir(i+1); }; nav.appendChild(next); if(id==='pontos'&&window.__onSel) window.__onSel(nSel()); }
  v.appendChild(nav);
}


/* ---------- Melhoria de fotos (admin): pontos com foto fraca ou sem foto ---------- */
function contFotos(){ var n=fqConta(); document.querySelectorAll('.tab[data-t=fotos] .cnt').forEach(function(c){ c.textContent=n; c.hidden=!n; }); }
function viewFotos(v){
  v.appendChild(h('h2',{text:'Melhoria de fotos'}));
  v.appendChild(h('p',{class:'hint',text:'Aqui aparecem os pontos com foto em baixa qualidade (menos de '+FQ_MIN_W+'×'+FQ_MIN_H+' px) ou sem foto. Troque pela foto nova: o ponto sai da lista assim que a foto estiver boa.'}));
  var gsel=h('select',{},[h('option',{value:'',text:'Todas as seções'})].concat(GRUPOS.map(function(g){ return h('option',{value:g.k,text:g.nome}); })));
  var tipo='', segs=h('div',{class:'seg'}), info=h('p',{class:'status'}), list=h('div',{class:'fgrid'}); v.appendChild(h('div',{class:'bar'},[segs,gsel])); v.appendChild(info); v.appendChild(list);
  function drawSegs(){ segs.innerHTML=''; var nb=D.pontos.filter(function(p){return fotoAtencao(p)==='baixa'}).length, ns=D.pontos.filter(function(p){return fotoAtencao(p)==='sem'}).length;
    [['','Todos ('+(nb+ns)+')'],['baixa','Baixa qualidade ('+nb+')'],['sem','Sem foto ('+ns+')']].forEach(function(o){ segs.appendChild(h('button',{type:'button',class:'segb'+(tipo===o[0]?' on':''),text:o[1],onclick:function(){ tipo=o[0]; draw(); }})); }); }
  function draw(){ list.innerHTML=''; drawSegs(); var itens=D.pontos.filter(function(p){ var a=fotoAtencao(p); return a&&(!tipo||a===tipo)&&(!gsel.value||grupoDe(p).k===gsel.value); });
    info.textContent=fqScanning?'Verificando as fotos…':(itens.length?itens.length+' ponto'+(itens.length>1?'s':'')+' para melhorar.':'Tudo certo: nenhuma foto em baixa qualidade.'); info.className='status '+(fqScanning?'':(itens.length?'':'ok'));
    itens.forEach(function(p){ var k=fotoKey(p), q=k&&FQ[k], st=h('p',{class:'fst',text:fotoAtencao(p)==='sem'?'⚠ Sem foto':'⚠ '+q.w+'×'+q.h+' px · baixa qualidade'});
      var th=k&&libSrc(k)?h('img',{src:libSrc(k),loading:'lazy'}):h('div',{class:'nofoto',text:'sem foto'});
      var fi=h('input',{type:'file',accept:'image/*'}); var msg=h('span',{class:'hint'});
      fi.addEventListener('change',async function(){ if(!fi.files.length) return; msg.textContent='Enviando…'; try{ var nk=await addPhoto(fi.files[0]); if(Array.isArray(p.foto)) p.foto[0]=nk; else p.foto=nk; dirty(); var r=await fqCheck(nk); contFotos(); document.dispatchEvent(new Event('fotochg')); if(r&&r.low) toast('Foto enviada, mas ainda está pequena ('+r.w+'×'+r.h+' px). Use uma maior.',true); else toast('Foto trocada ✓'); draw(); }catch(e){ msg.textContent=''; toast(e.message||String(e),true); } });
      var abrir=h('button',{type:'button',class:'btn',text:'Abrir ponto',onclick:function(){ filtro=''; filtroDono=''; filtroQ=false; busca=p.endereco||''; showTab('pontos'); }});
      list.appendChild(h('div',{class:'fcard'},[th,h('div',{class:'fbody'},[h('b',{text:p.endereco||'(sem endereço)'}),h('span',{class:'hint',text:[p.bairro,grupoDe(p).nome].filter(Boolean).join(' · ')}),st,h('div',{class:'bar'},[h('label',{class:'btn pri'},['📷 Substituir foto',fi]),abrir]),msg])])); }); }
  gsel.addEventListener('change',draw); draw(); fqScan(function(){ contFotos(); if(curTab==='fotos') draw(); });
}
