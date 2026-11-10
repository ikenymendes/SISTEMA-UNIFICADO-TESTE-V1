-- =====================================================================
--  09 · AVISOS (notificação do navegador enviada pelo admin)
--  Como usar: Supabase → SQL Editor → New query → cole TUDO → Run.
--  Pode rodar de novo sem problema.
--
--  - Só o ADMIN envia avisos.
--  - Cada usuário só enxerga os avisos destinados a ele: "todos", a
--    função dele (motoboy, operacional...) ou ele mesmo.
--  - "avisos_lidos" guarda quem já recebeu (para o admin ver "6 receberam").
-- =====================================================================

create table if not exists public.avisos (
  id              uuid primary key default gen_random_uuid(),
  criado_em       timestamptz not null default now(),
  criado_por      uuid default auth.uid(),
  criado_por_nome text,
  titulo          text not null check (length(titulo) between 1 and 120),
  texto           text check (length(coalesce(texto,'')) <= 600),
  destino         text not null default 'todos'
                  check (destino in ('todos','admin','comercial','gerente_comercial','operacional','manutencao','motoboy','financeiro','usuario')),
  destino_id      uuid,
  abrir           text
);
create index if not exists avisos_data_idx on public.avisos (criado_em desc);

create table if not exists public.avisos_lidos (
  aviso_id uuid not null references public.avisos(id) on delete cascade,
  user_id  uuid not null default auth.uid(),
  lido_em  timestamptz not null default now(),
  primary key (aviso_id, user_id)
);

-- quem pode ver um aviso
create or replace function public.aviso_e_pra_mim(p_destino text, p_destino_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid() and ativo and papel not in ('pendente','bloqueado')
       and (p_destino = 'todos' or p_destino = papel or (p_destino = 'usuario' and p_destino_id = auth.uid()))
  )
$$;

alter table public.avisos enable row level security;
alter table public.avisos_lidos enable row level security;

drop policy if exists avisos_ver on public.avisos;
create policy avisos_ver on public.avisos for select to authenticated
  using (public.is_admin() or public.aviso_e_pra_mim(destino, destino_id));

drop policy if exists avisos_criar on public.avisos;
create policy avisos_criar on public.avisos for insert to authenticated
  with check (public.is_admin());

drop policy if exists avisos_apagar on public.avisos;
create policy avisos_apagar on public.avisos for delete to authenticated
  using (public.is_admin());

drop policy if exists lidos_ver on public.avisos_lidos;
create policy lidos_ver on public.avisos_lidos for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists lidos_marcar on public.avisos_lidos;
create policy lidos_marcar on public.avisos_lidos for insert to authenticated
  with check (user_id = auth.uid());

revoke all on public.avisos, public.avisos_lidos from anon;
grant select, insert, delete on public.avisos to authenticated;
grant select, insert on public.avisos_lidos to authenticated;
revoke all on function public.aviso_e_pra_mim(text, uuid) from public, anon;
grant execute on function public.aviso_e_pra_mim(text, uuid) to authenticated;
