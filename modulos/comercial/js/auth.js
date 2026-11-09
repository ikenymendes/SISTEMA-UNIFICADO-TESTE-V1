/* Tela de acesso: login, primeiro cadastro, espera de liberação e saída. */
function carro(cor){ return '<path d="M0 548 L0 540 Q2 535 10 535 L20 528 Q24 526 34 526 L48 526 Q54 527 58 535 L68 536 Q72 538 72 548 Z" fill="'+cor+'"/><path d="M24 535 L28 529 L38 529 L38 535 Z M42 535 L42 529 L49 529 L53 535 Z" fill="#0a0a50"/><circle cx="16" cy="548" r="6" fill="#05052e" stroke="#9a9aff" stroke-width="2"/><circle cx="56" cy="548" r="6" fill="#05052e" stroke="#9a9aff" stroke-width="2"/><path d="M72 540 L150 530 L150 556 Z" fill="#fff" opacity=".16"/><rect x="69" y="538" width="4" height="4" rx="2" fill="#fff8c0"/>'; }
function onibus(){ return '<rect x="0" y="512" width="150" height="36" rx="7" fill="#1c1c9a"/><rect x="8" y="517" width="92" height="22" rx="3" fill="#05052e"/><rect class="bustxt" x="8" y="517" width="92" height="22" rx="3" fill="#ff0066" opacity=".85"/><text x="54" y="533" text-anchor="middle" class="bt" style="font-size:11px">MEGA OOH</text><rect x="106" y="517" width="14" height="14" rx="2" fill="#7a7aff" opacity=".5"/><rect x="124" y="517" width="20" height="14" rx="2" fill="#7a7aff" opacity=".5"/><circle cx="28" cy="548" r="7" fill="#05052e" stroke="#9a9aff" stroke-width="2"/><circle cx="122" cy="548" r="7" fill="#05052e" stroke="#9a9aff" stroke-width="2"/>'; }
function estrelas(){ var o=''; for(var i=0;i<26;i++){ o+='<circle class="st" style="animation-delay:'+((i*0.37)%4).toFixed(1)+'s" cx="'+((i*97)%900-60)+'" cy="'+(12+(i*41)%200)+'" r="'+(i%3?1.2:1.8)+'" fill="#fff"/>'; } return o; }
function mercadoCentral(){
  var arcos=''; for(var i=0;i<4;i++){ var x=10+i*28; arcos+='<path d="M'+x+' 520 L'+x+' 492 Q'+(x+9)+' 478 '+(x+18)+' 492 L'+(x+18)+' 520 Z" fill="#05052e" stroke="#4a4ac8" stroke-width="1.5"/>'; }
  return '<g><rect x="-30" y="456" width="170" height="74" fill="#14147c"/><path d="M-30 456 L140 456 L140 450 L-30 450 Z" fill="#2323a8"/>'+
    '<rect x="42" y="392" width="46" height="64" fill="#1a1a92"/><path d="M38 392 L65 370 L92 392 Z" fill="#2a2ab4"/><circle cx="65" cy="408" r="9" fill="#05052e" stroke="#ffd96a" stroke-width="1.5"/><path d="M65 408 L65 402 M65 408 L70 410" stroke="#ffd96a" stroke-width="1.5" stroke-linecap="round"/>'+
    '<rect x="8" y="458" width="114" height="17" rx="3" fill="#ff0066"/><text x="65" y="470.5" text-anchor="middle" class="bt" style="font-size:9.5px">MERCADO CENTRAL</text>'+arcos+'</g>';
}
function rodaGigante(cx,cy,r){
  var raios='', cab='', cor=['#ff0066','#7a7aff','#ffd96a','#ff4d94'];
  for(var i=0;i<12;i++){ var a=i*Math.PI/6, x=(r*Math.cos(a)).toFixed(1), y=(r*Math.sin(a)).toFixed(1);
    raios+='<line x1="0" y1="0" x2="'+x+'" y2="'+y+'" stroke="#5a5ae0" stroke-width="1.4"/>';
    cab+='<g transform="translate('+x+','+y+')"><g><animateTransform attributeName="transform" type="rotate" from="0" to="-360" dur="46s" repeatCount="indefinite"/><line x1="0" y1="0" x2="0" y2="4" stroke="#8a8af0" stroke-width="1.5"/><rect x="-7" y="4" width="14" height="11" rx="3" fill="'+cor[i%4]+'"/></g></g>'; }
  return '<g transform="translate('+cx+','+cy+')"><line x1="0" y1="0" x2="-42" y2="146" stroke="#3a3aa6" stroke-width="5"/><line x1="0" y1="0" x2="42" y2="146" stroke="#3a3aa6" stroke-width="5"/>'+
    '<g><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="46s" repeatCount="indefinite"/><circle r="'+r+'" fill="none" stroke="#6a6af0" stroke-width="3"/><circle r="'+(r*0.55).toFixed(0)+'" fill="none" stroke="#4a4ac8" stroke-width="1.4"/>'+raios+cab+'</g><circle r="7" fill="#ff0066"/></g>';
}
function cenaSvg(logo){
  var win=''; for(var i=0;i<46;i++){ var x=18+((i*53)%700), y=330+((i*37)%170); win+='<rect class="tw" style="animation-delay:'+((i*0.7)%6).toFixed(1)+'s" x="'+x+'" y="'+y+'" width="5" height="7" rx="1"/>'; }
  function banca(x,d,tit){
    var rev=''; ['#ff0066','#ffd96a','#7a7aff','#ff4d94','#5adfa0','#ffd96a','#ff0066'].forEach(function(c,i){ rev+='<rect x="'+(20+i*9)+'" y="484" width="7" height="12" rx="1" fill="'+c+'"/>'; });
    var lis=''; for(var i=0;i<6;i++){ lis+='<rect x="'+(2+i*19.4)+'" y="475" width="9.7" height="8" fill="'+(i%2?'#ff0066':'#e9e9ff')+'"/>'; }
    return '<g transform="translate('+x+',0)">'+
    '<rect x="14" y="440" width="6" height="14" fill="#3a3aa6"/><rect x="96" y="440" width="6" height="14" fill="#3a3aa6"/>'+
    '<rect x="4" y="384" width="108" height="58" rx="5" fill="#10106e" stroke="#4a4ac8" stroke-width="2.5"/>'+
    '<rect x="8" y="388" width="100" height="50" rx="3" fill="#05052e"/>'+
    '<clipPath id="cb'+d+'"><rect x="8" y="388" width="100" height="50" rx="3"/></clipPath><g clip-path="url(#cb'+d+')">'+
    '<g class="bnr" style="animation-delay:-'+d+'s"><rect x="8" y="388" width="50" height="50" fill="#2d2de0"/><rect x="58" y="388" width="50" height="50" fill="#ff0066"/><rect x="108" y="388" width="50" height="50" fill="#2d2de0"/><rect x="158" y="388" width="50" height="50" fill="#ff0066"/></g>'+
    '<text x="58" y="418" text-anchor="middle" class="bt" style="font-size:18px">'+tit+'</text><text x="58" y="432" text-anchor="middle" class="bt s">BANCA DE LED</text></g>'+
    '<rect x="8" y="388" width="100" height="50" fill="url(#gap)"/>'+
    '<rect x="0" y="454" width="116" height="10" rx="2" fill="#2323a8"/><rect x="0" y="462" width="116" height="3" fill="#ff0066"/>'+
    '<rect x="6" y="465" width="104" height="65" fill="#1a1a92"/>'+
    lis+
    '<rect x="14" y="483" width="68" height="34" rx="2" fill="#05052e" stroke="#4a4ac8" stroke-width="1.5"/>'+rev+'<rect x="14" y="505" width="68" height="3" fill="#2c2c92"/>'+
    '<rect x="88" y="480" width="16" height="50" rx="2" fill="#0b0b5e" stroke="#4a4ac8" stroke-width="1.2"/><circle cx="100" cy="506" r="1.5" fill="#ffd96a"/>'+
    '<rect x="2" y="526" width="112" height="6" rx="2" fill="#06063a"/></g>'; }
  return '<svg class="cena" viewBox="0 0 760 560" preserveAspectRatio="xMidYMax meet" role="img" aria-label="Painel de LED e bancas de LED com horário e data">'+
  '<defs><pattern id="gap" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="none" stroke="#02021f" stroke-opacity=".55" stroke-width="1.3"/></pattern>'+
  '<linearGradient id="gBan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d2de0"/><stop offset="1" stop-color="#ff0066"/></linearGradient>'+
  '<linearGradient id="gScr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0a0a62"/><stop offset="1" stop-color="#1a1ab0"/></linearGradient>'+
  '<linearGradient id="gTr" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".9"/></linearGradient>'+
  '<clipPath id="cScr"><rect x="150" y="64" width="460" height="222" rx="4"/></clipPath><clipPath id="cPol"><rect x="514" y="484" width="132" height="26" rx="3"/></clipPath></defs>'+
  estrelas()+'<g fill="#0b0b5e" opacity=".9"><rect x="268" y="430" width="50" height="100"/><rect x="322" y="405" width="40" height="125"/><rect x="500" y="440" width="34" height="90"/></g>'+mercadoCentral()+''+win+
  '<rect x="-500" y="530" width="1760" height="30" fill="#04042b"/><rect x="-500" y="530" width="1760" height="3" fill="#ff0066" opacity=".8"/>'+
  '<line class="road" x1="-500" y1="548" x2="1260" y2="548" stroke="#6b6bd6" stroke-width="2" stroke-dasharray="26 22"/>'+
  '<rect x="372" y="286" width="16" height="246" fill="#2f2f9a"/><rect x="360" y="520" width="40" height="10" rx="3" fill="#1b1b78"/>'+
  '<rect x="138" y="52" width="484" height="246" rx="10" fill="#10106e" stroke="#4a4ac8" stroke-width="3"/>'+
  '<rect x="150" y="64" width="460" height="222" rx="4" fill="url(#gScr)"/>'+
  '<g clip-path="url(#cScr)">'+
    '<g class="sl s1"><text x="380" y="140" text-anchor="middle" class="big">Pense grande.</text><text x="380" y="196" text-anchor="middle" class="big pk">Pense MEGA.</text></g>'+
    '<g class="sl s2"><text x="380" y="128" text-anchor="middle" class="sm">Circuito de LED em BH</text><text x="380" y="178" text-anchor="middle" class="h2">Mercado Central</text><rect x="330" y="192" width="100" height="4" rx="2" fill="#ff4d94"/><text x="380" y="224" text-anchor="middle" class="mid">8 telas · 15 milhões de pessoas por ano</text></g>'+
    '<g class="sl s3"><text x="380" y="128" text-anchor="middle" class="sm">Circuito de LED na Pampulha</text><text x="380" y="178" text-anchor="middle" class="h2">Parque Guanabara</text><rect x="330" y="192" width="100" height="4" rx="2" fill="#ff4d94"/><text x="380" y="224" text-anchor="middle" class="mid">10 telas · 70 mil visitantes por mês</text></g>'+
    '<g class="sl s4"><image href="'+logo+'" x="290" y="96" width="180" height="46" preserveAspectRatio="xMidYMid meet"/><text x="380" y="184" text-anchor="middle" class="mid">Painéis de LED · Bancas de LED</text><text x="380" y="212" text-anchor="middle" class="sm">Belo Horizonte · Região Metropolitana · Brasília</text></g>'+
    '<rect x="150" y="250" width="460" height="36" fill="#05052e" opacity=".82"/><text class="dt" x="168" y="274"></text><text class="hr" x="592" y="275" text-anchor="end"><tspan class="hh">00</tspan><tspan class="cl">:</tspan><tspan class="mm">00</tspan></text>'+
    '<rect class="scan" x="150" y="64" width="90" height="222" fill="#fff" opacity=".13"/></g>'+
  '<rect x="150" y="64" width="460" height="222" rx="4" fill="url(#gap)"/>'+
  banca(150,3,'MEGA')+banca(395,9,'MEGA')+
  rodaGigante(578,385,78)+
  '<rect x="524" y="510" width="5" height="20" fill="#2f2f9a"/><rect x="628" y="510" width="5" height="20" fill="#2f2f9a"/><rect x="508" y="478" width="144" height="36" rx="5" fill="#10106e" stroke="#4a4ac8" stroke-width="2"/><rect x="514" y="484" width="132" height="26" rx="3" fill="#05052e"/><g clip-path="url(#cPol)"><g class="mq"><text x="650" y="502" textLength="330" lengthAdjust="spacingAndGlyphs" class="mqt">MERCADO CENTRAL  •  PARQUE GUANABARA  •  </text><text x="980" y="502" textLength="330" lengthAdjust="spacingAndGlyphs" class="mqt">MERCADO CENTRAL  •  PARQUE GUANABARA  •  </text></g></g><rect x="514" y="484" width="132" height="26" fill="url(#gap)"/>'+
  '<g class="veh v1">'+carro('#ff0066')+'</g><g class="veh v2">'+carro('#7a7aff')+'</g><g class="veh v3">'+onibus()+'</g>'+
  '</svg>';
}
function relogio(root){
  var dias=['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'], meses=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  function tick(){
    if(!document.body.contains(root)){ clearInterval(t); return; }
    var d=new Date(), hh=('0'+d.getHours()).slice(-2), mm=('0'+d.getMinutes()).slice(-2);
    root.querySelectorAll('.hh').forEach(function(e){ e.textContent=hh; }); root.querySelectorAll('.mm').forEach(function(e){ e.textContent=mm; });
    var dt=root.querySelector('.dt'); if(dt) dt.textContent=dias[d.getDay()].replace(/^./,function(c){return c.toUpperCase();})+', '+d.getDate()+' de '+meses[d.getMonth()];
  }
  var t=setInterval(tick,1000); tick();
}

/* Tela de acesso: login, primeiro cadastro, espera de liberação e saída. */
function gate(title,msg,actions,hero){ hero=hero||{};
  var g=$('#gate'); g.hidden=false; g.innerHTML='';
  var split=h('div',{class:'gsplit'});
  split.appendChild(h('div',{class:'gslash'}));
  var cena=h('div',{class:'scene'}); cena.innerHTML=cenaSvg(ASSETS.logoW);
  var hero=h('div',{class:'ghero'},[h('div',{class:'dots'}),h('div',{class:'ghtxt'},[h('img',{src:ASSETS.logoW,alt:'MEGA OOH',class:'ghlogo'}),cena,h('div',{class:'ghfoot'},[h('h1',{text:hero.h1||'Propostas de mídia exterior, do ponto ao PDF.'}),h('p',{text:hero.p||'Circuitos de LED no Mercado Central e no Parque Guanabara: o diferencial da Mega.'})])])]);
  split.appendChild(hero);
  var box=h('div',{class:'gbox'}); box.appendChild(h('h2',{text:title})); (Array.isArray(msg)?msg:[msg]).forEach(function(m){ if(m) box.appendChild(h('p',{class:'hint',text:m})); }); (actions||[]).forEach(function(a){ box.appendChild(a); });
  split.appendChild(h('div',{class:'gform'},[box])); g.appendChild(split); relogio(cena); return box;
}

function msgAuth(e){
  var m=erroMsg(e), l=String(m).toLowerCase();
  if(l.indexOf('invalid login')>=0) return 'E-mail ou senha incorretos.';
  if(l.indexOf('email not confirmed')>=0) return 'Confirme o seu e-mail pelo link que enviamos e tente de novo.';
  if(l.indexOf('already registered')>=0||l.indexOf('already been registered')>=0) return 'Este e-mail já tem cadastro. Use "Entrar".';
  if(l.indexOf('apenas para e-mails da empresa')>=0||l.indexOf('database error saving new user')>=0) return 'Cadastro permitido apenas para e-mails da empresa.';
  if(l.indexOf('password')>=0&&l.indexOf('6')>=0) return 'A senha precisa ter pelo menos 6 caracteres.';
  if(l.indexOf('rate limit')>=0) return 'Muitas tentativas. Aguarde alguns minutos.';
  if(l.indexOf('failed to fetch')>=0||l.indexOf('network')>=0) return 'Sem conexão com o servidor. Verifique a internet.';
  return m;
}

function telaLogin(modo,aviso){
  modo=modo||'entrar';
  var nome=h('input',{type:'text',placeholder:'seu nome',autocomplete:'name'});
  var email=h('input',{type:'email',placeholder:'e-mail',autocomplete:'username'});
  var senha=h('input',{type:'password',placeholder:'senha',autocomplete:modo==='entrar'?'current-password':'new-password'});
  var st=h('p',{class:'status'+(aviso?' ok':''),text:aviso||''});
  async function ir(){
    var e=emailKey(email.value), s=senha.value;
    if(!e||!s){ st.textContent='Preencha e-mail e senha.'; st.className='status err'; return; }
    btn.disabled=true; st.textContent=modo==='entrar'?'Entrando…':'Criando cadastro…'; st.className='status';
    try{
      if(modo==='entrar'){ await Store.entrar(e,s); await iniciarSessao(); return; }
      if(!nome.value.trim()){ st.textContent='Informe o seu nome.'; st.className='status err'; btn.disabled=false; return; }
      var r=await Store.cadastrar(e,s,nome.value.trim());
      if(r.session){ await iniciarSessao(); return; }
      telaLogin('entrar','Cadastro criado. Se pediu confirmação, abra o link enviado ao seu e-mail e depois entre. O administrador precisa liberar o seu acesso.');
    }catch(x){ st.textContent=msgAuth(x); st.className='status err'; btn.disabled=false; }
  }
  var btn=h('button',{class:'btn pri big',type:'button',text:modo==='entrar'?'Entrar':'Solicitar cadastro',onclick:ir});
  var troca=h('button',{class:'linklike',type:'button',text:modo==='entrar'?'Primeiro acesso? Solicitar cadastro':'Já tenho cadastro · Entrar',onclick:function(){ telaLogin(modo==='entrar'?'cadastro':'entrar'); }});
  var campos=modo==='entrar'?[email,senha]:[nome,email,senha];
  var box=gate(modo==='entrar'?'Entrar no gerador':'Solicitar cadastro',modo==='entrar'?'Use o e-mail e a senha do seu cadastro.':'Use o e-mail da empresa. Depois do cadastro, o administrador libera o seu acesso.',campos.concat([btn,st,troca]));
  box.addEventListener('keydown',function(ev){ if(ev.key==='Enter') ir(); });
  setTimeout(function(){ (campos[0]).focus(); },50);
}

async function iniciarSessao(){
  gate('Verificando seu acesso…','Um instante.');
  var perfil; try{ perfil=await Store.meuPerfil(); }catch(e){ gate('Não foi possível verificar o acesso',erroMsg(e),[h('button',{class:'btn',text:'Tentar de novo',onclick:iniciarSessao}),h('button',{class:'btn',text:'Sair',onclick:sairDoGerador})]); return; }
  if(!perfil){ telaLogin('entrar'); return; }
  ME.uid=perfil.id; ME.email=perfil.email; ME.nome=perfil.nome||perfil.email; ME.papel=perfil.papel; ME.admin=perfil.papel==='admin';
  var l=lsGet(); if(l) L=Object.assign(L,l);
  if(perfil.papel==='admin'||perfil.papel==='comercial'){ entered=true; enterApp(); return; }
  entered=false; telaPendente(perfil.papel);
}
var unsubPerfil=null;
function telaPendente(papel){
  var sair=h('button',{class:'btn',type:'button',text:'Sair',onclick:sairDoGerador});
  var atual=h('button',{class:'btn pri',type:'button',text:'Já fui liberado · atualizar',onclick:iniciarSessao});
  if(papel==='bloqueado'){ gate('Acesso bloqueado','O administrador bloqueou o acesso de '+ME.email+'.',[sair]); return; }
  gate('Aguardando liberação',['Você entrou como '+ME.email+'.','O administrador precisa liberar o seu acesso (comercial ou administrador). Assim que liberar, toque em atualizar.'],[h('div',{class:'bar'},[atual,sair])]);
  if(unsubPerfil) unsubPerfil(); unsubPerfil=Store.assinar('profiles',function(ev){ if(ev.new&&ev.new.id===ME.uid&&ev.new.papel!==papel){ iniciarSessao(); } });
}
async function sairDoGerador(){
  try{ sessionStorage.removeItem('mk_bv'); }catch(e){}
  try{ if(window.parent!==window && window.parent.MEGA){ window.parent.MEGA.sair(); return; } }catch(e){}
  try{ await Store.sair(); }catch(e){}
  try{ location.reload(); }catch(e){}
}

async function boot(){
  $('#hl').src=ASSETS.logoW;
  for(var k of ['logoW','logoC','mercN','mercW']){ var a=await loadAsset(ASSETS[k]); if(a){ try{ var cv=document.createElement('canvas'); cv.width=a.w; cv.height=a.h; cv.getContext('2d').drawImage(a.el,0,0); a.src=cv.toDataURL('image/png'); }catch(e){ console.warn('logo',k,e); } } BASE[k]=a; }
  if(!Store.configurado()){
    gate('Falta configurar o Supabase',['Abra o arquivo js/config.js e cole a "Project URL" e a "anon key" do seu projeto Supabase (Project Settings > API).','Veja o passo a passo no README.md.']); return;
  }
  if(!Store.configOk()){
    gate('O endereço do Supabase está errado',['A "Project URL" em js/config.js precisa ser exatamente assim: https://xxxxxxxx.supabase.co (começa com https://, termina em .supabase.co, sem espaços e sem nada depois).','Valor lido agora: '+JSON.stringify(String((window.MEGAKIT_CONFIG||{}).SUPABASE_URL||'').slice(0,80))]); return;
  }
  if(!Store.init()){ gate('Não foi possível iniciar','A biblioteca do Supabase não carregou. Recarregue a página.'); return; }
  try{ var s=await Store.sessao(); if(s){ await iniciarSessao(); return; } }catch(e){ console.warn(e); }
  telaLogin('entrar');
}


/* ---- saudação rápida após o login (~2,8 s; clique para pular) ---- */
function boasVindas(){
  return new Promise(function(res){
    try{ if(window.parent&&window.parent!==window&&window.parent.MEGA){ res(); return; } }catch(e){}  /* dentro da casca: sem saudação própria (o Início da casca faz isso) */
    try{ if(sessionStorage.getItem('mk_bv')===ME.uid){ res(); return; } }catch(e){}
    var d=new Date(), h0=d.getHours(), sau=h0<12?'Bom dia':h0<18?'Boa tarde':'Boa noite';
    var nome=String(ME.nome||ME.email||'').split(/[ @.]/)[0]; nome=nome.charAt(0).toUpperCase()+nome.slice(1).toLowerCase();
    var dias=['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'], meses=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    var quando=dias[d.getDay()].replace(/^./,function(c){return c.toUpperCase();})+', '+d.getDate()+' de '+meses[d.getMonth()]+' · '+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);
    var o=h('div',{class:'welcome',role:'status'},[h('div',{class:'dots'}),h('div',{class:'wbody'},[h('img',{src:ASSETS.logoW,alt:'MEGA OOH',class:'wlogo'}),h('div',{class:'wsau',text:sau+','}),h('div',{class:'wnome',text:nome}),h('div',{class:'wbar'}),h('div',{class:'wtxt',text:'Bem-vindo ao software de propostas da Mega OOH'}),h('div',{class:'wdt',text:quando})])]);
    document.body.appendChild(o);
    var feito=false; function fim(){ if(feito) return; feito=true; try{ sessionStorage.setItem('mk_bv',ME.uid); }catch(e){} o.classList.add('out'); setTimeout(function(){ o.remove(); },450); res(); }
    o.addEventListener('click',fim); setTimeout(fim,2800);
  });
}
