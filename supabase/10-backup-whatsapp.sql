-- =====================================================================
-- 10 · Backup do WhatsApp (Fotos validadas › 📲 Backup WhatsApp)
-- Libera um novo tipo de registro, 'wpp', onde fica o histórico de
-- pedidos de rota do grupo do operacional. Só o administrador grava;
-- quem já pode ver os registros do operacional pode ler.
-- Rode uma vez no Supabase (SQL Editor → New query → colar → Run).
-- =====================================================================

-- 1. aceita o tipo 'wpp'
alter table public.registros drop constraint if exists registros_tipo_check;
alter table public.registros add constraint registros_tipo_check
  check (tipo in ('fx','vr','vt','ft','mn','es','cf','cfg','rot','wpp'));

-- 2. gravar/alterar 'wpp' só o admin (o resto continua igual ao 08-motoboy.sql)
drop policy if exists reg_criar on public.registros;
create policy reg_criar on public.registros for insert to authenticated
  with check (public.eh_ativo()
              and (tipo not in ('fx','cfg','wpp') or public.eh_admin())
              and (not public.eh_manut() or tipo = 'mn')
              and (not public.eh_moto() or tipo = 'ft'));

drop policy if exists reg_alterar on public.registros;
create policy reg_alterar on public.registros for update to authenticated
  using (public.eh_ativo()
         and (tipo not in ('fx','vr','cfg','wpp') or public.eh_admin())
         and (not public.eh_manut() or tipo = 'mn')
         and (not public.eh_moto() or tipo = 'ft'))
  with check (public.eh_ativo()
              and (tipo not in ('fx','vr','cfg','wpp') or public.eh_admin())
              and (not public.eh_manut() or tipo = 'mn')
              and (not public.eh_moto() or tipo = 'ft'));
