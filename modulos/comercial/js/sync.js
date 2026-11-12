/* Estado do usuário e sincronização dos pontos/configuração com o Supabase. */
var CFG_KEYS=['kit','mercado','guanabara','brasilia','precos','specChips','specPad','sepInfo','sepFotos','comissao','descAlerta','bv','modoGeral','mapStyle','libMap'];
var ME={email:'',uid:null,papel:null,admin:false,gerente:false,nome:''};
var DEF0=null, CFGSRV=null;
var READY=false, lastPt={}, lastCfg='', remoteSig='', latestRemote={cfg:null,pts:null}, syncing=false, syncAgain=false, saveT=null, entered=false, synced=false;
var LOCAL_KEY='megakit_online_v2', L={sel:{},cliente:'',precos:null,comissao:null,bv:null,modoGeral:null};
function lsGet(){ try{ return JSON.parse(localStorage.getItem(LOCAL_KEY)||'null'); }catch(e){ return null; } }
function lsPut(){ try{ localStorage.setItem(LOCAL_KEY,JSON.stringify(L)); }catch(e){} }
function emailKey(e){ return String(e||'').trim().toLowerCase(); }
function stable(o){ return JSON.stringify(o,function(k,v){ if(v&&typeof v==='object'&&!Array.isArray(v)){ var r={}; Object.keys(v).sort().forEach(function(x){ r[x]=v[x]; }); return r; } return v; }); }
function stripPt(p){ var o=JSON.parse(JSON.stringify(p)); delete o.sel; return o; }
function ptJson(p){ return stable(stripPt(p)); }
/* A base guarda só a ESTRUTURA das linhas de preço. Os valores digitados/praticados numa proposta
   (tabela, desconto, negociado por endereço) NUNCA entram na base — quem define a base é só o admin,
   pelos valores mínimos de cada ponto. */
function cfgSnapshot(){ var o={}; CFG_KEYS.forEach(function(k){ o[k]=D[k]; }); o.kit=Object.assign({},D.kit); delete o.kit.cliente;
  o.precos=(D.precos||[]).map(function(r){ var c=Object.assign({},r); delete c.end; delete c.desc; delete c.tabela; return c; });
  return JSON.parse(JSON.stringify(o)); }
function toast(msg,err){ var t=$('#toast'); if(!t) return; t.textContent=msg; t.className='toast show'+(err?' err':''); clearTimeout(toast.t); toast.t=setTimeout(function(){ t.className='toast'; },6000); }
function setSaved(t,err){ var s=$('#saved'); if(s){ s.textContent=t; s.style.color=err?'#ffb3c9':''; } }
function hora(){ var d=new Date(); return ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2); }
function dataBR(iso){ var d=new Date(iso); return d.toLocaleDateString('pt-BR')+' '+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2); }
function erroMsg(e){ return (e&&(e.message||e.error_description||e.code))||String(e); }

/* ---- aplicar dados vindos do banco ---- */
function applyCfg(data){ CFGSRV=JSON.parse(JSON.stringify(data)); CFG_KEYS.forEach(function(k){ if(data[k]!==undefined) D[k]=mergeDef(DEF0[k],data[k]); }); D.kit.cliente=L.cliente||''; if(!ME.admin&&!ME.gerente){ if(L.precos) D.precos=L.precos; if(L.comissao!=null) D.comissao=L.comissao; if(L.bv!=null) D.bv=L.bv; if(L.modoGeral) D.modoGeral=L.modoGeral; } D.baseSP=!!L.baseSP; D.perfilEsc=!!L.perfilEsc; D.circ=L.circ||null; D.cpmProp=L.cpmProp||null; D.progPag=L.progPag; if(!(D.kit&&D.kit.mapV>=3)){ if(!D.mapStyle||D.mapStyle==='esri_street'||D.mapStyle==='mega'||D.mapStyle==='neon') D.mapStyle='claro'; if(D.kit) D.kit.mapV=3; } if(D.mercado) D.mercado.nTelas=TELAS_CIRC.mercado; if(D.guanabara) D.guanabara.nTelas=TELAS_CIRC.guanabara; }
function applyPontos(rows){ var tmpAnt=(D.pontos||[]).filter(function(p){return p.tmp;}); if(!tmpAnt.length&&typeof tmpLer==='function') tmpAnt=tmpLer(); lastPt={}; if(!ME.admin) rows=rows.filter(function(r){ return r.secao!=='rj'; }); D.pontos=rows.map(function(r){ var p=Object.assign({},r); p.sel=!!L.sel[p.id]; lastPt[p.id]=ptJson(p); return p; }).sort(function(a,b){ return (a.ord==null?1e9:a.ord)-(b.ord==null?1e9:b.ord); }).concat(tmpAnt); ordenaPts(D); sincCircuitos(D); }

async function carregarDados(){
  DEF0=DEF();
  var cfg=await Store.lerConfig(); if(cfg){ applyCfg(cfg); remoteSig=stable(cfg); } lastCfg=cfg?stable(cfgSnapshot()):'';
  var pts=await Store.lerPontos(); applyPontos(pts);
  READY=true;
}

/* ---- tempo real: outro usuário mexeu nos pontos/config ---- */
var rtTimer=null;
function agendarRefetch(){ clearTimeout(rtTimer); rtTimer=setTimeout(refetchRemoto,700); }
async function refetchRemoto(){
  if(!READY||syncing||Date.now()<ignorarRt) return;
  try{
    var cfg=await Store.lerConfig(), pts=await Store.lerPontos(), mudou=false;
    if(cfg&&stable(cfg)!==remoteSig){ remoteSig=stable(cfg); latestRemote.cfg=cfg; mudou=true; }
    var ch=pts.length!==Object.keys(lastPt).length; pts.forEach(function(r){ if(lastPt[r.id]!==ptJson(r)) ch=true; });
    if(ch){ latestRemote.pts=pts; mudou=true; }
    if(mudou) remoteChanged();
  }catch(e){ console.warn('refetch',e); }
}
function remoteChanged(){
  if(!ME.admin){ applyRemote(); var y=window.scrollY; showTab(curTab); window.scrollTo(0,y); return; }
  var b=$('#banner'); b.hidden=false; b.innerHTML=''; b.appendChild(h('span',{text:'Outro usuário alterou os dados. Atualize para ver (alterações ainda não salvas aqui serão descartadas).'})); b.appendChild(h('button',{class:'btn',text:'Atualizar',onclick:function(){ applyRemote(); b.hidden=true; showTab(curTab); }}));
}
function applyRemote(){ if(latestRemote.cfg){ applyCfg(latestRemote.cfg); lastCfg=stable(cfgSnapshot()); latestRemote.cfg=null; } if(latestRemote.pts){ applyPontos(latestRemote.pts); latestRemote.pts=null; } }

/* ---- salvar (somente administrador) ---- */
async function syncOut(){
  if(!ME.admin||!READY) return; if(syncing){ syncAgain=true; return; } syncing=true; setSaved('salvando…');
  try{
    var arr=D.pontos; for(var i=0;i<arr.length;i++){ if(arr[i].ord==null){ var prev=i>0?(arr[i-1].ord||0):0, nxt=null; for(var j=i+1;j<arr.length;j++) if(arr[j].ord!=null){ nxt=arr[j].ord; break; } arr[i].ord=nxt==null?prev+1:(prev+nxt)/2; } }
    var sets=[], ids={}, dels=[];
    arr.forEach(function(p){ if(p.tmp) return; /* pontos personalizados (terceiros) nunca vão para o banco */ ids[p.id]=1; var js=ptJson(p); if(lastPt[p.id]!==js) sets.push([p,js]); });
    Object.keys(lastPt).forEach(function(id){ if(!ids[id]) dels.push(id); });
    if(dels.length>25) throw new Error('Exclusão em massa bloqueada ('+dels.length+' pontos). Nada foi apagado.');
    if(sets.length){ await Store.gravarPontos(sets.map(function(x){ return stripPt(x[0]); })); sets.forEach(function(x){ lastPt[x[0].id]=x[1]; }); }
    if(dels.length){ await Store.apagarPontos(dels); dels.forEach(function(id){ delete lastPt[id]; }); }
    var c=stable(cfgSnapshot()); if(c!==lastCfg){ var body=cfgSnapshot(); await Store.gravarConfig(body); lastCfg=c; remoteSig=stable(body); }
    setSaved('salvo na nuvem às '+hora());
  }catch(e){ console.error(e); setSaved('erro ao salvar',true); toast('Não foi possível salvar: '+erroMsg(e),true); }
  finally{ syncing=false; if(syncAgain){ syncAgain=false; syncOut(); } }
}
function persistLocal(){ L.sel={}; D.pontos.forEach(function(p){ if(p.sel) L.sel[p.id]=1; }); L.cliente=D.kit.cliente||''; L.baseSP=!!D.baseSP; L.perfilEsc=!!D.perfilEsc; L.circ=D.circ||null; L.cpmProp=D.cpmProp||null; L.progPag=D.progPag; if(!ME.admin&&!ME.gerente){ L.precos=D.precos; L.comissao=D.comissao; L.bv=D.bv; L.modoGeral=D.modoGeral; } lsPut(); }
function dirty(){ if(typeof tmpGuardar==='function') tmpGuardar(); persistLocal(); if(ME.admin&&READY){ setSaved('alterações não salvas…'); clearTimeout(saveT); saveT=setTimeout(syncOut,1200); } else if(ME.gerente&&READY&&(curTab==='precos'||curTab==='precosp')){ setSaved('alterações não salvas…'); clearTimeout(saveT); saveT=setTimeout(syncOutGer,1200); } }
/* Gerente comercial: na aba Preços base edita e salva os preços base; nas demais abas age como comercial (ajustes só na própria proposta). */
function baseEditavel(){ return ME.admin||(ME.gerente&&(curTab==='precos'||curTab==='precosp')); }
function baseDoServidor(){ if(!CFGSRV||!DEF0) return; D.precos=JSON.parse(JSON.stringify(CFGSRV.precos||DEF0.precos)); D.comissao=CFGSRV.comissao!=null?CFGSRV.comissao:DEF0.comissao; D.bv=CFGSRV.bv!=null?CFGSRV.bv:DEF0.bv; D.modoGeral=CFGSRV.modoGeral||DEF0.modoGeral; L.precos=null; L.comissao=null; L.bv=null; L.modoGeral=null; lsPut(); lastCfg=stable(cfgSnapshot()); }
async function syncOutGer(){
  if(!ME.gerente||!READY) return; if(syncing){ syncAgain=true; return; } syncing=true; setSaved('salvando…');
  try{
    var mud=[]; D.pontos.forEach(function(p){ if(p.tmp) return; var js=ptJson(p); if(lastPt[p.id]!==js) mud.push([p,js]); });
    if(mud.length){ ignorarRt=Date.now()+3000; await Store.gravarValoresPontos(mud.map(function(x){ var o={id:x[0].id}; if(x[0].liq!==undefined) o.liq=x[0].liq; if(x[0].prod!==undefined) o.prod=x[0].prod; if(x[0].liqsp!==undefined) o.liqsp=x[0].liqsp; if(x[0].prodsp!==undefined) o.prodsp=x[0].prodsp; return o; })); mud.forEach(function(x){ lastPt[x[0].id]=x[1]; }); }
    var c=stable(cfgSnapshot()); if(c!==lastCfg){ await Store.gravarPrecosBase({precos:D.precos,comissao:D.comissao,bv:D.bv,modoGeral:D.modoGeral}); lastCfg=c; var cfg=await Store.lerConfig(); if(cfg){ CFGSRV=JSON.parse(JSON.stringify(cfg)); remoteSig=stable(cfg); } }
    setSaved('preços salvos às '+hora());
  }catch(e){ console.error(e); setSaved('erro ao salvar',true); toast('Não foi possível salvar: '+erroMsg(e),true); }
  finally{ syncing=false; if(syncAgain){ syncAgain=false; syncOutGer(); } }
}
function restorePrecos(){ if(!CFGSRV) return; D.precos=JSON.parse(JSON.stringify(CFGSRV.precos||DEF0.precos)); D.comissao=CFGSRV.comissao!=null?CFGSRV.comissao:DEF0.comissao; D.modoGeral=CFGSRV.modoGeral||DEF0.modoGeral; D.bv=CFGSRV.bv!=null?CFGSRV.bv:DEF0.bv; L.bv=null; L.precos=null; L.comissao=null; L.modoGeral=null; dirty(); }
