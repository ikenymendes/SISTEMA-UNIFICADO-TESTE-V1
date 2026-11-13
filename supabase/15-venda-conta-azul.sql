-- =====================================================================
-- 15 · Nº DA VENDA NO CONTA AZUL (Financeiro)
--   Além da data do faturamento e do Nº da NF, o Financeiro passa a
--   registrar o Nº da venda no Conta Azul (campo "vca" do VT).
--   O campo é opcional: não impede registrar o faturamento.
--   Rode uma vez no Supabase (SQL Editor). Pode rodar de novo sem problema.
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
      'vca',     coalesce(dados->>'vca',''),
      'u',       u
    ) order by u desc)
    from public.registros
    where tipo = 'vt' and not excluido
      and coalesce((dados->>'chk')::boolean, false)
      and not coalesce((dados->>'nfat')::boolean, false)
  ), '[]'::jsonb);
end $$;

-- a versão antiga (4 parâmetros) sai para não haver duas funções com o mesmo nome
drop function if exists public.fin_registrar(text,text,text,boolean);

create or replace function public.fin_registrar(p_chave text, p_fdt text, p_nfn text, p_desfazer boolean default false, p_vca text default '')
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
    d := d || jsonb_build_object('fat', false, 'fdt', '', 'nfn', '', 'vca', '');
  else
    if coalesce(p_fdt,'') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Informe a data do faturamento.'; end if;
    if length(trim(coalesce(p_nfn,''))) = 0 then raise exception 'Informe o número da nota fiscal.'; end if;
    d := d || jsonb_build_object('fat', true, 'fdt', p_fdt, 'nfn', trim(p_nfn), 'vca', trim(coalesce(p_vca,'')));
  end if;
  nu := greatest((extract(epoch from clock_timestamp()) * 1000)::bigint,
                 (select u + 1 from public.registros where chave = p_chave));
  update public.registros set dados = d, u = nu where chave = p_chave;
  return jsonb_build_object('ok', true, 'u', nu);
end $$;

revoke all on function public.fin_listar() from public, anon;
revoke all on function public.fin_registrar(text,text,text,boolean,text) from public, anon;
grant execute on function public.fin_listar() to authenticated;
grant execute on function public.fin_registrar(text,text,text,boolean,text) to authenticated;
