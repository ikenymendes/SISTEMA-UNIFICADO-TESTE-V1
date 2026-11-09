/* Camada de dados: tudo que fala com o Supabase fica aqui (login, pontos, sugestões, propostas, fotos). */
var Store = (function(){
  var sb = null;
  var CFG = window.MEGAKIT_CONFIG || {};

  function urlValida(u){ try{ var x=new URL(String(u||'').trim()); return x.protocol==='https:'&&/\.supabase\.(co|in)$/.test(x.hostname); }catch(e){ return false; } }
  function configurado(){ return !!CFG.SUPABASE_URL && !/COLE_AQUI/.test(CFG.SUPABASE_URL) && !!CFG.SUPABASE_ANON_KEY && !/COLE_AQUI/.test(CFG.SUPABASE_ANON_KEY); }
  function configOk(){ return configurado() && urlValida(CFG.SUPABASE_URL); }
  /* Dentro da casca unificada (iframe) usa o mesmo cliente/sessão da casca. */
  function clienteDaCasca(){ try{ return (window.parent!==window && window.parent.MEGA && window.parent.MEGA.client) || null; }catch(e){ return null; } }
  function init(){
    var host=clienteDaCasca();
    if(host){ sb=host; return true; }
    if(!configurado() || !window.supabase) return false;
    sb = window.supabase.createClient(String(CFG.SUPABASE_URL).trim(), String(CFG.SUPABASE_ANON_KEY).trim(), { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:false } });
    return true;
  }
  function must(r){ if(r.error) throw r.error; return r.data; }
  function uuid(){ return (window.crypto&&crypto.randomUUID)?crypto.randomUUID():('x'+Date.now().toString(36)+Math.random().toString(36).slice(2,10)); }

  /* ---------- acesso ---------- */
  async function sessao(){ var r=await sb.auth.getSession(); return r.data&&r.data.session||null; }
  async function entrar(email,senha){ return must(await sb.auth.signInWithPassword({email:email,password:senha})); }
  async function cadastrar(email,senha,nome){ return must(await sb.auth.signUp({email:email,password:senha,options:{data:{nome:nome||''}}})); }
  async function sair(){ await sb.auth.signOut(); }
  async function meuPerfil(){ var s=await sessao(); if(!s) return null; var r=await sb.from('profiles').select('*').eq('id',s.user.id).maybeSingle(); return must(r); }

  /* ---------- kit: configuração e pontos ---------- */
  async function lerConfig(){ var r=await sb.from('config').select('data').eq('id','main').maybeSingle(); var d=must(r); return d?d.data:null; }
  async function gravarConfig(body){ must(await sb.from('config').upsert({id:'main',data:body})); }
  /* Gerente comercial: só os preços base (config) e o valor líquido/produção de cada ponto; o banco recusa qualquer outra coisa. */
  async function gravarPrecosBase(body){ must(await sb.rpc('gerente_gravar_precos',{p:body})); }
  async function gravarValoresPontos(lista){ must(await sb.rpc('gerente_gravar_valores_pontos',{p:lista})); }
  async function lerPontos(){ var d=must(await sb.from('pontos').select('id,ord,data').order('ord',{ascending:true})); return d.map(function(r){ var p=Object.assign({},r.data,{id:r.id}); if(r.ord!=null) p.ord=r.ord; return p; }); }
  async function gravarPontos(lista){ if(!lista.length) return; must(await sb.from('pontos').upsert(lista.map(function(p){ return {id:p.id,ord:p.ord==null?null:p.ord,data:p}; }))); }
  async function apagarPontos(ids){ if(!ids.length) return; must(await sb.from('pontos').delete().in('id',ids)); }

  /* ---------- fotos ---------- */
  async function enviarFoto(blob,admin){
    var s=await sessao(); var nome=uuid()+'.jpg';
    var path=(admin?'pontos/':('sugestoes/'+s.user.id+'/'))+nome;
    must(await sb.storage.from('fotos').upload(path,blob,{contentType:'image/jpeg',upsert:false}));
    return path;
  }
  function urlFoto(path){ return sb.storage.from('fotos').getPublicUrl(path).data.publicUrl; }

  /* ---------- sugestões ---------- */
  async function criarSugestao(row){ must(await sb.from('sugestoes').insert({tipo:row.tipo,ponto_id:row.ponto_id||null,payload:row.payload,antes:row.antes||null,motivo:row.motivo||null})); }
  async function listarSugestoes(status){ var q=sb.from('sugestoes').select('*').order('criado_em',{ascending:false}).limit(500); if(status) q=q.eq('status',status); return must(await q); }
  async function contarPendentes(){ var r=await sb.from('sugestoes').select('id',{count:'exact',head:true}).eq('status','pendente'); if(r.error) throw r.error; return r.count||0; }
  async function resolverSugestao(id,acao,payload,resposta){ must(await sb.rpc('resolver_sugestao',{p_id:id,p_acao:acao,p_payload:payload||null,p_resposta:resposta||null})); }

  /* ---------- propostas (backup) ---------- */
  async function salvarProposta(row){ var r=await sb.from('propostas').insert(row); if(r.error&&/bv/i.test(r.error.message||'')){ var c=Object.assign({},row); delete c.bv; r=await sb.from('propostas').insert(c); } must(r); }
  async function listarPropostas(colunas){
    var out=[], from=0, step=1000;
    while(true){
      var r=await sb.from('propostas').select(colunas||'*').order('criado_em',{ascending:false}).range(from,from+step-1);
      var d=must(r); out=out.concat(d); if(d.length<step) break; from+=step; if(from>50000) break;
    }
    return out;
  }

  /* ---------- usuários ---------- */
  async function listarUsuarios(){ return must(await sb.from('profiles').select('*').order('criado_em',{ascending:true})); }
  async function criarUsuario(email,senha,nome,papel){ return must(await sb.rpc('admin_criar_usuario',{p_email:email,p_senha:senha,p_nome:nome||'',p_papel:papel})); }
  async function redefinirSenha(id,senha){ must(await sb.rpc('admin_redefinir_senha',{p_id:id,p_senha:senha})); }
  async function mudarPapel(id,papel){ must(await sb.from('profiles').update({papel:papel}).eq('id',id)); }

  /* ---------- tempo real ---------- */
  function assinar(tabela,cb){
    var ch=sb.channel('rt-'+tabela+'-'+uuid()).on('postgres_changes',{event:'*',schema:'public',table:tabela},function(ev){ try{ cb(ev); }catch(e){ console.error(e); } }).subscribe();
    return function(){ try{ sb.removeChannel(ch); }catch(e){} };
  }

  return { init:init, configurado:configurado, configOk:configOk, sessao:sessao, entrar:entrar, cadastrar:cadastrar, sair:sair, meuPerfil:meuPerfil,
    lerConfig:lerConfig, gravarConfig:gravarConfig, gravarPrecosBase:gravarPrecosBase, gravarValoresPontos:gravarValoresPontos, lerPontos:lerPontos, gravarPontos:gravarPontos, apagarPontos:apagarPontos,
    uploadPhoto:enviarFoto, photoUrl:urlFoto,
    criarSugestao:criarSugestao, listarSugestoes:listarSugestoes, contarPendentes:contarPendentes, resolverSugestao:resolverSugestao,
    salvarProposta:salvarProposta, listarPropostas:listarPropostas, listarUsuarios:listarUsuarios, criarUsuario:criarUsuario, redefinirSenha:redefinirSenha, mudarPapel:mudarPapel, assinar:assinar };
})();
