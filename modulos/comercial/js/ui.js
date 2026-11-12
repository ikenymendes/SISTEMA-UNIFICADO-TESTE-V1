/* Telas do gerador (comuns a administrador e comercial). */
var curTab='kit';
function viewSelecao(v,embed){
  if(!embed){ v.appendChild(h('h2',{text:'Pontos da proposta'}));
  v.appendChild(h('p',{class:'hint',text:'Marque os pontos que entram na proposta personalizada.'})); }
  var iaSlot=h('div'); if(embed) v.appendChild(iaSlot);
  var bar=h('div',{class:'bar'}), fsel=h('select',{},[h('option',{value:'',text:'Todas as seções'})].concat(fmtOpcoes().map(function(g){ var o=h('option',{value:g.k,text:g.nome}); if(filtro===g.k) o.selected=true; return o; })));
  var bs=h('input',{type:'search',placeholder:'🔍 Buscar endereço ou bairro',class:'busca'}); bs.value=busca;
  var fdn=filtroDonoSel(function(){ draw(); });
  bar.appendChild(fsel); bar.appendChild(fdn); var pf=progFiltro(function(){ draw(); pf.classList.toggle('on',filtroProg); }); if(pf) bar.appendChild(pf); bar.appendChild(bs); bar.appendChild(h('button',{class:'btn',type:'button',text:'➕ Sugerir novo ponto',onclick:function(){ abrirFormSugestao('adicionar',null); }})); v.appendChild(bar);
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
  function draw(){ list.innerHTML=''; var n=0, ncirc=desenhaCirc(); vis().forEach(function(p){ n++; var ck=h('input',{type:'checkbox'}); ck.checked=!!p.sel; ck.addEventListener('change',function(){ p.sel=ck.checked; dirty(); ref(); }); var fk=Array.isArray(p.foto)?p.foto[0]:p.foto; var kids=[ck]; if(fk&&libSrc(fk)) kids.push(h('img',{class:'sth',src:libSrc(fk)})); kids.push(h('span',{class:'t',text:(p.endereco||'(sem endereço)')+(p.bairro?' · '+p.bairro:'')})); kids.push(qBadge(p)); kids.push(h('em',{text:secLabel(p.secao)})); if(ME.admin&&p.prog) kids.push(progBadge(p)); if(donoDe(p)!=='padrao') kids.push(h('em',{class:'dono d-'+donoDe(p),text:donoNome(donoDe(p))})); kids.push(h('button',{class:'mini',type:'button',text:'✏️ sugerir alteração',title:'Pedir ao administrador para alterar este ponto',onclick:function(e){ e.preventDefault(); e.stopPropagation(); abrirFormSugestao('alterar',p); }})); list.appendChild(h('label',{class:'srow'},kids)); }); if(!n&&!ncirc) list.appendChild(h('p',{class:'hint',text:'Nenhum ponto encontrado.'})); ref(); }
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
  rows.forEach(function(r){ tt+=r.tabela; tn+=r.neg; tf+=r.final; if(!(r.tabela>0)) avisos.push(['bad','"'+r.nome+'" está sem valor de tabela.']); if(r.desc>lim) avisos.push(['warn','"'+r.nome+'": desconto de '+String(r.desc).replace('.',',')+'% (acima de '+lim+'%).']); if(r.desc<0) avisos.push(['bad','"'+r.nome+'": desconto negativo.']); if(!r.pontos) avisos.push(['warn','"'+r.nome+'" está com 0 pontos.']); if(r.abaixo) avisos.push(['warn','"'+r.nome+'": você está alterando o valor pré-definido pelo administrador. Líquido negociado '+R(r.liqNeg)+', abaixo do mínimo de '+R(r.minLiq)+(r.incProd?' (inclui produção)':'')+'.']); });
  if(!rows.length) avisos.push(['bad','Nenhuma linha de preço entrou na proposta.']);
  if(!String(D.kit.cliente||'').trim()) avisos.push(['warn','Cliente não informado: a proposta sairá sem o nome do cliente.']);
  if(liq) avisos.push(['info','Valores líquidos: comissão da agência '+String(D.comissao).replace('.',',')+'%'+(num(D.bv)?' e BV '+String(D.bv).replace('.',',')+'%':'')+' já descontados do valor final.']);
  var np=(typeof PAG!=='undefined'&&PAG.off&&PAG.off.size)?PAG.off.size:0; if(np) avisos.push(['info',np+' página'+(np>1?'s':'')+' removida'+(np>1?'s':'')+' da proposta.']);
  var ov=h('div',{class:'pinov'}), box=h('div',{class:'pinbox conf'});
  function close(v){ document.removeEventListener('keydown',kd); ov.remove(); res(v); } function kd(e){ if(e.key==='Escape') close(false); }
  box.appendChild(h('h3',{text:'Conferir antes de gerar'})); box.appendChild(h('p',{class:'pind',text:'Cliente: '+(D.kit.cliente||'—')+' · '+slides.length+' páginas'}));
  var tb=h('table',{class:'ctab'}); tb.appendChild(h('thead',{},[h('tr',{},['Formato','Tabela','Desc.','Negociado'].concat(liq?['Líquido']:[]).map(function(t,i){ return h('th',{class:i?'n':'',text:t}); }))]));
  var tbody=h('tbody'); rows.forEach(function(r){ var a=[r.nome,R(r.tabela),String(r.desc).replace('.',',')+'%',R(r.neg)]; if(liq) a.push(R(r.final)); tbody.appendChild(h('tr',{class:(r.desc>lim||r.abaixo||!(r.tabela>0))?'al':''},a.map(function(t,i){ return h('td',{class:i?'n':'',text:t}); }))); });
  var ta=['Total',R(tt),tt?String(Math.round((1-tn/tt)*10000)/100).replace('.',',')+'%':'—',R(tn)]; if(liq) ta.push(R(tf)); tbody.appendChild(h('tr',{class:'tot'},ta.map(function(t,i){ return h('td',{class:i?'n':'',text:t}); }))); tb.appendChild(tbody); box.appendChild(h('div',{class:'cwrap'},[tb]));
  if(avisos.length){ var ul=h('div',{class:'cav'}); avisos.forEach(function(a){ ul.appendChild(h('div',{class:'ca '+a[0],text:(a[0]==='info'?'ℹ ':'⚠ ')+a[1]})); }); box.appendChild(ul); }
  var altos=rows.filter(function(r){ return r.desc>lim||r.abaixo; }), jt=h('textarea',{rows:'2',placeholder:'Ex.: cliente fechou 6 meses; aprovado pelo gestor.'}); window.JUST_DESC='';
  if(altos.length){ var temMin=altos.some(function(r){return r.abaixo;}), temDesc=altos.some(function(r){return r.desc>lim;}); box.appendChild(h('label',{class:'f'},[h('span',{text:'Justificativa '+(temMin&&temDesc?'do desconto acima de '+lim+'% e do valor abaixo do mínimo pré-definido':temMin?'do valor abaixo do mínimo pré-definido':'do desconto acima de '+lim+'%')+' (obrigatória)'}),jt])); }
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
  /* a prévia usa a foto já girada (desenhada num canvas), igual ao que vai para o PowerPoint/PDF */
  function girada(){ var r=((+aj().r||0)%360+360)%360, sc=Math.min(1,1600/Math.max(im.naturalWidth,im.naturalHeight)), w0=Math.round(im.naturalWidth*sc), h0=Math.round(im.naturalHeight*sc), lado=r%180!==0,
      cv=document.createElement('canvas'); cv.width=lado?h0:w0; cv.height=lado?w0:h0; var c=cv.getContext('2d'); c.translate(cv.width/2,cv.height/2); c.rotate(r*Math.PI/180); c.drawImage(im,-w0/2,-h0/2,w0,h0);
    nat={w:lado?im.naturalHeight:im.naturalWidth,h:lado?im.naturalWidth:im.naturalHeight}; box.style.backgroundImage='url("'+cv.toDataURL('image/jpeg',0.85)+'")'; draw(); }
  function load(){ var k=Array.isArray(p.foto)?p.foto[0]:p.foto, src=k&&libSrc(k); nat=null; box.style.backgroundImage='none'; if(!src){ aviso.hidden=false; aviso.textContent='Este ponto não tem foto.'; return; } aviso.hidden=false; aviso.textContent='Carregando a foto…';
    im=new Image(); im.crossOrigin='anonymous'; im.onload=function(){ try{ girada(); }catch(e){ nat={w:im.naturalWidth,h:im.naturalHeight}; box.style.backgroundImage='url("'+src+'")'; draw(); } }; im.onerror=function(){ if(im.crossOrigin){ var o=im.onload; im=new Image(); im.onload=o; im.onerror=function(){ aviso.hidden=false; aviso.textContent='Não foi possível carregar a foto.'; }; im.src=src; return; } aviso.hidden=false; aviso.textContent='Não foi possível carregar a foto.'; }; im.src=src; }
  function girar(d){ var a=aj(); a.r=(((+a.r||0)+d)%360+360)%360; if(im&&im.complete&&im.naturalWidth){ try{ girada(); }catch(e){} } dirty(); }
  var salvo=h('small',{class:'fsalvo'});
  var bSalvar=h('button',{type:'button',class:'btn pri',text:'💾 Salvar enquadramento',onclick:async function(){
    if(typeof ME!=='undefined'&&!ME.admin){ toast('Só o administrador salva o enquadramento das fotos dos pontos.',true); return; }
    bSalvar.disabled=true; bSalvar.textContent='Salvando…'; clearTimeout(saveT);
    try{ await syncOut(); salvo.textContent='✓ Salvo às '+hora()+'. Vale para o PowerPoint e o PDF.'; }catch(e){ salvo.textContent='Não foi possível salvar agora.'; }
    bSalvar.disabled=false; bSalvar.textContent='💾 Salvar enquadramento'; }});
  function sl(rot,key,min,max){ var s=h('input',{type:'range',step:1}); s.min=min; s.max=max; s.value=aj()[key]==null?(key==='z'?100:50):aj()[key]; var f=function(){ aj()[key]=+s.value; draw(); dirty(); }; s.addEventListener('input',f); s.addEventListener('change',f); return h('label',{class:'frow'},[h('span',{text:rot}),s]); }
  var inteira=h('input',{type:'checkbox'}); inteira.checked=!!(p.fotoAj&&p.fotoAj.inteira); inteira.addEventListener('change',function(){ aj().inteira=inteira.checked; draw(); dirty(); });
  var reset=h('button',{type:'button',class:'btn',text:'Restaurar',onclick:function(){ delete p.fotoAj; dirty(); var par=wr.parentNode; if(par) par.replaceChild(fotoAjuste(p),wr); }});
  var giro=h('div',{class:'fgiro'},[h('span',{text:'Girar a foto'}),h('button',{type:'button',class:'btn',title:'Girar para a esquerda',text:'↺ 90°',onclick:function(){ girar(-90); }}),h('button',{type:'button',class:'btn',title:'Girar para a direita',text:'↻ 90°',onclick:function(){ girar(90); }}),h('button',{type:'button',class:'btn',title:'Virar de cabeça para baixo',text:'180°',onclick:function(){ girar(180); }})]);
  w.appendChild(box); w.appendChild(h('div',{class:'fctl'},[giro,sl('← Esquerda · Direita →','x',0,100),sl('↑ Cima · Baixo ↓','y',0,100),sl('Zoom','z',100,300),h('label',{class:'chk'},[inteira,h('span',{text:'Mostrar a foto inteira (sem cortar)'})]),h('div',{class:'fbts'},[bSalvar,reset]),salvo]));
  load(); document.addEventListener('fotochg',function f(){ if(box.isConnected){ box.__c=1; load(); } else if(box.__c){ document.removeEventListener('fotochg',f); } });
  var wr=h('div',{class:'f wide'},[h('span',{text:'Enquadramento da foto no kit'}),w,h('small',{text:'Mexa nos controles até o painel aparecer inteiro. Vale para a ficha deste ponto no PowerPoint e no PDF.'})]); return wr; }
function photosField(label,obj,path){
  var wrap=h('div',{class:'photos'}), fi=h('input',{type:'file',accept:'image/*',multiple:'multiple'}); 
  function draw(){ wrap.innerHTML=''; var arr=getp(obj,path); if(!Array.isArray(arr)){ arr=arr?[arr]:[]; }
    arr.forEach(function(k,ix){ wrap.appendChild(h('span',{class:'thumb'},[h('img',{src:libSrc(k)}),h('b',{text:'×',title:'remover',onclick:function(){ askPin('Remover foto','A foto será retirada deste ponto.').then(function(ok){ if(!ok) return; arr.splice(ix,1); setp(obj,path,Array.isArray(getp(obj,path))?arr:(arr[0]||null)); draw(); dirty(); }); }})])); }); }
  fi.addEventListener('change',async function(){ var arr=getp(obj,path); var multi=Array.isArray(arr); arr=multi?arr:(arr?[arr]:[]); try{ for(var f of fi.files){ var k=await addPhoto(f,obj); arr.push(k); } }catch(e){ toast(e.message||String(e),true); } if(!multi) arr=arr.slice(-1); setp(obj,path,multi?arr:(arr[0]||null)); fi.value=''; draw(); dirty(); });
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
  if(!D.specPad) D.specPad=JSON.parse(JSON.stringify(DEF().specPad||{}));
  v.appendChild(h('h3',{text:'Especificações do arquivo (planilha do mídia kit)'})); v.appendChild(h('p',{class:'hint',text:'Padrão de cada formato de LED. Saem só na planilha de especificações do kit. Para um ponto diferente, preencha no próprio ponto (aba Pontos).'}));
  var g4=h('div',{class:'grid'});
  [['led','Painéis de LED'],['banca','Bancas de LED'],['df','LED Brasília']].forEach(function(f){ D.specPad[f[0]]=D.specPad[f[0]]||{}; [['peso','peso máximo'],['arquivo','formato do arquivo'],['dur','secundagem']].concat(f[0]==='df'?[['conteudo','conteúdo permitido']]:[]).forEach(function(c){ g4.appendChild(schemaField(D.specPad[f[0]],[c[0],'text',f[1]+' · '+c[1]])); }); });
  v.appendChild(g4);
  var sel=h('select',{},[['claro','Claro limpo · endereço em destaque (padrão)'],['neon','Mapa Mega · azul suave'],['neon_b','Mapa Mega · lavanda'],['neon_c','Mapa Mega · azul médio'],['neon_d','Mapa Mega · lilás claro'],['mega','Branco Mega · ruas visíveis'],['esri_street','Ruas coloridas (Esri)'],['esri_gray','Cinza claro (Esri)'],['osm','OpenStreetMap']].map(function(o){ var op=h('option',{value:o[0],text:o[1]}); if(mapSt(D.mapStyle)===o[0]) op.selected=true; return op; })); sel.addEventListener('change',function(){ D.mapStyle=sel.value; dirty(); });
  
  v.appendChild(h('h3',{text:'Textos das capas (separadores de praça e formato)'})); v.appendChild(h('p',{class:'hint',text:'Cada capa mostra um texto sobre a praça ou o formato, 3 números e 3 destaques. Use "auto" no número para contar os pontos cadastrados.'}));
  SEQ.map(function(i){return SEPS[i-1]}).forEach(function(sp){ var info=sepInfo(D,sp.i), det=h('details',{class:'pt'}), sm=h('summary',{},[h('span',{class:'t',text:NP(sp.i)+' · '+sp.title.replace('\n',' ')})]); det.appendChild(sm); var gg=h('div',{class:'grid',style:'padding:12px 16px'}); gg.appendChild(schemaField(info,['texto','area','Texto'])); gg.appendChild(schemaField(info,['stats','pairs','3 números: valor | rótulo',3])); gg.appendChild(schemaField(info,['bullets','rows','3 destaques (um por linha)',3])); det.appendChild(gg); v.appendChild(det); });
}
var MERC=[['circuito','text','Nome do circuito (ex.: Circuito de 8 telas de LED)'],['lat','num','Latitude do Mercado'],['lng','num','Longitude do Mercado'],['fotos','fotos','Fotos do Mercado (a 1ª aparece na página de abertura e no separador)'],['texto','area','Texto de abertura'],['tiles','pairs','6 indicadores — um por linha: valor | rótulo',6],['pill1','text','Selo 1'],['pill2','text','Selo 2'],['destaque','pair','Destaque: título | texto'],
 ['demo.tiles','pairs','Perfil demográfico · 4 indicadores: valor | rótulo',4],['demo.faixaCats','strs','Faixa etária · categorias (separe por vírgula)'],['demo.faixa','nums','Faixa etária · valores (%)'],['demo.genero','nums','Gênero · Feminino, Masculino (%)'],['demo.classes','nums','Classe social A–E (%)'],['demo.renda','nums','Renda média por classe A–E (R$, decimais com ponto)'],['demo.intCats','strs','Top 5 interesses · nomes'],['demo.intVals','nums','Top 5 interesses · quantidades'],
 ['specs','rows','Especificações: Ponto | Qtd. | Tamanho | Formato (px)',5],['dims','strs','Medidas do desenho (largura, altura)'],['caption','text','Legenda do desenho'],['chips','pairs','Faixa de 4 itens: valor | rótulo',4]];
var GUAN=[['circuito','text','Nome do circuito'],['lat','num','Latitude do parque (confira!)'],['lng','num','Longitude do parque (confira!)'],['endereco','text','Endereço'],['fotoParque','fotos','Foto do parque para a abertura (opcional; sem foto usa a ilustração)'],['fotos','fotos','Outras fotos do parque (reserva)'],['texto','area','Texto de abertura'],['tiles','pairs','3 indicadores: valor | rótulo',3],['quem','strs','Quem visita (separe por vírgula)'],['porque','text','Por que anunciar'],
 ['demo.faixaCats','strs','Faixa etária · categorias'],['demo.faixa','nums','Faixa etária · valores (%)'],['demo.classes','nums','Classe social A–E (%)'],['demo.genero','nums','Gênero · Mulheres, Homens (%)'],['demo.audiencia','pairs','Audiência: rótulo | valor',3],['specs','rows','Especificações: Ponto | Tamanho | Formato (px)',4],['caption','text','Legenda do desenho'],['chips','pairs','Faixa de 4 itens: valor | rótulo',4]];
var BRAS=[['tiles','pairs','6 indicadores do Metrô-DF: valor | rótulo',6],['genero','nums','Gênero · Feminino, Masculino (%)'],['generoNota','text','Nota do gráfico de gênero'],['fonte','text','Fonte da pesquisa'],['texto','area','Texto sobre o público do metrô'],['formatos','pairs','Formatos de mídia no metrô (5): nome | descrição',6],['dims','strs','Medidas do painel de LED (largura, altura)'],['veic','text','Inserções por dia (painéis)'],['caption','text','Legenda do desenho'],['painelChips','pairs','Faixa de 4 itens: valor | rótulo',4]];
function viewSchema(v,key,schema){ v.appendChild(h('h2',{text:key==='mercado'?'Mercado Central':(key==='guanabara'?'Parque Guanabara':'Brasília · Metrô-DF e painéis')})); v.appendChild(h('p',{class:'hint',text:'Já vem preenchido com os dados do mídia kit atual. Altere o que mudou.'})); var g=h('div',{class:'grid'}); schema.forEach(function(s){ g.appendChild(schemaField(D[key],s)); }); v.appendChild(g); }

/* ---------- pontos ---------- */
var filtro='', busca='', filtroDono='', filtroQ=false, filtroProg=false;
/* programática: marcação e filtro são só do admin */
function progBadge(p){ return p&&p.prog?h('em',{class:'prog',text:'⚡ Programática',title:'Plugado na programática'}):null; }
function progFiltro(onchg){ if(!ME.admin) return null; var c=h('input',{type:'checkbox'}); c.checked=filtroProg; c.addEventListener('change',function(){ filtroProg=c.checked; onchg(); }); return h('label',{class:'btn progf'+(filtroProg?' on':''),title:'Mostrar só os pontos plugados na programática'},[c,document.createTextNode(' ⚡ Só programáticos')]); }
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
/* Formato do ponto: uma única opção por formato (MEGA/R2/Terceiros é a "Propriedade do ponto") */
var FMT_NOME={led_mega:'Painéis de LED',banca_mega:'Bancas de LED',guanabara:'Circuito Parque Guanabara'};
function fmtK(k){ return k==='led_r2'?'led_mega':k==='banca_r2'?'banca_mega':k; }
function fmtOpcoes(){ return GRUPOS.filter(function(g){ return g.k!=='led_r2'&&g.k!=='banca_r2'&&(g.k!=='rj'||ME.admin); }).map(function(g){ return {k:g.k,nome:FMT_NOME[g.k]||g.nome}; }); }
function tipoSelect(p,after){ var s=h('select',{},[h('option',{value:'',text:'Automático (pelo grupo)'})].concat(TIPOS_KIT.map(function(t){return h('option',{value:t,text:t});}))); if(p.tipoTxt&&TIPOS_KIT.indexOf(p.tipoTxt)<0) s.appendChild(h('option',{value:p.tipoTxt,text:p.tipoTxt})); s.value=p.tipoTxt||''; s.addEventListener('change',function(){ if(s.value) p.tipoTxt=s.value; else delete p.tipoTxt; if(after) after(); }); return s; }
function grupoSelect(p,after){ var cur=fmtK(grupoDe(p).k); var s=h('select',{},fmtOpcoes().map(function(g){ var o=h('option',{value:g.k,text:g.nome}); if(g.k===cur) o.selected=true; return o; })); s.addEventListener('change',function(){ var k=s.value; if(donoDe(p)==='mega_r2'){ if(k==='led_mega') k='led_r2'; else if(k==='banca_mega') k='banca_r2'; } aplicaGrupo(p,k); if(after) after(); }); return s; }
function matchP(p){ if(filtroProg&&ME.admin&&!p.prog) return false; if(filtro&&fmtK(grupoDe(p).k)!==filtro) return false; if(filtroQ&&!fotoAtencao(p)) return false; if(filtroDono&&donoDe(p)!==filtroDono) return false; if(!busca) return true; var t=[p.endereco,p.bairro,p.cidade,secLabel(p.secao)].join(' ').toLowerCase(); return busca.toLowerCase().split(/\s+/).every(function(w){ return t.indexOf(w)>=0; }); }
function secLabel(k){ return SEC[k]?SEC[k].nome+(SEC[k].praca?' · '+SEC[k].praca:''):k; }
function novoPontoPanel(){
  var np={secao:(grupoPorK(filtro||'')||GRUPOS[1]).sec[0],dono:(grupoPorK(filtro||'')||{}).r2?'mega_r2':'padrao',endereco:'',bairro:'',cidade:'Belo Horizonte',lat:null,lng:null,zoom:16,tamanho:'',pixels:'',veic:'',publico:'',fluxo:'',impacto:'',sentido:'',foto:null};
  var d=h('details',{class:'pt novo',id:'novoponto'}); d.open=true; d.appendChild(h('summary',{},[h('span',{class:'t',text:'➕ Adicionar novo ponto'})]));
  var g=h('div',{class:'grid'}), msg=h('p',{class:'status'});
  var sel=grupoSelect(np); sel.addEventListener('change',function(){ if(np.secao==='metro'||np.secao==='df_painel'){ np.cidade='Brasília-DF'; cid.value=np.cidade; } });
  g.appendChild(field('Formato do ponto',sel,'Painel de LED, banca de LED, empena, frontlight, painel mensal, banca estática, Metrô-DF…')); g.appendChild(donoField(np));
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
  var bar=h('div',{class:'bar'}), fsel=h('select',{},[h('option',{value:'',text:'Todas as seções'})].concat(fmtOpcoes().map(function(g){ var o=h('option',{value:g.k,text:g.nome}); if(filtro===g.k) o.selected=true; return o; })));
  fsel.addEventListener('change',function(){ filtro=fsel.value; showTab('pontos'); });
  bar.appendChild(fsel); bar.appendChild(filtroDonoSel(function(){ showTab('pontos'); })); var pf2=progFiltro(function(){ showTab('pontos'); }); if(pf2) bar.appendChild(pf2);
  fqScan(function(){ contFotos(); });
  var bs=h('input',{type:'search',placeholder:'🔍 Buscar endereço ou bairro',class:'busca'}); bs.value=busca; bs.addEventListener('input',function(){ busca=bs.value; if(window.drawList) window.drawList(); }); bar.appendChild(bs);
  function setSel(v){ D.pontos.forEach(function(p){ if(!filtro||fmtK(grupoDe(p).k)===filtro) p.sel=v; }); dirty(); showTab('pontos'); }
  bar.appendChild(h('button',{class:'btn',text:'✓ Marcar todos'+(filtro?' desta seção':''),onclick:function(){ setSel(true); }}));
  bar.appendChild(h('button',{class:'btn',text:'Limpar marcação',onclick:function(){ setSel(false); }}));
  bar.appendChild(h('button',{class:'btn pri',text:'+ Novo ponto',onclick:function(){ var f=$('#novoponto'); f.open=true; f.scrollIntoView({behavior:'smooth',block:'start'}); setTimeout(function(){ var i=f.querySelector('input[type=text]'); if(i) i.focus(); },300); }}));
  bar.appendChild(h('button',{class:'btn',text:'Importar planilha (colar)',onclick:function(){ $('#imp').classList.toggle('show'); }}));
  var fl=h('input',{type:'file',accept:'image/*',multiple:'multiple'}); fl.addEventListener('change',async function(){ var n=0; try{ for(var f of fl.files){ var kk=await addPhoto(f); D.libMap=D.libMap||{}; D.libMap[f.name]=kk; n++; } }catch(e){ toast(e.message||String(e),true); } dirty(); $('#fotomsg').textContent=n+' foto(s) adicionadas à biblioteca. Use o nome do arquivo na planilha ou escolha em cada ponto.'; showTab('pontos'); });
  bar.appendChild(h('label',{class:'btn'},['Fotos em lote',fl]));
  if(ME.admin&&typeof RJ_PONTOS!=='undefined'&&(filtro==='rj'||curTab==='rio'||!ptsOf(D,'rj').length)){ var nf=rjFaltam().length, nl=rjSemLL().length;
    if(nf) bar.appendChild(h('button',{class:'btn pri',type:'button',text:'📍 Importar '+(nf===RJ_PONTOS.length?'os '+nf+' pontos':nf+(nf===1?' ponto que falta':' pontos que faltam'))+' do Rio de Janeiro',onclick:function(){ importarRJ(this); }}));
    if(nl) bar.appendChild(h('button',{class:'btn pri',type:'button',text:'🧭 Buscar coordenadas que faltam ('+nl+')',onclick:function(){ coordRJ(this); }})); }
  v.appendChild(bar); v.appendChild(h('p',{id:'fotomsg',class:'hint'}));
  var cnt=fmtOpcoes().map(function(g){ var n=ptsOf(D,g.k).length+(g.k==='led_mega'?ptsOf(D,'led_r2').length:g.k==='banca_mega'?ptsOf(D,'banca_r2').length:0); return n?g.nome+': '+n:null; }).filter(Boolean).join('  ·  ')||'Nenhum ponto cadastrado ainda.'; v.appendChild(h('p',{class:'hint',text:'Total: '+D.pontos.length+' pontos · '+D.pontos.filter(function(p){return p.sel}).length+' marcados para a proposta   —   '+cnt}));
  var vis=function(){ return D.pontos.filter(function(p){ return !p.tmp&&matchP(p); }); };
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
  function drawList(){ list.innerHTML=''; var n=0; D.pontos.forEach(function(p,ix){ if(p.tmp||!matchP(p)) return; n++; list.appendChild(pointCard(p,ix)); }); if(!n) list.appendChild(h('p',{class:'hint',text:'Nenhum ponto encontrado.'})); if(window.refMaster) window.refMaster(); }
  drawList(); v.appendChild(list); window.drawList=drawList;
}
function normSec(s){ s=String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); if(/rm|metropol/.test(s)&&/led|painel/.test(s)) return 'led_rm'; if(/banca/.test(s)&&/(revista|estatic)/.test(s)) return 'revista'; if(/revista/.test(s)) return 'revista'; if(/banca/.test(s)) return 'banca_led'; if(/empena/.test(s)) return 'empena'; if(/front/.test(s)) return 'front'; if(/outdoor/.test(s)) return 'outdoor'; if(/mensal|mega/.test(s)) return 'mensal'; return 'led_bh'; }
function importText(t){ var n=0; t.split(/\r?\n/).forEach(function(line){ if(!line.trim()) return; var c=line.indexOf('\t')>=0?line.split('\t'):line.split(';'); c=c.map(function(x){return x.trim()}); if(/^se[cç][aã]o$/i.test(c[0])) return; var ll=parseMapsText(c[4]||'');
  D.pontos.push({id:newId(),sel:true,secao:normSec(c[0]),endereco:c[1]||'',bairro:c[2]||'',cidade:c[3]||'',lat:ll?ll.lat:null,lng:ll?ll.lng:null,zoom:16,tamanho:c[5]||'',pixels:c[6]||'',veic:c[7]||'',publico:c[8]||'',fluxo:c[9]||'',impacto:c[10]||'',sentido:c[11]||'',foto:(c[12]&&libSrc(c[12]))?(D.libMap&&D.libMap[c[12]]||c[12]):null}); n++; }); return n; }
function pointCard(p,ix){
  var d=h('details',{class:'pt'}), sm=h('summary'), title=h('span',{class:'t'}), badge=h('em',{text:SEC[p.secao]?SEC[p.secao].nome:''});
  function upd(){ title.textContent=(p.endereco||'(sem endereço)')+(p.bairro?' · '+p.bairro:''); badge.textContent=grupoDe(p).nome+(donoDe(p)!=='padrao'?' · '+donoNome(donoDe(p)):'')+(ME.admin&&p.prog?' · ⚡ programática':''); st.textContent=(p.lat!=null&&p.lat!==''&&!isNaN(p.lat))?(p.llAprox?'📍 posição aproximada':'📍 mapa ok'):'sem coordenadas'; st.className='st '+((p.lat!=null&&!isNaN(p.lat))?'ok':'no'); }
  var st=h('span',{class:'st'}); var ck=h('input',{type:'checkbox',title:'Incluir na proposta'}); ck.checked=!!p.sel; ck.addEventListener('click',function(e){ e.stopPropagation(); }); ck.addEventListener('change',function(){ if(CIRCUITOS.indexOf(p.secao)>=0){ setCircuito(D,p.secao,ck.checked); dirty(); var y=window.scrollY; showTab('pontos'); window.scrollTo(0,y); return; } p.sel=ck.checked; dirty(); if(window.refMaster) window.refMaster(); }); var cl=h('label',{class:'ck',title:'Incluir na proposta'},[ck,h('span',{text:'proposta'})]); cl.addEventListener('click',function(e){ e.stopPropagation(); }); sm.appendChild(cl); sm.appendChild(badge); sm.appendChild(title); sm.appendChild(st);
  sm.appendChild(h('button',{class:'mini',text:'duplicar',onclick:function(e){ e.preventDefault(); var c=JSON.parse(JSON.stringify(p)); c.id=newId(); D.pontos.splice(D.pontos.indexOf(p)+1,0,c); dirty(); showTab(p.tmp?'pers':'pontos'); }}));
  sm.appendChild(qBadge(p)); sm.appendChild(h('button',{class:'mini del',text:'excluir',onclick:function(e){ e.preventDefault(); (p.tmp?Promise.resolve(confirm('Tirar este ponto personalizado da proposta?')):askPin('Excluir ponto',(p.endereco||'(sem endereço)')+' · '+secLabel(p.secao))).then(function(ok){ if(!ok) return; var k=D.pontos.indexOf(p); if(k>=0) D.pontos.splice(k,1); dirty(); showTab(p.tmp?'pers':'pontos'); }); }}));
  var fk=Array.isArray(p.foto)?p.foto[0]:p.foto; if(fk&&libSrc(fk)) sm.insertBefore(h('img',{class:'sth',src:libSrc(fk)}),sm.firstChild);
  d.appendChild(sm);
  var g=h('div',{class:'grid'});
  var sel=grupoSelect(p,function(){ upd(); dirty(); }); g.appendChild(field('Formato do ponto',sel)); g.appendChild(donoField(p,function(){ sel.value=fmtK(grupoDe(p).k); upd(); }));
  if(ME.admin){ var pg=h('input',{type:'checkbox'}); pg.checked=!!p.prog; pg.addEventListener('change',function(){ p.prog=pg.checked; upd(); dirty(); });
    g.appendChild(field('Programática',h('label',{class:'chk progchk'},[pg,h('span',{text:' ⚡ Plugado na programática'})]),'Só o admin vê. Serve para filtrar os pontos nas propostas programáticas (CPM).'));
    g.appendChild(field('CPM base (R$)',inp(p,'cpm',{num:true,onchange:upd}),'Opcional. Usado na proposta por CPM quando você escolhe "CPM de cada ponto".')); }
  function I(path,label,o){ o=o||{}; o.onchange=upd; return field(label,inp(p,path,o),o.hint); }
  g.appendChild(I('endereco','Endereço (título da ficha)')); g.appendChild(I('bairro','Bairro')); g.appendChild(I('cidade','Cidade'));
  var lk=h('input',{type:'text',placeholder:'Cole o link completo do Google Maps ou "lat, long"'}); var lat=inp(p,'lat',{num:true,onchange:upd}), lng=inp(p,'lng',{num:true,onchange:upd});
  lk.addEventListener('input',function(){ var r=parseMapsText(lk.value); if(r){ delete p.llAprox; p.lat=r.lat; p.lng=r.lng; lat.value=r.lat; lng.value=r.lng; upd(); dirty(); pm.update(); lk.style.borderColor='#2a9d6f'; } else lk.style.borderColor=''; });
  g.appendChild(field('Link do Google Maps (preenche lat/long)',lk,'Link curto (maps.app.goo.gl) não funciona: abra e copie o endereço completo da barra.','wide'));
  if(p.tmp&&typeof tmpBuscaBtn==='function') g.appendChild(tmpBuscaBtn(p,function(r){ lat.value=r.lat; lng.value=r.lng; upd(); pm.update(); }));
  g.appendChild(field('Latitude',lat)); g.appendChild(field('Longitude',lng)); g.appendChild(I('zoom','Zoom do mapa (13–19)',{num:true})); var pm=mapaPreview(p); g.appendChild(pm.el); g.addEventListener('input',pm.update);
  g.appendChild(I('tamanho','Tamanho (ex.: 9,00 x 3,00 m)')); g.appendChild(I('pixels','Formato em pixels (ex.: 2308 x 577)'));
  if(['led_bh','led_rm','banca_led','df_painel'].indexOf(p.secao)>=0){ /* só para o mídia kit (planilha de especificações); não aparece no operacional */
    [['peso','Peso máximo do arquivo (ex.: 25 MB)'],['arquivo','Formato do arquivo (ex.: MP4)'],['dur','Secundagem (ex.: 10")']].concat(p.secao==='df_painel'?[['conteudo','Conteúdo permitido (ex.: Somente vídeo estático)']]:[]).forEach(function(f){ var x=inp(p,f[0],{onchange:upd}), pd=(D.specPad&&D.specPad[specFam(p)]||{})[f[0]]; if(pd) x.placeholder='Padrão: '+pd; g.appendChild(field(f[1],x,'Só no mídia kit (especificações). Vazio = padrão do formato.')); }); }
  g.appendChild(I('veic','Veiculações/dia (bancas)')); g.appendChild(I('publico','Público (ex.: A, B, C e D)')); g.appendChild(I('fluxo','Fluxo de carros/dia')); g.appendChild(I('impacto','Impacto semanal')); g.appendChild(I('sentido','Sentido (ex.: Centro / Bairro)')); g.appendChild(I('preco','Valor de tabela deste endereço (R$)',{num:true,hint:'Usado nas propostas de empenas, frontlight, mega painéis, bancas estáticas e Metrô-DF.'}));
  g.appendChild(photosField('Foto do ponto',p,'foto')); g.appendChild(fotoAjuste(p)); g.appendChild(photosField('Imagem do mapa (opcional; envie um print do mapa do ponto)',p,'mapa')); d.appendChild(g); upd(); return d;
}

/* ---------- preços ---------- */
function viewPrecos(v,embed){ migPrecos(D); var EDITA=baseEditavel(), soEnd=function(r){ return ehEstatico(r)&&!embed&&EDITA; };
  if(!document.getElementById('ptab-fit')){ var stl=document.createElement('style'); stl.id='ptab-fit'; stl.textContent='.ptab{width:100%;table-layout:fixed;border-collapse:collapse}.ptab th,.ptab td{padding:6px 4px;font-size:12.5px;vertical-align:middle;overflow-wrap:anywhere}.ptab input,.ptab select{width:100%!important;min-width:0!important;box-sizing:border-box;padding:6px 7px;font-size:12.5px}.ptab th:nth-child(1){width:23%}.ptab th:nth-child(2){width:6%}.ptab th:nth-child(3){width:9%}.ptab th:nth-child(4){width:9%}.ptab th:nth-child(5){width:8%}.ptab th:nth-child(6){width:14%}.ptab th:nth-child(7){width:8%}.ptab th:nth-child(8){width:14%}.ptab th:nth-child(9),.ptab th:nth-child(10){width:4%}'+'.ptab thead th{font-size:11px;text-transform:uppercase;letter-spacing:.03em;text-align:left;font-weight:600;opacity:.7;padding-bottom:8px;overflow-wrap:normal;word-break:normal}.ptab tbody tr.gh td{padding:10px 6px}.ptab tr.endl td{border-top:1px solid rgba(0,0,102,.07)}.ptab tr.endl.sub td{background:rgba(0,0,102,.02)}.ptab .calc{text-align:left}.ptab td:nth-child(n+6){text-align:right}.ptab td input{text-align:right}.ptab td:first-child input{text-align:left}.tw{overflow-x:auto}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px 16px;align-items:end;margin-bottom:14px}.grid select,.grid input{width:100%;box-sizing:border-box}@media(min-width:701px){.ptab.prop{border-collapse:separate;border-spacing:0 2px}.ptab.prop tbody tr{background:#fff}.ptab.prop tr.gh td{background:linear-gradient(180deg,#f7f6fd,#f0eff9);border-top:1px solid rgba(0,0,102,.1)}.ptab.prop tr.gh td:first-child{border-radius:10px 0 0 0}.ptab.prop tr.endl td{background:#fff}.ptab.prop tr.endl.sub td{background:#faf9fe}.ptab.prop tr.abaixo td{background:#fff7f3!important}.ptab.prop tr.abaixo td:first-child{box-shadow:inset 3px 0 0 #ff5a8a}.ptab.prop tr.vazio{display:none!important}.ptab.prop td .negin,.ptab.prop td.val input{font-weight:700;color:#000066;border:1.5px solid rgba(0,0,102,.25);border-radius:9px;background:#fbfbff}.ptab.prop td .negin:focus,.ptab.prop td.val input:focus{border-color:#ff2d7e;outline:none}.minwarn{display:inline-block;margin-top:4px;font-size:11px;font-weight:600;color:#c01858;background:#ffe4ee;border-radius:6px;padding:2px 8px}.pleg{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px;font-size:13px}.pleg .pc{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid rgba(0,0,102,.12);border-radius:999px;padding:5px 12px}.pleg .pc b{color:#000066}.pleg .op{opacity:.5;font-weight:700}'; document.head.appendChild(stl); }
  if(!embed){ var h2=h('h2',{text:'Tabela de preços e investimento '}); var vb=h('small',{text:'· versão 20261110l'}); vb.style.cssText='font-size:11px;font-weight:500;opacity:.55;'; h2.appendChild(vb); v.appendChild(h2); }
  if(embed){
    var leg=h('div',{class:'pleg'}); leg.appendChild(h('span',{class:'pc'},[h('b',{text:'Tabela'}),h('span',{text:'unitário'})])); leg.appendChild(h('span',{class:'op',text:'−'})); leg.appendChild(h('span',{class:'pc'},[h('b',{text:'Desc. %'})])); leg.appendChild(h('span',{class:'op',text:'='})); leg.appendChild(h('span',{class:'pc'},[h('b',{text:'Negociado'}),h('span',{text:'× quantidade'})]));
    v.appendChild(h('p',{class:'hint',text:'Digite a tabela (ou direto o negociado) e o desconto sai sozinho. Em vermelho: abaixo do mínimo definido pelo admin — permitido, mas será confirmado antes de gerar. Nada aqui altera a base.'}));
    v.appendChild(leg);
  } else {
  v.appendChild(h('p',{class:'hint dica-longa',text:'Preencha o valor de tabela UNITÁRIO (por painel, tela ou banca) e o desconto: o valor negociado começa igual ao de tabela e o desconto o reduz; se você escolher mais de um ponto do formato (ou digitar a quantidade em Pontos), o valor é somado (unitário × quantidade). Circuitos (Mercado Central e Parque Guanabara) têm um preço só para o circuito. O valor negociado e a página de Investimento Total são calculados sozinhos. Estáticos (empenas, frontlight, mega painéis, outdoor, bancas estáticas, Metrô-DF) têm o preço de cada endereço logo abaixo da linha; outdoor é por bi-semana e os demais formatos são mensais. O valor é bruto ou líquido para todas as linhas (campo acima). Pontos vêm da contagem dos pontos cadastrados (Mercado Central e Parque Guanabara usam o número de telas). Inserções: é sempre o MÍNIMO por tela/dia (ex.: Mercado Central 220 × 8 telas; Parque Guanabara 250 × 10 telas) e o total é calculado (telas × mínimo).'}));
  }
  var top=h('div',{class:'grid'}), ms=h('select',{},[['bruto','Bruto'],['liquido','Líquido (desconta comissão da agência e BV)']].map(function(o){ var op=h('option',{value:o[0],text:o[1]}); if(D.modoGeral===o[0]) op.selected=true; return op; })); ms.addEventListener('change',function(){ D.modoGeral=ms.value; dirty(); recalc(); });
  var PERFIS=[['direto','Cliente direto (sem comissão)',0,0],['agencia','Agência (25%)',25,0],['planejador','Agência + planejador (25% + 25%)',25,25],['outro','Personalizado',null,null]]; function perfilAtual(){ var c=num(D.comissao), b=num(D.bv), f=PERFIS.filter(function(x){ return x[2]!==null&&x[2]===c&&x[3]===b; })[0]; return f?f[0]:'outro'; } var ps=h('select',{},PERFIS.map(function(o){ return h('option',{value:o[0],text:o[1]}); })); function syncPerfil(){ ps.value=perfilAtual(); } syncPerfil(); var icom=inp(D,'comissao',{num:true,onchange:function(){ syncPerfil(); recalc(); }}), ibv=inp(D,'bv',{num:true,onchange:function(){ syncPerfil(); recalc(); }}); ps.addEventListener('change',function(){ var f=PERFIS.filter(function(x){ return x[0]===ps.value; })[0]; if(f&&f[2]!==null){ D.comissao=f[2]; D.bv=f[3]; icom.value=f[2]; ibv.value=f[3]; dirty(); recalc(); } }); top.appendChild(field('Valor padrão do kit',ms)); if(!embed){ top.appendChild(field('Perfil do cliente',ps,'Agência: comissão de 25%. Planejador: 25% de comissão + 25% de BV, um sobre o outro. Direto: sem desconto.')); top.appendChild(field('Comissão da agência (%)',icom)); top.appendChild(field('BV à parte (%)',ibv)); } if(ME.admin) top.appendChild(field('Alertar desconto acima de (%)',inp(D,'descAlerta',{num:true}))); v.appendChild(top);
  var tb=h('table',{class:'ptab'+(embed?' prop':'')}); tb.appendChild(h('thead',{},[h('tr',{},['Formato','Pontos','Período','Ins./tela/dia','Total ins./dia','Tabela unit. (R$)','Desc. (%)','Negociado (R$)','',''].map(function(t){return h('th',{text:t})}))]));
  var body=h('tbody'), trs=[], addrRefs=[]; tb.appendChild(body); var foot=h('tfoot'); tb.appendChild(foot);
  var avMin=h('div',{class:'avmin',hidden:'hidden'}); v.appendChild(avMin);
  function recalc(){ if(window.__onPreco) window.__onPreco(); var tt=0,tn=0, baixo=[]; D.precos.forEach(function(r,i){ var c=calcPreco(D,r); tt+=c.tabela; tn+=c.final; var tr0=trs[i]; if(tr0){ var mw=tr0.querySelector('.minwarn'); if(mw){ mw.hidden=!c.abaixo; mw.textContent=c.abaixo?'⚠ Abaixo do mínimo pré-definido ('+brl(c.minLiq)+' líquido)':''; } tr0.classList.toggle('abaixo',!!c.abaixo); } if(c.abaixo&&(!embed||!r.auto||r.auto.split(',').some(function(k){ return ptsOf(D,k).some(function(p){return p.sel;}); }))) baixo.push(r.nome); var cell=trs[i]&&trs[i].querySelector('.val'); if(cell){ var ni=cell.querySelector('input'); if(ni){ if(document.activeElement!==ni) ni.value=brl(c.final); } else cell.textContent=brl(c.final); } var pc=trs[i]&&trs[i].querySelector('.pts'); if(pc) pc.placeholder=String(c.pontos); var ic=trs[i]&&trs[i].querySelector('.ins'); if(ic) ic.textContent=c.insercoes; var tcl=trs[i]&&trs[i].querySelector('.tabcalc'); if(tcl) tcl.textContent=c.tabela?brl(c.tabela):'por endereço'; var dsc=trs[i]&&trs[i].querySelector('.dsc'); if(dsc) dsc.textContent=c.tabela>0?(Math.round(c.desc*100)/100+'%').replace('.',','):''; }); addrRefs.forEach(function(f){ f(); }); avMin.hidden=!baixo.length; avMin.textContent=baixo.length?'⚠ Você está alterando valores pré-definidos pelo administrador: '+baixo.join(', ')+' ficou abaixo do mínimo líquido. Isso será pedido na conferência antes de gerar a proposta.':''; foot.innerHTML=''; foot.appendChild(h('tr',{},[h('td',{text:'Total'}),h('td'),h('td'),h('td'),h('td'),h('td',{text:brl(tt)}),h('td'),h('td',{text:brl(tn)}),h('td'),h('td')])); }
function rowsEst(r,i){
    var porBi=/bi/i.test(String(r.periodo||''))||r.auto==='outdoor', per=porBi?'bi-semana':'mês';
    var lista=(!embed&&EDITA)?ptsOf(D,r.auto):selEstaticos(D,r.auto), vz=embed&&!lista.length;
    var hd=h('tr',{class:'gh'+(vz?' vazio':'')}), nt=h('td',{colspan:'5'});
    hd.style.cssText='background:rgba(0,0,102,.06);font-weight:600;';
    nt.appendChild(h('b',{text:r.nome})); nt.appendChild(h('small',{text:'   ·   preço por '+per+', por endereço'+(r.auto==='rj'?'':' · produção em valor único no fim')})); nt.appendChild(h('div',{class:'minwarn',hidden:'hidden'})); hd.appendChild(nt);
    hd.appendChild(h('td',{class:'calc tabcalc'})); hd.appendChild(h('td',{class:'calc dsc'})); hd.appendChild(h('td',{class:'calc val'}));
    if(ME.admin){ hd.appendChild(h('td',{},[h('button',{class:'mini',text:'↑',onclick:function(){ if(i>0){ D.precos.splice(i-1,0,D.precos.splice(i,1)[0]); dirty(); showTab(curTab); } }})])); hd.appendChild(h('td',{},[h('button',{class:'mini del',text:'×',onclick:function(){ askPin('Excluir linha de preço',r.nome).then(function(ok){ if(!ok) return; var k=D.precos.indexOf(r); if(k>=0) D.precos.splice(k,1); dirty(); showTab(curTab); }); }})])); } else { hd.appendChild(h('td')); hd.appendChild(h('td')); }
    var out=[hd];
    if(!lista.length){ var er=h('tr',{class:'endl'+(vz?' vazio':'')}), ec=h('td',{colspan:'10'}); ec.appendChild(h('span',{class:'hint',text:ME.admin||baseEditavel()?'Nenhum ponto cadastrado neste formato.':'Nenhum endereço escolhido neste formato.'})); er.appendChild(ec); out.push(er); }
    if(r.auto==='revista'&&lista.length){ var SL=selEstaticos(D,r.auto), n=SL.length, ref=SL.concat(lista), pl=null, pp=null; ref.forEach(function(p){ if(!pl&&pLiq(p)>0) pl=p; if(!pp&&pProd(p)>0) pp=p; });
      var ps={id:'*'}, nm='Bancas estáticas · valor UNITÁRIO por banca (todas iguais) × '+n+(n===1?' ponto':' pontos');
      out.push(linhaEst(r,ps,nm,'t','d',function(){ return pl?pLiq(pl)/fatorLiq(D):(ref[0]?vlr(ref[0].preco):0); },String(n),porBi?'Bi-semana':'Mensal',false,function(){ return n||0; }));
      out.push(linhaProd(r,ps,'↳ Produção (unitária)',function(){ return pp?pProd(pp):0; },String(n),function(){ return n||0; }));
      return out; }
    lista.forEach(function(p){
      var nome=(p.endereco||'(sem endereço)')+(p.bairro?' · '+p.bairro:'');
      out.push(linhaEst(r,p,nome,'t','d',function(){ var l=pLiq(p); return l>0?l/fatorLiq(D):vlr(p.preco); },'1',porBi?'Bi-semana':'Mensal',false));
    });
    if(lista.length&&r.auto!=='rj') out.push(linhaProd(r,{id:'#prod'},'↳ Produção (valor único) — digite o líquido',function(){ var t=0; selEstaticos(D,r.auto).forEach(function(p){ t+=pProd(p); }); return t; },'',null));
    return out; }
  function linhaProd(r,p,rot,base,qtd,mult){ mult=mult||function(){return 1;};
    var tr=h('tr',{class:'endl sub'}), c0=h('td'), sp=h('span',{text:rot}); sp.style.cssText='padding-left:18px;opacity:.85;'; c0.appendChild(sp); tr.appendChild(c0);
    [qtd,'Produção'].forEach(function(t){ tr.appendChild(h('td',{class:'calc',text:t})); });
    var E=function(){ r.end=r.end||{}; return (r.end[p.id]=r.end[p.id]||{}); }, G=function(k){ return (r.end&&r.end[p.id]&&r.end[p.id][k])||''; };
    var se=h('select',{title:'Escolha o perfil do cliente: o acréscimo é aplicado sobre o valor líquido'},[['','Conforme perfil do cliente'],['liq','Líquido (sem acréscimo)'],['ag','Agência +25%'],['pl','Planejador +25% +25%']].map(function(o){ return h('option',{value:o[0],text:o[1]}); })); se.value=G('pq');
    var c3=h('td',{colspan:'2'}); c3.appendChild(se); tr.appendChild(c3);
    var li=h('input',{type:'text',title:'Valor LÍQUIDO da produção (a porcentagem do perfil é aplicada sobre ele)'}); li.inputMode='decimal'; li.value=G('pl');
    var t6=h('td'); t6.appendChild(li); tr.appendChild(t6);
    var t7=h('td',{class:'calc',text:'líquido'}); t7.style.cssText='font-size:11px;opacity:.6;text-align:left!important;'; tr.appendChild(t7);
    var vt=h('td',{class:'calc'}); vt.style.cssText='font-weight:700;text-align:right;'; tr.appendChild(vt);
    function pinta(){ var fm=D.modoGeral==='liquido'?fatorLiq(D):1, b=base(); li.placeholder=b>0?String(b).replace('.',','):'R$ 0,00'; vt.textContent=(b>0||num(G('pl'))>0)?brl(prodDe(D,{pq:G('pq'),pl:G('pl')},b)*mult()*(fm>0?fm:1)):'sem produção'; }
    se.addEventListener('change',function(){ E().pq=se.value; dirty(); pinta(); recalc(); });
    li.addEventListener('input',function(){ E().pl=li.value; dirty(); pinta(); recalc(); });
    tr.appendChild(h('td')); addrRefs.push(pinta); pinta(); return tr; }
  function linhaEst(r,p,rot,kt,kd,padrao,qtd,per,sub,mult){ mult=mult||function(){return 1;};
    var tr=h('tr',{class:'endl'+(sub?' sub':'')}), c0=h('td'), sp=h('span',{text:rot}); if(sub) sp.style.cssText='padding-left:18px;opacity:.85;'; c0.appendChild(sp); tr.appendChild(c0);
    [qtd,per,'—','—'].forEach(function(t){ tr.appendChild(h('td',{class:'calc',text:t})); });
    var E=function(){ r.end=r.end||{}; return (r.end[p.id]=r.end[p.id]||{}); }, G=function(k){ return (r.end&&r.end[p.id]&&r.end[p.id][k])||''; };
    var ti=h('input',{type:'text'}), di=h('input',{type:'text'}), ni=h('input',{type:'text',title:'Digite o valor negociado e o desconto é calculado sozinho'});
    [ti,di,ni].forEach(function(x){ x.inputMode='decimal'; }); ni.style.cssText='width:100%;min-width:118px;font-weight:600;'; ti.value=G(kt); di.value=G(kd);
    var fm=function(){ var f=D.modoGeral==='liquido'?(1-num(D.comissao)/100)*(1-num(D.bv)/100):1; return f>0?f:1; };
    var tabEf=function(){ var t=num(G(kt)); return t>0?t:padrao(); };
    function pinta(){ var pd=padrao(); ti.placeholder=pd>0?pd.toFixed(2).replace('.',','):'R$ 0,00'; if(document.activeElement!==ni) ni.value=brl(tabEf()*mult()*(1-num(G(kd))/100)*fm()); }
    ti.addEventListener('input',function(){ E()[kt]=ti.value; dirty(); pinta(); recalc(); });
    di.addEventListener('input',function(){ E()[kd]=di.value; dirty(); pinta(); recalc(); });
    ni.addEventListener('change',function(){ var t=tabEf(); if(!(t>0)){ pinta(); return; } var alvo=num(String(ni.value).replace(/[^\d,.\-]/g,'')), d=(1-(alvo/fm()/mult())/t)*100; d=Math.max(0,Math.min(100,Math.round(d*10000)/10000)); E()[kd]=String(d).replace('.',','); di.value=E()[kd]; dirty(); pinta(); recalc(); });
    [ti,di,ni].forEach(function(x){ var t=h('td'); t.appendChild(x); tr.appendChild(t); }); tr.appendChild(h('td')); tr.appendChild(h('td'));
    addrRefs.push(pinta); pinta(); return tr; }
  function row(r,i){ var tr=h('tr'); if(embed&&r.auto&&!r.auto.split(',').some(function(k){ return ptsOf(D,k).some(function(p){return p.sel;}); })) tr.className='vazio'; function td(x){ var t=h('td'); t.appendChild(x); tr.appendChild(t); }
    var nt=h('td'); nt.appendChild(inp(r,'nome')); if(ehEstatico(r)){ var tp=totProdEst(D,r.auto,EDITA); if(tp>0||r.incProd){ var ck=h('input',{type:'checkbox'}); ck.checked=!!r.incProd; ck.addEventListener('change',function(){ r.incProd=ck.checked; dirty(); recalc(); }); nt.appendChild(h('label',{class:'incprod'},[ck,h('span',{text:' Produção líquida incluída ('+brl(tp)+')'})])); } nt.appendChild(h('div',{class:'minwarn',hidden:'hidden'})); } else if(r.auto) nt.appendChild(h('div',{class:'minwarn',hidden:'hidden'})); if(GRUPO_NOVOS[r.auto]) nt.appendChild(h('small',{class:'dono d-'+(r.auto.slice(-2)==='r2'?'mega_r2':'mega'),text:'interno: '+grupoPorK(r.auto).nome})); tr.appendChild(nt); var pi=inp(r,'pontos'); pi.className='pts'; if(TELAS_CIRC[r.auto]){ r.pontos=String(TELAS_CIRC[r.auto]); pi.value=r.pontos; pi.readOnly=true; pi.title='Circuito fixo de '+r.pontos+' telas'; pi.style.opacity='.7'; } td(pi); td(inp(r,'periodo')); td(inp(r,'insPor',{onchange:recalc})); var ti=h('td',{class:'calc ins'}); tr.appendChild(ti); if(ehEstatico(r)){ var tc=h('td',{class:'calc tabcalc'}); tr.appendChild(tc); } else td(inp(r,'tabela',{onchange:recalc})); var di=inp(r,'desc',{onchange:recalc}); td(di);
    var cs=h('td',{class:'calc val'}), vi=h('input',{type:'text',class:'negin',title:'Digite o valor negociado e o desconto é calculado sozinho'}); vi.inputMode='decimal'; vi.style.cssText='width:100%;min-width:118px;font-weight:600;'; cs.appendChild(vi); tr.appendChild(cs); vi.addEventListener('change',function(){ var c=calcPreco(D,r), alvo=num(String(vi.value).replace(/[^\d,.\-]/g,'')); if(!(c.tabela>0)){ recalc(); return; } var fm=D.modoGeral==='liquido'?(1-num(D.comissao)/100)*(1-num(D.bv)/100):1; if(!(fm>0)) fm=1; var d=(1-(alvo/fm)/c.tabela)*100; d=Math.max(0,Math.min(100,Math.round(d*10000)/10000)); r.desc=String(d).replace('.',','); di.value=r.desc; dirty(); recalc(); });
    if(!ME.admin){ td(h('span')); td(h('span')); return tr; }
    td(h('button',{class:'mini',text:'↑',onclick:function(){ if(i>0){ D.precos.splice(i-1,0,D.precos.splice(i,1)[0]); dirty(); showTab(curTab); } }})); td(h('button',{class:'mini del',text:'×',onclick:function(){ askPin('Excluir linha de preço',r.nome).then(function(ok){ if(!ok) return; var k=D.precos.indexOf(r); if(k>=0) D.precos.splice(k,1); dirty(); showTab(curTab); }); }})); return tr; }
  window.__recalcPrecos=recalc; var ROT=['Formato','Pontos','Período','Ins./tela/dia','Total ins./dia','Tabela unit. (R$)','Desc. (%)','Negociado (R$)']; D.precos.forEach(function(r,i){ if(r.auto==='rj'&&!ME.admin){ trs.push(null); return; } if(ehEstatico(r)){ var gr=rowsEst(r,i); trs.push(gr[0]); gr.forEach(function(t){ body.appendChild(t); }); return; } var tr=row(r,i); ROT.forEach(function(l,k){ if(tr.children[k]) tr.children[k].setAttribute('data-l',l); }); trs.push(tr); body.appendChild(tr); }); v.appendChild(h('div',{class:'tw'},[tb])); recalc();
  if(!EDITA) v.appendChild(h('button',{class:'btn',text:'Restaurar valores da tabela base',onclick:function(){ restorePrecos(); showTab(curTab); }}));
  if(ME.admin) v.appendChild(h('button',{class:'btn',text:'+ Adicionar linha',onclick:function(){ D.precos.push({nome:'Nova linha',auto:'',pontos:'',periodo:'Mensal',insercoes:'',insPor:'',v2:1,v3:1,tabela:'',desc:'',modo:'geral'}); dirty(); showTab(curTab); }}));
}

function filtroDonoSel(onchg){ var s=h('select',{},[h('option',{value:'',text:'Todas as propriedades'})].concat(DONOS.map(function(d){ var o=h('option',{value:d[0],text:d[1]}); if(filtroDono===d[0]) o.selected=true; return o; }))); s.addEventListener('change',function(){ filtroDono=s.value; onchg(); }); return s; }
function donoField(p,onchg){ var s=h('select',{},DONOS.map(function(d){ var o=h('option',{value:d[0],text:d[1]}); if(donoDe(p)===d[0]) o.selected=true; return o; })); s.addEventListener('change',function(){ p.dono=s.value; if(onchg) onchg(); dirty(); }); return field('Propriedade do ponto',s,'MEGA, MEGA/R2 (sócio), Terceiros ou Padrão.'); }

/* ---------- preço por ponto (Preços base e Preços base SP): mesma tela, valores diferentes ---------- */
function ptsFmt(k){ return k==='led_mega'?ptsOf(D,'led_mega').concat(ptsOf(D,'led_r2')):k==='banca_mega'?ptsOf(D,'banca_mega').concat(ptsOf(D,'banca_r2')):ptsOf(D,k); }
function enderecosGrupo(k,periodo,nomeLinha,sp){
  var porBi=/bi/i.test(String(periodo||''))||k==='outdoor', per=porBi?'bi-semana':'mês', temProd=ESTATICOS.indexOf(k)>=0, edita=baseEditavel(), fL=sp?'liqsp':'liq', fP=sp?'prodsp':'prod';
  var g=h('div',{class:'endgrp'}); g.style.cssText='width:100%;max-width:900px;box-sizing:border-box;margin:12px 0;padding:14px 16px;background:#fff;border:1px solid rgba(0,0,102,.12);border-radius:12px;overflow-x:auto;';
  var lista=edita?ptsFmt(k):selEstaticos(D,k);
  var t=h('h4',{text:(nomeLinha||'')+(edita?'':' · '+lista.length+' escolhido'+(lista.length===1?'':'s'))}); t.style.cssText='margin:0 0 10px;'; g.appendChild(t);
  if(!lista.length){ g.appendChild(h('p',{class:'hint',text:edita?'Nenhum ponto cadastrado neste formato.':'Nenhum endereço escolhido neste formato.'})); return g; }
  var srvDe=function(p,c){ try{ var o=(typeof lastPt!=='undefined'&&lastPt[p.id])?JSON.parse(lastPt[p.id]):{}; return o[c]; }catch(e){ return undefined; } };
  /* aviso de que um valor pré-definido está sendo alterado + comparação SP x padrão */
  var avisos=function(box,campo,rot,ant,agora,padrao){ var m=[]; var a=vlr(ant), n=vlr(agora);
    if(a>0&&Math.abs(a-n)>0.004) m.push('⚠ Você está alterando um valor pré-definido ('+rot+': era '+brl(a)+', agora '+(n>0?brl(n):'vazio')+'). As propostas novas passam a usar o novo valor.');
    if(sp&&n>0&&padrao>0&&n<=padrao) m.push('⚠ O valor SP deve ser maior que o da base padrão ('+brl(padrao)+').');
    box.hidden=!m.length; box.textContent=m.join(' '); };
  var mkAviso=function(){ var a=h('div',{class:'prewarn',hidden:'hidden'}); return a; };
  var circ=CIRCUITOS.indexOf(k)>=0, nT=TELAS_CIRC[k];
  if((k==='revista'||circ)&&edita){
    /* Bancas estáticas: um valor único por banca. Circuitos: um valor único do circuito inteiro (fixo: Mercado 8 telas, Guanabara 10) */
    var unit=function(c){ if(circ){ var sm=0; lista.forEach(function(p){ sm+=vlr(p[c]); }); return sm>0?Math.round(sm*100)/100:null; } var r=null; lista.forEach(function(p){ if(r===null&&vlr(p[c])>0) r=vlr(p[c]); }); return r; };
    var difere=function(c){ if(circ) return false; var u=unit(c)||0; return lista.some(function(p){ return Math.abs(vlr(p[c])-u)>0.004; }); };
    var box=h('div'); box.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;align-items:start;';
    (circ?[[fL,'Mínimo líquido / '+per+' — circuito completo ('+nT+' telas)',fL==='liqsp'?'liq':null]]:[[fL,'Mínimo líquido / '+per+' (por banca)',fL==='liqsp'?'liq':null],[fP,'Produção líquida (por banca)',fP==='prodsp'?'prod':null]]).forEach(function(x){
      var c=x[0], bc=x[2], w=h('div'), lb=h('div',{text:x[1]}); lb.style.cssText='font-size:11px;text-transform:uppercase;letter-spacing:.04em;opacity:.65;font-weight:600;margin-bottom:5px;';
      var i=h('input',{type:'text'}); i.inputMode='decimal'; i.placeholder='R$ 0,00'; i.style.cssText='width:100%;box-sizing:border-box;text-align:right;'; var u=unit(c); i.value=u?String(u).replace('.',','):'';
      var av=mkAviso(), ant=null; lista.forEach(function(p){ if(ant===null&&vlr(srvDe(p,c))>0) ant=srvDe(p,c); });
      var pad=bc?(unit(bc)||0):0;
      if(bc&&pad>0){ var rf=h('small',{text:'Base padrão: '+brl(pad)}); rf.style.cssText='display:block;margin-top:4px;opacity:.7;'; w.appendChild(lb); w.appendChild(i); w.appendChild(rf); } else { w.appendChild(lb); w.appendChild(i); }
      w.appendChild(av);
      if(difere(c)){ var dn=h('small',{text:'Hoje as bancas têm valores diferentes; ao digitar, todas passam a ter este valor.'}); dn.style.cssText='display:block;margin-top:4px;color:#b45309;'; w.appendChild(dn); }
      i.addEventListener('input',function(){ var a=num(i.value); lista.forEach(function(p){ p[c]=a>0?(circ?Math.round(a/lista.length*1e4)/1e4:a):null; }); dirty(); avisos(av,c,x[1],ant,a,pad); if(window.__recalcPrecos) window.__recalcPrecos(); });
      box.appendChild(w); });
    g.appendChild(box);
    var nm=lista.map(function(p){ return (p.endereco||'(sem endereço)')+(p.bairro?' · '+p.bairro:''); }).join('  ·  ');
    var nt=h('p',{class:'hint',text:circ?'Circuito fixo de '+nT+' telas, vendido sempre inteiro: um valor só para o circuito, nunca por tela. Telas: '+nm:'Vale para as '+lista.length+' bancas cadastradas: '+nm}); nt.style.cssText='margin:12px 0 0;font-size:12px;'; g.appendChild(nt);
    return g;
  }
  if(!document.getElementById('pbase-css')){ var st=document.createElement('style'); st.id='pbase-css'; st.textContent='.pbrow,.pbhead{display:grid!important;grid-template-columns:minmax(0,1fr) 170px;gap:0 14px;align-items:start;box-sizing:border-box}.pbrow.p2,.pbhead.p2{grid-template-columns:minmax(0,1fr) 170px 170px}.pbhead{padding:2px 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;opacity:.65;font-weight:600}.pbhead span+span,.pbrow .pbc{text-align:right}.pbrow{padding:10px 0}.pbrow .pbn{padding-top:9px;min-width:0}.pbrow .pbc{min-width:0}.pbrow .pbc input{width:100%!important;box-sizing:border-box;text-align:right}.pbrow .pbc b{display:block;padding-top:9px}.pbrow .pbc .lb{display:none}@media(max-width:700px){.pbhead{display:none!important}.pbrow,.pbrow.p2{grid-template-columns:1fr 1fr!important;gap:6px 10px}.pbrow .pbn{grid-column:1/-1;padding-top:0}.pbrow .pbc .lb{display:block;font-size:11px;text-transform:uppercase;opacity:.6;margin-bottom:3px;text-align:left}.pbrow .pbc{text-align:left}}'; document.head.appendChild(st); }
  var cls=temProd?' p2':'';
  var cab=h('div',{class:'pbhead'+cls}); ['Endereço','Mínimo líquido / '+per].concat(temProd?['Produção líquida']:[]).forEach(function(x){ cab.appendChild(h('span',{text:x})); }); g.appendChild(cab);
  var body=h('div'); g.appendChild(body);
  var cel=function(x,rot,right){ var c=h('div',{class:'pbc'}); if(rot) c.appendChild(h('div',{class:'lb',text:rot})); if(x) c.appendChild(x); return c; };
  lista.forEach(function(p){
    var nome=(p.endereco||'(sem endereço)')+(p.bairro?' · '+p.bairro:''), tr=h('div',{class:'endrow pbrow'+cls+(edita&&p.sel?' on':'')});
    var c0=h('div',{class:'pbn'}); c0.appendChild(h('span',{class:'t',text:nome})); if(donoDe(p)!=='padrao') c0.appendChild(h('small',{class:'mu',text:'  · '+donoNome(donoDe(p))})); tr.appendChild(c0);
    if(edita){
      var aviso=mkAviso();
      var fl=function(campo,rot,baseCampo){ var w=h('div'), ant=srvDe(p,campo); var i=inp(p,campo,{num:true,onchange:function(){ avisos(aviso,campo,rot,ant,p[campo],baseCampo?vlr(p[baseCampo]):0); if(window.__recalcPrecos) window.__recalcPrecos(); }}); i.placeholder='R$ 0,00'; i.inputMode='decimal'; w.appendChild(i); if(baseCampo&&vlr(p[baseCampo])>0){ var rf=h('small',{text:'Base padrão: '+brl(vlr(p[baseCampo]))}); rf.style.cssText='display:block;margin-top:3px;opacity:.7;text-align:right;'; w.appendChild(rf); } return w; };
      tr.appendChild(cel(fl(fL,'Mínimo líquido',sp?'liq':null),'Mínimo líquido / '+per)); if(temProd) tr.appendChild(cel(fl(fP,'Produção líquida',sp?'prod':null),'Produção líquida'));
      if(!sp&&p.preco&&!(vlr(p.liq)>0)) c0.appendChild(h('small',{class:'legado',text:' Tabela bruta antiga: '+brl(vlr(p.preco))+' (vale até definir o líquido)'}));
      if(!sp&&temProd&&vlr(p[fL])>0&&!(vlr(p[fP])>0)) c0.appendChild(h('small',{class:'legado',text:' ⚠ Falta a produção líquida deste endereço.'}));
      c0.appendChild(aviso);
    } else {
      tr.appendChild(cel(h('b',{class:(pLiq(p)||p.preco)?'':'sem',text:pLiq(p)>0?brl(pLiq(p)):(p.preco?brl(vlr(p.preco)):'sem preço')}),'Mínimo líquido / '+per));
      if(temProd) tr.appendChild(cel(h('b',{class:pProd(p)>0?'':'sem',text:pProd(p)>0?brl(pProd(p)):'sem produção'}),'Produção líquida'));
    }
    body.appendChild(tr);
  });
  return g;
}

/* ---------- Preços base / Preços base SP: valor mínimo líquido de CADA ponto (mesma tela; SP tem valores maiores) ---------- */
function viewPrecosBase(v,sp){
  var h2b=h('h2',{text:sp?'Preços base SP · valor mínimo por ponto ':'Preços base · valor mínimo por ponto '}); var vbb=h('small',{text:'· versão 20261110l'}); vbb.style.cssText='font-size:11px;font-weight:500;opacity:.55;'; h2b.appendChild(vbb); v.appendChild(h2b);
  v.appendChild(h('p',{class:'hint',text:(sp?'Base SP: mesma lista da base padrão, com valores sempre maiores. Ponto sem valor SP usa o valor da base padrão. ':'Base padrão. ')+'Cada ponto tem o seu mínimo líquido (mensal; outdoor por bi-semana). Estáticos também têm a produção líquida; bancas estáticas têm um valor único para todas. Na proposta o sistema soma os mínimos dos pontos escolhidos e avisa quando o negociado ficar abaixo. As alterações são salvas sozinhas.'}));
  var f=h('input',{type:'search',placeholder:'Filtrar por endereço ou bairro…'}); v.appendChild(field('Buscar ponto',f));
  var wrap=h('div'); v.appendChild(wrap);
  fmtOpcoes().forEach(function(g){ if(!ptsFmt(g.k).length) return; wrap.appendChild(enderecosGrupo(g.k,g.k==='outdoor'?'Bi-semana':'Mensal',g.nome,sp)); });
  if(!wrap.children.length) wrap.appendChild(h('p',{class:'hint',text:'Nenhum ponto cadastrado.'}));
  f.addEventListener('input',function(){ var q=f.value.trim().toLowerCase(); wrap.querySelectorAll('.endrow').forEach(function(r){ var t=(r.querySelector('.t')||r).textContent.toLowerCase(); r.style.display=(!q||t.indexOf(q)>=0)?'':'none'; }); });
  if(ME.admin&&!sp){ var dt=h('details',{class:'pt'}); dt.appendChild(h('summary',{text:'Tabela de preços da proposta (avançado, só admin)'})); var bx=h('div'), built=false; dt.appendChild(bx); dt.addEventListener('toggle',function(){ if(dt.open&&!built){ built=true; viewPrecos(bx,false); } }); v.appendChild(dt); }
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
/* Perfil do cliente (obrigatório no início da proposta): líquido, agência 25% ou planejador 25%+25% */
function perfilBox(panel,tipo,comValores){ var PF=[['direto','Líquido (cliente direto)',0,0,1,'sem comissão'],['agencia','Agência +25%',25,0,0.75,'25% de comissão'],['planejador','Planejador +25% +25%',25,25,0.5625,'25% + 25%']];
      var cur=D.perfilEsc?PF.filter(function(f){ return num(D.comissao)===f[2]&&num(D.bv)===f[3]; })[0]:null;
      var base=0, prod=0; D.pontos.forEach(function(p){ if(p.sel){ base+=pLiq(p); prod+=pProd(p); } });
      var box=h('div',{class:'perfilbox'}); box.style.cssText='margin:0 0 14px;padding:14px;border:1px solid rgba(0,0,102,.14);border-radius:12px;background:#fff;';
      box.appendChild(h('div',{text:'Perfil do cliente'})); box.firstChild.style.cssText='font-weight:700;color:#000066;margin-bottom:4px;';
      var hp=h('div',{class:'hint',text:'Obrigatório: escolha quem fecha a proposta. O acréscimo já entra no valor de tabela e na produção.'}); hp.style.margin='0 0 10px'; box.appendChild(hp);
      var gr=h('div'); gr.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;';
      PF.forEach(function(f){ var on=cur&&cur[0]===f[0]; var b=h('button',{type:'button',class:'btn'+(on?' pri':'')}); b.style.cssText='display:block;text-align:left;padding:10px 12px;line-height:1.35;white-space:normal;height:auto;border-radius:14px;';
        b.appendChild(h('div',{text:f[1]})); b.firstChild.style.cssText='font-weight:700;display:block;';
        var d=h('div',{text:f[5]+(comValores&&base>0?' · mínimo '+brl(base/f[4]):'')}); d.style.cssText='display:block;font-size:12px;opacity:.9;font-weight:400;margin-top:2px;'; b.appendChild(d);
        if(comValores&&prod>0){ var d2=h('div',{text:'produção '+brl(prod/f[4])}); d2.style.cssText='display:block;font-size:12px;opacity:.9;font-weight:400;'; b.appendChild(d2); }
        b.addEventListener('click',function(){ D.comissao=f[2]; D.bv=f[3]; D.perfilEsc=true; dirty(); try{ persistLocal(); }catch(e){} showTab(tipo); }); gr.appendChild(b); });
      box.appendChild(gr);
      if(!cur&&D.perfilEsc) box.appendChild(h('div',{class:'hint',text:'Percentuais personalizados em uso (comissão '+num(D.comissao)+'% · BV '+num(D.bv)+'%). Escolha um perfil acima para voltar ao padrão.'}));
      panel.appendChild(box); }
/* circuito com desconto (passo Preços da proposta): separado = valores individuais; circuito = total com desconto */
function propTotal(){ var cc=cpmCalc(D); if(cc) return cc.total; var t=0; D.precos.forEach(function(r){ if(!r.auto||r.auto.split(',').some(function(k){ return ptsOf(D,k).some(function(p){return p.sel;}); })) t+=calcPreco(D,r).final; }); return t; }
function circBox(panel){
  var c=D.circ=D.circ||{on:false,tipo:'pct',v:''}, box=h('div',{class:'circbox'+(c.on?' on':'')}), res=h('div',{class:'circres'});
  function upd(){ box.classList.toggle('on',!!c.on); corpo.hidden=!c.on; var t=propTotal(), cc=circCalc(D,t);
    res.innerHTML=''; if(!c.on) return; if(!cc){ res.textContent='Informe o desconto do circuito.'; return; }
    res.appendChild(h('span',{text:'Separado '})); res.appendChild(h('b',{text:brl(cc.sep)})); res.appendChild(h('span',{text:' → Circuito '})); res.appendChild(h('b',{class:'pk',text:brl(cc.circ)}));
    res.appendChild(h('span',{text:' · −'+pctTxt(cc.pct)+' · economia de '+brl(cc.desc)})); }
  var sv=function(){ try{ persistLocal(); }catch(e){} upd(); };
  var ck=h('input',{type:'checkbox'}); ck.checked=!!c.on; ck.addEventListener('change',function(){ c.on=ck.checked; sv(); });
  var tp=h('div',{class:'seg'}); [['pct','Porcentagem (%)'],['rs','Valor (R$)']].forEach(function(o){ tp.appendChild(h('button',{type:'button',class:'segb'+(c.tipo===o[0]?' on':''),text:o[1],onclick:function(){ c.tipo=o[0]; tp.querySelectorAll('.segb').forEach(function(b,k){ b.classList.toggle('on',(k?'rs':'pct')===c.tipo); }); vi.placeholder=c.tipo==='rs'?'Ex.: 4200':'Ex.: 15'; un.textContent=c.tipo==='rs'?'R$':'%'; sv(); }})); });
  var vi=h('input',{type:'text',inputmode:'decimal'}); vi.value=c.v||''; vi.placeholder=c.tipo==='rs'?'Ex.: 4200':'Ex.: 15'; vi.addEventListener('input',function(){ c.v=vi.value; sv(); });
  var un=h('b',{class:'circun',text:c.tipo==='rs'?'R$':'%'});
  var corpo=h('div',{class:'circcorpo'},[h('div',{class:'circlin'},[tp,h('label',{class:'circv'},[un,vi])]),res]);
  box.appendChild(h('label',{class:'circon'},[ck,h('span',{},[h('b',{text:'Oferecer circuito completo com desconto'}),h('small',{text:'A proposta mostra os valores separados e, em destaque, o valor do pacote fechando todos os pontos.'})])]));
  box.appendChild(corpo); panel.appendChild(box); window.__onPrecoCirc=upd; upd();
  var o=window.__onPreco; window.__onPreco=function(){ if(o) o(); upd(); };
}
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
    if(prop){ perfilBox(panel,tipo,false); var bs0=h('select',{},[['','Base padrão'],['sp','Base SP (valores maiores)']].map(function(o){ return h('option',{value:o[0],text:o[1]}); })); bs0.value=D.baseSP?'sp':''; bs0.addEventListener('change',function(){ D.baseSP=bs0.value==='sp'; try{ persistLocal(); }catch(e){} }); panel.appendChild(field('Base de preços',bs0,'Padrão ou SP (valores mínimos maiores).')); }
    function vc(){ if(prop){ var okc=!!String(D.kit.cliente||'').trim(), ok=okc&&!!D.perfilEsc; next.disabled=!ok; next.textContent=ok?'Continuar':(okc?'Escolha o perfil do cliente para continuar':'Informe o cliente para continuar'); } } setTimeout(vc,0);
    if(!prop) panel.appendChild(h('button',{type:'button',class:'btn',text:'Quero o mídia kit completo (todos os pontos)',onclick:function(){ window.__completo=1; FLUXO[tipo]=passos.length-1; showTab(tipo); }}));
  } else if(id==='pontos'){
    panel.appendChild(h('h3',{text:'Quais pontos entram?'}));
    window.__onSel=function(n){ next.disabled=!n; next.textContent=n?'Continuar · '+n+(n>1?' pontos':' ponto'):'Escolha um ponto'; };
    viewSelecao(panel,true);
  } else if(id==='precos'){
    var avp=h('p',{class:'qinfo bad'}); avp.hidden=true;
    if(ME.admin){ var cpmMode=modoBox(panel,tipo); if(cpmMode){ panel.appendChild(avp); cpmBox(panel,avp,next); circBox(panel); setTimeout(function(){ if(window.__onPreco) window.__onPreco(); },0); } }
    if(!(ME.admin&&cpmOn(D))){
    window.__onPreco=function(){ var f=[]; D.precos.forEach(function(r){ if(r.auto&&!r.auto.split(',').some(function(k){ return ptsOf(D,k).some(function(p){return p.sel;}); })) return; if(!(calcPreco(D,r).tabela>0)) f.push(r.nome); }); avp.hidden=!f.length; avp.textContent=f.length?'⚠ Falta o valor de tabela em: '+f.join(', ')+'.':''; next.disabled=!!f.length; next.textContent=f.length?'Preencha os valores para continuar':'Continuar'; };
    panel.appendChild(avp);
    panel.appendChild(h('h3',{text:'Valores da proposta'}));
    panel.appendChild(h('p',{class:'hint',text:'Aparecem só os formatos dos pontos que você escolheu. Preencha o valor de tabela e o desconto; o total é calculado sozinho.'}));
    perfilBox(panel,tipo,true);
    var bs=h('select',{},[['','Base padrão'],['sp','Base SP (valores maiores)']].map(function(o){ return h('option',{value:o[0],text:o[1]}); })); bs.value=D.baseSP?'sp':''; bs.addEventListener('change',function(){ D.baseSP=bs.value==='sp'; try{ persistLocal(); }catch(e){} showTab(tipo); }); panel.appendChild(field('Base de preços',bs,'Escolha SP para usar os valores mínimos da base SP nesta proposta.'));
    viewPrecos(panel,true); circBox(panel); setTimeout(function(){ if(window.__onPreco) window.__onPreco(); },0);
    }
  } else {
    var comp=!prop&&window.__completo, n=nSel(), tot=0;
    if(prop) tot=propTotal();
    var sm=h('div',{class:'resumo'},[h('div',{},[h('b',{text:D.kit.cliente||'(sem cliente)'}),h('span',{text:'cliente / campanha'})]),h('div',{},[h('b',{text:String(comp?D.pontos.length:n)}),h('span',{text:comp?'pontos (todos)':'pontos escolhidos'})])]);
    if(prop) sm.appendChild(h('div',{},[h('b',{text:brl(tot)}),h('span',{text:'investimento ('+(D.modoGeral==='liquido'?'líquido':'bruto')+')'+(cpmOn(D)?' · por CPM':'')+(circCalc(D,tot)?' · separado':'')})]));
    if(prop&&circCalc(D,tot)){ var cc=circCalc(D,tot); sm.appendChild(h('div',{class:'rcirc'},[h('b',{text:brl(cc.circ)}),h('span',{text:'circuito completo · −'+pctTxt(cc.pct)})])); }
    panel.appendChild(h('h3',{text:'Tudo pronto'})); panel.appendChild(sm);
    if(ME.admin){ var pv=prop&&cpmOn(D)?D.progPag!==false:!!D.progPag, pc=h('input',{type:'checkbox'}); pc.checked=pv; pc.addEventListener('change',function(){ D.progPag=pc.checked; try{ persistLocal(); }catch(e){} });
      panel.appendChild(h('label',{class:'chk progpag'},[pc,h('span',{},[h('b',{text:' ⚡ Incluir a página “Mídia programática”'}),h('small',{text:' Plataformas (Admooh, Hivestack, Outcon, DV360) e abertura para negociar valores e CPMs. Já vem marcada nas propostas por CPM.'})])])); }
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
  var gsel=h('select',{},[h('option',{value:'',text:'Todas as seções'})].concat(fmtOpcoes().map(function(g){ return h('option',{value:g.k,text:g.nome}); })));
  var tipo='', segs=h('div',{class:'seg'}), info=h('p',{class:'status'}), list=h('div',{class:'fgrid'}); v.appendChild(h('div',{class:'bar'},[segs,gsel])); v.appendChild(info); v.appendChild(list);
  function drawSegs(){ segs.innerHTML=''; var nb=D.pontos.filter(function(p){return fotoAtencao(p)==='baixa'}).length, ns=D.pontos.filter(function(p){return fotoAtencao(p)==='sem'}).length;
    [['','Todos ('+(nb+ns)+')'],['baixa','Baixa qualidade ('+nb+')'],['sem','Sem foto ('+ns+')']].forEach(function(o){ segs.appendChild(h('button',{type:'button',class:'segb'+(tipo===o[0]?' on':''),text:o[1],onclick:function(){ tipo=o[0]; draw(); }})); }); }
  function draw(){ list.innerHTML=''; drawSegs(); var itens=D.pontos.filter(function(p){ var a=fotoAtencao(p); return a&&(!tipo||a===tipo)&&(!gsel.value||fmtK(grupoDe(p).k)===gsel.value); });
    info.textContent=fqScanning?'Verificando as fotos…':(itens.length?itens.length+' ponto'+(itens.length>1?'s':'')+' para melhorar.':'Tudo certo: nenhuma foto em baixa qualidade.'); info.className='status '+(fqScanning?'':(itens.length?'':'ok'));
    itens.forEach(function(p){ var k=fotoKey(p), q=k&&FQ[k], st=h('p',{class:'fst',text:fotoAtencao(p)==='sem'?'⚠ Sem foto':'⚠ '+q.w+'×'+q.h+' px · baixa qualidade'});
      var th=k&&libSrc(k)?h('img',{src:libSrc(k),loading:'lazy'}):h('div',{class:'nofoto',text:'sem foto'});
      var fi=h('input',{type:'file',accept:'image/*'}); var msg=h('span',{class:'hint'});
      fi.addEventListener('change',async function(){ if(!fi.files.length) return; msg.textContent='Enviando…'; try{ var nk=await addPhoto(fi.files[0]); if(Array.isArray(p.foto)) p.foto[0]=nk; else p.foto=nk; dirty(); var r=await fqCheck(nk); contFotos(); document.dispatchEvent(new Event('fotochg')); if(r&&r.low) toast('Foto enviada, mas ainda está pequena ('+r.w+'×'+r.h+' px). Use uma maior.',true); else toast('Foto trocada ✓'); draw(); }catch(e){ msg.textContent=''; toast(e.message||String(e),true); } });
      var abrir=h('button',{type:'button',class:'btn',text:'Abrir ponto',onclick:function(){ filtro=''; filtroDono=''; filtroQ=false; busca=p.endereco||''; showTab('pontos'); }});
      list.appendChild(h('div',{class:'fcard'},[th,h('div',{class:'fbody'},[h('b',{text:p.endereco||'(sem endereço)'}),h('span',{class:'hint',text:[p.bairro,grupoDe(p).nome].filter(Boolean).join(' · ')}),st,h('div',{class:'bar'},[h('label',{class:'btn pri'},['📷 Substituir foto',fi]),abrir]),msg])])); }); }
  gsel.addEventListener('change',draw); draw(); fqScan(function(){ contFotos(); if(curTab==='fotos') draw(); });
}

/* ===== Rio de Janeiro: importação dos pontos do mídia kit (só admin) =====
   Envia as fotos para a biblioteca, busca a posição de cada endereço (OpenStreetMap, 1 por segundo,
   várias formas de escrever o endereço, só dentro do estado do RJ) e cria os pontos que ainda não existem. */
var RJ_BOX='-44.95,-20.75,-40.90,-23.40';
function rjFaltam(){ if(typeof RJ_PONTOS==='undefined') return []; var N=function(t){ return String(t||'').toLowerCase().replace(/[^a-z0-9]/g,''); }, tem=ptsOf(D,'rj').map(function(p){ return N(p.endereco); }); return RJ_PONTOS.filter(function(x){ return tem.indexOf(N(x.endereco))<0; }); }
function rjSemLL(){ return ptsOf(D,'rj').filter(function(p){ return p.lat==null||p.lat===''||isNaN(p.lat)||p.lng==null||p.lng===''; }); }
async function geoRJ(qs){ var espera=function(ms){ return new Promise(function(r){ setTimeout(r,ms); }); };
  for(var i=0;i<qs.length;i++){ try{ var j=await (await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&bounded=1&viewbox='+RJ_BOX+'&q='+encodeURIComponent(qs[i]))).json(); await espera(1100);
    if(j&&j[0]) return {lat:+(+j[0].lat).toFixed(7),lng:+(+j[0].lon).toFixed(7),exato:i===0}; }catch(e){ await espera(1100); } } return null; }
function rjBuscas(p){ var x=(typeof RJ_PONTOS!=='undefined'?RJ_PONTOS:[]).filter(function(r){ return r.endereco===p.endereco; })[0], cid=String(p.cidade||'').replace(/\s*-\s*RJ$/,'');
  return ((x&&x.q)||[]).concat([String(p.endereco||'').split(' · ')[0]+', '+cid+', Rio de Janeiro',(p.bairro?p.bairro+', ':'')+cid+', Rio de Janeiro']); }
async function importarRJ(btn){
  if(!ME.admin||typeof RJ_PONTOS==='undefined') return; var L=rjFaltam(); if(!L.length){ toast('Todos os pontos do Rio de Janeiro já estão cadastrados.',true); return; }
  if(!confirm('Importar '+L.length+' ponto(s) do Rio de Janeiro (fotos, formatos, audiência, valores e coordenadas)? Leva cerca de '+Math.max(1,Math.round(L.length*3/60))+' minuto(s).')) return;
  var msg=$('#fotomsg'), ok=0, semLL=[]; btn.disabled=true;
  for(var i=0;i<L.length;i++){ var x=L[i];
    msg.textContent='Importando '+(i+1)+' de '+L.length+': '+x.endereco+'…';
    var key=null; try{ var b=await (await fetch('assets/rj/'+x.f)).blob(); key=await addPhoto(new File([b],x.f,{type:'image/jpeg'})); }catch(e){ console.warn('foto RJ',x.f,e); }
    var p={id:newId(),secao:'rj',dono:'padrao',sel:false,zoom:16,endereco:x.endereco,bairro:x.bairro,cidade:x.cidade,sentido:x.sentido,tamanho:x.tamanho,pixels:x.pixels,veic:x.veic,publico:x.publico,fluxo:x.fluxo,impacto:x.impacto,preco:x.preco,foto:key,lat:null,lng:null,prog:false};
    var g=await geoRJ(rjBuscas(p)); if(g){ p.lat=g.lat; p.lng=g.lng; if(!g.exato) p.llAprox=true; } else semLL.push(x.endereco);
    if(x.tipoTxt) p.tipoTxt=x.tipoTxt; D.pontos.push(p); ok++; dirty(); }
  ordenaPts(D); dirty(); showTab(curTab==='rio'?'rio':'pontos');
  var m=$('#fotomsg'); if(m) m.textContent='✓ '+ok+' ponto(s) do Rio de Janeiro importados.'+(semLL.length?' Sem coordenada: '+semLL.join('; ')+' — cole o link do Maps nesses.':' Confira no mapa de cada ponto os marcados como "aproximado".');
}
/* completa latitude/longitude dos pontos do RJ que estão sem */
async function coordRJ(btn){ var L=rjSemLL(); if(!L.length){ toast('Todos os pontos do Rio de Janeiro já têm coordenadas.'); return; }
  btn.disabled=true; var msg=$('#fotomsg'), ok=0, falha=[];
  for(var i=0;i<L.length;i++){ var p=L[i]; msg.textContent='Buscando coordenadas '+(i+1)+' de '+L.length+': '+p.endereco+'…';
    var g=await geoRJ(rjBuscas(p)); if(g){ p.lat=g.lat; p.lng=g.lng; if(!g.exato) p.llAprox=true; else delete p.llAprox; ok++; dirty(); } else falha.push(p.endereco); }
  showTab(curTab); var m=$('#fotomsg'); if(m) m.textContent='✓ Coordenadas encontradas para '+ok+' de '+L.length+' ponto(s).'+(falha.length?' Não achei: '+falha.join('; ')+' — abra o ponto e cole o link do Google Maps.':''); }
/* ===== Proposta por valor ou por CPM (só admin) ===== */
function modoBox(panel,tipo){
  var c=D.cpmProp=D.cpmProp||{on:false,cpm:'',dias:30,base:false}, box=h('div',{class:'modobox'});
  box.appendChild(h('b',{text:'Proposta por'}));
  var sg=h('div',{class:'seg'}); [[false,'💰 Valor (tabela)'],[true,'📊 CPM (programática)']].forEach(function(o){ sg.appendChild(h('button',{type:'button',class:'segb'+(!!c.on===o[0]?' on':''),text:o[1],onclick:function(){ c.on=o[0]; try{ persistLocal(); }catch(e){} showTab(tipo); }})); });
  box.appendChild(sg); box.appendChild(h('small',{text:c.on?'Valor = impactos do período ÷ 1.000 × CPM. Só você (admin) vê esta opção.':'Valores de tabela, desconto e negociado, como sempre.'}));
  panel.appendChild(box); return !!c.on; }
function cpmBox(panel,avp,next){
  var c=D.cpmProp, box=h('div',{class:'cpmbox'}), tb=h('div',{class:'cpmtab'}), res=h('div',{class:'cpmres'});
  var iC=h('input',{type:'text',inputmode:'decimal',placeholder:'Ex.: 15,00'}); iC.value=c.cpm||'';
  var iD=h('input',{type:'number',min:'1',max:'365'}); iD.value=c.dias||30;
  var iB=h('input',{type:'checkbox'}); iB.checked=!!c.base;
  var sv=function(){ c.cpm=iC.value; c.dias=Math.max(1,num(iD.value)||30); c.base=iB.checked; try{ persistLocal(); }catch(e){} pinta(); };
  [iC,iD].forEach(function(x){ x.addEventListener('input',sv); }); iB.addEventListener('change',sv);
  box.appendChild(h('div',{class:'cpmlin'},[field('CPM da proposta (R$ por mil impactos)',iC),field('Período (dias)',iD),h('label',{class:'chk cpmchk'},[iB,h('span',{text:' Usar o CPM base de cada ponto (quando cadastrado)'})])]));
  box.appendChild(res); box.appendChild(tb); panel.appendChild(box);
  function pinta(){ var cc=cpmCalc(D); tb.innerHTML=''; res.innerHTML=''; if(!cc) return;
    var t=h('table',{class:'cpmt'}); t.appendChild(h('thead',{},[h('tr',{},['Ponto','Impacto semanal','Impactos no período','CPM (R$)','Valor'].map(function(x){ return h('th',{text:x}); }))]));
    var b=h('tbody'); cc.itens.forEach(function(x){ var tr=h('tr',{class:x.semImp||x.semCpm?'abaixo':''}); tr.appendChild(h('td',{},[h('b',{text:x.end}),h('small',{text:' · '+x.nome})])); tr.appendChild(h('td',{text:x.semImp?'sem impacto cadastrado':fmtMil(impSemanal(x.p))})); tr.appendChild(h('td',{text:fmtMil(x.imp)})); tr.appendChild(h('td',{text:x.cpm>0?brl(x.cpm)+(c.base&&num(x.p.cpm)>0?' (base)':''):'—'})); tr.appendChild(h('td',{text:brl(x.valor)})); b.appendChild(tr); }); t.appendChild(b); tb.appendChild(h('div',{class:'tw'},[t]));
    res.appendChild(h('span',{text:fmtMil(cc.imp)+' impactos em '+cc.dias+' dias · CPM médio '+brl(cc.cpmMedio)+' · '})); res.appendChild(h('b',{text:'Investimento '+brl(cc.total)}));
    var f=cc.falta; avp.hidden=!f.length&&cc.total>0; avp.textContent=!cc.itens.length?'⚠ Escolha os pontos da proposta.':f.length?'⚠ '+f.length+(f.length===1?' ponto':' pontos')+' sem impacto semanal ou sem CPM: '+f.slice(0,4).map(function(x){ return x.end; }).join('; ')+(f.length>4?'…':''):(cc.total>0?'':'⚠ Informe o CPM.');
    next.disabled=!(cc.total>0); next.textContent=cc.total>0?'Continuar':'Informe o CPM para continuar';
    if(window.__onPrecoCirc) window.__onPrecoCirc(); }
  window.__onPreco=pinta; pinta(); }

/* aba "Rio de Janeiro" (só admin): os pontos da praça, com a importação quando ainda não existem */
function viewRio(v){ if(!ME.admin) return; filtro='rj'; filtroDono=''; busca=''; filtroQ=false; filtroProg=false; viewPontos(v);
  var t=v.querySelector('h2'); if(t) t.textContent='Rio de Janeiro';
  var n=ptsOf(D,'rj').length, nl=rjSemLL().length, nf=rjFaltam().length, hint=v.querySelector('p.hint');
  if(hint) hint.textContent=n?n+' pontos de LED no Rio de Janeiro (só você vê esta praça)'+(nf?' · faltam '+nf+' do mídia kit':' · todos os pontos do mídia kit cadastrados')+(nl?' · '+nl+' sem coordenada':'')+'. Marque "⚡ Plugado na programática" e o CPM base em cada ponto; para propostas, use Montar proposta e escolha estes pontos junto com os de BH se quiser.':'Ainda não há pontos do Rio de Janeiro. Clique em "📍 Importar os 28 pontos do Rio de Janeiro" logo abaixo (uma vez só).';
  var nv=v.querySelector('#novoponto'); if(nv) nv.open=false; }
