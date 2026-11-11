-- =====================================================================
-- 11 · Aviso de chegada do motoboy
-- Quando o motoboy chega a até 70 m de um ponto com foto pendente, o app
-- dele manda um aviso (sininho) para o administrador.
-- Libera o motoboy a criar avisos SÓ para o admin, e só desse tipo
-- (abrindo a tela de fotos). Os demais avisos continuam só do admin.
-- Rode uma vez no Supabase (SQL Editor → New query → colar → Run).
-- =====================================================================

drop policy if exists avisos_criar on public.avisos;
create policy avisos_criar on public.avisos for insert to authenticated
  with check (
    public.is_admin()
    or (public.eh_ativo() and public.eh_moto()
        and destino = 'admin' and destino_id is null and abrir = 'fp'
        and criado_por = auth.uid())
  );
