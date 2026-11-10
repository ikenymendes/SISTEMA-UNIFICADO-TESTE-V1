/* Dados do kit: estado padrão, preços, fotos, mapas e geração (PPTX/PDF/prévia). */
var ONLINE=false; /* false = mapas reais (Esri/OSM) com a internet */
var INS_DEF={led_mega:500,led_r2:500,banca_mega:500,banca_r2:500,led_bh:500,led_rm:500,banca_led:500,mercado:220,guanabara:250,df_painel:420};
var PRECO_ORD=['mercado','led_mega','banca_mega','led_r2','banca_r2','guanabara','empena','front','mensal','outdoor','revista','metro','df_painel'];
function temK(rs,k){ return rs.some(function(r){ return (r.auto||'').split(',').indexOf(k)>=0; }); }
function juntaLinha(rs,a,b,nome){
  var ra=rs.filter(function(r){ return (r.auto||'').split(',').indexOf(a)>=0; })[0], rb=rs.filter(function(r){ return (r.auto||'').split(',').indexOf(b)>=0&&r!==ra; })[0], alvo=ra||rb; if(!alvo) return false;
  if(ra&&rb){ ['tabela','desc','insPor'].forEach(function(c){ if(!String(ra[c]==null?'':ra[c]).trim()&&String(rb[c]==null?'':rb[c]).trim()) ra[c]=rb[c]; }); rs.splice(rs.indexOf(rb),1); }
  var novo=a+','+b; if(alvo.auto===novo&&alvo.nome===nome) return !!(ra&&rb); alvo.auto=novo; alvo.nome=nome; return true; }
function migPrecos(D){ if(!D.precos) return;
  var rs=D.precos, mudou=false;
  if(rs.some(function(r){return /led_bh|led_rm|banca_led/.test(r.auto||'')})){
    var bh=rs.filter(function(r){return r.auto==='led_bh'})[0], rm=rs.filter(function(r){return r.auto==='led_rm'})[0], bl=rs.filter(function(r){return r.auto==='banca_led'})[0];
    if(bh){ bh.auto='led_mega'; bh.nome='Painéis de LED'; if(rm&&!String(bh.tabela||'').trim()&&String(rm.tabela||'').trim()){ bh.tabela=rm.tabela; bh.desc=rm.desc; } }
    if(rm) rs.splice(rs.indexOf(rm),1);
    if(bl){ bl.auto='banca_mega'; bl.nome='Bancas de LED'; }
    mudou=true; }
  /* Painéis de LED e Bancas de LED: uma linha só (MEGA e MEGA/R2 são só informação interna) */
  if(juntaLinha(rs,'led_mega','led_r2','Painéis de LED')) mudou=true;
  if(juntaLinha(rs,'banca_mega','banca_r2','Bancas de LED')) mudou=true;
  [['led_mega,led_r2','Painéis de LED','led_mega'],['banca_mega,banca_r2','Bancas de LED','banca_mega'],['mercado','Circuito Mercado Central','mercado'],['outdoor','Painéis outdoor','outdoor']].forEach(function(n){ if(!temK(rs,n[2])){ rs.push({nome:n[1],auto:n[0],pontos:'',periodo:'Mensal',insercoes:'',tabela:'',desc:'',modo:'geral'}); mudou=true; } });
  /* nenhuma linha repetida (ex.: Bancas Estáticas só uma) */
  var vis={}; for(var i=0;i<rs.length;i++){ var a=rs[i]; if(a.nome==='Bancas de revista') a.nome='Bancas Estáticas'; if(!a.auto) continue; if(vis[a.auto]){ var o=vis[a.auto]; ['tabela','desc','insPor'].forEach(function(c){ if(!String(o[c]==null?'':o[c]).trim()&&String(a[c]==null?'':a[c]).trim()) o[c]=a[c]; }); rs.splice(i,1); i--; mudou=true; } else vis[a.auto]=a; }
  if(mudou){ var ix=function(r){ var j=PRECO_ORD.indexOf((r.auto||'').split(',')[0]); return j<0?99:j; };
    D.precos=rs.map(function(r,i){return [r,i]}).sort(function(a,b){ return (ix(a[0])-ix(b[0]))||(a[1]-b[1]); }).map(function(x){return x[0]}); }
  /* v2: inserções por tela/dia (mínimo por ativo). v3: período mensal; só outdoor é por bi-semana */
  (D.precos||[]).forEach(function(r){ if(!r.v2){ r.v2=1; var d=INS_DEF[(r.auto||'').split(',')[0]]; r.insPor=d!=null?d:(parseInt(r.insercoes,10)||''); delete r.modo; }
    if(!r.v3){ r.v3=1; if(r.auto) r.periodo=r.auto==='outdoor'?'Bi-semana':'Mensal'; }
    if(!r.v4){ r.v4=1; if(ehEstatico(r)) r.incProd=true; } }); }
var ESTATICOS=['empena','front','mensal','outdoor','revista','metro'];
function ehEstatico(r){ return !!r.auto&&ESTATICOS.indexOf(r.auto)>=0; }
function selEstaticos(D,k){ return ptsOf(D,k).filter(function(p){ return p.sel; }); }
/* Preço pré-definido (líquido) dos estáticos: o admin cadastra, por ponto, o valor LÍQUIDO (p.liq) e, se houver, a
   produção líquida (p.prod). A linha pode incluir a produção (r.incProd). O valor de tabela da linha é o líquido
   "inflado" pela comissão/BV, para que no modo Líquido o valor final volte a ser exatamente o pré-definido.
   Pontos sem p.liq continuam usando p.preco (tabela bruta antiga). */
function fatorLiq(D){ var f=(1-num(D.comissao)/100)*(1-num(D.bv)/100); return f>0.01?f:1; }
/* Base de preços: padrão (p.liq / p.prod) ou SP (p.liqsp / p.prodsp, valores maiores; sem valor SP usa o padrão) */
function pLiq(p){ var s=typeof D!=='undefined'&&D&&D.baseSP&&vlr(p.liqsp)>0; return vlr(s?p.liqsp:p.liq); }
function pProd(p){ var s=typeof D!=='undefined'&&D&&D.baseSP&&vlr(p.prodsp)>0; return vlr(s?p.prodsp:p.prod); }
function totProdEst(D,k,todos){ return (todos?ptsOf(D,k):selEstaticos(D,k)).reduce(function(a,p){ return a+pProd(p); },0); }
function precoEstatico(D,r){
  var f=fatorLiq(D), tab=0, min=0;
  selEstaticos(D,r.auto).forEach(function(p){ var l=pLiq(p), pr=r.incProd?pProd(p):0;
    tab+=(l>0?l/f:vlr(p.preco))+pr/f; min+=(l>0?l:0)+pr; });
  return {tab:Math.round(tab*100)/100,min:Math.round(min*100)/100};
}
/* Quantidade padrão: pontos escolhidos na proposta (se houver); senão, todos os cadastrados. Circuitos usam o nº de telas. */
/* Circuitos são sempre fixos: Mercado Central = 8 telas, Parque Guanabara = 10 telas (em qualquer área do sistema) */
var TELAS_CIRC={mercado:8,guanabara:10};
function qtdPontos(D,auto){ var tot=0,sel=0,alg=false;
  auto.split(',').forEach(function(k){ var a=ptsOf(D,k), s=a.filter(function(p){return p.sel;}).length; if(s) alg=true;
    if(k==='mercado'||k==='guanabara'){ var n=TELAS_CIRC[k]; tot+=n; if(s) sel+=n; } else { tot+=a.length; sel+=s; } });
  return alg?sel:tot; }
/* Quantidade para o PREÇO: pontos escolhidos na proposta; sem escolha (ou circuito) vale 1, então o negociado fica igual ao valor de tabela. */
function qtdPreco(D,auto){ var sel=0; auto.split(',').forEach(function(k){ if(k!=='mercado'&&k!=='guanabara') sel+=selEstaticos(D,k).length; }); return sel>0?sel:1; }
/* Valor de tabela é sempre UNITÁRIO (por painel/tela/banca): total = unitário × quantidade. Estáticos somam o valor de cada endereço escolhido. */
/* Linhas de um estático: UMA por endereço (mensal + produção), cada uma com valor de tabela, desconto e negociado próprios (guardados em r.end[idDoPonto]). Sem valor digitado, a tabela parte do líquido/produção pré-definidos (inflados pela comissão/BV). */
/* Produção: sem tabela/desconto. Só muda conforme o perfil escolhido (líquido, agência, planejador); valor = produção líquida ÷ fator do perfil. Devolvido já na base do kit (÷ fator do modo) para o total bater. */
function fatorPerfilProd(D,q){ return q==='liq'?1:q==='ag'?0.75:q==='pl'?0.5625:fatorLiq(D); }
function prodDe(D,e,base){ base=(e&&num(e.pl)>0)?num(e.pl):vlr(base); if(!(base>0)) return 0; var fm=D.modoGeral==='liquido'?fatorLiq(D):1; return base/fatorPerfilProd(D,(e||{}).pq)/(fm>0?fm:1); }
function linhasEst(D,r,todos){ var f=fatorLiq(D), end=r.end||{};
  if(r.auto==='revista'){ var L=todos?ptsOf(D,r.auto):selEstaticos(D,r.auto), n=L.length; if(!n) return []; var e=end['*']||{}, pl=null, pp=null, mM=0, mP=0; L.forEach(function(p){ if(!pl&&pLiq(p)>0) pl=p; if(!pp&&pProd(p)>0) pp=p; mM+=pLiq(p); mP+=pProd(p); });
    var tu=num(e.t)>0?num(e.t):(pl?pLiq(pl)/f:vlr(L[0].preco)), tpu=prodDe(D,e,pp?pProd(pp):0), dm=num(e.d), dp=0;
    return [{p:{id:'*',endereco:'Bancas estáticas · '+n+(n===1?' ponto':' pontos')},n:n,tu:tu,tpu:tpu,tm:tu*n,dm:dm,nm:tu*n*(1-dm/100),tp:tpu*n,dp:dp,np:tpu*n*(1-dp/100),minM:mM,minP:mP}]; }
  var SL=todos?ptsOf(D,r.auto):selEstaticos(D,r.auto), sumP=0;
  var out=SL.map(function(p){ var e=end[p.id]||{}, l=pLiq(p), pr=pProd(p); sumP+=pr;
    var tm=num(e.t)>0?num(e.t):(l>0?l/f:vlr(p.preco)), dm=num(e.d);
    return {p:p,tm:tm,dm:dm,nm:tm*(1-dm/100),tp:0,dp:0,np:0,minM:l,minP:pr}; });
  /* Produção: UM valor único por formato (líquido + perfil), em vez de um por endereço. */
  if(out.length){ var ep=end['#prod']||{}, tv=prodDe(D,ep,sumP); out.push({p:{id:'#prod',endereco:'Produção'},isProd:true,tm:0,dm:0,nm:0,tp:tv,dp:0,np:tv,minM:0,minP:0}); }
  return out; }
function calcPreco(D,r){
  migPrecos(D);
  var minLiq=0, est=ehEstatico(r);
  var LE=null, eT=0, eN=0; if(est){ LE=linhasEst(D,r); LE.forEach(function(x){ eT+=x.tm+x.tp; eN+=x.nm+x.np; minLiq+=x.minM+x.minP; }); r=Object.assign({},r,{pontos:r.pontos!==''&&r.pontos!=null?r.pontos:LE.length}); }
  var pontos=r.pontos!==''&&r.pontos!=null?num(r.pontos):(r.auto?qtdPontos(D,r.auto):0);
  var tabU, tab;
  if(est){ tab=eT; tabU=pontos>0?tab/pontos:0; }
  else { tabU=num(r.tabela); var circ=!!r.auto&&r.auto.split(',').every(function(k){ return k==='mercado'||k==='guanabara'; }), qtd=circ?1:((r.pontos!==''&&r.pontos!=null)?num(r.pontos):(r.auto?qtdPreco(D,r.auto):1)); tab=tabU*(qtd>0?qtd:0); }
  var desc=est?(tab>0?(1-eN/tab)*100:0):num(r.desc), neg=est?eN:tab*(1-desc/100), modo=D.modoGeral, fin=modo==='liquido'?neg*(1-num(D.comissao)/100)*(1-num(D.bv)/100):neg;
  var ip=num(r.insPor), ins=ip?ip*pontos:0;
  if(!est&&r.auto){ minLiq=r.auto.split(',').reduce(function(a,k){ return a+selEstaticos(D,k).reduce(function(b,p){ return b+pLiq(p); },0); },0); }
  var liqNeg=neg*fatorLiq(D), abaixo=minLiq>0&&liqNeg<minLiq-0.005;
  return {minLiq:minLiq,liqNeg:liqNeg,abaixo:abaixo,incProd:!!r.incProd,nome:r.nome,pontos:pontos,periodo:r.periodo,insPor:ip,insercoes:ins?String(ins).replace(/\B(?=(\d{3})+(?!\d))/g,'.'):'—',insN:ins,linhas:LE,tabelaUnit:tabU,tabela:tab,desc:desc,neg:neg,modo:modo,final:fin};
}

/* ===== Estado, mapas, interface ===== */
var $=function(s,r){return (r||document).querySelector(s)};
var DEF=function(){ return {
 kit:{titulo:'Mídia Kit 2026',ano:'2026',frase1:'Pense grande.',frase2:'Pense MEGA.',subtitulo:'Mídia exterior digital e estática em Belo Horizonte, região metropolitana e Brasília',selo:'Belo Horizonte · Região Metropolitana · Brasília',
  sobre:'A MEGA é uma empresa especializada em mídia OOH, comunicação visual e projetos especiais. Temos diversas opções de mídias e equipe profissional extremamente capacitada. Executamos qualquer projeto dentro do estado de Minas Gerais, sempre com atendimento exclusivo e personalizado.',
  investTitulo:'Plataforma de mídia OOH',pagamento:'Forma de pagamento: em __ parcelas, com vencimento a partir de __/__/____.',validade:'Proposta válida por 07 (sete) dias. Valores sujeitos à disponibilidade dos pontos.',
  cliente:'',resp:{nome:'Keny Mendes',cargo:'Coordenador Operacional',email:'operacional@megamidiaooh.com.br',tel1:'(31) 98407-4135',tel2:'(31) 3267-5087',site:'www.megamidiaooh.com.br'},fotoCapa:'capa.jpg',fotoContra:null},
 specChips:{led:[['MP4','Extensão do arquivo'],['10 s','Duração do VT'],['500','Mínimo de veiculações por dia'],['20 MB','Tamanho máximo']],banca:[['MP4','Extensão do arquivo'],['10 s','Duração do VT'],['500 · 800','Mínimo de veiculações por dia'],['20 MB','Tamanho máximo']]},
 pontos:[], libMap:{}, lib:Object.assign({},DEFLIB), sepFotos:{}, mapStyle:'neon', 
 mercado:{circuito:'Circuito de 8 telas de LED',nTelas:8,lat:-19.9231747,lng:-43.943164,fotos:['mercado.jpg'],
  texto:'Maior mercado da América Latina e um dos principais pontos turísticos e gastronômicos de BH, recebendo visitantes do mundo todo.',
  tiles:[['400+','lojas'],['2.600','empregos diretos'],['15 mi','pessoas por ano'],['40 mil','pessoas/dia (meio de semana)'],['63 mil','veículos por mês'],['420','vagas rotativas']],
  pill1:'90 câmeras de monitoramento',pill2:'100 anos em setembro de 2029',destaque:['Praia dos Mineiros','60 mesas na calçada · sábados e domingos · 85.000 pessoas por ano'],
  demo:{tiles:[['28.965','População'],['R$ 7.767,60','Renda per capita'],['17.114','Domicílios'],['R$ 13.146,47','Renda média por domicílio']],faixaCats:['0–14','15–24','25–39','40–54','55+'],faixa:[0,15,25,19,35],genero:[57,43],classes:[29,42,28,1,1],renda:[17724.49,5152.82,1902.32,334.10,100.96],intCats:['Lanchonetes','Restaurantes','Padarias','Farmácias','Bancos'],intVals:[453,406,195,104,98]},
  specs:[['Painel de LED · estacionamento','1','5,00 x 2,00 m','1028 x 512'],['Painel de LED · saída de pedestres','1','2,00 x 1,00 m','624 x 320'],['Painéis de LED nos corredores','6','96 x 64 cm','1032 x 688']],dims:['5,00 m','2,00 m'],
  caption:'Painel do estacionamento. Há ainda 1 painel na saída de pedestres e 6 nos corredores.',chips:[['MP4','Extensão do arquivo'],['10 s','Duração do VT'],['220','Veiculações por dia'],['20 MB','Tamanho máximo']]},
 guanabara:{circuito:'Circuito de 10 telas de LED',nTelas:10,lat:-19.8594949,lng:-43.9786329,fotos:['guanabara1.jpg','guanabara2.jpg'],endereco:'Av. Otacílio Negrão de Lima, 2949 · São Luiz · Belo Horizonte – MG',
  texto:'Localizado em um dos principais cartões-postais de Belo Horizonte, na região da Lagoa da Pampulha, é um dos parques de diversões mais tradicionais do Brasil, com forte presença no imaginário afetivo dos mineiros. Ambiente estratégico de comunicação, conecta marcas a um público diversificado nos momentos de lazer.',
  tiles:[['70 mil','visitantes por mês'],['1951','ano de fundação'],['Própria','estacionamento no parque']],quem:['Famílias','Grupos escolares','Moradores de BH e região','Jovens e grupos de amigos','Turistas da Pampulha'],
  porque:'Alto fluxo mensal · Público variado e qualificado · Ambiente emocionalmente positivo · Forte lembrança de marca · Ações personalizadas',
  demo:{faixaCats:['18–25','26–40','41–55','55+'],faixa:[5,39,45,11],classes:[0,38,50,11,1],genero:[41,59],audiencia:[['Alcance','251.661'],['Impactos','268.324'],['Frequência','1,17']]},
  specs:[['Totens Guanabara','1,00 x 2,00 m','239 x 479'],['Painel de LED','4,00 x 2,00 m','768 x 320']],caption:'Totem (1 x 2 m) e painel de LED (4 x 2 m).',chips:[['MP4','Extensão do arquivo'],['10 s','Duração do VT'],['250','Veiculações por dia'],['20 MB','Tamanho máximo']]},
 brasilia:{tiles:[['3.854.278','usuários por mês'],['160 mil','usuários por dia'],['68%','usam o metrô todos os dias'],['59%','têm entre 21 e 40 anos'],['81%','com ensino médio completo'],['~20%','com nível superior completo']],genero:[53.4,45.4],generoNota:'1,2% se declararam com outra identidade.',fonte:'Pesquisa Ser Desenvolvimento Humano e Empresarial.',texto:'O Metrô-DF transporta por mês 3.854.278 usuários, sendo público A, B e C. A faixa etária é majoritariamente jovem, economicamente ativa e receptiva a novas tendências: mais de 59% dos passageiros têm entre 21 e 40 anos.',formatos:[['Envelopamento externo','Envelopamento externo de vagões'],['Cabeceira de vagão','Mídia na cabeceira do vagão'],['Mídia interna','Painéis dentro dos vagões'],['Interna em cabeceira','Mídia interna na cabeceira do vagão'],['Mídia nas estações','Painéis de 6,00 x 2,00 m (tamanhos variam por estação)']],dims:['1,92 m','2,88 m'],veic:'420',caption:'Painel de LED de 1,92 x 2,88 m (640 x 960 px).',painelChips:[['MP4','Extensão do arquivo'],['10 s','Duração do VT · sem animação'],['420','Inserções por dia'],['6 MB','Tamanho máximo']]},
 comissao:25, descAlerta:20, bv:0, modoGeral:'bruto',
 precos:[['Circuito Mercado Central','mercado','Mensal','220'],['Painéis de LED','led_mega,led_r2','Mensal','500'],['Bancas de LED','banca_mega,banca_r2','Mensal','500'],['Circuito Parque Guanabara','guanabara','Mensal','250'],['Empenas','empena','Mensal','—'],['Painéis frontlight','front','Mensal','—'],['Mega Painéis','mensal','Mensal','—'],['Painéis outdoor','outdoor','Bi-semana','—'],['Bancas Estáticas','revista','Mensal','—'],['Metrô-DF · mídia no metrô','metro','Mensal','—'],['Painéis de LED · Brasília','df_painel','Mensal','420']].map(function(r){ return {nome:r[0],auto:r[1],pontos:'',periodo:r[2],insercoes:r[3],tabela:'',desc:'',modo:'geral'}; })
};};
var D=DEF(), uid=0;
function newId(){ return 'p'+Date.now().toString(36)+(uid++); }

/* ---------- persistência: ver store.js e sync.js ---------- */
function mergeDef(base,src){ if(src===undefined||src===null) return base; if(Array.isArray(base)||typeof base!=='object'||base===null) return src; var o={}; Object.keys(base).forEach(function(k){ o[k]=mergeDef(base[k],src[k]); }); Object.keys(src).forEach(function(k){ if(!(k in o)) o[k]=src[k]; }); return o; }

/* ---------- fotos ---------- */
function readImage(file){ return new Promise(function(res,rej){ var fr=new FileReader(); fr.onload=function(){ var im=new Image(); im.onload=function(){ var s=Math.min(1,1800/Math.max(im.width,im.height)), cv=document.createElement('canvas'); cv.width=Math.round(im.width*s); cv.height=Math.round(im.height*s); var c=cv.getContext('2d'); c.fillStyle='#fff'; c.fillRect(0,0,cv.width,cv.height); c.drawImage(im,0,0,cv.width,cv.height); res(cv.toDataURL('image/jpeg',0.86)); }; im.onerror=rej; im.src=fr.result; }; fr.onerror=rej; fr.readAsDataURL(file); }); }
function dataToBlob(u){ var p=u.split(','), m=/:(.*?);/.exec(p[0])[1], b=atob(p[1]), n=b.length, u8=new Uint8Array(n); while(n--) u8[n]=b.charCodeAt(n); return new Blob([u8],{type:m}); }
function libSrc(k){ if(!k) return ''; if(String(k).indexOf('sb:')===0) return Store.photoUrl(String(k).slice(3)); if(D.libMap&&D.libMap[k]&&D.libMap[k]!==k) return libSrc(D.libMap[k]); return D.lib[k]||''; }
async function addPhoto(file){ var du=await readImage(file); var path=await Store.uploadPhoto(dataToBlob(du),ME.admin); return 'sb:'+path; }
async function loadPhoto(key){ var src=libSrc(key); if(!src) return null; var a=await loadAsset(src); if(!a||/^data:/.test(src)) return a; try{ var cv=document.createElement('canvas'); cv.width=a.w; cv.height=a.h; var c=cv.getContext('2d'); c.fillStyle='#fff'; c.fillRect(0,0,a.w,a.h); c.drawImage(a.el,0,0); a.src=cv.toDataURL('image/jpeg',0.9); }catch(e){ return null; } return a; }
function usedPhotoKeys(mode){ var ks={}; function add(v){ if(Array.isArray(v)) v.forEach(add); else if(typeof v==='string'&&v) ks[v]=1; }
  D.pontos.forEach(function(p){ if((mode==='proposta'||mode==='kit')&&!p.sel) return; add(p.foto); add(p.mapa); });
  [D.mercado,D.guanabara,D.brasilia].forEach(function(o){ if(!o) return; Object.keys(o).forEach(function(k){ if(/^foto/.test(k)) add(o[k]); }); });
  ['fotoCapa','fotoContra'].forEach(function(k){ add(D.kit[k]); }); Object.keys(D.sepFotos||{}).forEach(function(k){ add(D.sepFotos[k]); });
  return Object.keys(ks); }
function loadAsset(src){ return new Promise(function(res){ var im=new Image(); if(/^https?:/i.test(src)) im.crossOrigin='anonymous'; im.onload=function(){ res({src:src,w:im.width,h:im.height,el:im}); }; im.onerror=function(){ res(null); }; im.src=src; }); }

/* ---------- mapas ---------- */
var tileCache={}, mapCache={}, mapFail=0;
function tileLoad(u,nocount){ if(!tileCache[u]) tileCache[u]=new Promise(function(res){ var i=new Image(); i.crossOrigin='anonymous'; i.onload=function(){res(i)}; i.onerror=function(){ if(!nocount) mapFail++; res(null); }; i.src=u; }); return tileCache[u]; }
function osmUrl(z,x,y){ var n=1<<z; x=((x%n)+n)%n; return 'https://tile.openstreetmap.org/'+z+'/'+x+'/'+y+'.png'; }
function tileAny(st,z,x,y){ if(ONLINE) return Promise.resolve(null); var alt=mapSt(st)==='osm'?tileUrl('esri_street',z,x,y):osmUrl(z,x,y); return tileLoad(tileUrl(st,z,x,y),true).then(function(im){ return im||tileLoad(alt,false); }); }
function mapSt(st){ return ({neon:1,mega:1,esri_street:1,esri_gray:1,osm:1})[st]?st:'neon'; }
function esriUrl(svc,z,x,y){ var n=1<<z; x=((x%n)+n)%n; return 'https://server.arcgisonline.com/ArcGIS/rest/services/'+svc+'/MapServer/tile/'+z+'/'+y+'/'+x; }
function refUrl(z,x,y,st){ return esriUrl(mapSt(st)==='neon'?'Canvas/World_Dark_Gray_Reference':'Canvas/World_Light_Gray_Reference',z,x,y); }
function tileUrl(st,z,x,y){ st=mapSt(st); if(st==='osm') return 'https://tile.openstreetmap.org/'+z+'/'+(((x%(1<<z))+(1<<z))%(1<<z))+'/'+y+'.png'; var svc=st==='neon'?'Canvas/World_Dark_Gray_Base':(st==='esri_gray'||st==='mega')?'Canvas/World_Light_Gray_Base':'World_Street_Map'; return esriUrl(svc,z,x,y); }
function mapAttr(st){ st=mapSt(st); return st==='osm'?'© OpenStreetMap':'Tiles © Esri'; }
function worldXY(lat,lng,z){ var s=256*Math.pow(2,z), sn=Math.sin(lat*Math.PI/180); return {x:(lng+180)/360*s,y:(0.5-Math.log((1+sn)/(1-sn))/(4*Math.PI))*s}; }
function pinDraw(c,x,y,s){ var g=c.createRadialGradient(x,y,0,x,y,s*2.4); g.addColorStop(0,'rgba(255,0,102,.28)'); g.addColorStop(1,'rgba(255,0,102,0)'); c.fillStyle=g; c.beginPath(); c.arc(x,y,s*2.4,0,7); c.fill();
  c.save(); c.shadowColor='rgba(0,0,102,.35)'; c.shadowBlur=s*.5; c.shadowOffsetY=s*.18; c.fillStyle='#ff0066'; c.beginPath(); c.moveTo(x,y); c.bezierCurveTo(x-s*.95,y-s*.95,x-s*.95,y-s*2.45,x,y-s*2.45); c.bezierCurveTo(x+s*.95,y-s*2.45,x+s*.95,y-s*.95,x,y); c.fill(); c.restore();
  c.fillStyle='#fff'; c.beginPath(); c.arc(x,y-s*1.5,s*.42,0,7); c.fill(); c.fillStyle='#000066'; c.beginPath(); c.arc(x,y-s*1.5,s*.2,0,7); c.fill(); }
/* aproxima o mapa: um nível acima do zoom cadastrado (máx. 19) */
function zoomMapa(z){ return Math.min(19,+z||16); }
/* Estilo "Mega noturno": recolore o mapa escuro em azul-marinho, ruas em azul e avenidas em rosa com brilho */
function neonize(c,W,H){
  var im=c.getImageData(0,0,W,H), d=im.data, n=W*H, hist=new Uint32Array(256), L=new Uint8Array(n), i, j, k;
  for(i=0,j=0;i<n;i++,j+=4){ var l=(d[j]*77+d[j+1]*150+d[j+2]*29)>>8; L[i]=l; hist[l]++; }
  var bg=0, mx=0; for(k=0;k<256;k++) if(hist[k]>mx){ mx=hist[k]; bg=k; }
  var acc=0, hi=255, lim=n*0.997; for(k=0;k<256;k++){ acc+=hist[k]; if(acc>=lim){ hi=k; break; } }
  if(hi<=bg+8) hi=bg+40;
  var NV=[9,8,52], BL=[50,62,210], PK=[255,24,124];
  var gl=document.createElement('canvas'); gl.width=W; gl.height=H; var g=gl.getContext('2d'), gi=g.createImageData(W,H), gd=gi.data;
  for(i=0,j=0;i<n;i++,j+=4){ var t=(L[i]-bg)/(hi-bg); if(t<0) t=0; if(t>1) t=1; var r,gg,b,u;
    if(t<0.14){ u=t/0.14; r=NV[0]+u*8; gg=NV[1]+u*10; b=NV[2]+u*30; }
    else if(t<0.55){ u=(t-0.14)/0.41; r=NV[0]+(BL[0]-NV[0])*u; gg=NV[1]+(BL[1]-NV[1])*u; b=NV[2]+(BL[2]-NV[2])*u; }
    else { u=(t-0.55)/0.45; r=BL[0]+(PK[0]-BL[0])*u; gg=BL[1]+(PK[1]-BL[1])*u; b=BL[2]+(PK[2]-BL[2])*u; gd[j]=PK[0]; gd[j+1]=PK[1]; gd[j+2]=PK[2]; gd[j+3]=Math.round(255*u); }
    d[j]=r; d[j+1]=gg; d[j+2]=b; d[j+3]=255; }
  c.putImageData(im,0,0); g.putImageData(gi,0,0);
  try{ var bl=Math.max(2,Math.round(Math.min(W,H)*0.008)); c.save(); c.globalCompositeOperation='lighter';
    c.filter='blur('+bl+'px)'; c.globalAlpha=0.85; c.drawImage(gl,0,0);
    c.filter='blur('+(bl*3)+'px)'; c.globalAlpha=0.5; c.drawImage(gl,0,0); c.restore(); c.filter='none';
    var vg=c.createRadialGradient(W/2,H/2,Math.min(W,H)*0.35,W/2,H/2,Math.max(W,H)*0.75); vg.addColorStop(0,'rgba(5,4,30,0)'); vg.addColorStop(1,'rgba(5,4,30,.55)'); c.fillStyle=vg; c.fillRect(0,0,W,H);
  }catch(e){}
}
async function renderMap(pts,W,H,zoom,big){
  var key=[pts.map(function(p){return p.lat+','+p.lng}).join(';'),W,H,zoom,big,D.mapStyle].join('|'); if(mapCache[key]) return mapCache[key];
  var st=D.mapStyle, z=zoom||16, cx, cy;
  if(pts.length>1){
    var la=pts.map(function(p){return p.lat}), ln=pts.map(function(p){return p.lng}), cla=(Math.min.apply(null,la)+Math.max.apply(null,la))/2, cln=(Math.min.apply(null,ln)+Math.max.apply(null,ln))/2;
    for(z=17;z>8;z--){ var a=worldXY(Math.max.apply(null,la),Math.min.apply(null,ln),z), b=worldXY(Math.min.apply(null,la),Math.max.apply(null,ln),z); if((b.x-a.x)<W*0.8&&(b.y-a.y)<H*0.78) break; }
    var o=worldXY(cla,cln,z); cx=o.x; cy=o.y;
  } else { var o2=worldXY(pts[0].lat,pts[0].lng,z); cx=o2.x; cy=o2.y; }
  var cv=document.createElement('canvas'); cv.width=W; cv.height=H; var c=cv.getContext('2d'); c.fillStyle=mapSt(D.mapStyle)==='neon'?'#0b0a3a':'#eef0f7'; c.fillRect(0,0,W,H);
  var F=pts.length>1?1:1.7; /* mapa de 1 ponto: amplia, assim ruas e nomes ficam maiores e legíveis */
  var x0=cx-W/(2*F), y0=cy-H/(2*F), jobs=[]; var before=mapFail;
  if(ONLINE){ var gg=c.createLinearGradient(0,0,0,H); gg.addColorStop(0,'#f3f5fb'); gg.addColorStop(1,'#e6e9f4'); c.fillStyle=gg; c.fillRect(0,0,W,H); c.strokeStyle='rgba(0,0,102,.07)'; c.lineWidth=Math.max(1,H*.003); var st2=Math.round(H/9); for(var gx=0;gx<W;gx+=st2){ c.beginPath(); c.moveTo(gx,0); c.lineTo(gx,H); c.stroke(); } for(var gy=0;gy<H;gy+=st2){ c.beginPath(); c.moveTo(0,gy); c.lineTo(W,gy); c.stroke(); } if(pts.length===1){ c.strokeStyle='rgba(255,0,102,.22)'; c.lineWidth=Math.max(2,H*.004); [.12,.2,.29].forEach(function(r){ c.beginPath(); c.arc(W/2,H/2+Math.round(H*.05),H*r,0,7); c.stroke(); }); } }
  for(var ty=Math.floor(y0/256);ty<=Math.floor((y0+H/F)/256);ty++) for(var tx=Math.floor(x0/256);tx<=Math.floor((x0+W/F)/256);tx++) (function(tx,ty){ jobs.push(tileAny(st,z,tx,ty).then(function(im){ if(im) c.drawImage(im,(tx*256-x0)*F,(ty*256-y0)*F,256*F+1,256*F+1); })); })(tx,ty);
  await Promise.all(jobs);
  if(mapFail>before){ c.strokeStyle='#fff'; c.lineWidth=H*0.012; for(var i=0;i<6;i++){ c.beginPath(); c.moveTo(0,H*(i/5)); c.lineTo(W,H*((i*37%5)/5+0.1)); c.stroke(); } }
  if(mapSt(st)==='neon'){
    if(!(mapFail>before)) neonize(c,W,H);
    var jobsN=[]; for(var nty=Math.floor(y0/256);nty<=Math.floor((y0+H/F)/256);nty++) for(var ntx=Math.floor(x0/256);ntx<=Math.floor((x0+W/F)/256);ntx++) (function(tx,ty){ jobsN.push(tileLoad(refUrl(z,tx,ty,'neon'),true).then(function(im){ if(im){ try{ c.filter='brightness(1.25)'; }catch(e){} c.drawImage(im,(tx*256-x0)*F,(ty*256-y0)*F,256*F+1,256*F+1); try{ c.filter='none'; }catch(e){} } })); })(ntx,nty);
    await Promise.all(jobsN);
  } else if(mapSt(st)==='mega'){
    /* fundo branco Mega: leve tom azul-claro, rótulos de ruas por cima e mais contraste para ficarem legíveis */
    try{ c.save(); c.globalAlpha=0.05; c.fillStyle='#000066'; c.fillRect(0,0,W,H); c.restore(); }catch(e){}
    var jobsR=[]; for(var rty=Math.floor(y0/256);rty<=Math.floor((y0+H/F)/256);rty++) for(var rtx=Math.floor(x0/256);rtx<=Math.floor((x0+W/F)/256);rtx++) (function(tx,ty){ jobsR.push(tileLoad(refUrl(z,tx,ty,'mega'),true).then(function(im){ if(im){ try{ c.filter='contrast(1.35)'; }catch(e){} c.drawImage(im,(tx*256-x0)*F,(ty*256-y0)*F,256*F+1,256*F+1); try{ c.filter='none'; }catch(e){} } })); })(rtx,rty);
    await Promise.all(jobsR);
  } else if(!mapFail||mapFail<=before){ try{ c.filter='saturate(1.25) contrast(1.12)'; c.drawImage(cv,0,0); c.filter='none'; }catch(e){} }
  var s=Math.round(Math.min(W,H)*(pts.length>1?0.02:0.034));
  pts.forEach(function(p){ var w=worldXY(p.lat,p.lng,z); var px=(w.x-x0)*F, py=(w.y-y0)*F+(pts.length>1?0:Math.round(H*.05)); if(pts.length>1){ c.fillStyle='#fff'; c.beginPath(); c.arc(px,py,s*0.9,0,7); c.fill(); c.fillStyle='#ff0066'; c.beginPath(); c.arc(px,py,s*0.62,0,7); c.fill(); } else pinDraw(c,px,py,s); });
  if(!ONLINE){ c.font='400 '+Math.round(H*.016)+'px Poppins,Segoe UI,sans-serif'; c.textAlign='right'; var at=mapAttr(st), aw=c.measureText(at).width+16; var nn=mapSt(st)==='neon'; c.fillStyle=nn?'rgba(10,9,50,.75)':'rgba(255,255,255,.85)'; c.fillRect(W-aw-8,H-H*.045-6,aw,H*.045); c.fillStyle=nn?'#b9bde8':'#4a4a6a'; c.fillText(at,W-16,H-H*.045+H*.016*0.8-6); }
  var src=cv.toDataURL('image/jpeg',0.9); var a={src:src,w:W,h:H,el:cv,falhou:mapFail>before}; if(!a.falhou) mapCache[key]=a; return a;
}
function parseMapsText(text){
  text=(text||'').trim(); if(!text) return null; try{ text=decodeURIComponent(text); }catch(e){}
  var m; if((m=text.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/))) return {lat:+m[1],lng:+m[2]};
  if((m=text.match(/[?&](?:q|ll|query|center|destination|viewpoint)=(-?\d+(?:\.\d+)?)[,\s+]+(-?\d+(?:\.\d+)?)/))) return {lat:+m[1],lng:+m[2]};
  if((m=text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/))) return {lat:+m[1],lng:+m[2]};
  if((m=text.match(/\/maps\/(?:search|place|dir)\/(?:[^\/]*\/)?(-?\d+\.\d+),\+?\s*(-?\d+\.\d+)/))) return {lat:+m[1],lng:+m[2]};
  if((m=text.match(/^\s*(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/))) return {lat:+m[1],lng:+m[2]};
  return null; }

/* ---------- prévia do mapa no cadastro do ponto: o mesmo mapa que vai para o mídia kit ---------- */
function mapaPreview(obj){
  var img=h('img',{class:'mpimg',alt:'Mapa do ponto'}), msg=h('p',{class:'mpmsg'}), box=h('div',{class:'mapprev wide'},[h('div',{class:'mphead',text:'Mapa que vai para o mídia kit'}),h('div',{class:'mpbody'},[img,msg])]), tm=null, seq=0;
  function vazio(t){ img.removeAttribute('src'); img.hidden=true; msg.textContent=t; msg.className='mpmsg'; }
  async function gerar(){
    var la=obj.lat, ln=obj.lng, ok=la!=null&&la!==''&&ln!=null&&ln!==''&&!isNaN(la)&&!isNaN(ln)&&Math.abs(la)<=90&&Math.abs(ln)<=180;
    if(!ok){ vazio('Cole o link do Google Maps (ou a latitude e a longitude) e o mapa aparece aqui sozinho.'); return; }
    var my=++seq; msg.textContent='Gerando o mapa…'; msg.className='mpmsg'; img.hidden=true;
    try{
      var a=await renderMap([{lat:+la,lng:+ln}],1040,720,zoomMapa(obj.zoom)); if(my!==seq) return;
      img.src=a.src; img.hidden=false;
      if(a.falhou){ msg.textContent='Não consegui baixar o mapa agora (internet ou bloqueio do serviço de mapas). A posição está certa; o mapa será tentado de novo ao gerar o kit.'; msg.className='mpmsg err'; }
      else { msg.textContent=(obj.mapa&&(Array.isArray(obj.mapa)?obj.mapa.length:1)?'Este ponto tem uma imagem de mapa enviada, que tem prioridade no kit. ':'')+'Gerado a partir de '+Number(la).toFixed(6)+' , '+Number(ln).toFixed(6)+'. Ajuste o zoom se quiser mais perto ou mais longe.'; msg.className='mpmsg ok'; }
    }catch(e){ vazio('Não foi possível gerar o mapa: '+erroMsg(e)); }
  }
  var iniciou=false;
  function update(){ if(!iniciou) return; clearTimeout(tm); tm=setTimeout(gerar,450); }
  vazio('');
  function iniciar(){ if(iniciou) return; iniciou=true; gerar(); }
  if(window.IntersectionObserver){ var io=new IntersectionObserver(function(es){ if(es.some(function(e){return e.isIntersecting})){ io.disconnect(); iniciar(); } }); io.observe(box); } else iniciar();
  return {el:box,update:update};
}

/* ---------- preparação dos assets e geração ---------- */
var BASE={};
async function prepare(setStatus,mode){
  var A={photos:{},maps:{},logoW:BASE.logoW,logoC:BASE.logoC,mercN:BASE.mercN,mercW:BASE.mercW};
  var keys=usedPhotoKeys(mode); for(var i=0;i<keys.length;i++){ setStatus&&setStatus('Preparando fotos '+(i+1)+'/'+keys.length+'…'); A.photos[keys[i]]=await loadPhoto(keys[i]); }
  mapFail=0; var withLL=D.pontos.filter(function(p){return ((mode!=='proposta'&&mode!=='kit')||p.sel)&&p.lat!=null&&p.lat!==''&&p.lng!=null&&!isNaN(p.lat)}); var done=0;
  for(var j=0;j<withLL.length;j+=6){ await Promise.all(withLL.slice(j,j+6).map(async function(p){ A.maps[p.id]=await renderMap([{lat:+p.lat,lng:+p.lng}],1040,720,zoomMapa(p.zoom)); done++; setStatus&&setStatus('Gerando mapas '+done+'/'+withLL.length+'…'); })); }
  var all=withLL.filter(function(p){return p.secao!=='df_painel'}).map(function(p){return {lat:+p.lat,lng:+p.lng}}); all.push({lat:+D.mercado.lat,lng:+D.mercado.lng}); all.push({lat:+D.guanabara.lat,lng:+D.guanabara.lng});
  setStatus&&setStatus('Gerando mapa geral…'); A.mapGeral=await renderMap(all.filter(function(p){return !isNaN(p.lat)}),1460,890,0);
  var dfl=withLL.filter(function(p){return p.secao==='df_painel'}).map(function(p){return {lat:+p.lat,lng:+p.lng}}); if(dfl.length) A.mapDF=await renderMap(dfl,1500,890,0);
  if(+D.mercado.lat&&+D.mercado.lng) A.mapM=await renderMap([{lat:+D.mercado.lat,lng:+D.mercado.lng}],1000,1260,zoomMapa(16));
  A.mapG=await renderMap([{lat:+D.guanabara.lat,lng:+D.guanabara.lng}],1284,408,16); A.mapG2=await renderMap([{lat:+D.guanabara.lat,lng:+D.guanabara.lng}],1000,1150,16);
  D.pontos.forEach(function(p){ var mk=Array.isArray(p.mapa)?p.mapa[0]:p.mapa; if(mk&&A.photos[mk]) A.maps[p.id]=A.photos[mk]; }); A.mapFail=0; return A;
}
async function download(blob,name){ var u=URL.createObjectURL(blob), a=document.createElement('a'); a.href=u; a.download=name; document.body.appendChild(a); a.click(); setTimeout(function(){ a.remove(); URL.revokeObjectURL(u); },4000); }
function safeName(){ return (D.kit.titulo||'Midia_Kit').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\w\-]+/g,'_'); }
var lastSlides=null;
var PAG={sig:'',off:new Set()};
function sigPag(mode,n){ return mode+'|'+D.pontos.filter(function(p){return p.sel}).map(function(p){return p.id}).join(',')+'|'+n; }
async function generate(kind,mode){ mode=mode||'completo'; var nsel=D.pontos.filter(function(p){return p.sel}).length; if((mode==='proposta'||mode==='kit')&&!nsel){ var st0=$('#gstatus'); st0.textContent='Escolha ao menos um ponto no passo "Pontos" para gerar.'; st0.className='status err'; return; }
  var st=$('#gstatus'); var set=function(t,c){ st.textContent=t; st.className='status '+(c||''); };
  try{
    await fontsReady(); var A=await prepare(set,mode); var slides=buildSlides(D,A,mode); var sg=sigPag(mode,slides.length);
    if(kind!=='prev'&&PAG.sig===sg&&PAG.off.size){ slides=slides.filter(function(s,i){ return !PAG.off.has(i); }); slides.forEach(function(s,i){ if(s.pn) s.pn.str=(i+1<10?'0':'')+(i+1); }); }
    lastSlides=slides;
    if(A.mapFail) set('','err');
    if(kind==='pptx'){ set('Montando PowerPoint (editável)…'); if(!(await confirmarPrecos(mode,slides))){ set('Geração cancelada. Corrija os valores e gere de novo.',''); return; } var b=await buildPptx(slides,{title:D.kit.titulo}); var bk=await logProposta('pptx',mode); await download(b,safeName()+(mode==='proposta'||mode==='kit'?(mode==='kit'?'_MidiaKit':'_Proposta')+(D.kit.cliente?'_'+D.kit.cliente.replace(/[^\w\-]+/g,'_'):''):'')+'.pptx'); set('PowerPoint gerado ('+slides.length+' páginas). Arquivo salvo.'+bk+(A.mapFail?' (Alguns mapas ficaram simplificados.)':''),A.mapFail?'err':'ok'); }
    else if(kind==='pdf'){ if(!(await confirmarPrecos(mode,slides))){ set('Geração cancelada. Corrija os valores e gere de novo.',''); return; } var b2=await buildPdf(slides,function(i,n){ set('Gerando PDF… página '+i+'/'+n); }); var bk=await logProposta('pdf',mode); await download(b2,safeName()+(mode==='proposta'||mode==='kit'?(mode==='kit'?'_MidiaKit':'_Proposta')+(D.kit.cliente?'_'+D.kit.cliente.replace(/[^\w\-]+/g,'_'):''):'')+'.pdf'); set('PDF gerado ('+slides.length+' páginas). Arquivo salvo.'+bk+(A.mapFail?' (Alguns mapas ficaram simplificados.)':''),A.mapFail?'err':'ok'); }
    else { var box=$('#prev'); box.innerHTML=''; PAG={sig:sg,off:new Set()};
      var tb=document.createElement('div'); tb.className='ptool'; var info=document.createElement('span'); tb.appendChild(info);
      function upd(){ var n=slides.length-PAG.off.size; info.textContent=n+' de '+slides.length+' páginas vão no arquivo'+(PAG.off.size?' · '+PAG.off.size+' removida'+(PAG.off.size>1?'s':''):'')+'. Clique em ✕ para remover uma página.'; b1.textContent='⬇ PowerPoint ('+n+')'; b2.textContent='⬇ PDF ('+n+')'; b1.disabled=b2.disabled=!n; }
      var b1=document.createElement('button'); b1.type='button'; b1.className='btn pri'; b1.onclick=function(){ generate('pptx',mode); };
      var b2=document.createElement('button'); b2.type='button'; b2.className='btn'; b2.onclick=function(){ generate('pdf',mode); };
      tb.appendChild(b1); tb.appendChild(b2); box.appendChild(tb);
      for(var i=0;i<slides.length;i++){ (function(i){ var cv=document.createElement('canvas'); renderCanvas(slides[i],cv,520); var f=document.createElement('figure'); f.appendChild(cv); var cap=document.createElement('figcaption'); cap.textContent=(i+1); f.appendChild(cap);
        var x=document.createElement('button'); x.type='button'; x.className='pgx'; x.textContent='✕'; x.title='Remover esta página'; x.onclick=function(){ if(PAG.off.has(i)){ PAG.off.delete(i); f.classList.remove('off'); x.textContent='✕'; x.title='Remover esta página'; } else { PAG.off.add(i); f.classList.add('off'); x.textContent='↺'; x.title='Voltar com a página'; } upd(); };
        f.appendChild(x); box.appendChild(f); })(i); if(i%4==3) await new Promise(function(r){setTimeout(r,0)}); }
      upd(); set('Prévia pronta: '+slides.length+' páginas. Remova as que não quiser e baixe.','ok'); }
  }catch(e){ console.error(e); set('Erro ao gerar: '+(e&&e.message||e),'err'); }
}
function fontsReady(){ return Promise.all(['400 20px "Poppins Light"','400 20px "Poppins"','700 20px "Poppins"','400 20px "Poppins Medium"'].map(function(f){ return document.fonts.load(f); })); }

/* ===== Online: identidade, funções, sincronização ===== */
