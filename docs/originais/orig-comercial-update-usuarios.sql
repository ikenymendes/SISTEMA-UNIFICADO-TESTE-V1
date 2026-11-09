-- ATUALIZAÇÃO: criar usuários pelo sistema + coluna BV nas propostas.
-- Cole tudo no Supabase > SQL Editor > New query > Run. Pode rodar mais de uma vez.

create extension if not exists pgcrypto with schema extensions;

-- 1) BV guardado no backup das propostas
alter table public.propostas add column if not exists bv numeric;

-- 2) Cadastro de domínio: o administrador pode criar usuários de qualquer e-mail
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

-- 3) Administrador cria usuário com e-mail + senha (já liberado, sem confirmar e-mail)
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
  if p_papel not in ('admin','comercial') then raise exception 'Função inválida.'; end if;
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

  update public.profiles set papel = p_papel,
    nome = coalesce(nullif(trim(p_nome),''), nome) where id = v_id;
  return v_id;
end $$;

-- 4) Administrador redefine a senha de um usuário
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
