const { chromium } = require('playwright');
const BASE='http://127.0.0.1:8765/', OUT=process.argv[2];
const ok=(n,c,x='')=>console.log((c?'OK   ':'FALHA')+' '+n+(x?' · '+x:''));
(async()=>{
 const b=await chromium.launch();
 // 1) sair de dentro do operacional volta ao login da casca
 {
  const ctx=await b.newContext({viewport:{width:1300,height:800}});const p=await ctx.newPage();const erros=[];p.on('pageerror',e=>erros.push(e.message));
  await p.goto(BASE);await p.click('.teste-box button:has-text("Operacional")');await p.waitForSelector('.palco iframe');await p.waitForTimeout(5000);
  const f=p.frames().find(x=>x.url().includes('modulos/operacional'));
  // dados chegaram?
  const n=await f.evaluate(()=>({vts:S.vts.length,fixos:S.fixos.length,role:ROLE,nome:PERFIL&&PERFIL.nome}));
  ok('operacional: dados carregados do banco',n.vts>0&&n.fixos>0,JSON.stringify(n));
  ok('operacional: papel reconhecido como operacional',n.role==='operacional');
  // operador NÃO pode apagar/alterar ponto fixo: botão admin não aparece (aba Admin só com Status e Manutenções)
  const subs=await f.evaluate(()=>{adm="s";view="a";render();return [...document.querySelectorAll('#app .tabs button')].map(b=>b.textContent.trim())});
  ok('operacional: Admin só mostra Status dos VTs e Manutenções',JSON.stringify(subs)==JSON.stringify(['Status dos VTs','Manutenções']),subs.join('|'));
  // proteção no banco: tentar ler tabelas comerciais pelo cliente da casca
  const leitura=await p.evaluate(async()=>{const r=await MEGA.client.from('pontos').select('id').limit(3);const q=await MEGA.client.from('propostas').select('id').limit(3);return {pontos:(r.data||[]).length,propostas:(q.data||[]).length,e1:!!r.error,e2:!!q.error}});
  ok('operacional: banco não entrega pontos/propostas comerciais',leitura.pontos===0&&leitura.propostas===0,JSON.stringify(leitura));
  await f.evaluate(()=>{document.querySelector('[data-a=sair]')&&document.querySelector('[data-a=sair]').click()});
  await p.waitForSelector('.login',{timeout:10000});
  ok('operacional: "sair" do módulo volta ao login único',await p.locator('.login').count()===1);
  ok('operacional: sem erros de JS',erros.length===0,erros.join('|'));await ctx.close();
 }
 // 2) comercial: sem acesso a registros operacionais; sair volta ao login
 {
  const ctx=await b.newContext({viewport:{width:1300,height:800}});const p=await ctx.newPage();const erros=[];p.on('pageerror',e=>erros.push(e.message));
  await p.goto(BASE);await p.click('.teste-box button:has-text("Comercial")');await p.waitForSelector('.palco iframe');await p.waitForTimeout(5000);
  const leitura=await p.evaluate(async()=>{const r=await MEGA.client.from('registros').select('chave').limit(3);const g=await MEGA.client.from('pontos').select('id').limit(3);return {registros:(r.data||[]).length,pontos:(g.data||[]).length}});
  ok('comercial: banco não entrega registros operacionais, mas entrega pontos',leitura.registros===0&&leitura.pontos>0,JSON.stringify(leitura));
  const f=p.frames().find(x=>x.url().includes('modulos/comercial'));
  await f.evaluate(()=>sairDoGerador());await p.waitForSelector('.login',{timeout:10000});
  ok('comercial: Sair volta ao login único',true);ok('comercial: sem erros de JS',erros.length===0,erros.join('|'));await ctx.close();
 }
 // 3) manutenção no celular
 {
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});const p=await ctx.newPage();
  await p.goto(BASE);await p.screenshot({path:OUT+'/m-login.png'});
  await p.click('.teste-box button:has-text("Manutenção")');await p.waitForSelector('.palco iframe');await p.waitForTimeout(6000);await p.screenshot({path:OUT+'/m-manutencao.png'});await ctx.close();
 }
 // 4) login desktop
 {const ctx=await b.newContext({viewport:{width:1360,height:820}});const p=await ctx.newPage();await p.goto(BASE);await p.waitForSelector('.login');await p.screenshot({path:OUT+'/login.png'});
  await p.fill('#em','admin@teste.com');await p.fill('#se','senhaerrada');await p.click('button.btn[type=submit]');await p.waitForSelector('.erro:not([hidden])');ok('login: senha errada mostra mensagem',/incorretos/.test(await p.textContent('.erro')));await ctx.close();}
 await b.close();
})();
