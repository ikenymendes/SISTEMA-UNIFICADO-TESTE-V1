-- =====================================================================
--  MEGA MÍDIA OOH · SISTEMA UNIFICADO (Comercial + Operacional)
--  Banco único (Supabase / Postgres).
--  Como usar: Supabase → SQL Editor → New query → cole TUDO → Run.
--  Pode rodar de novo sem problema (é idempotente).
--
--  Perfis (coluna profiles.papel):
--    admin       → tudo (comercial + operacional + usuários)
--    comercial   → só a parte comercial (pontos, propostas, sugestões)
--    operacional → só a gestão operacional (tabela registros)
--    manutencao  → só chamados de manutenção (registros do tipo 'mn')
--    pendente    → acabou de se cadastrar, aguarda liberação (sem acesso)
--    bloqueado   → sem acesso
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Configuração de acesso
-- ---------------------------------------------------------------------
-- Só e-mails destes domínios conseguem se cadastrar sozinhos.
-- (O admin pode criar usuário de qualquer e-mail pelo sistema.)
create table if not exists public.dominios_permitidos (
  dominio text primary key
);
insert into public.dominios_permitidos (dominio) values ('megamidiaooh.com.br')
on conflict do nothing;
-- >>> Para testar com outro e-mail (ex.: gmail), descomente e rode:
-- insert into public.dominios_permitidos (dominio) values ('gmail.com') on conflict do nothing;

-- E-mails que já nascem como ADMINISTRADOR no primeiro cadastro.
create table if not exists public.admins_iniciais (
  email text primary key
);
insert into public.admins_iniciais (email) values ('operacional@megamidiaooh.com.br')
on conflict do nothing;

alter table public.dominios_permitidos enable row level security;
alter table public.admins_iniciais     enable row level security;
-- (sem policies: só as funções internas abaixo enxergam estas tabelas)

-- ---------------------------------------------------------------------
-- 2. Perfis (um por usuário do login) — tabela ÚNICA dos dois sistemas
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id        uuid primary key references auth.users(id) on delete cascade,
  email     text not null,
  nome      text,
  papel     text not null default 'pendente',
  ativo     boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Para quem já tinha a tabela do comercial: acrescenta 'ativo' e amplia os papéis.
alter table public.profiles add column if not exists ativo boolean not null default true;
alter table public.profiles drop constraint if exists profiles_papel_check;
alter table public.profiles add constraint profiles_papel_check
  check (papel in ('admin','comercial','operacional','manutencao','pendente','bloqueado'));

-- 2.1 Funções de apoio (usadas pelas regras de segurança) ----------------
create or replace function public.meu_papel() returns text
language sql stable security definer set search_path = public as $$
  select papel from public.profiles where id = auth.uid() and ativo
$$;

-- Administrador ativo.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and papel = 'admin' and ativo)
$$;

-- Usuário ativo da parte COMERCIAL (admin ou comercial).
create or replace function public.is_ativo() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                  where id = auth.uid() and ativo and papel in ('admin','comercial'))
$$;

-- Nomes usados pelo operacional (mesma tabela de perfis):
create or replace function public.eh_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin()
$$;

-- Usuário ativo da parte OPERACIONAL (admin, operacional ou manutenção).
create or replace function public.eh_ativo() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                  where id = auth.uid() and ativo and papel in ('admin','operacional','manutencao'))
$$;

-- Usuário do papel MANUTENÇÃO: só mexe em chamados de manutenção (tipo 'mn').
create or replace function public.eh_manut() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                  where id = auth.uid() and papel = 'manutencao' and ativo)
$$;

-- 2.2 Cadastro: domínio permitido -----------------------------------------
-- O admin, ao criar usuário pelo sistema, liga app.admin_criando e pula a checagem.
create or replace function public.checa_dominio() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('app.admin_criando', true), '') = '1' then
    return new;
  end if;
  if not exists (
    select 1 from public.dominios_permitidos
    where lower(split_part(new.email, '@', 2)) = dominio
  ) then
    raise exception 'Cadastro permitido apenas para e-mails da empresa.';
  end if;
  return new;
end $$;

drop trigger if exists trg_checa_dominio on auth.users;
create trigger trg_checa_dominio before insert on auth.users
  for each row execute function public.checa_dominio();

-- 2.3 Perfil automático (UM trigger só): admins_iniciais → admin; resto → pendente
create or replace function public.novo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, nome, papel)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    case when exists (select 1 from public.admins_iniciais where email = lower(new.email))
         then 'admin' else 'pendente' end
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- remove os nomes de trigger dos dois sistemas antigos, caso existam
drop trigger if exists ao_criar_usuario on auth.users;
drop trigger if exists trg_novo_usuario on auth.users;
create trigger trg_novo_usuario after insert on auth.users
  for each row execute function public.novo_usuario();

-- 2.4 Nunca deixar o sistema sem nenhum admin ativo -----------------------
create or replace function public.protege_ultimo_admin() returns trigger
language plpgsql as $$
begin
  if (old.papel = 'admin' and old.ativo) and not (new.papel = 'admin' and new.ativo) then
    if not exists (select 1 from public.profiles where papel = 'admin' and ativo and id <> old.id) then
      raise exception 'Precisa existir pelo menos um admin ativo.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists protege_admin on public.profiles;
create trigger protege_admin before update on public.profiles
  for each row execute function public.protege_ultimo_admin();

-- 2.5 Permissões (RLS) de profiles ----------------------------------------
alter table public.profiles enable row level security;

-- Cada um lê o seu; o admin lê todos.
drop policy if exists profiles_ler on public.profiles;
create policy profiles_ler on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- Só o admin altera perfis (papel, nome, ativo).
drop policy if exists profiles_admin_altera on public.profiles;
create policy profiles_admin_altera on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 3. COMERCIAL · configuração do kit e pontos
-- ---------------------------------------------------------------------
create table if not exists public.config (
  id          text primary key,            -- sempre 'main'
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id)
);

create table if not exists public.pontos (
  id          text primary key,
  ord         double precision,
  data        jsonb not null,              -- endereço, bairro, lat/lng, foto, etc.
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id)
);

create or replace function public.marca_edicao() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

drop trigger if exists trg_config_edicao on public.config;
create trigger trg_config_edicao before insert or update on public.config
  for each row execute function public.marca_edicao();
drop trigger if exists trg_pontos_edicao on public.pontos;
create trigger trg_pontos_edicao before insert or update on public.pontos
  for each row execute function public.marca_edicao();

alter table public.config enable row level security;
alter table public.pontos enable row level security;

-- Comercial e admin LEEM; só o administrador ESCREVE.
drop policy if exists config_ler on public.config;
create policy config_ler on public.config for select to authenticated using (public.is_ativo());
drop policy if exists config_escrever on public.config;
create policy config_escrever on public.config for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists pontos_ler on public.pontos;
create policy pontos_ler on public.pontos for select to authenticated using (public.is_ativo());
drop policy if exists pontos_escrever on public.pontos;
create policy pontos_escrever on public.pontos for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 4. COMERCIAL · sugestões (adicionar / alterar ponto)
-- ---------------------------------------------------------------------
create table if not exists public.sugestoes (
  id             uuid primary key default gen_random_uuid(),
  tipo           text not null check (tipo in ('adicionar','alterar')),
  ponto_id       text,                      -- só em 'alterar'
  payload        jsonb not null,            -- como o ponto deve ficar (campos sugeridos)
  antes          jsonb,                     -- foto do ponto antes da sugestão (para comparar)
  motivo         text,
  status         text not null default 'pendente'
                 check (status in ('pendente','aprovada','recusada')),
  criado_por     uuid not null references auth.users(id),
  criado_por_email text,
  criado_por_nome  text,
  criado_em      timestamptz not null default now(),
  resolvido_por  uuid references auth.users(id),
  resolvido_em   timestamptz,
  resposta       text
);
create index if not exists sugestoes_status_idx on public.sugestoes (status, criado_em desc);

create or replace function public.preenche_autor() returns trigger
language plpgsql security definer set search_path = public as $$
declare p public.profiles;
begin
  -- Só carimba o autor quando há um usuário logado. Em cargas administrativas
  -- (migração com a chave service_role) preserva o autor original.
  if auth.uid() is not null then
    select * into p from public.profiles where id = auth.uid();
    new.criado_por       := auth.uid();
    new.criado_por_email := p.email;
    new.criado_por_nome  := p.nome;
  end if;
  return new;
end $$;

drop trigger if exists trg_sugestoes_autor on public.sugestoes;
create trigger trg_sugestoes_autor before insert on public.sugestoes
  for each row execute function public.preenche_autor();

alter table public.sugestoes enable row level security;

drop policy if exists sugestoes_ler on public.sugestoes;
create policy sugestoes_ler on public.sugestoes for select to authenticated
  using ((criado_por = auth.uid() and public.is_ativo()) or public.is_admin());

drop policy if exists sugestoes_criar on public.sugestoes;
create policy sugestoes_criar on public.sugestoes for insert to authenticated
  with check (public.is_ativo() and status = 'pendente');
-- Sem update/delete direto: a decisão do admin passa pela função abaixo.

-- O admin aprova (aplicando no ponto) ou recusa. Pode ajustar o conteúdo antes de aprovar.
create or replace function public.resolver_sugestao(
  p_id uuid, p_acao text, p_payload jsonb default null, p_resposta text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.sugestoes; dados jsonb; novo_id text; prox double precision;
begin
  if not public.is_admin() then raise exception 'Apenas administrador.'; end if;
  select * into s from public.sugestoes where id = p_id for update;
  if not found then raise exception 'Sugestão não encontrada.'; end if;
  if s.status <> 'pendente' then raise exception 'Esta sugestão já foi resolvida.'; end if;

  if p_acao = 'aprovar' then
    dados := coalesce(p_payload, s.payload);
    if s.tipo = 'adicionar' then
      novo_id := 's' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
      select coalesce(max(ord), 0) + 1 into prox from public.pontos;
      insert into public.pontos (id, ord, data)
      values (novo_id, prox, (dados - 'sel') || jsonb_build_object('id', novo_id, 'ord', prox));
    else
      update public.pontos
         set data = data || (dados - 'id' - 'ord' - 'sel')
       where id = s.ponto_id;
      if not found then raise exception 'O ponto original não existe mais.'; end if;
    end if;
    update public.sugestoes set status='aprovada', payload=dados, resolvido_por=auth.uid(),
           resolvido_em=now(), resposta=p_resposta where id = p_id;
  elsif p_acao = 'recusar' then
    update public.sugestoes set status='recusada', resolvido_por=auth.uid(),
           resolvido_em=now(), resposta=p_resposta where id = p_id;
  else
    raise exception 'Ação inválida.';
  end if;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.resolver_sugestao(uuid, text, jsonb, text) from public, anon;
grant execute on function public.resolver_sugestao(uuid, text, jsonb, text) to authenticated;

-- ---------------------------------------------------------------------
-- 5. COMERCIAL · backup das propostas (SEM fotos: só locais e valores)
-- ---------------------------------------------------------------------
create table if not exists public.propostas (
  id               uuid primary key default gen_random_uuid(),
  tipo             text not null default 'proposta' check (tipo in ('proposta','kit_completo')),
  formato          text not null check (formato in ('pptx','pdf')),
  cliente          text,
  titulo           text,
  n_locais         integer not null default 0,
  modo_valor       text,                    -- 'bruto' ou 'liquido'
  comissao         numeric,
  total_tabela     numeric not null default 0,
  total_negociado  numeric not null default 0,
  locais           jsonb not null default '[]'::jsonb,   -- [{secao, endereco, bairro, cidade, lat, lng, tamanho, pixels, ...}]
  valores          jsonb not null default '[]'::jsonb,   -- [{nome, pontos, periodo, insercoes, tabela, desconto, negociado, final}]
  criado_por       uuid not null references auth.users(id),
  criado_por_email text,
  criado_por_nome  text,
  criado_em        timestamptz not null default now()
);
-- BV (bonificação por volume) guardado junto da proposta
alter table public.propostas add column if not exists bv numeric;
create index if not exists propostas_data_idx on public.propostas (criado_em desc);
create index if not exists propostas_autor_idx on public.propostas (criado_por);

drop trigger if exists trg_propostas_autor on public.propostas;
create trigger trg_propostas_autor before insert on public.propostas
  for each row execute function public.preenche_autor();

alter table public.propostas enable row level security;

drop policy if exists propostas_ler on public.propostas;
create policy propostas_ler on public.propostas for select to authenticated
  using ((criado_por = auth.uid() and public.is_ativo()) or public.is_admin());

drop policy if exists propostas_criar on public.propostas;
create policy propostas_criar on public.propostas for insert to authenticated
  with check (public.is_ativo());
-- Sem update e sem delete: o histórico é um backup, ninguém reescreve.

-- ---------------------------------------------------------------------
-- 6. COMERCIAL · fotos (Storage)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do nothing;

drop policy if exists fotos_enviar on storage.objects;
create policy fotos_enviar on storage.objects for insert to authenticated
  with check (
    bucket_id = 'fotos' and (
      public.is_admin()
      or (public.is_ativo() and name like 'sugestoes/' || auth.uid()::text || '/%')
    )
  );

drop policy if exists fotos_admin_altera on storage.objects;
create policy fotos_admin_altera on storage.objects for update to authenticated
  using (bucket_id = 'fotos' and public.is_admin());

drop policy if exists fotos_admin_apaga on storage.objects;
create policy fotos_admin_apaga on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and public.is_admin());

-- ---------------------------------------------------------------------
-- 7. OPERACIONAL · registros (todos os dados da gestão operacional)
-- ---------------------------------------------------------------------
--    chave  = "tipo:id" (ex.: vt:v1793..., fx:p15, ft:v1793...__p15)
--    tipo   = fx pontos fixos | vr pontos variáveis | vt campanhas/eventos
--             ft fotos | mn manutenções | es estáticos | cf circuitos fixos
--             cfg configurações (base, motoboys, prioridades) | rot rota
--    u      = data/hora da última alteração (ms) — vence o mais recente
--    rev    = contador do servidor (usado na sincronização)
create sequence if not exists public.registros_rev_seq;
create table if not exists public.registros (
  chave          text primary key,
  tipo           text not null check (tipo in ('fx','vr','vt','ft','mn','es','cf','cfg','rot')),
  dados          jsonb,
  u              bigint not null default 0,
  excluido       boolean not null default false,
  rev            bigint not null default nextval('public.registros_rev_seq'),
  atualizado_por uuid,
  atualizado_em  timestamptz not null default now(),
  constraint registros_chave_tipo check (split_part(chave, ':', 1) = tipo)
);
create index if not exists registros_rev_idx on public.registros (rev);

-- Carimba cada gravação com o contador do servidor e o autor.
create or replace function public.carimba_registro() returns trigger
language plpgsql as $$
begin
  new.rev := nextval('public.registros_rev_seq');
  new.atualizado_por := auth.uid();
  new.atualizado_em := now();
  return new;
end $$;
drop trigger if exists carimba on public.registros;
create trigger carimba before insert or update on public.registros
  for each row execute function public.carimba_registro();

alter table public.registros enable row level security;

-- Ler: admin, operacional e manutenção (comercial NÃO lê).
drop policy if exists reg_ver on public.registros;
create policy reg_ver on public.registros for select to authenticated
  using (public.eh_ativo());

-- Criar: qualquer usuário operacional ativo cria tudo, EXCETO pontos fixos (fx)
-- e configurações (cfg), que só o admin cria. Manutenção só cria 'mn'.
drop policy if exists reg_criar on public.registros;
create policy reg_criar on public.registros for insert to authenticated
  with check (public.eh_ativo() and (tipo not in ('fx','cfg') or public.eh_admin()) and (not public.eh_manut() or tipo = 'mn'));

-- Alterar/apagar: fx, vr e cfg SÓ o admin. Todo o resto (campanhas, fotos,
-- manutenção...) é livre para o operacional. Manutenção só mexe em 'mn'.
-- Para proteger mais tipos (ex.: 'es' estáticos), acrescente na lista abaixo.
drop policy if exists reg_alterar on public.registros;
create policy reg_alterar on public.registros for update to authenticated
  using (public.eh_ativo() and (tipo not in ('fx','vr','cfg') or public.eh_admin()) and (not public.eh_manut() or tipo = 'mn'))
  with check (public.eh_ativo() and (tipo not in ('fx','vr','cfg') or public.eh_admin()) and (not public.eh_manut() or tipo = 'mn'));

drop policy if exists reg_apagar on public.registros;
create policy reg_apagar on public.registros for delete to authenticated
  using (public.eh_admin());

-- Gravação em lote (o módulo operacional usa esta função).
-- Recebe uma lista de registros e devolve o que foi aceito, o que foi
-- negado por permissão e o que estava desatualizado (alguém gravou depois).
create or replace function public.gravar_registros(p jsonb) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare
  r jsonb; k text; t text; nu bigint; n int; cur bigint;
  ok text[] := '{}'; negado text[] := '{}'; antigo text[] := '{}';
begin
  for r in select * from jsonb_array_elements(p) loop
    k := r->>'chave'; t := r->>'tipo'; nu := coalesce((r->>'u')::bigint, 0);
    update public.registros
       set tipo = t, dados = r->'dados', u = nu, excluido = coalesce((r->>'excluido')::boolean, false)
     where chave = k and u <= nu;
    get diagnostics n = row_count;
    if n > 0 then
      ok := ok || k;
    else
      select u into cur from public.registros where chave = k;
      if found then
        if cur > nu then antigo := antigo || k; else negado := negado || k; end if;
      else
        begin
          insert into public.registros (chave, tipo, dados, u, excluido)
          values (k, t, r->'dados', nu, coalesce((r->>'excluido')::boolean, false));
          ok := ok || k;
        exception when insufficient_privilege or check_violation then
          negado := negado || k;
        end;
      end if;
    end if;
  end loop;
  return jsonb_build_object('ok', to_jsonb(ok), 'negado', to_jsonb(negado), 'antigo', to_jsonb(antigo));
end $$;

-- ---------------------------------------------------------------------
-- 8. Administração de usuários (pelo sistema, sem abrir o painel do Supabase)
-- ---------------------------------------------------------------------
-- Cria usuário com e-mail + senha, já liberado, com o papel escolhido.
create or replace function public.admin_criar_usuario(p_email text, p_senha text, p_nome text, p_papel text)
returns uuid
language plpgsql security definer set search_path = public, extensions, auth as $$
declare
  v_id uuid := gen_random_uuid();
  v_email text := lower(trim(p_email));
begin
  if not public.is_admin() then raise exception 'Apenas administrador.'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'E-mail inválido.'; end if;
  if length(coalesce(p_senha,'')) < 6 then raise exception 'A senha precisa ter pelo menos 6 caracteres.'; end if;
  if p_papel not in ('admin','comercial','operacional','manutencao') then raise exception 'Função inválida.'; end if;
  if exists (select 1 from auth.users where lower(email) = v_email) then raise exception 'Este e-mail já tem cadastro.'; end if;

  perform set_config('app.admin_criando', '1', true);

  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
    crypt(p_senha, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('nome', coalesce(nullif(trim(p_nome),''), split_part(v_email,'@',1))),
    now(), now(), '', '', '', '');

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text,
    jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
    'email', now(), now(), now());

  update public.profiles
     set papel = p_papel, ativo = true,
         nome = coalesce(nullif(trim(p_nome),''), nome)
   where id = v_id;
  return v_id;
end $$;

-- Redefine a senha de um usuário.
create or replace function public.admin_redefinir_senha(p_id uuid, p_senha text)
returns void
language plpgsql security definer set search_path = public, extensions, auth as $$
begin
  if not public.is_admin() then raise exception 'Apenas administrador.'; end if;
  if length(coalesce(p_senha,'')) < 6 then raise exception 'A senha precisa ter pelo menos 6 caracteres.'; end if;
  update auth.users set encrypted_password = crypt(p_senha, gen_salt('bf')), updated_at = now() where id = p_id;
end $$;

revoke all on function public.admin_criar_usuario(text,text,text,text) from public, anon;
revoke all on function public.admin_redefinir_senha(uuid,text) from public, anon;
grant execute on function public.admin_criar_usuario(text,text,text,text) to authenticated;
grant execute on function public.admin_redefinir_senha(uuid,text) to authenticated;

-- ---------------------------------------------------------------------
-- 9. Acessos (GRANTs)
-- ---------------------------------------------------------------------
revoke all on public.profiles, public.registros from anon;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.registros to authenticated;
revoke all on function public.gravar_registros(jsonb) from public, anon;
grant execute on function public.gravar_registros(jsonb) to authenticated;
grant usage on sequence public.registros_rev_seq to authenticated;

-- ---------------------------------------------------------------------
-- 10. Tempo real (avisos para o admin e atualização de pontos)
-- ---------------------------------------------------------------------
do $$ begin
  begin alter publication supabase_realtime add table public.sugestoes;  exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.pontos;     exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.config;     exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.propostas;  exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.profiles;   exception when duplicate_object then null; end;
end $$;

-- Pronto. Próximo passo: rode supabase/02-seed-comercial.sql (137 pontos).
