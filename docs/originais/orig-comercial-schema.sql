-- =====================================================================
--  MEGA MÍDIA OOH · Gerador de Mídia Kit · banco de dados (Supabase)
--  Cole este arquivo inteiro em: Supabase > SQL Editor > New query > Run
--  Pode rodar de novo sem medo: tudo é "create if not exists / or replace".
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Configuração de acesso
-- ---------------------------------------------------------------------
-- Só e-mails destes domínios conseguem criar conta.
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
-- 2. Perfis (um por usuário do login)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  nome       text,
  papel      text not null default 'pendente'
             check (papel in ('admin','comercial','pendente','bloqueado')),
  criado_em  timestamptz not null default now()
);

-- Funções de apoio usadas nas regras de segurança
create or replace function public.meu_papel() returns text
language sql stable security definer set search_path = public as $$
  select papel from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select papel = 'admin' from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_ativo() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select papel in ('admin','comercial') from public.profiles where id = auth.uid()), false)
$$;

-- Bloqueia cadastro fora dos domínios permitidos
create or replace function public.checa_dominio() returns trigger
language plpgsql security definer set search_path = public as $$
begin
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

-- Cria o perfil automaticamente quando alguém se cadastra
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

drop trigger if exists trg_novo_usuario on auth.users;
create trigger trg_novo_usuario after insert on auth.users
  for each row execute function public.novo_usuario();

alter table public.profiles enable row level security;

drop policy if exists profiles_ler on public.profiles;
create policy profiles_ler on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_altera on public.profiles;
create policy profiles_admin_altera on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 3. Configuração do kit (textos, preços base etc.) e pontos
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

-- Todos os usuários liberados LEEM; só o administrador ESCREVE.
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
-- 4. Sugestões do comercial (adicionar / alterar ponto)
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
  select * into p from public.profiles where id = auth.uid();
  new.criado_por       := auth.uid();
  new.criado_por_email := p.email;
  new.criado_por_nome  := p.nome;
  return new;
end $$;

drop trigger if exists trg_sugestoes_autor on public.sugestoes;
create trigger trg_sugestoes_autor before insert on public.sugestoes
  for each row execute function public.preenche_autor();

alter table public.sugestoes enable row level security;

drop policy if exists sugestoes_ler on public.sugestoes;
create policy sugestoes_ler on public.sugestoes for select to authenticated
  using (criado_por = auth.uid() or public.is_admin());

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
-- 5. Backup das propostas (SEM fotos: só locais e valores praticados)
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
create index if not exists propostas_data_idx on public.propostas (criado_em desc);
create index if not exists propostas_autor_idx on public.propostas (criado_por);

drop trigger if exists trg_propostas_autor on public.propostas;
create trigger trg_propostas_autor before insert on public.propostas
  for each row execute function public.preenche_autor();

alter table public.propostas enable row level security;

drop policy if exists propostas_ler on public.propostas;
create policy propostas_ler on public.propostas for select to authenticated
  using (criado_por = auth.uid() or public.is_admin());

drop policy if exists propostas_criar on public.propostas;
create policy propostas_criar on public.propostas for insert to authenticated
  with check (public.is_ativo());
-- Sem update e sem delete: o histórico é um backup, ninguém reescreve.

-- ---------------------------------------------------------------------
-- 6. Fotos (Storage)
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
-- 7. Tempo real (avisos para o admin e atualização de pontos)
-- ---------------------------------------------------------------------
do $$ begin
  begin alter publication supabase_realtime add table public.sugestoes; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.pontos;    exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.config;    exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.propostas; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.profiles;  exception when duplicate_object then null; end;
end $$;

-- Pronto. Próximo passo: rode supabase/seed.sql para carregar os 137 pontos atuais.
