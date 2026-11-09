/* Usuários (administrador): liberar cadastros e definir função. */
function viewUsuarios(v){
  var so=(function(){ try{ return window.parent!==window&&!!window.parent.MEGA; }catch(e){ return false; } })(); if(so) v.classList.add('so-ass');
  v.appendChild(h('h2',{text:so?'Assinaturas da contracapa':'Usuários e funções'}));
  v.appendChild(h('p',{class:'hint',text:so?'Cada usuário pode ter a sua assinatura na contracapa do mídia kit e da proposta. Para criar usuários e definir funções, use Usuários no menu principal.':'Quem se cadastra na tela de entrada aparece aqui como "Pendente". Comercial monta propostas, gera o mídia kit e sugere pontos. Operacional e Manutenção acessam só a Gestão Operacional. Administrador acessa tudo: edita pontos, textos e preços base, decide as sugestões e vê o dashboard. "Bloqueado" impede o acesso.'}));
  v.appendChild(formNovoUsuario(function(){ load(); }));
  var pend=h('div'), tab=h('div',{class:'tw'}), ass=h('div',{class:'card pad'}); v.appendChild(h('h3',{class:'x-pend',text:'Aguardando liberação'})); pend.className='x-pend'; v.appendChild(pend); v.appendChild(h('h3',{text:'Usuários'})); v.appendChild(tab); v.appendChild(ass); v.appendChild(ass);
  var lista=[];
  async function mudar(u,papel){ try{ await Store.mudarPapel(u.id,papel); u.papel=papel; toast('Acesso de '+u.email+' atualizado.'); draw(); }catch(e){ toast('Não foi possível salvar: '+erroMsg(e),true); load(); } }
  function draw(){
    pend.innerHTML=''; var ps=lista.filter(function(u){ return u.papel==='pendente'; });
    if(!ps.length) pend.appendChild(h('p',{class:'hint',text:'Nenhuma solicitação pendente.'}));
    ps.forEach(function(u){ pend.appendChild(h('div',{class:'urow'},[h('span',{class:'t',text:u.email+(u.nome&&u.nome!==u.email.split('@')[0]?' · '+u.nome:'')}),h('button',{class:'btn',type:'button',text:'Liberar como comercial',onclick:function(){ mudar(u,'comercial'); }}),h('button',{class:'btn',type:'button',text:'Liberar como admin',onclick:function(){ mudar(u,'admin'); }}),h('button',{class:'mini del',type:'button',text:'bloquear',onclick:function(){ mudar(u,'bloqueado'); }})])); });
    tab.innerHTML=''; var t=h('table',{class:'ptab'}); t.appendChild(h('thead',{},[h('tr',{},['Nome','E-mail','Função','Assinatura','Senha','Cadastro'].map(function(x){ return h('th',{text:x}); }))])); var tb=h('tbody'); t.appendChild(tb);
    lista.forEach(function(u){
      var eu=u.id===ME.uid, sel=h('select',{},[['admin','Administrador'],['comercial','Comercial'],['operacional','Operacional'],['manutencao','Manutenção'],['financeiro','Financeiro'],['pendente','Pendente'],['bloqueado','Bloqueado']].map(function(o){ var op=h('option',{value:o[0],text:o[1]}); if(u.papel===o[0]) op.selected=true; return op; }));
      if(eu){ sel.disabled=true; sel.title='Você não pode alterar a própria função.'; }
      sel.addEventListener('change',function(){ var novo=sel.value; if(u.papel==='admin'&&novo!=='admin'){ askPin('Remover acesso de administrador',u.email).then(function(ok){ if(ok) mudar(u,novo); else sel.value=u.papel; }); } else mudar(u,novo); });
      var temAss=!!(D.kit.assinaturas&&D.kit.assinaturas[u.id]&&ASS_CAMPOS.some(function(c){return String(D.kit.assinaturas[u.id][c[0]]||'').trim();}));
      var btnAss=h('button',{class:'mini',type:'button',text:temAss?'Editar':'Definir',title:'Assinatura da contracapa deste usuário',onclick:function(){ abrirAss(u); }});
      tb.appendChild(h('tr',{},[h('td',{text:(u.nome||'—')+(eu?'  (você)':'')}),h('td',{text:u.email}),h('td',{},[sel]),h('td',{},[h('span',{class:'hint',text:temAss?'Personalizada ':'Padrão '}),btnAss]),h('td',{},[h('button',{class:'mini',type:'button',text:'Redefinir',title:'Definir uma nova senha para este usuário',onclick:function(){ redefinirSenha(u); }})]),h('td',{text:dataBR(u.criado_em)})]));
    });
    tab.appendChild(t);
  }
  function abrirAss(u){
    D.kit.assinaturas=D.kit.assinaturas||{}; var a=D.kit.assinaturas[u.id]=D.kit.assinaturas[u.id]||{};
    ass.innerHTML=''; var pd=assinaturaDe(null);
    ass.appendChild(h('h3',{text:'Assinatura de '+(u.nome||u.email)}));
    ass.appendChild(h('p',{class:'hint',text:'Aparece na contracapa do mídia kit e da proposta gerados por este usuário. Campo em branco usa o Responsável padrão (aba Kit).'}));
    var g=h('div',{class:'grid'}); ASS_CAMPOS.forEach(function(c){ var i=inp(a,c[0],{onchange:function(){ draw(); }}); i.placeholder=pd[c[0]]||''; g.appendChild(field(c[1],i)); }); ass.appendChild(g);
    ass.appendChild(h('div',{class:'row'},[h('button',{class:'btn',type:'button',text:'Preencher com nome e e-mail do usuário',onclick:function(){ a.nome=u.nome||''; a.email=u.email; dirty(); abrirAss(u); }}),h('button',{class:'btn',type:'button',text:'Voltar ao padrão',onclick:function(){ delete D.kit.assinaturas[u.id]; dirty(); ass.innerHTML=''; draw(); }}),h('button',{class:'btn',type:'button',text:'Fechar',onclick:function(){ ass.innerHTML=''; }})]));
    ass.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function load(){ Store.listarUsuarios().then(function(d){ lista=d; draw(); }).catch(function(e){ tab.innerHTML=''; tab.appendChild(h('p',{class:'status err pad',text:'Não foi possível carregar: '+erroMsg(e)})); }); }
  load();
}


/* campo de senha mascarado, com olho para conferir enquanto digita */
function campoSenha(ph,auto){
  var i=h('input',{type:'password',placeholder:ph||'senha',autocomplete:auto||'new-password'});
  var b=h('button',{type:'button',class:'eye',title:'Mostrar ou ocultar',text:'👁',onclick:function(){ i.type=i.type==='password'?'text':'password'; }});
  return {input:i,el:h('div',{class:'pw'},[i,b])};
}
function copiarTexto(t){ try{ return navigator.clipboard.writeText(t); }catch(e){ return Promise.reject(e); } }
function textoAcesso(email,senha){ return 'Gerador de Mídia Kit · Mega Mídia OOH\nSite: '+location.href.split('#')[0].split('?')[0]+'\nE-mail: '+email+'\nSenha: '+senha; }

function formNovoUsuario(depois){
  var nome=h('input',{type:'text',placeholder:'Nome',autocomplete:'off'}), email=h('input',{type:'email',placeholder:'e-mail do usuário',autocomplete:'off'});
  var sn=campoSenha('Senha (mínimo 6 caracteres)'), papel=h('select',{},[['comercial','Comercial'],['operacional','Operacional'],['manutencao','Manutenção'],['financeiro','Financeiro'],['admin','Administrador']].map(function(o){ return h('option',{value:o[0],text:o[1]}); }));
  var st=h('p',{class:'status'}), btn=h('button',{class:'btn pri',type:'button',text:'Criar usuário'});
  btn.onclick=async function(){
    var em=emailKey(email.value), se=sn.input.value;
    if(!em||!se){ st.className='status err'; st.textContent='Preencha e-mail e senha.'; return; }
    if(papel.value==='admin'&&!(await askPin('Criar administrador',em))) return;
    btn.disabled=true; st.className='status'; st.textContent='Criando…';
    try{
      await Store.criarUsuario(em,se,nome.value.trim(),papel.value);
      var tx=textoAcesso(em,se); nome.value=''; email.value=''; sn.input.value=''; sn.input.type='password'; st.textContent='';
      abrirModal('Usuário criado',[h('p',{class:'hint',text:em+' já pode entrar como '+({admin:'administrador',comercial:'comercial',operacional:'operacional',financeiro:'financeiro',manutencao:'manutenção'}[papel.value]||papel.value)+'.'}),h('div',{class:'cred'},[h('div',{},[h('span',{text:'E-mail'}),h('b',{text:em})]),h('div',{},[h('span',{text:'Senha'}),h('b',{text:'••••••••'})])]),h('p',{class:'hint',text:'A senha fica oculta. Use o botão para copiar o acesso e enviar ao usuário. Depois de fechar esta janela ela não aparece mais.'})],[
        function(){ return h('button',{class:'btn pri',type:'button',text:'Copiar acesso',onclick:function(e){ var b=e.target; copiarTexto(tx).then(function(){ b.textContent='Copiado ✓'; },function(){ b.textContent='Não foi possível copiar'; }); }}); },
        function(fechar){ return h('button',{class:'btn',type:'button',text:'Fechar',onclick:fechar}); }]);
      if(depois) depois();
    }catch(e){ st.className='status err'; st.textContent=erroMsg(e); }
    btn.disabled=false;
  };
  return h('section',{class:'card newuser'},[h('h3',{text:'Criar usuário'}),h('p',{class:'hint',text:'Defina e-mail e senha e passe o acesso para a pessoa testar. O usuário já entra liberado, sem confirmar e-mail. A senha nunca é exibida depois.'}),
    h('div',{class:'grid'},[field('Nome',nome),field('E-mail',email),field('Senha',sn.el),field('Função',papel)]),h('div',{class:'bar'},[btn]),st]);
}
function redefinirSenha(u){
  var sn=campoSenha('Nova senha (mínimo 6 caracteres)'), er=h('p',{class:'status err'});
  abrirModal('Redefinir senha',[h('p',{class:'hint',text:u.email}),field('Nova senha',sn.el),er],[
    function(fechar){ return h('button',{class:'btn pri',type:'button',text:'Salvar nova senha',onclick:async function(e){ var b=e.target; b.disabled=true; try{ await Store.redefinirSenha(u.id,sn.input.value); var tx=textoAcesso(u.email,sn.input.value); fechar(); toast('Senha de '+u.email+' atualizada. Acesso copiado para enviar.'); copiarTexto(tx).catch(function(){}); }catch(x){ er.textContent=erroMsg(x); b.disabled=false; } }}); },
    function(fechar){ return h('button',{class:'btn',type:'button',text:'Cancelar',onclick:fechar}); }]);
}
