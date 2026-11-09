-- =====================================================================
-- FINANCEIRO · perfil novo + leitura/gravação segura dos faturamentos
-- Rode UMA vez no Supabase: SQL Editor -> colar tudo -> Run. Pode rodar de novo sem problema.
--   O financeiro NÃO lê a tabela registros. Ele só usa as duas funções abaixo:
--     fin_listar()    -> devolve só VTs com CHECKING CONCLUÍDO (campos de faturamento incluídos)
--     fin_registrar() -> grava só data do faturamento e Nº da NF (ou desfaz) nesse VT
--   Os campos gravados são os mesmos que o Operacional já usa (fat, fdt, nfn),
--   por isso os dois lados enxergam a mesma coisa, sem sincronizar nada à parte.
-- =====================================================================
alter table public.profiles drop constraint if exists profiles_papel_check;
alter table public.profiles add constraint profiles_papel_check
  check (papel in ('admin','comercial','operacional','manutencao','financeiro','pendente','bloqueado'));

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
  if p_papel not in ('admin','comercial','operacional','manutencao','financeiro') then raise exception 'Função inválida.'; end if;
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
grant execute on function public.admin_criar_usuario(text,text,text,text) to authenticated;

create or replace function public.eh_financeiro() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                  where id = auth.uid() and ativo and papel in ('admin','financeiro'))
$$;

create or replace function public.fin_listar() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.eh_financeiro() then raise exception 'Sem acesso ao financeiro.'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'chave',   chave,
      'cliente', dados->>'cliente',
      'pi',      coalesce(dados->>'pi',''),
      'tipo',    coalesce(dados->>'tipo',''),
      'evento',  coalesce(dados#>>'{ev,nome}',''),
      'ini',     coalesce(dados->>'ini',''),
      'fim',     coalesce(dados->>'fim',''),
      'paineis', jsonb_array_length(coalesce(dados->'paineis','[]'::jsonb)),
      'chkd',    coalesce(dados->>'chkd',''),
      'fat',     coalesce((dados->>'fat')::boolean, false),
      'fdt',     coalesce(dados->>'fdt',''),
      'nfn',     coalesce(dados->>'nfn',''),
      'u',       u
    ) order by u desc)
    from public.registros
    where tipo = 'vt' and not excluido
      and coalesce((dados->>'chk')::boolean, false)
  ), '[]'::jsonb);
end $$;

create or replace function public.fin_registrar(p_chave text, p_fdt text, p_nfn text, p_desfazer boolean default false)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare d jsonb; nu bigint;
begin
  if not public.eh_financeiro() then raise exception 'Sem acesso ao financeiro.'; end if;
  select dados into d from public.registros
   where chave = p_chave and tipo = 'vt' and not excluido for update;
  if not found then raise exception 'VT não encontrado.'; end if;
  if not coalesce((d->>'chk')::boolean, false) then
    raise exception 'O checking deste VT ainda não foi concluído.';
  end if;
  if p_desfazer then
    d := d || jsonb_build_object('fat', false, 'fdt', '', 'nfn', '');
  else
    if coalesce(p_fdt,'') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Informe a data do faturamento.'; end if;
    if length(trim(coalesce(p_nfn,''))) = 0 then raise exception 'Informe o número da nota fiscal.'; end if;
    d := d || jsonb_build_object('fat', true, 'fdt', p_fdt, 'nfn', trim(p_nfn));
  end if;
  -- "u" é a hora da última alteração (ms): o mais recente vence na sincronização do Operacional.
  nu := greatest((extract(epoch from clock_timestamp()) * 1000)::bigint,
                 (select u + 1 from public.registros where chave = p_chave));
  update public.registros set dados = d, u = nu where chave = p_chave;
  return jsonb_build_object('ok', true, 'u', nu);
end $$;

revoke all on function public.eh_financeiro() from public, anon;
revoke all on function public.fin_listar() from public, anon;
revoke all on function public.fin_registrar(text,text,text,boolean) from public, anon;
grant execute on function public.eh_financeiro() to authenticated;
grant execute on function public.fin_listar() to authenticated;
grant execute on function public.fin_registrar(text,text,text,boolean) to authenticated;
