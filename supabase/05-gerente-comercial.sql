-- =====================================================================
--  GERENTE COMERCIAL · novo perfil
--  Como usar: Supabase → SQL Editor → New query → cole TUDO → Run.
--  Pode rodar de novo sem problema (é idempotente).
--
--  O que o Gerente comercial pode:
--    - tudo que o perfil Comercial faz (montar proposta, mídia kit, sugestões);
--    - VER e ALTERAR os preços base (tabela de preços, comissão, BV e o
--      valor líquido/produção de cada endereço estático).
--  O que NÃO pode: criar, editar ou EXCLUIR pontos (só sugestões),
--  mexer em fotos, usuários ou qualquer outra configuração do kit.
--  O banco garante isso: o gerente só grava por duas funções abaixo.
-- =====================================================================

-- 1. Novo papel permitido
alter table public.profiles drop constraint if exists profiles_papel_check;
alter table public.profiles add constraint profiles_papel_check
  check (papel in ('admin','comercial','gerente_comercial','operacional','manutencao','financeiro','pendente','bloqueado'));

-- 2. Gerente também é "ativo comercial" (ler pontos/config, criar sugestões e propostas)
create or replace function public.is_ativo() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                  where id = auth.uid() and ativo and papel in ('admin','comercial','gerente_comercial'))
$$;

create or replace function public.eh_gerente_com() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                  where id = auth.uid() and papel = 'gerente_comercial' and ativo)
$$;

-- 3. Admin pode criar usuário com o novo papel
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
  if p_papel not in ('admin','comercial','gerente_comercial','operacional','manutencao','financeiro') then raise exception 'Função inválida.'; end if;
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

-- 4. Gravar preços base (só estas chaves da configuração)
create or replace function public.gerente_gravar_precos(p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if not (public.is_admin() or public.eh_gerente_com()) then
    raise exception 'Apenas administrador ou gerente comercial.';
  end if;
  select coalesce(jsonb_object_agg(k, val), '{}'::jsonb) into v
    from jsonb_each(p) as t(k, val)
   where k in ('precos','comissao','bv','modoGeral');
  update public.config set data = data || v where id = 'main';
  if not found then
    raise exception 'A configuração do kit ainda não foi salva pelo administrador.';
  end if;
end $$;

-- 5. Gravar valor líquido e produção líquida dos pontos (só estes dois campos)
create or replace function public.gerente_gravar_valores_pontos(p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare e jsonb; v jsonb;
begin
  if not (public.is_admin() or public.eh_gerente_com()) then
    raise exception 'Apenas administrador ou gerente comercial.';
  end if;
  for e in select * from jsonb_array_elements(p) loop
    select coalesce(jsonb_object_agg(k, val), '{}'::jsonb) into v
      from jsonb_each(e) as t(k, val) where k in ('liq','prod');
    update public.pontos set data = data || v where id = e->>'id';
  end loop;
end $$;

revoke all on function public.eh_gerente_com() from public, anon;
revoke all on function public.gerente_gravar_precos(jsonb) from public, anon;
revoke all on function public.gerente_gravar_valores_pontos(jsonb) from public, anon;
grant execute on function public.eh_gerente_com() to authenticated;
grant execute on function public.gerente_gravar_precos(jsonb) to authenticated;
grant execute on function public.gerente_gravar_valores_pontos(jsonb) to authenticated;
