-- =====================================================================
-- 13 · PROTOCOLOS DE ENTREGA (histórico de 30 dias)
-- Guarda os protocolos gerados para consulta. Quem vê e grava: admin e gerente comercial.
-- Protocolos com mais de 30 dias são apagados sozinhos sempre que um novo é salvo.
-- Pode rodar mais de uma vez sem problema.
-- =====================================================================

create table if not exists public.protocolos (
  id uuid primary key default gen_random_uuid(),
  numero text,
  dados jsonb not null,
  criado_por uuid default auth.uid() references auth.users(id) on delete set null,
  criado_em timestamptz not null default now()
);
create index if not exists protocolos_criado_em on public.protocolos (criado_em desc);

alter table public.protocolos enable row level security;

drop policy if exists protocolos_ver on public.protocolos;
create policy protocolos_ver on public.protocolos for select to authenticated
  using (public.is_admin() or public.eh_gerente_com());

drop policy if exists protocolos_criar on public.protocolos;
create policy protocolos_criar on public.protocolos for insert to authenticated
  with check ((public.is_admin() or public.eh_gerente_com()) and criado_por = auth.uid());

drop policy if exists protocolos_apagar on public.protocolos;
create policy protocolos_apagar on public.protocolos for delete to authenticated
  using (public.is_admin());

grant select, insert, delete on public.protocolos to authenticated;

-- limpeza automática: ao salvar um protocolo, apaga os com mais de 30 dias
create or replace function public.protocolos_limpar() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.protocolos where criado_em < now() - interval '30 days';
  return null;
end $$;

drop trigger if exists protocolos_limpar on public.protocolos;
create trigger protocolos_limpar after insert on public.protocolos
  for each statement execute function public.protocolos_limpar();
