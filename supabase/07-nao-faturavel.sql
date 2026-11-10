-- =====================================================================
-- 07 · VTs NÃO FATURÁVEIS (permuta, cortesia, evento sem cobrança)
--   O Operacional marca o VT com "nfat = true". Esses VTs não aparecem
--   mais no Financeiro (nem como pendentes) e se concluem só com o checking.
--   Rode este arquivo uma vez no Supabase (SQL Editor).
-- =====================================================================
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
      and not coalesce((dados->>'nfat')::boolean, false)
  ), '[]'::jsonb);
end $$;
