// Testes do schema unificado num Postgres de verdade (WASM) — sem precisar do Supabase.
// Uso:  npm i @electric-sql/pglite   (uma vez, nesta pasta ou acima)   →   node rodar-testes.mjs
// Opcional: PGLITE=/caminho/para/@electric-sql/pglite/dist/index.js  e  PGLITE_CONTRIB=.../contrib/pgcrypto.js
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const aqui = dirname(fileURLToPath(import.meta.url));
const { PGlite } = await import(process.env.PGLITE || '@electric-sql/pglite');
const { pgcrypto } = await import(process.env.PGLITE_CONTRIB || '@electric-sql/pglite/contrib/pgcrypto');

const db = new PGlite({ extensions: { pgcrypto } });
const schema = readFileSync(join(aqui, '..', '01-schema-unificado.sql'), 'utf8');

// ---- Shims mínimos do que o Supabase já traz pronto -------------------------
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to authenticated;
  create schema auth; create schema storage;
  grant usage on schema auth, storage to authenticated;
  create table auth.users (
    instance_id uuid, id uuid primary key default gen_random_uuid(), aud text, role text,
    email text, encrypted_password text, email_confirmed_at timestamptz,
    raw_app_meta_data jsonb, raw_user_meta_data jsonb, created_at timestamptz default now(),
    updated_at timestamptz default now(), confirmation_token text, recovery_token text,
    email_change_token_new text, email_change text);
  create table auth.identities (
    id uuid primary key, user_id uuid, provider_id text, identity_data jsonb, provider text,
    last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant select, insert, update, delete on storage.objects to authenticated;
  create publication supabase_realtime;
`);

let ok = 0, falhas = [];
const linhas = [];
function reg(nome, passou, detalhe = '') {
  if (passou) ok++; else falhas.push(nome + (detalhe ? ' → ' + detalhe : ''));
  linhas.push(`| ${passou ? '✅' : '❌'} | ${nome} | ${detalhe.replace(/\|/g, '/').slice(0, 120)} |`);
}
const q = async (sql, p) => (await db.query(sql, p)).rows;

// Executa como um usuário logado (papel "authenticated" + sub do JWT)
async function como(uid, fn) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`);
  try { return await fn(); }
  finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); }
}
async function tenta(uid, sql, p) {   // devolve {rows} ou {erro}
  try { return { rows: await como(uid, () => q(sql, p)) }; }
  catch (e) { return { erro: e.message }; }
}

// ---- 1. Schema + idempotência ------------------------------------------------
try { await db.exec(schema); reg('Schema roda na 1ª vez', true); } catch (e) { reg('Schema roda na 1ª vez', false, e.message); }
try { await db.exec(schema); reg('Schema roda na 2ª vez (idempotente)', true); } catch (e) { reg('Schema roda na 2ª vez (idempotente)', false, e.message); }
try {
  const seed = readFileSync(join(aqui, '..', '02-seed-comercial.sql'), 'utf8');
  await db.exec(seed); await db.exec(seed);
  const n = (await q('select count(*)::int n from public.pontos'))[0].n;
  reg('Seed comercial roda 2x sem duplicar', n === 137, `${n} pontos`);
} catch (e) { reg('Seed comercial roda 2x sem duplicar', false, e.message); }

// ---- 2. Cadastro e perfis ----------------------------------------------------
const ins = (email) => q(`insert into auth.users (id, email, raw_user_meta_data) values (gen_random_uuid(), $1, '{}') returning id`, [email]);
const ADM = (await ins('operacional@megamidiaooh.com.br'))[0].id;
reg('E-mail de admins_iniciais nasce admin', (await q('select papel from profiles where id=$1', [ADM]))[0].papel === 'admin');
const PEN = (await ins('novo@megamidiaooh.com.br'))[0].id;
reg('Outro cadastro nasce pendente', (await q('select papel,ativo from profiles where id=$1', [PEN]))[0].papel === 'pendente');
try { await ins('alguem@gmail.com'); reg('Cadastro fora do domínio é barrado', false); }
catch (e) { reg('Cadastro fora do domínio é barrado', /e-mails da empresa/.test(e.message)); }
reg('Só existe 1 trigger de novo usuário em auth.users',
  (await q(`select count(*)::int n from pg_trigger where tgrelid='auth.users'::regclass and tgname in ('ao_criar_usuario','trg_novo_usuario')`))[0].n === 1);

// ---- 3. admin_criar_usuario com cada papel ----------------------------------
const ids = {};
for (const papel of ['comercial', 'operacional', 'manutencao', 'admin']) {
  const r = await tenta(ADM, `select public.admin_criar_usuario($1,$2,$3,$4) id`, [`${papel}@exemplo.com`, 'senha123', 'Usuário ' + papel, papel]);
  if (r.erro) { reg(`admin_criar_usuario cria "${papel}"`, false, r.erro); continue; }
  ids[papel] = r.rows[0].id;
  const p = (await q('select papel,ativo,nome from profiles where id=$1', [ids[papel]]))[0];
  reg(`admin_criar_usuario cria "${papel}" (ativo, e-mail de fora do domínio)`, p.papel === papel && p.ativo === true, JSON.stringify(p));
}
reg('admin_criar_usuario rejeita papel inválido', !!(await tenta(ADM, `select public.admin_criar_usuario('x@x.com','senha123','x','pendente')`)).erro);
reg('Comercial NÃO consegue criar usuário', !!(await tenta(ids.comercial, `select public.admin_criar_usuario('y@y.com','senha123','y','admin')`)).erro);
reg('Operacional NÃO consegue redefinir senha', !!(await tenta(ids.operacional, `select public.admin_redefinir_senha('${ids.comercial}','novasenha')`)).erro);
reg('Admin redefine senha', !(await tenta(ADM, `select public.admin_redefinir_senha('${ids.comercial}','novasenha')`)).erro);

// Usuários extras: bloqueado (pendente já existe: PEN)
const BLQ = (await tenta(ADM, `select public.admin_criar_usuario('blq@exemplo.com','senha123','Blq','comercial') id`)).rows[0].id;
await tenta(ADM, `update profiles set papel='bloqueado' where id='${BLQ}'`);
reg('Admin muda papel para bloqueado', (await q('select papel from profiles where id=$1', [BLQ]))[0].papel === 'bloqueado');
// operacional desativado (ativo=false)
const INA = (await tenta(ADM, `select public.admin_criar_usuario('ina@exemplo.com','senha123','Ina','operacional') id`)).rows[0].id;
await tenta(ADM, `update profiles set ativo=false where id='${INA}'`);

// ---- 4. Dados de apoio (como superusuário) -----------------------------------
const now = Date.now();
await db.exec(`
  insert into registros (chave,tipo,dados,u) values
   ('fx:p1','fx','{"n":"fixo"}',${now}), ('vr:v1','vr','{"n":"var"}',${now}),
   ('vt:c1','vt','{"n":"camp"}',${now}), ('mn:m1','mn','{"n":"chamado"}',${now}),
   ('cfg:base','cfg','{"x":1}',${now});
`);
// sugestão e proposta nascem pelo comercial (o gatilho preenche o autor com auth.uid())
await como(ids.comercial, async () => {
  await q(`insert into sugestoes (tipo,ponto_id,payload) values ('alterar','d006','{"bairro":"X"}')`);
  await q(`insert into propostas (formato) values ('pdf')`);
});

// ---- 5. Leitura por papel ----------------------------------------------------
const cont = async (uid, tab) => { const r = await tenta(uid, `select count(*)::int n from ${tab}`); return r.erro ? 'ERRO' : r.rows[0].n; };
const quem = { admin: ADM, comercial: ids.comercial, operacional: ids.operacional, manutencao: ids.manutencao, pendente: PEN, bloqueado: BLQ, 'operacional inativo': INA };
const esperado = {   // [registros, pontos, config, sugestoes, propostas]
  admin:               [5, 137, 1, 1, 1],
  comercial:           [0, 137, 1, 1, 1],
  operacional:         [5, 0, 0, 0, 0],
  manutencao:          [5, 0, 0, 0, 0],
  pendente:            [0, 0, 0, 0, 0],
  bloqueado:           [0, 0, 0, 0, 0],
  'operacional inativo': [0, 0, 0, 0, 0],
};
const tabs = ['registros', 'pontos', 'config', 'sugestoes', 'propostas'];
for (const [nome, uid] of Object.entries(quem)) {
  for (let i = 0; i < tabs.length; i++) {
    const n = await cont(uid, tabs[i]);
    reg(`Leitura de ${tabs[i]} como ${nome}`, n === esperado[nome][i], `viu ${n}, esperado ${esperado[nome][i]}`);
  }
}
// Perfis: cada um vê o seu; admin vê todos
reg('Comercial vê só o próprio perfil', (await cont(ids.comercial, 'profiles')) === 1);
reg('Admin vê todos os perfis', (await cont(ADM, 'profiles')) >= 8);

// ---- 6. Escrita: operacional ---------------------------------------------------
const OP = ids.operacional, MN = ids.manutencao, CM = ids.comercial;
const upd = async (uid, chave) => { const r = await tenta(uid, `update registros set dados='{"alt":1}' where chave='${chave}' returning chave`); return r.erro ? 'ERRO' : r.rows.length; };
reg('Operacional NÃO altera fx', (await upd(OP, 'fx:p1')) === 0);
reg('Operacional NÃO altera vr', (await upd(OP, 'vr:v1')) === 0);
reg('Operacional NÃO altera cfg', (await upd(OP, 'cfg:base')) === 0);
reg('Operacional altera vt (campanha)', (await upd(OP, 'vt:c1')) === 1);
reg('Operacional altera mn', (await upd(OP, 'mn:m1')) === 1);
reg('Operacional NÃO cria fx', !!(await tenta(OP, `insert into registros(chave,tipo,dados,u) values('fx:novo','fx','{}',1)`)).erro);
reg('Operacional cria vr (ponto variável novo)', !(await tenta(OP, `insert into registros(chave,tipo,dados,u) values('vr:novo','vr','{}',1)`)).erro);
reg('Operacional NÃO apaga registro', (await tenta(OP, `delete from registros where chave='vt:c1' returning 1`)).rows?.length === 0);
reg('Manutenção altera só mn', (await upd(MN, 'mn:m1')) === 1 && (await upd(MN, 'vt:c1')) === 0 && (await upd(MN, 'vr:v1')) === 0);
reg('Manutenção NÃO cria vt', !!(await tenta(MN, `insert into registros(chave,tipo,dados,u) values('vt:x','vt','{}',1)`)).erro);
reg('Manutenção cria mn', !(await tenta(MN, `insert into registros(chave,tipo,dados,u) values('mn:novo','mn','{}',1)`)).erro);
reg('Admin altera fx, vr e cfg', (await upd(ADM, 'fx:p1')) === 1 && (await upd(ADM, 'vr:v1')) === 1 && (await upd(ADM, 'cfg:base')) === 1);
reg('Admin apaga registro', (await tenta(ADM, `delete from registros where chave='mn:novo' returning 1`)).rows?.length === 1);
reg('Comercial NÃO grava em registros', !!(await tenta(CM, `insert into registros(chave,tipo,dados,u) values('vt:z','vt','{}',1)`)).erro);

// gravar_registros por operacional
const lote = JSON.stringify([
  { chave: 'vt:novo1', tipo: 'vt', dados: { a: 1 }, u: now + 10 },
  { chave: 'fx:novo2', tipo: 'fx', dados: { a: 1 }, u: now + 10 },        // negado (fx só admin)
  { chave: 'vt:c1', tipo: 'vt', dados: { a: 2 }, u: 1 },                  // antigo (u menor)
  { chave: 'fx:p1', tipo: 'fx', dados: { a: 2 }, u: now + 99 },           // existe e é fx → negado
]);
const g = await tenta(OP, `select public.gravar_registros($1::jsonb) r`, [lote]);
const gr = g.rows?.[0]?.r;
reg('gravar_registros (operacional): aceita vt novo', gr?.ok?.includes('vt:novo1'), JSON.stringify(gr));
reg('gravar_registros (operacional): nega fx novo e fx existente', gr?.negado?.includes('fx:novo2') && gr?.negado?.includes('fx:p1'), JSON.stringify(gr));
reg('gravar_registros (operacional): marca registro desatualizado', gr?.antigo?.includes('vt:c1'), JSON.stringify(gr));
const gc = await tenta(CM, `select public.gravar_registros($1::jsonb) r`, [JSON.stringify([{ chave: 'vt:com', tipo: 'vt', dados: {}, u: now }])]);
reg('gravar_registros (comercial): nada é gravado', !gc.erro && gc.rows[0].r.ok.length === 0, JSON.stringify(gc.rows?.[0]?.r || gc.erro));
const gm = await tenta(MN, `select public.gravar_registros($1::jsonb) r`, [JSON.stringify([{ chave: 'mn:viaLote', tipo: 'mn', dados: {}, u: now }, { chave: 'vt:viaLote', tipo: 'vt', dados: {}, u: now }])]);
reg('gravar_registros (manutenção): só mn passa', gm.rows?.[0]?.r.ok.length === 1 && gm.rows[0].r.ok[0] === 'mn:viaLote', JSON.stringify(gm.rows?.[0]?.r || gm.erro));

// ---- 7. Escrita: comercial -----------------------------------------------------
reg('Comercial NÃO altera ponto', (await tenta(CM, `update pontos set ord=999 where id='d006' returning 1`)).rows?.length === 0);
reg('Comercial NÃO altera config', (await tenta(CM, `update config set data='{}' where id='main' returning 1`)).rows?.length === 0);
reg('Admin altera ponto', (await tenta(ADM, `update pontos set ord=1 where id='d006' returning 1`)).rows?.length === 1);
reg('Comercial cria sugestão (autor preenchido)', (await tenta(CM, `insert into sugestoes(tipo,payload,criado_por) values('adicionar','{"endereco":"X"}','${OP}') returning criado_por`)).rows?.[0]?.criado_por === CM);
reg('Comercial cria proposta', !(await tenta(CM, `insert into propostas(formato,bv) values('pptx',5)`)).erro);
reg('Operacional NÃO cria sugestão', !!(await tenta(OP, `insert into sugestoes(tipo,payload) values('adicionar','{}')`)).erro);
reg('Operacional NÃO cria proposta', !!(await tenta(OP, `insert into propostas(formato) values('pdf')`)).erro);
reg('Comercial NÃO apaga/edita proposta', (await tenta(CM, `update propostas set cliente='x' returning 1`)).rows?.length === 0);
const sug = (await q(`select id from sugestoes where tipo='alterar' limit 1`))[0].id;
reg('Comercial NÃO resolve sugestão', !!(await tenta(CM, `select public.resolver_sugestao('${sug}','aprovar')`)).erro);
reg('Admin aprova sugestão e ponto é alterado',
  !(await tenta(ADM, `select public.resolver_sugestao('${sug}','aprovar')`)).erro &&
  (await q(`select data->>'bairro' b from pontos where id='d006'`))[0].b === 'X');
reg('Comercial NÃO altera o próprio papel', (await tenta(CM, `update profiles set papel='admin' where id='${CM}' returning 1`)).rows?.length === 0);
reg('Operacional NÃO altera o próprio papel', (await tenta(OP, `update profiles set papel='admin' where id='${OP}' returning 1`)).rows?.length === 0);

// ---- 8. Storage (fotos) ----------------------------------------------------------
const foto = (uid, nome) => tenta(uid, `insert into storage.objects(bucket_id,name) values('fotos',$1)`, [nome]);
reg('Comercial envia foto para sugestoes/<seu id>/', !(await foto(CM, `sugestoes/${CM}/a.jpg`)).erro);
reg('Comercial NÃO envia foto em pontos/', !!(await foto(CM, 'pontos/a.jpg')).erro);
reg('Admin envia foto em pontos/', !(await foto(ADM, 'pontos/a.jpg')).erro);
reg('Operacional NÃO envia foto', !!(await foto(OP, `sugestoes/${OP}/a.jpg`)).erro);

// ---- 9. protege_ultimo_admin -------------------------------------------------------
// Há 2 admins (ADM e o criado como "admin"): rebaixar um funciona, o último não.
const ADM2 = ids.admin;
reg('Rebaixar um admin (há outro) funciona', !(await tenta(ADM, `update profiles set papel='comercial' where id='${ADM2}'`)).erro);
const e1 = await tenta(ADM, `update profiles set ativo=false where id='${ADM}'`);
reg('Não deixa desativar o ÚLTIMO admin', /pelo menos um admin/.test(e1.erro || ''), e1.erro || 'sem erro');
const e2 = await tenta(ADM, `update profiles set papel='operacional' where id='${ADM}'`);
reg('Não deixa rebaixar o ÚLTIMO admin', /pelo menos um admin/.test(e2.erro || ''), e2.erro || 'sem erro');
// admin desativado perde poderes
await tenta(ADM, `update profiles set papel='admin' where id='${ADM2}'`);
await tenta(ADM, `update profiles set ativo=false where id='${ADM2}'`);
reg('Admin desativado perde o acesso', (await cont(ADM2, 'registros')) === 0);

// ---- Relatório ---------------------------------------------------------------------
const total = ok + falhas.length;
const md = `# Resultado dos testes do schema unificado

Gerado em ${new Date().toISOString()} · Postgres ${(await q('show server_version'))[0].server_version} (pglite/WASM)

**${ok}/${total} testes passaram.**${falhas.length ? '\n\nFalhas:\n' + falhas.map(f => '- ' + f).join('\n') : ''}

| | Teste | Detalhe |
|---|---|---|
${linhas.join('\n')}

## O que NÃO foi validado aqui
- Autenticação real do Supabase (GoTrue): login/senha, JWT. O teste simula só \`auth.uid()\`.
- Tabelas \`auth.users\`/\`auth.identities\`/\`storage.*\` são versões mínimas (shim), não as reais.
- Realtime: a publicação foi criada, mas não há servidor de tempo real.
- O PostgREST (API REST) não participa: testamos as regras direto no banco (RLS), que é onde a segurança fica.
`;
writeFileSync(join(aqui, 'RESULTADO.md'), md);
console.log(`${ok}/${total} testes passaram`);
if (falhas.length) { console.log(falhas.join('\n')); process.exit(1); }
