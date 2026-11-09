// Teste do mock-supabase.js com Chromium (Playwright). Roda: node smoke-mock.js
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');

const RAIZ = '/home/claude/sistema-unificado';
const PORTA = 8765;
const URL_SMOKE = `http://127.0.0.1:${PORTA}/teste/_smoke.html`;

(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORTA), '--bind', '127.0.0.1'], { cwd: RAIZ, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1200));
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const consoleMsgs = [];
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) consoleMsgs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => consoleMsgs.push('pageerror: ' + e.message));
  await page.goto(URL_SMOKE);

  const resultados = await page.evaluate(async () => {
    const R = [];
    const t = (grupo, nome, ok, detalhe) => R.push({ grupo, nome, ok: !!ok, detalhe: ok ? '' : String(detalhe === undefined ? '' : (typeof detalhe === 'string' ? detalhe : JSON.stringify(detalhe))).slice(0, 300) });
    const C = window.MEGA_CONFIG;
    MEGA_TESTE.latencia(0);
    MEGA_TESTE.reset();
    const novo = () => supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const logar = async (email, senha = 'teste123') => { const c = novo(); const r = await c.auth.signInWithPassword({ email, password: senha }); return { c, r }; };
    const raw = async (sess, path, o = {}) => {
      const h = Object.assign({ apikey: C.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' }, sess ? { Authorization: 'Bearer ' + sess.access_token } : {}, o.h || {});
      const r = await fetch(C.SUPABASE_URL + path, { method: o.method || 'GET', headers: h, body: o.body !== undefined ? JSON.stringify(o.body) : undefined });
      let j = null; try { j = await r.json(); } catch (_) {}
      return { status: r.status, j, r };
    };

    /* ---------------- A) Login ---------------- */
    const U = {};
    for (const [k, e] of [['adm', 'admin@teste.com'], ['com', 'comercial@teste.com'], ['op', 'operacional@teste.com'], ['man', 'manutencao@teste.com']]) {
      const { c, r } = await logar(e);
      U[k] = { c, s: r.data && r.data.session, id: r.data && r.data.user && r.data.user.id };
      t('A login', e + ' entra', r.data && r.data.session && !r.error, r.error && r.error.message);
    }
    const ruim = await logar('admin@teste.com', 'errada');
    t('A login', 'senha errada é recusada', ruim.r.error && /Invalid login/i.test(ruim.r.error.message), ruim.r.error);
    const gu = await U.adm.c.auth.getUser();
    t('A login', 'getUser devolve o e-mail', gu.data.user && gu.data.user.email === 'admin@teste.com', gu);
    const jwt = U.adm.s.access_token.split('.');
    t('A login', 'JWT tem 3 partes e sub', jwt.length === 3 && JSON.parse(atob(jwt[1])).sub === U.adm.id);
    const rf = await raw(null, '/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: U.adm.s.refresh_token } });
    t('A login', 'refresh_token renova a sessão', rf.status === 200 && rf.j.access_token, rf);
    const rf2 = await raw(null, '/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: 'lixo' } });
    t('A login', 'refresh inválido → 400', rf2.status === 400, rf2);
    const sn = await logar('operacional@teste.com'); // via supabase-js signUp (domínio proibido)
    const su = await novo().auth.signUp({ email: 'x@gmail.com', password: 'abcdef', options: { data: { nome: 'X' } } });
    t('A login', 'signUp fora do domínio é barrado', !!su.error, su);
    const su2 = await novo().auth.signUp({ email: 'novato@teste.com', password: 'abcdef', options: { data: { nome: 'Novato' } } });
    t('A login', 'signUp no domínio permitido cria sessão', su2.data && su2.data.session, su2.error);
    const novato = await U.adm.c.from('profiles').select('*').eq('email', 'novato@teste.com').maybeSingle();
    t('A login', 'novo cadastro nasce como pendente', novato.data && novato.data.papel === 'pendente', novato);

    /* ---------------- B) Leitura por perfil ---------------- */
    const cnt = async (u, tab) => { const r = await U[u].c.from(tab).select('*'); return r.error ? 'ERRO:' + r.error.message : r.data.length; };
    const esp = { adm: { profiles: 5, config: 1, pontos: 137, sugestoes: 4, propostas: 7, registros: 52 },
                  com: { profiles: 1, config: 1, pontos: 137, sugestoes: 4, propostas: 5, registros: 0 },
                  op:  { profiles: 1, config: 0, pontos: 0, sugestoes: 0, propostas: 0, registros: 52 },
                  man: { profiles: 1, config: 0, pontos: 0, sugestoes: 0, propostas: 0, registros: 52 } };
    for (const u of Object.keys(esp)) for (const tab of Object.keys(esp[u])) {
      const n = await cnt(u, tab);
      t('B leitura', `${u} lê ${tab}: ${esp[u][tab]} linhas`, n === esp[u][tab], 'veio ' + n);
    }
    const anonR = await raw(null, '/rest/v1/registros?select=chave');
    t('B leitura', 'anônimo não lê registros (401)', anonR.status === 401, anonR);

    /* ---------------- C) Escritas / RLS ---------------- */
    const sug = await U.com.c.from('sugestoes').insert({ tipo: 'adicionar', payload: { endereco: 'Novo X', secao: 'banca_led' }, motivo: 'teste' }).select().single();
    t('C escrita', 'comercial cria sugestão (autor preenchido)', sug.data && sug.data.criado_por === U.com.id && sug.data.criado_por_email === 'comercial@teste.com' && sug.data.status === 'pendente', sug.error || sug.data);
    const sugBad = await U.com.c.from('sugestoes').insert({ tipo: 'adicionar', payload: {}, status: 'aprovada' });
    t('C escrita', 'comercial não cria sugestão já aprovada (403)', sugBad.status === 403 && sugBad.error && sugBad.error.code === '42501', sugBad);
    const sugUp = await U.com.c.from('sugestoes').update({ status: 'aprovada' }).eq('id', sug.data.id).select();
    t('C escrita', 'comercial não altera sugestão (0 linhas)', !sugUp.error && sugUp.data.length === 0, sugUp);
    const pp = await U.com.c.from('pontos').upsert({ id: 'd006', ord: 1, data: { x: 1 } });
    t('C escrita', 'comercial não grava ponto (403)', pp.status === 403, pp);
    const pp2 = await U.com.c.from('pontos').delete().eq('id', 'd006').select();
    t('C escrita', 'comercial não apaga ponto (0 linhas)', !pp2.error && pp2.data.length === 0, pp2);
    const prop = await U.com.c.from('propostas').insert({ formato: 'pptx', cliente: 'Cliente X', n_locais: 2, locais: [], valores: [], bv: 3 });
    t('C escrita', 'comercial grava proposta (com bv)', !prop.error, prop.error);
    const propBadCol = await U.com.c.from('propostas').insert({ formato: 'pptx', coluna_que_nao_existe: 1 });
    t('C escrita', 'coluna desconhecida → PGRST204', propBadCol.error && propBadCol.error.code === 'PGRST204', propBadCol);
    const propBadFmt = await U.com.c.from('propostas').insert({ formato: 'doc' });
    t('C escrita', 'check de formato → 23514', propBadFmt.error && propBadFmt.error.code === '23514', propBadFmt);
    const propUp = await U.com.c.from('propostas').update({ cliente: 'Hack' }).eq('cliente', 'Cliente X').select();
    t('C escrita', 'proposta não é reescrita (histórico imutável)', !propUp.error && propUp.data.length === 0, propUp);
    const regC = await U.com.c.from('registros').insert({ chave: 'vt:zz', tipo: 'vt', dados: {}, u: 1 });
    t('C escrita', 'comercial não grava registro operacional (403)', regC.status === 403, regC);
    const cfgW = await U.adm.c.from('config').upsert({ id: 'main', data: { teste: true } });
    t('C escrita', 'admin grava config (upsert)', !cfgW.error, cfgW.error);
    const cfgR = await U.com.c.from('config').select('data').eq('id', 'main').maybeSingle();
    t('C escrita', 'comercial lê config alterada pelo admin', cfgR.data && cfgR.data.data.teste === true, cfgR);
    // restaura config
    MEGA_TESTE.reset();
    for (const k of Object.keys(U)) { const { c, r } = await logar({ adm: 'admin@teste.com', com: 'comercial@teste.com', op: 'operacional@teste.com', man: 'manutencao@teste.com' }[k]); U[k] = { c, s: r.data.session, id: r.data.user.id }; }

    /* ---------------- D) gravar_registros (operacional) ---------------- */
    const grava = (u, itens) => raw(U[u].s, '/rest/v1/rpc/gravar_registros', { method: 'POST', body: { p: itens } });
    const agora = Date.now();
    let g = await grava('op', [{ chave: 'vt:novo1', tipo: 'vt', dados: { id: 'novo1', cliente: 'X' }, u: agora, excluido: false }]);
    t('D rpc gravar', 'operacional cria VT novo', g.j && g.j.ok.includes('vt:novo1'), g);
    g = await grava('op', [{ chave: 'vt:novo1', tipo: 'vt', dados: { id: 'novo1', cliente: 'Y' }, u: agora + 10, excluido: false }]);
    t('D rpc gravar', 'operacional atualiza VT (u maior)', g.j && g.j.ok.includes('vt:novo1'), g);
    g = await grava('op', [{ chave: 'vt:novo1', tipo: 'vt', dados: {}, u: agora - 5000, excluido: false }]);
    t('D rpc gravar', 'u antigo → "antigo"', g.j && g.j.antigo.includes('vt:novo1'), g);
    g = await grava('op', [{ chave: 'fx:p1', tipo: 'fx', dados: { id: 'p1', nome: 'Hack' }, u: agora + 99999, excluido: false }]);
    t('D rpc gravar', 'operacional NÃO altera ponto fixo → negado', g.j && g.j.negado.includes('fx:p1'), g);
    g = await grava('op', [{ chave: 'fx:novofx', tipo: 'fx', dados: {}, u: agora, excluido: false }]);
    t('D rpc gravar', 'operacional NÃO cria ponto fixo → negado', g.j && g.j.negado.includes('fx:novofx'), g);
    g = await grava('op', [{ chave: 'cfg:base', tipo: 'cfg', dados: {}, u: agora + 99999, excluido: false }]);
    t('D rpc gravar', 'operacional NÃO altera cfg → negado', g.j && g.j.negado.includes('cfg:base'), g);
    g = await grava('op', [{ chave: 'vr:x1', tipo: 'vr', dados: {}, u: agora + 99999, excluido: false }]);
    t('D rpc gravar', 'operacional NÃO altera ponto variável → negado', g.j && g.j.negado.includes('vr:x1'), g);
    g = await grava('op', [{ chave: 'vr:xnovo', tipo: 'vr', dados: { id: 'xnovo' }, u: agora, excluido: false }]);
    t('D rpc gravar', 'operacional CRIA ponto variável novo', g.j && g.j.ok.includes('vr:xnovo'), g);
    g = await grava('man', [{ chave: 'mn:m2001', tipo: 'mn', dados: { id: 'm2001', status: 'resolvida' }, u: agora + 5, excluido: false }, { chave: 'vt:novo2', tipo: 'vt', dados: {}, u: agora, excluido: false }]);
    t('D rpc gravar', 'manutenção altera mn e é negada em vt', g.j && g.j.ok.includes('mn:m2001') && g.j.negado.includes('vt:novo2'), g);
    g = await grava('com', [{ chave: 'vt:com1', tipo: 'vt', dados: {}, u: agora, excluido: false }]);
    t('D rpc gravar', 'comercial → tudo negado', g.j && g.j.negado.includes('vt:com1') && !g.j.ok.length, g);
    g = await grava('adm', [{ chave: 'fx:p1', tipo: 'fx', dados: { id: 'p1', nome: 'Painel Copacabana (editado)' }, u: agora + 99999, excluido: false }]);
    t('D rpc gravar', 'admin altera ponto fixo', g.j && g.j.ok.includes('fx:p1'), g);
    // paginação por rev como o cloudPull
    const pull = await raw(U.op.s, '/rest/v1/registros?select=chave,tipo,dados,u,excluido,rev&rev=gt.52&order=rev.asc&limit=1000');
    t('D rpc gravar', 'pull por rev=gt.N&order=rev.asc traz só os novos, em ordem',
      pull.status === 200 && pull.j.length >= 3 && pull.j.every((x, i, a) => i === 0 || a[i - 1].rev < x.rev) && pull.j.every(x => x.rev > 52), pull.j && pull.j.map(x => x.rev));
    const rev = await raw(U.op.s, '/rest/v1/registros?select=chave,tipo,dados,u,excluido,rev&chave=in.(%22fx:p1%22,%22vt:novo1%22,%22nao:existe%22)');
    t('D rpc gravar', 'chave=in.("a","b") (cloudRevert)', rev.j && rev.j.length === 2, rev);
    const lim1 = await raw(U.op.s, '/rest/v1/registros?select=chave&limit=1');
    t('D rpc gravar', 'limit=1', lim1.j && lim1.j.length === 1, lim1);

    /* ---------------- E) Filtros / paginação / count (PostgREST) ---------------- */
    const o1 = await U.adm.c.from('pontos').select('id,ord').order('ord', { ascending: false }).limit(3);
    t('E filtros', 'order desc + limit', o1.data.length === 3 && o1.data[0].ord > o1.data[1].ord, o1);
    const o2 = await U.adm.c.from('pontos').select('id,ord').order('ord', { ascending: true }).range(10, 14);
    t('E filtros', 'range(10,14) → 5 linhas a partir de ord 11', o2.data.length === 5 && o2.data[0].ord === 11, o2);
    const o3 = await U.adm.c.from('pontos').select('id', { count: 'exact', head: true });
    t('E filtros', 'count exact + head', o3.count === 137 && !o3.error, o3);
    const o4 = await U.adm.c.from('sugestoes').select('id', { count: 'exact', head: true }).eq('status', 'pendente');
    t('E filtros', 'count pendentes = 2', o4.count === 2, o4);
    const o5 = await U.adm.c.from('pontos').select('id').in('id', ['d006', 'd007', 'nada']);
    t('E filtros', 'in()', o5.data.length === 2, o5);
    const o6 = await U.adm.c.from('config').select('data').eq('id', 'main').maybeSingle();
    t('E filtros', 'maybeSingle com 1 linha', o6.data && o6.data.data && !o6.error, o6);
    const o7 = await U.adm.c.from('config').select('data').eq('id', 'xxx').maybeSingle();
    t('E filtros', 'maybeSingle com 0 linhas → null sem erro', o7.data === null && !o7.error, o7);
    const o8 = await U.adm.c.from('pontos').select('id,data').eq('id', 'd006').single();
    t('E filtros', 'single()', o8.data && o8.data.id === 'd006', o8);
    const o9 = await U.adm.c.from('propostas').select('id,total_negociado,criado_em').order('criado_em', { ascending: false }).range(0, 999);
    t('E filtros', 'propostas ordenadas por criado_em desc (listarPropostas)', o9.data.length === 7 && o9.data[0].criado_em >= o9.data[1].criado_em, o9);
    const o10 = await U.adm.c.from('pontos').upsert([{ id: 'zz1', ord: 1000, data: { a: 1 } }, { id: 'd006', ord: 1, data: { b: 2 } }]);
    const o10b = await U.adm.c.from('pontos').select('id,data').in('id', ['zz1', 'd006']);
    t('E filtros', 'upsert em lote (insere + atualiza)', !o10.error && o10b.data.length === 2 && o10b.data.find(x => x.id === 'd006').data.b === 2, [o10, o10b]);
    const o11 = await U.adm.c.from('pontos').delete().in('id', ['zz1']);
    t('E filtros', 'delete().in()', !o11.error, o11);
    await novo().auth.signUp({ email: 'novato@teste.com', password: 'abcdef', options: { data: { nome: 'Novato' } } });
    const upd = await U.adm.c.from('profiles').update({ papel: 'comercial' }).eq('email', 'novato@teste.com').select();
    t('E filtros', 'admin muda papel de usuário (update+select)', upd.data && upd.data[0] && upd.data[0].papel === 'comercial', upd);
    const lastAdm = await U.adm.c.from('profiles').update({ papel: 'comercial' }).eq('id', U.adm.id);
    t('E filtros', 'protege o último admin', lastAdm.error && /pelo menos um admin/i.test(lastAdm.error.message), lastAdm);
    const upd2 = await U.com.c.from('profiles').update({ papel: 'admin' }).eq('id', U.com.id).select();
    t('E filtros', 'comercial não se promove a admin (0 linhas)', !upd2.error && upd2.data.length === 0, upd2);
    // alias "perfis" do operacional antigo
    const al = await raw(U.op.s, '/rest/v1/perfis?id=eq.' + U.op.id + '&select=id,email,nome,papel,ativo');
    t('E filtros', 'alias perfis: operacional aparece como "operador"', al.j && al.j[0] && al.j[0].papel === 'operador', al);
    const al2 = await raw(U.adm.s, '/rest/v1/perfis?id=eq.' + U.man.id, { method: 'PATCH', body: { papel: 'operador', nome: 'Renomeado' }, h: { Prefer: 'return=minimal' } });
    const al3 = await U.adm.c.from('profiles').select('papel,nome').eq('id', U.man.id).single();
    t('E filtros', 'alias perfis: PATCH "operador" grava "operacional"', al2.status === 204 && al3.data.papel === 'operacional', [al2.status, al3]);
    await raw(U.adm.s, '/rest/v1/profiles?id=eq.' + U.man.id, { method: 'PATCH', body: { papel: 'manutencao', nome: 'ELDRIANO - Manutenção (teste)' }, h: { Prefer: 'return=minimal' } });
    const al4 = await raw(U.adm.s, '/rest/v1/perfis?select=id,email,nome,papel,ativo,criado_em&order=criado_em.asc');
    t('E filtros', 'alias perfis: lista de usuários (cloudUsers)', al4.status === 200 && al4.j.length >= 4, al4);

    /* ---------------- F) RPCs de usuário e sugestão ---------------- */
    const cr = await U.adm.c.rpc('admin_criar_usuario', { p_email: 'novo.op@teste.com', p_senha: 'segredo1', p_nome: 'Novo Op', p_papel: 'operacional' });
    t('F rpc', 'admin cria usuário operacional', !cr.error && typeof cr.data === 'string', cr);
    const lg = await logar('novo.op@teste.com', 'segredo1');
    t('F rpc', 'usuário criado consegue entrar', !lg.r.error, lg.r.error);
    const lgp = await lg.c.from('profiles').select('papel').maybeSingle();
    t('F rpc', 'e já nasce com o papel certo', lgp.data && lgp.data.papel === 'operacional', lgp);
    const crN = await U.com.c.rpc('admin_criar_usuario', { p_email: 'x@teste.com', p_senha: 'segredo1', p_nome: 'X', p_papel: 'admin' });
    t('F rpc', 'comercial NÃO cria usuário', crN.error && /Apenas administrador/.test(crN.error.message), crN);
    const crP = await U.adm.c.rpc('admin_criar_usuario', { p_email: 'y@teste.com', p_senha: 'segredo1', p_nome: 'Y', p_papel: 'pendente' });
    t('F rpc', 'papel inválido é recusado', crP.error && /Função inválida/.test(crP.error.message), crP);
    const crD = await U.adm.c.rpc('admin_criar_usuario', { p_email: 'novo.op@teste.com', p_senha: 'segredo1', p_nome: 'Dup', p_papel: 'comercial' });
    t('F rpc', 'e-mail duplicado é recusado', crD.error && /já tem cadastro/.test(crD.error.message), crD);
    const rs = await U.adm.c.rpc('admin_redefinir_senha', { p_id: cr.data, p_senha: 'outrasenha' });
    const lg2 = await logar('novo.op@teste.com', 'outrasenha');
    t('F rpc', 'admin redefine senha', !rs.error && !lg2.r.error, [rs.error, lg2.r.error]);

    const pend = await U.adm.c.from('sugestoes').select('*').eq('status', 'pendente').order('criado_em', { ascending: false });
    const sAdd = pend.data.find(s => s.tipo === 'adicionar'), sAlt = pend.data.find(s => s.tipo === 'alterar');
    const ap1 = await U.adm.c.rpc('resolver_sugestao', { p_id: sAdd.id, p_acao: 'aprovar', p_payload: null, p_resposta: 'ok' });
    const pontosN = await U.adm.c.from('pontos').select('id', { count: 'exact', head: true });
    t('F rpc', 'aprovar "adicionar" cria ponto novo (138)', !ap1.error && pontosN.count === 138, [ap1.error, pontosN.count]);
    const ap2 = await U.adm.c.rpc('resolver_sugestao', { p_id: sAlt.id, p_acao: 'aprovar', p_payload: Object.assign({}, sAlt.payload, { fluxo: '123.456' }), p_resposta: null });
    const alterado = await U.adm.c.from('pontos').select('data').eq('id', sAlt.ponto_id).single();
    t('F rpc', 'aprovar "alterar" edita o ponto (com payload ajustado)', !ap2.error && alterado.data.data.fluxo === '123.456', [ap2.error, alterado]);
    const ap3 = await U.adm.c.rpc('resolver_sugestao', { p_id: sAdd.id, p_acao: 'recusar', p_payload: null, p_resposta: 'x' });
    t('F rpc', 'resolver de novo → "já foi resolvida"', ap3.error && /já foi resolvida/.test(ap3.error.message), ap3);
    const ap4 = await U.com.c.rpc('resolver_sugestao', { p_id: sAdd.id, p_acao: 'recusar', p_payload: null, p_resposta: null });
    t('F rpc', 'comercial NÃO resolve sugestão', ap4.error && /Apenas administrador/.test(ap4.error.message), ap4);
    const minhas = await U.com.c.from('sugestoes').select('status').eq('criado_por', U.com.id);
    t('F rpc', 'comercial vê o novo status das suas sugestões', minhas.data.filter(s => s.status === 'aprovada').length >= 3, minhas);

    /* ---------------- G) Storage + imagens ---------------- */
    const blob = new Blob([Uint8Array.from(atob('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA='), c => c.charCodeAt(0))], { type: 'image/jpeg' });
    const up1 = await U.com.c.storage.from('fotos').upload('sugestoes/' + U.com.id + '/a.jpg', blob, { contentType: 'image/jpeg', upsert: false });
    t('G storage', 'comercial sobe foto em sugestoes/<seu-id>/', !up1.error && up1.data.path === 'sugestoes/' + U.com.id + '/a.jpg', up1.error || up1.data);
    const up2 = await U.com.c.storage.from('fotos').upload('pontos/b.jpg', blob, { contentType: 'image/jpeg', upsert: false });
    t('G storage', 'comercial NÃO sobe em pontos/', !!up2.error, up2);
    const up3 = await U.adm.c.storage.from('fotos').upload('pontos/c.jpg', blob, { contentType: 'image/jpeg', upsert: false });
    t('G storage', 'admin sobe em pontos/', !up3.error, up3.error);
    const up4 = await U.adm.c.storage.from('fotos').upload('pontos/c.jpg', blob, { contentType: 'image/jpeg', upsert: false });
    t('G storage', 'duplicado sem upsert é recusado', !!up4.error, up4);
    const pubUrl = U.com.c.storage.from('fotos').getPublicUrl('sugestoes/' + U.com.id + '/a.jpg').data.publicUrl;
    const pr = await fetch(pubUrl);
    t('G storage', 'URL pública responde 200 image/jpeg via fetch', pr.status === 200 && /image\/jpeg/.test(pr.headers.get('content-type')), [pr.status, pr.headers.get('content-type')]);
    const img = document.createElement('img'); img.setAttribute('src', pubUrl); document.body.appendChild(img);
    await new Promise(r => setTimeout(r, 50));
    t('G storage', '<img> com URL pública é reescrita para data:', /^data:image\/jpeg/.test(img.getAttribute('src')), img.getAttribute('src').slice(0, 60));
    const img2 = document.createElement('div'); img2.innerHTML = '<img src="' + C.SUPABASE_URL + '/storage/v1/object/public/fotos/nao/existe.jpg">'; document.body.appendChild(img2);
    await new Promise(r => setTimeout(r, 50));
    t('G storage', '<img> inexistente vira quadro cinza (innerHTML)', /^data:image\/svg/.test(img2.firstChild.getAttribute('src')), img2.firstChild.getAttribute('src').slice(0, 60));

    /* ---------------- H) Função players + auth user ---------------- */
    const pl = await raw(U.adm.s, '/functions/v1/players-status', { method: 'POST', body: {} });
    t('H funções', 'players-status: admin 200 com lista', pl.status === 200 && pl.j.ok && pl.j.players.length > 5, pl);
    const pl2 = await raw(U.op.s, '/functions/v1/players-status', { method: 'POST', body: {} });
    t('H funções', 'players-status: operacional 403', pl2.status === 403, pl2);
    const pl3 = await raw(U.adm.s, '/functions/v1/dynamic-task', { method: 'POST', body: {} });
    t('H funções', 'função desconhecida → 404', pl3.status === 404, pl3);

    /* ---------------- I) Realtime ---------------- */
    const eventos = [];
    const ch = U.adm.c.channel('rt-sugestoes-teste').on('postgres_changes', { event: '*', schema: 'public', table: 'sugestoes' }, ev => eventos.push(ev)).subscribe();
    const ch2 = U.com.c.channel('rt-sugestoes-com').on('postgres_changes', { event: '*', schema: 'public', table: 'sugestoes' }, ev => eventos.push({ com: true, ev })).subscribe();
    await new Promise(r => setTimeout(r, 400));
    await U.com.c.from('sugestoes').insert({ tipo: 'adicionar', payload: { endereco: 'RT' }, motivo: 'rt' });
    await new Promise(r => setTimeout(r, 400));
    const evAdm = eventos.find(e => e.eventType === 'INSERT');
    t('I realtime', 'admin recebe INSERT de sugestão feita pelo comercial', evAdm && evAdm.new && evAdm.new.motivo === 'rt', eventos);
    const evCom = eventos.find(e => e.com);
    t('I realtime', 'comercial recebe a própria sugestão (RLS permite)', !!evCom, eventos);
    const antes = eventos.length;
    await U.op.c.from('registros').upsert({ chave: 'vt:rt', tipo: 'vt', dados: {}, u: 5 });
    const chOp = U.op.c.channel('rt-op').on('postgres_changes', { event: '*', schema: 'public', table: 'sugestoes' }, ev => eventos.push({ op: true, ev })).subscribe();
    await new Promise(r => setTimeout(r, 300));
    await U.com.c.from('sugestoes').insert({ tipo: 'adicionar', payload: { endereco: 'RT2' }, motivo: 'rt2' });
    await new Promise(r => setTimeout(r, 400));
    t('I realtime', 'operacional NÃO recebe eventos de sugestões (RLS)', !eventos.some(e => e.op), eventos.filter(e => e.op));
    await ch.unsubscribe(); await ch2.unsubscribe(); await chOp.unsubscribe();

    /* ---------------- J) Reset ---------------- */
    MEGA_TESTE.reset();
    const db = MEGA_TESTE.db();
    t('J reset', 'reset volta aos dados de fábrica', db.tabelas.profiles.length === 4 && db.tabelas.pontos.length === 137 && db.tabelas.registros.length === 52 && db.tabelas.sugestoes.length === 4, [db.tabelas.profiles.length, db.tabelas.pontos.length, db.tabelas.registros.length]);
    return R;
  });

  /* ---------- Teste entre abas: evento de um iframe/aba chega em outra ---------- */
  const page2 = await ctx.newPage();
  await page2.goto(URL_SMOKE);
  await page.evaluate(async () => {
    window.__ev = [];
    const C = window.MEGA_CONFIG;
    window.__c = supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    await window.__c.auth.signInWithPassword({ email: 'admin@teste.com', password: 'teste123' });
    window.__c.channel('x').on('postgres_changes', { event: '*', schema: 'public', table: 'sugestoes' }, e => window.__ev.push(e)).subscribe();
    await new Promise(r => setTimeout(r, 300));
  });
  await page2.evaluate(async () => {
    const C = window.MEGA_CONFIG;
    const c = supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    await c.auth.signInWithPassword({ email: 'comercial@teste.com', password: 'teste123' });
    await c.from('sugestoes').insert({ tipo: 'adicionar', payload: { endereco: 'de outra aba' }, motivo: 'aba2' });
  });
  await page.waitForTimeout(600);
  const entreAbas = await page.evaluate(() => window.__ev.map(e => e.eventType + ':' + (e.new && e.new.motivo)));
  resultados.push({ grupo: 'I realtime', nome: 'evento criado em OUTRA aba chega à aba do admin (BroadcastChannel)', ok: entreAbas.includes('INSERT:aba2'), detalhe: JSON.stringify(entreAbas) });
  const compart = await page2.evaluate(() => MEGA_TESTE.db().tabelas.sugestoes.some(s => s.motivo === 'aba2'));
  resultados.push({ grupo: 'I realtime', nome: 'estado compartilhado por localStorage entre abas', ok: compart, detalhe: '' });

  await browser.close(); srv.kill();

  const falhas = resultados.filter(r => !r.ok);
  let md = `# Resultado do teste do mock (mock-supabase.js)\n\nExecutado em ${new Date().toISOString()} com Chromium (Playwright) servindo a raiz do repositório.\n\n`;
  md += `**${resultados.length - falhas.length}/${resultados.length} verificações passaram.**\n\n`;
  let g = '';
  resultados.forEach(r => {
    if (r.grupo !== g) { g = r.grupo; md += `\n### ${g}\n\n`; }
    md += `- ${r.ok ? '✅' : '❌'} ${r.nome}${r.ok ? '' : ' — ' + r.detalhe}\n`;
  });
  const ruido = consoleMsgs.filter(m => !/Failed to load resource.*(4\d\d|5\d\d)/i.test(m));
  md += `\n### Mensagens de console (warning/error)\n\n${consoleMsgs.length ? consoleMsgs.slice(0, 15).map(m => '- `' + m.replace(/`/g, "'").slice(0, 200) + '`').join('\n') : '_nenhuma_'}\n`;
  fs.writeFileSync('/home/claude/sistema-unificado/teste/RESULTADO-MOCK.md', md);
  console.log(md);
  process.exit(falhas.length ? 1 : 0);
})().catch(e => { console.error('ERRO NO TESTE', e); process.exit(2); });
