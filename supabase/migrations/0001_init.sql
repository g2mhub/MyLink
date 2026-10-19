-- =====================================================================
-- Mylink — migração inicial (espelha docs/03-banco-de-dados.md)
-- Supabase / PostgreSQL 15+
-- =====================================================================

create extension if not exists pgcrypto;

create type public.layout_kind as enum ('lista', 'grade', 'cards');
create type public.button_kind as enum ('solido', 'contorno', 'sombra');
create type public.event_kind  as enum ('view', 'click');

-- ---------------------------------------------------------------- plans
create table public.plans (
  id                  smallint generated always as identity primary key,
  code                text not null unique check (code in ('free', 'pro')),
  name                text not null,
  max_pages           integer not null,          -- -1 = ilimitado
  max_links_per_page  integer not null,          -- -1 = ilimitado
  metrics_days        integer not null,          -- janela de dados; -1 = histórico todo
  custom_domain       boolean not null default false,
  price_monthly_cents integer not null default 0, -- R$; pro = 1500 (R$ 15,00)
  created_at          timestamptz not null default now()
);

-- ------------------------------------------------------------ handles
create or replace function public.is_handle_reserved(h text)
returns boolean language sql immutable as $$
  select h = any(array[
    'app','api','admin','auth','painel','entrar','cadastro','sair','logout',
    'recuperar','redefinir','onboarding','assets','static','favicon','robots',
    'sobre','ajuda','termos','privacidade','contato','suporte','blog',
    'mylink','www','mailto','metricas','config','preview','404','null','undefined'
  ])
$$;

-- ------------------------------------------------------------ profiles
create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  handle            text not null unique
                      check (handle ~ '^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$'),
  handle_temporary  boolean not null default false,
  display_name      text not null check (char_length(display_name) between 1 and 50),
  bio               text not null default '' check (char_length(bio) <= 300),
  avatar_url        text,
  plan_id           smallint not null default 1 references public.plans(id),
  plan_valid_until  timestamptz,                -- reserva p/ cobrança futura
  role              text not null default 'user' check (role in ('user', 'admin')),
  status            text not null default 'ativo' check (status in ('ativo', 'bloqueado')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create or replace function public.check_handle(h text)
returns void language plpgsql stable as $$
begin
  if h !~ '^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$' then
    raise exception 'Handle inválido: use letras minúsculas, números e hífen (3–30 caracteres).';
  end if;
  if public.is_handle_reserved(h) then
    raise exception 'Este nome de usuário está reservado.';
  end if;
  if exists (select 1 from public.profiles where handle = h) then
    raise exception 'Este nome de usuário já está em uso.';
  end if;
end $$;

-- --------------------------------------------------------------- temas
create table public.themes (
  slug       text primary key,
  name       text not null,
  is_dark    boolean not null default false,
  tokens     jsonb not null,
  position   smallint not null default 0,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------- páginas
create table public.pages (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 60),
  slug         text check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$'),
  theme_slug   text not null default 'classico' references public.themes(slug),
  layout       public.layout_kind   not null default 'lista',
  button_style public.button_kind   not null default 'solido',
  font_body    text not null default 'inter',
  overrides    jsonb not null default '{}'::jsonb,
  published    boolean not null default false,
  position     smallint not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint pages_slug_unico_por_dono unique (owner_id, slug)
  -- página principal = slug IS NULL (servida em /{handle})
);

create index pages_owner_idx on public.pages (owner_id, position);

-- --------------------------------------------------------------- links
create table public.links (
  id          uuid primary key default gen_random_uuid(),
  page_id     uuid not null references public.pages(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 80),
  url         text not null check (url ~* '^(https?://|mailto:|tel:)'),
  icon        text not null default 'link',
  highlighted boolean not null default false,
  enabled     boolean not null default true,
  position    smallint not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index links_page_position_idx on public.links (page_id, position);

-- ------------------------------------------------------------- métricas
create table public.click_events (
  id           bigint generated always as identity primary key,
  page_id      uuid not null references public.pages(id) on delete cascade,
  link_id      uuid references public.links(id) on delete set null,
  kind         public.event_kind not null default 'click',
  occurred_at  timestamptz not null default now(),
  device       text check (device in ('mobile', 'tablet', 'desktop')),
  referer_host text,
  country      text
);

create index click_events_page_time_idx on public.click_events (page_id, occurred_at desc);
create index click_events_link_time_idx on public.click_events (link_id, occurred_at desc)
  where link_id is not null;

-- ----------------------------------------------- domínios próprios (futuro)
create table public.custom_domains (
  id         uuid primary key default gen_random_uuid(),
  page_id    uuid not null unique references public.pages(id) on delete cascade,
  domain     text not null unique,
  verified   boolean not null default false,
  created_at timestamptz not null default now()
);

-- ================================================== triggers e funções

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger pages_set_updated_at before update on public.pages
  for each row execute function public.set_updated_at();
create trigger links_set_updated_at before update on public.links
  for each row execute function public.set_updated_at();

-- cria perfil ao criar usuário (e-mail/senha traz handle no metadata; social não)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_handle text := lower(trim(new.raw_user_meta_data ->> 'handle'));
  v_name   text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
                            split_part(new.email, '@', 1), 'Usuário');
begin
  if v_handle is not null and v_handle <> '' then
    perform public.check_handle(v_handle);
    insert into public.profiles (id, handle, display_name)
    values (new.id, v_handle, v_name);
  else
    insert into public.profiles (id, handle, handle_temporary, display_name)
    values (new.id, 'usuario-' || substr(md5(new.id::text), 1, 8), true, v_name);
  end if;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- limite de páginas por plano
create or replace function public.enforce_page_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_max integer; v_count integer;
begin
  select p.max_pages into v_max
    from public.plans p join public.profiles pr on pr.plan_id = p.id
   where pr.id = new.owner_id;
  select count(*) into v_count from public.pages where owner_id = new.owner_id;
  if v_max >= 0 and v_count >= v_max then
    raise exception 'Limite de % página(s) atingido no seu plano. Fale com o administrador para fazer upgrade.', v_max;
  end if;
  return new;
end $$;

create trigger pages_limit_before_insert
  before insert on public.pages
  for each row execute function public.enforce_page_limit();

-- limite de links por página
create or replace function public.enforce_link_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_max integer; v_count integer;
begin
  select p.max_links_per_page into v_max
    from public.plans p
    join public.profiles pr on pr.plan_id = p.id
    join public.pages pg on pg.owner_id = pr.id
   where pg.id = new.page_id;
  select count(*) into v_count from public.links where page_id = new.page_id;
  if v_max >= 0 and v_count >= v_max then
    raise exception 'Seu plano permite % link(s) por página. Fale com o administrador para fazer upgrade.', v_max;
  end if;
  return new;
end $$;

create trigger links_limit_before_insert
  before insert on public.links
  for each row execute function public.enforce_link_limit();

create trigger links_limit_before_page_change
  before update of page_id on public.links
  for each row when (old.page_id is distinct from new.page_id)
  execute function public.enforce_link_limit();

-- handle único + minúsculas (INSERT e UPDATE)
create or replace function public.guard_handle()
returns trigger language plpgsql as $$
begin
  new.handle := lower(trim(new.handle));
  if new.handle_temporary then
    return new;                    -- provisório (login social): só unicidade do índice
  end if;
  if tg_op = 'UPDATE' and new.handle = old.handle then
    return new;                    -- mesmo valor: unicidade garantida pelo índice
  end if;
  perform public.check_handle(new.handle);
  return new;
end $$;

create trigger profiles_guard_handle
  before insert or update of handle on public.profiles
  for each row execute function public.guard_handle();

-- ================================================================== RPCs

create or replace function public.is_handle_available(h text)
returns boolean language sql security definer set search_path = public as $$
  select not exists (select 1 from public.profiles where handle = lower(trim(h)))
     and not public.is_handle_reserved(lower(trim(h)))
     and h ~ '^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$'
$$;

create or replace function public.reorder_links(p_page_id uuid, p_ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare
  v_updated integer;
  v_total   integer := coalesce(array_length(p_ids, 1), 0);
begin
  if not exists (select 1 from public.pages
                  where id = p_page_id and owner_id = auth.uid()) then
    raise exception 'Página não encontrada ou sem permissão.';
  end if;

  with upd as (
    update public.links l
       set position = u.ord
      from unnest(p_ids) with ordinality as u(id, ord)
     where l.id = u.id and l.page_id = p_page_id
    returning 1
  )
  select count(*) into v_updated from upd;

  if v_updated <> v_total then
    raise exception 'Não foi possível salvar a ordem dos links.';
  end if;
end $$;

-- administração (doc 14)
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

create or replace function public.admin_list_users()
returns table (
  id uuid, handle text, display_name text, email text, avatar_url text,
  plano text, status text, criado_em timestamptz, paginas bigint, cliques bigint
) language sql security definer set search_path = public as $$
  select p.id, p.handle, p.display_name, u.email, p.avatar_url,
         pl.code, p.status, p.created_at,
         (select count(*) from public.pages pg where pg.owner_id = p.id),
         (select count(*) from public.click_events e
            join public.pages pg2 on pg2.id = e.page_id
           where pg2.owner_id = p.id and e.kind = 'click')
    from public.profiles p
    join auth.users u on u.id = p.id
    join public.plans pl on pl.id = p.plan_id
   where public.is_admin()
   order by p.created_at desc
$$;

create or replace function public.admin_set_user_status(p_user uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Acesso restrito ao administrador.';
  end if;
  if p_status not in ('ativo', 'bloqueado') then
    raise exception 'Status inválido.';
  end if;
  update public.profiles set status = p_status where id = p_user;
  if not found then raise exception 'Usuário não encontrado.'; end if;
end $$;

create or replace function public.admin_assign_plan(p_user uuid, p_plan smallint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Acesso restrito ao administrador.';
  end if;
  if not exists (select 1 from public.plans where id = p_plan) then
    raise exception 'Plano não encontrado.';
  end if;
  update public.profiles set plan_id = p_plan where id = p_user;
  if not found then raise exception 'Usuário não encontrado.'; end if;
end $$;

-- métricas agregadas (doc 09)
create or replace function public.get_metrics(p_page_id uuid, p_from date, p_to date)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid;
  v_window integer;
  v_from date := p_from;
begin
  select owner_id into v_owner from public.pages where id = p_page_id;
  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'Página não encontrada.';
  end if;

  select case when p.metrics_days < 0 then null else p.metrics_days end
    into v_window
    from public.plans p join public.profiles pr on pr.plan_id = p.id
   where pr.id = auth.uid();

  if v_window is not null then
    v_from := greatest(p_from, current_date - make_interval(days => v_window));
  end if;

  return jsonb_build_object(
    'de', v_from, 'ate', p_to,
    'janela_dias', v_window,
    'totais', (
      select coalesce(jsonb_build_object(
        'views', count(*) filter (where e.kind = 'view'),
        'clicks', count(*) filter (where e.kind = 'click')), '{}'::jsonb)
      from public.click_events e
     where e.page_id = p_page_id
       and e.occurred_at >= v_from and e.occurred_at < p_to + 1),
    'por_dia', (
      select coalesce(jsonb_agg(row_to_json(d) order by d.dia), '[]'::jsonb)
      from (select e.occurred_at::date as dia,
                   count(*) filter (where e.kind = 'view')  as views,
                   count(*) filter (where e.kind = 'click') as clicks
              from public.click_events e
             where e.page_id = p_page_id
               and e.occurred_at >= v_from and e.occurred_at < p_to + 1
             group by 1) d),
    'por_link', (
      select coalesce(jsonb_agg(row_to_json(l) order by l.clicks desc), '[]'::jsonb)
      from (select e.link_id, li.title, li.icon, li.url,
                   count(*) as clicks
              from public.click_events e
              join public.links li on li.id = e.link_id
             where e.page_id = p_page_id and e.kind = 'click'
               and e.occurred_at >= v_from and e.occurred_at < p_to + 1
             group by 1, 2, 3, 4) l)
  );
end $$;

-- ==================================================================== RLS

alter table public.plans          enable row level security;
alter table public.profiles       enable row level security;
alter table public.themes         enable row level security;
alter table public.pages          enable row level security;
alter table public.links          enable row level security;
alter table public.click_events   enable row level security;
alter table public.custom_domains enable row level security;

create policy plans_leitura_publica on public.plans for select using (true);
create policy plans_admin on public.plans
  for all using (public.is_admin()) with check (public.is_admin());

create policy themes_leitura_publica on public.themes for select using (true);

create policy profiles_leitura_publica on public.profiles for select using (true);
create policy profiles_update_dono on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy profiles_admin_update on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

create policy pages_publicas on public.pages
  for select using (published = true);
create policy pages_dono on public.pages
  for all using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id and exists (
    select 1 from public.profiles pr where pr.id = auth.uid() and pr.status = 'ativo'));

create policy links_pagina_publica on public.links
  for select using (exists (select 1 from public.pages p
                             where p.id = page_id and p.published = true));
create policy links_dono on public.links
  for all using (exists (select 1 from public.pages p
                          where p.id = page_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.pages p
                       where p.id = page_id and p.owner_id = auth.uid())
              and exists (select 1 from public.profiles pr
                          where pr.id = auth.uid() and pr.status = 'ativo'));

-- sem policies de cliente: escrita só via service_role (Edge Function),
-- leitura só via RPC get_metrics (security definer)
alter table public.click_events force row level security;

create policy custom_domains_dono on public.custom_domains
  for all using (exists (select 1 from public.pages p
                          where p.id = page_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.pages p
                       where p.id = page_id and p.owner_id = auth.uid()));

-- ================================================================= Storage

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;

create policy avatars_leitura_publica on storage.objects
  for select using (bucket_id = 'avatars');

create policy avatars_write_dono on storage.objects
  for insert to authenticated with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.jwt()->>'sub')
  );

create policy avatars_update_dono on storage.objects
  for update to authenticated using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.jwt()->>'sub')
  );

create policy avatars_delete_dono on storage.objects
  for delete to authenticated using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.jwt()->>'sub')
  );
