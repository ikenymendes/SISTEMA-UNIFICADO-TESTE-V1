-- =====================================================================
-- 12 · Limite de tentativas (rate limit) no banco
-- Barra quem tentar encher o sistema de avisos: quem não é admin pode
-- criar no máximo 15 avisos a cada 10 minutos (o aviso de chegada do
-- motoboy manda 1 por endereço, então isso nunca atrapalha o uso normal).
-- Rode uma vez no Supabase (SQL Editor → New query → colar → Run),
-- depois do 11-aviso-chegada-motoboy.sql.
-- =====================================================================

create or replace function public.avisos_limite() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  if (select count(*) from public.avisos
       where criado_por = auth.uid() and criado_em > now() - interval '10 minutes') >= 15 then
    raise exception 'Muitos avisos em pouco tempo. Tente de novo em alguns minutos.'
      using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists avisos_limite on public.avisos;
create trigger avisos_limite before insert on public.avisos
  for each row execute function public.avisos_limite();
