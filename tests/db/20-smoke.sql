-- =====================================================================
-- Smoke test do schema Mylink (rodar com ON_ERROR_STOP=1)
-- Cada bloco raise NOTICE 'Tn OK ...' ao passar; exception aborta o script.
-- =====================================================================
\set ON_ERROR_STOP on

-- T1: cadastro por e-mail cria perfil definitivo (trigger auth.users)
insert into auth.users (email, raw_user_meta_data)
values ('klauz@exemplo.test', '{"handle":"klauz","display_name":"Klauz"}');
do $$ begin
  if not exists (select 1 from public.profiles
                  where handle = 'klauz' and display_name = 'Klauz'
                    and handle_temporary = false and plan_id = 1
                    and status = 'ativo' and role = 'user') then
    raise exception 'FALHA T1: perfil nao criado pelo trigger';
  end if;
  raise notice 'T1 OK cadastro-cria-perfil';
end $$;

-- T2: handle duplicado barrado
do $$ declare v_ok boolean := false; begin
  begin
    insert into auth.users (email, raw_user_meta_data)
    values ('x@exemplo.test', '{"handle":"klauz","display_name":"X"}');
  exception when others then
    if sqlerrm like '%já está em uso%' then v_ok := true; else raise; end if;
  end;
  if not v_ok then raise exception 'FALHA T2: handle duplicado aceito'; end if;
  raise notice 'T2 OK handle-duplicado';
end $$;

-- T3: handle reservado barrado
do $$ declare v_ok boolean := false; begin
  begin
    insert into auth.users (email, raw_user_meta_data)
    values ('y@exemplo.test', '{"handle":"app","display_name":"Y"}');
  exception when others then
    if sqlerrm like '%reservado%' then v_ok := true; else raise; end if;
  end;
  if not v_ok then raise exception 'FALHA T3: handle reservado aceito'; end if;
  raise notice 'T3 OK handle-reservado';
end $$;

-- T4: login social cria handle provisório (onboarding)
insert into auth.users (email, raw_user_meta_data) values ('google@exemplo.test', '{}');
do $$ begin
  if not exists (select 1 from public.profiles p join auth.users u on u.id = p.id
                  where u.email = 'google@exemplo.test'
                    and p.handle like 'usuario-%' and p.handle_temporary) then
    raise exception 'FALHA T4: handle provisório nao criado';
  end if;
  raise notice 'T4 OK onboarding-provisorio';
end $$;

-- T5: onboarding troca handle; handle reservado continua barrado no UPDATE
do $$ declare v_lara uuid; v_ok boolean := false; begin
  select id into v_lara from auth.users where email = 'google@exemplo.test';
  update public.profiles set handle = 'lara', handle_temporary = false where id = v_lara;
  begin
    update public.profiles set handle = 'painel' where id = v_lara;
  exception when others then
    if sqlerrm like '%reservado%' then v_ok := true; else raise; end if;
  end;
  if not v_ok then raise exception 'FALHA T5'; end if;
  if (select handle from public.profiles where id = v_lara) <> 'lara' then
    raise exception 'FALHA T5b: onboarding nao aplicou';
  end if;
  raise notice 'T5 OK onboarding-e-reservado';
end $$;

-- T6: limite de páginas (Free = 1)
do $$ declare v_owner uuid; v_ok boolean := false; begin
  select id into v_owner from auth.users where email = 'klauz@exemplo.test';
  insert into public.pages (owner_id, title, slug) values (v_owner, 'Minha página', null);
  begin
    insert into public.pages (owner_id, title, slug) values (v_owner, 'Segunda', 'outra');
  exception when others then
    if sqlerrm like 'Limite de %' then v_ok := true; else raise; end if;
  end;
  if not v_ok then raise exception 'FALHA T6: limite de paginas nao aplicou'; end if;
  raise notice 'T6 OK limite-paginas';
end $$;

-- T7: limite de links (Free = 5 por página)
do $$ declare v_owner uuid; v_page uuid; i int; v_ok boolean := false; begin
  select id into v_owner from auth.users where email = 'klauz@exemplo.test';
  select id into v_page from public.pages where owner_id = v_owner and slug is null;
  for i in 1..5 loop
    insert into public.links (page_id, title, url, position)
    values (v_page, 'Link ' || i, 'https://exemplo.com/' || i, i);
  end loop;
  begin
    insert into public.links (page_id, title, url, position)
    values (v_page, 'Extra', 'https://exemplo.com/extra', 6);
  exception when others then
    if sqlerrm like 'Seu plano permite %' then v_ok := true; else raise; end if;
  end;
  if not v_ok then raise exception 'FALHA T7: limite de links nao aplicou'; end if;
  raise notice 'T7 OK limite-links';
end $$;

-- T8: reorder_links (dono via JWT) atômico e com permissão
do $$
declare
  v_owner uuid; v_page uuid; v_ids uuid[]; v_first uuid; v_pos int; v_ok boolean := false;
begin
  select id into v_owner from auth.users where email = 'klauz@exemplo.test';
  select id into v_page from public.pages where owner_id = v_owner and slug is null;
  perform set_config('request.jwt.claim.sub', v_owner::text, false);

  select array_agg(id order by position desc) into v_ids from public.links where page_id = v_page;
  select id into v_first from public.links where page_id = v_page order by position desc limit 1;
  perform public.reorder_links(v_page, v_ids);
  select position into v_pos from public.links where id = v_first;
  if v_pos <> 1 then raise exception 'FALHA T8a: posicao nao aplicada'; end if;

  begin
    perform public.reorder_links(v_page, array_append(v_ids, gen_random_uuid()));
  exception when others then
    if sqlerrm like 'Não foi possível salvar%' then v_ok := true; else raise; end if;
  end;
  if not v_ok then raise exception 'FALHA T8b: id estranho nao detectado'; end if;
  if (select count(*) from public.links where page_id = v_page) <> 5 then
    raise exception 'FALHA T8c: reorder parcial nao revertido';
  end if;
  raise notice 'T8 OK reorder-atomico';
end $$;

-- T8d: reorder por usuário alheio -> permissão negada
do $$ declare v_lara uuid; v_page uuid; v_ok boolean := false; begin
  select id into v_lara from auth.users where email = 'google@exemplo.test';
  select id into v_page from public.pages where slug is null;
  perform set_config('request.jwt.claim.sub', v_lara::text, false);
  begin
    perform public.reorder_links(v_page,
      array[(select id from public.links where page_id = v_page order by position limit 1)]);
  exception when others then
    if sqlerrm like '%sem permissão%' then v_ok := true; else raise; end if;
  end;
  if not v_ok then raise exception 'FALHA T8d'; end if;
  raise notice 'T8d OK reorder-sem-permissao';
end $$;

-- Preparação p/ métricas e RLS: publica página da klauz, cria página da lara,
-- promove lara a admin (simula promoção manual inicial)
update public.pages set published = true where slug is null;
do $$ declare v_lara uuid; begin
  select id into v_lara from auth.users where email = 'google@exemplo.test';
  insert into public.pages (owner_id, title, slug) values (v_lara, 'Página da Lara', 'lara');
  update public.profiles set role = 'admin' where id = v_lara;
end $$;

-- T9: get_metrics — janela Free (30d), permissão por dono
do $$
declare
  v_owner uuid; v_page uuid; v_m jsonb;
  v_views int; v_clicks int; v_janela int;
begin
  select id into v_owner from auth.users where email = 'klauz@exemplo.test';
  select id into v_page from public.pages where owner_id = v_owner and slug is null;
  perform set_config('request.jwt.claim.sub', v_owner::text, false);

  insert into public.click_events (page_id, link_id, kind, occurred_at) values
    (v_page, null, 'view', now()),
    (v_page, null, 'view', now()),
    (v_page, (select id from public.links where page_id = v_page order by position limit 1), 'click', now()),
    (v_page, null, 'view', now() - interval '40 days');   -- fora da janela Free

  v_m := public.get_metrics(v_page, current_date - 60, current_date);
  v_views   := (v_m->'totais'->>'views')::int;
  v_clicks  := (v_m->'totais'->>'clicks')::int;
  v_janela  := (v_m->>'janela_dias')::int;
  if v_views <> 2 or v_clicks <> 1 or v_janela <> 30 then
    raise exception 'FALHA T9: views=% clicks=% janela=% (esperado 2/1/30)', v_views, v_clicks, v_janela;
  end if;

  perform set_config('request.jwt.claim.sub',
    (select id from auth.users where email = 'google@exemplo.test')::text, false);
  begin
    perform public.get_metrics(v_page, current_date - 60, current_date);
    raise exception 'FALHA T9b: metricas vazaram para outra usuaria';
  exception
    when others then
      -- exceções próprias do teste (FALHA*) sempre abortam; a de negócio é esperada
      if sqlerrm like 'FALHA%' then raise; end if;
      if sqlerrm not like 'Página não encontrada.' then raise; end if;
  end;
  raise notice 'T9 OK metricas-janela-e-permissao';
end $$;

-- ====================================================================
-- A partir daqui, comportamento com papéis reais (RLS)
-- ====================================================================
set role authenticated;

-- T10: RLS de páginas/links
select set_config('request.jwt.claim.sub',
  (select id from auth.users where email = 'klauz@exemplo.test')::text, false);
do $$ begin
  if (select count(*) from public.pages) < 1 then
    raise exception 'FALHA T10a: dono nao vê as proprias paginas';
  end if;
end $$;

select set_config('request.jwt.claim.sub', '', false);   -- visitante anônimo
do $$ begin
  if (select count(*) from public.pages where published = false) > 0 then
    raise exception 'FALHA T10b: rascunho visivel para anon';
  end if;
  if (select count(*) from public.pages where published = true) < 1 then
    raise exception 'FALHA T10c: publicada invisivel para anon';
  end if;
end $$;

-- T10d: anônimo não escreve em click_events nem em pages
do $$ declare v_ok boolean := false; begin
  begin
    insert into public.click_events (page_id, kind)
    values ((select id from public.pages where published limit 1), 'view');
  exception when others then v_ok := true; end;
  if not v_ok then raise exception 'FALHA T10d: insert em click_events aceito'; end if;
  raise notice 'T10d OK click-events-escrita-negada';
end $$;

-- T10e: usuária não mexe na página de outra (0 linhas; título preservado)
select set_config('request.jwt.claim.sub',
  (select id from auth.users where email = 'google@exemplo.test')::text, false);
do $$ begin
  update public.pages set title = 'hack' where slug is null;
  if (select title from public.pages where slug is null) <> 'Minha página' then
    raise exception 'FALHA T10e: pagina alheia foi alterada';
  end if;
  raise notice 'T10e OK paginas-alheias-isoladas';
end $$;

-- T11: admin RPCs
do $$ declare v_klauz uuid; v_pro smallint; begin
  select id into v_klauz from auth.users where email = 'klauz@exemplo.test';
  select id into v_pro from public.plans where code = 'pro';
  perform public.admin_assign_plan(v_klauz, v_pro);   -- lara é admin (JWT acima)
  if (select plan_id from public.profiles where id = v_klauz) <> v_pro then
    raise exception 'FALHA T11a: admin_assign_plan nao aplicou';
  end if;
  raise notice 'T11a OK admin-atribui-plano';
end $$;

-- T11b: não-admin não usa RPC admin
select set_config('request.jwt.claim.sub',
  (select id from auth.users where email = 'klauz@exemplo.test')::text, false);
do $$ declare v_ok boolean := false; begin
  begin
    perform public.admin_set_user_status(
      (select id from auth.users where email = 'google@exemplo.test'), 'bloqueado');
  exception when others then
    if sqlerrm like '%Acesso restrito%' then v_ok := true; else raise; end if;
  end;
  if not v_ok then raise exception 'FALHA T11b: admin RPC sem papel passou'; end if;
  if (select count(*) from public.admin_list_users()) <> 0 then
    raise exception 'FALHA T11c: admin_list_users vazou para nao-admin';
  end if;
  raise notice 'T11b OK admin-rpcs-negadas';
end $$;

-- T11d: admin lista usuários com e-mail
select set_config('request.jwt.claim.sub',
  (select id from auth.users where email = 'google@exemplo.test')::text, false);
do $$ begin
  if (select count(*) from public.admin_list_users()) < 2 then
    raise exception 'FALHA T11d: admin_list_users incompleta';
  end if;
  if not exists (select 1 from public.admin_list_users() where email = 'klauz@exemplo.test') then
    raise exception 'FALHA T11e: e-mail ausente na listagem admin';
  end if;
  raise notice 'T11d OK admin-lista-usuarios-com-email';
end $$;

-- T12: RLS de plans — admin edita, usuário comum não
update public.plans set price_monthly_cents = 1501 where code = 'pro';
select set_config('request.jwt.claim.sub',
  (select id from auth.users where email = 'klauz@exemplo.test')::text, false);
do $$ begin
  update public.plans set price_monthly_cents = 9999 where code = 'pro';
  if (select price_monthly_cents from public.plans where code = 'pro') <> 1501 then
    raise exception 'FALHA T12: usuario comum alterou plano';
  end if;
  raise notice 'T12 OK plans-rls';
end $$;

-- T13: usuário bloqueado não escreve (RLS with check); desbloqueado volta a escrever
select set_config('request.jwt.claim.sub',
  (select id from auth.users where email = 'google@exemplo.test')::text, false);
do $$ declare v_klauz uuid; v_ok boolean := false; begin
  select id into v_klauz from auth.users where email = 'klauz@exemplo.test';
  perform public.admin_set_user_status(v_klauz, 'bloqueado');   -- ação do admin (lara)
  if (select status from public.profiles where id = v_klauz) <> 'bloqueado' then
    raise exception 'FALHA T13a: bloqueio nao aplicou';
  end if;
  raise notice 'T13a OK admin-bloqueia';
end $$;

select set_config('request.jwt.claim.sub',
  (select id from auth.users where email = 'klauz@exemplo.test')::text, false);
do $$ declare v_ok boolean := false; begin
  begin
    insert into public.pages (owner_id, title, slug)
    values ((select id from auth.users where email = 'klauz@exemplo.test'), 'Bloqueada', 'blk');
  exception when others then
    if sqlerrm like '%new row violates row-level security policy%' then v_ok := true; else raise; end if;
  end;
  if not v_ok then raise exception 'FALHA T13b: bloqueado conseguiu escrever'; end if;
  raise notice 'T13b OK bloqueado-sem-escrita';
end $$;

-- T13c: admin reativa e a escrita volta (Pro = ilimitado)
select set_config('request.jwt.claim.sub',
  (select id from auth.users where email = 'google@exemplo.test')::text, false);
do $$ begin
  perform public.admin_set_user_status(
    (select id from auth.users where email = 'klauz@exemplo.test'), 'ativo');
end $$;
select set_config('request.jwt.claim.sub',
  (select id from auth.users where email = 'klauz@exemplo.test')::text, false);
do $$ begin
  insert into public.pages (owner_id, title, slug)
  values ((select id from auth.users where email = 'klauz@exemplo.test'), 'Nova página', 'nova');
  if not exists (select 1 from public.pages where slug = 'nova') then
    raise exception 'FALHA T13c: reativado continuou bloqueado';
  end if;
  raise notice 'T13c OK reativado-volta-a-escrever';
end $$;

-- T14: storage — dono só escreve na propria pasta
do $$ declare v_uid text; v_ok boolean := false; begin
  perform set_config('request.jwt.claim.sub',
    (select id from auth.users where email = 'klauz@exemplo.test')::text, false);
  v_uid := (select id from auth.users where email = 'klauz@exemplo.test')::text;

  insert into storage.objects (bucket_id, name) values ('avatars', v_uid || '/avatar.webp');

  begin
    insert into storage.objects (bucket_id, name)
    values ('avatars', 'outra-pessoa/avatar.webp');
  exception when others then v_ok := true; end;
  if not v_ok then raise exception 'FALHA T14a: pasta alheia aceita'; end if;

  v_ok := false;
  begin
    insert into storage.objects (bucket_id, name) values ('avatars', 'sem-pasta.webp');
  exception when others then v_ok := true; end;
  if not v_ok then raise exception 'FALHA T14b: arquivo sem pasta aceito'; end if;
  raise notice 'T14 OK storage-rls';
end $$;

reset role;
\echo 'SMOKE OK — schema Mylink validado'
