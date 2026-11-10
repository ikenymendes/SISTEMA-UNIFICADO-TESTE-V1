-- Base de preços SP: o gerente/admin também grava os valores SP (liqsp / prodsp) dos pontos
create or replace function public.gerente_gravar_valores_pontos(p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare e jsonb; v jsonb;
begin
  if not (public.is_admin() or public.eh_gerente_com()) then
    raise exception 'Apenas administrador ou gerente comercial.';
  end if;
  for e in select * from jsonb_array_elements(p) loop
    select coalesce(jsonb_object_agg(k, val), '{}'::jsonb) into v
      from jsonb_each(e) as t(k, val) where k in ('liq','prod','liqsp','prodsp');
    update public.pontos set data = data || v where id = e->>'id';
  end loop;
end $$;
