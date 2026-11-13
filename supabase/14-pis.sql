-- =====================================================================
-- 14 · PI DE REPASSE (histórico)
-- Guarda as PIs de repasse emitidas. Quem vê e emite: admin e gerente comercial.
-- Só o admin apaga. Não há limpeza automática (PI é documento de cobrança).
-- Pode rodar mais de uma vez sem problema.
-- =====================================================================

create table if not exists public.pis (
  id uuid primary key default gen_random_uuid(),
  numero text,
  dados jsonb not null,
  criado_por uuid default auth.uid() references auth.users(id) on delete set null,
  criado_em timestamptz not null default now()
);
create index if not exists pis_criado_em on public.pis (criado_em desc);

alter table public.pis enable row level security;

drop policy if exists pis_ver on public.pis;
create policy pis_ver on public.pis for select to authenticated
  using (public.is_admin() or public.eh_gerente_com());

drop policy if exists pis_criar on public.pis;
create policy pis_criar on public.pis for insert to authenticated
  with check ((public.is_admin() or public.eh_gerente_com()) and criado_por = auth.uid());

drop policy if exists pis_apagar on public.pis;
create policy pis_apagar on public.pis for delete to authenticated
  using (public.is_admin());

grant select, insert, delete on public.pis to authenticated;
