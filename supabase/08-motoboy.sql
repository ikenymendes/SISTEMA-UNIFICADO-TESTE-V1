-- =====================================================================
--  08 · MOTOBOY · novo perfil (tela "Fotos perto de você")
--  Como usar: Supabase → SQL Editor → New query → cole TUDO → Run.
--  Pode rodar de novo sem problema.
--
--  O que o Motoboy pode:
--    - VER os pontos, os VTs e as fotos (para saber o que está pendente);
--    - GRAVAR só a situação das fotos (registros do tipo 'ft'), marcando
--      "Fiz as fotos". Validar continua com o admin/operacional.
--  O que NÃO pode: criar/alterar VT, ponto, manutenção, configuração etc.
--  O banco garante isso pelas regras abaixo.
-- =====================================================================

-- 1. Novo papel permitido
alter table public.profiles drop constraint if exists profiles_papel_check;
alter table public.profiles add constraint profiles_papel_check
  check (papel in ('admin','comercial','gerente_comercial','operacional','manutencao','financeiro','motoboy','pendente','bloqueado'));

-- 2. Motoboy também é usuário ativo da parte operacional (pode ler)
create or replace function public.eh_ativo() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                  where id = auth.uid() and ativo and papel in ('admin','operacional','manutencao','motoboy'))
$$;

create or replace function public.eh_moto() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                  where id = auth.uid() and papel = 'motoboy' and ativo)
$$;

-- 3. Gravar: motoboy só grava fotos ('ft'); o resto continua igual
drop policy if exists reg_criar on public.registros;
create policy reg_criar on public.registros for insert to authenticated
  with check (public.eh_ativo()
              and (tipo not in ('fx','cfg') or public.eh_admin())
              and (not public.eh_manut() or tipo = 'mn')
              and (not public.eh_moto() or tipo = 'ft'));

drop policy if exists reg_alterar on public.registros;
create policy reg_alterar on public.registros for update to authenticated
  using (public.eh_ativo()
         and (tipo not in ('fx','vr','cfg') or public.eh_admin())
         and (not public.eh_manut() or tipo = 'mn')
         and (not public.eh_moto() or tipo = 'ft'))
  with check (public.eh_ativo()
              and (tipo not in ('fx','vr','cfg') or public.eh_admin())
              and (not public.eh_manut() or tipo = 'mn')
              and (not public.eh_moto() or tipo = 'ft'));

-- 4. Admin pode criar usuário com o novo papel (tela Usuários do sistema)
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
  if p_papel not in ('admin','comercial','gerente_comercial','operacional','manutencao','financeiro','motoboy') then raise exception 'Função inválida.'; end if;
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

revoke all on function public.admin_criar_usuario(text,text,text,text) from public, anon;
grant execute on function public.admin_criar_usuario(text,text,text,text) to authenticated;
