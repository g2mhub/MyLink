# 03 · Banco de Dados (Supabase / PostgreSQL)

Schema completo aplicado via migrações em `supabase/migrations/`. Tabelas: `plans`, `profiles`, `themes`, `pages`, `links`, `click_events`, `custom_domains` (futura).

## 1. Tipos e extensões

```sql
-- 0001_plans_profiles.sql
create extension if not exists pgcrypto;

create type public.layout_kind   as enum ('lista', 'grade', 'cards');
create type public.button_kind   as enum ('solido', 'contorno', 'sombra');
create type public.event_kind    as enum ('view', 'click');

create table public.plans (
  id                smallint generated always as identity primary key,
  code              text not null unique check (code in ('free', 'pro')),
  name              text not null,                       -- 'Gratuito', 'Pro'
  max_pages         integer not null,                    -- -1 = ilimitado
  max_links_per_page integer not null,                   -- -1 = ilimitado
  metrics_days      integer not null,                    -- janela de dados; -1 = tudo
  custom_domain     boolean not null default false,
  price_monthly_cents integer not null default 0,        -- R$ em centavos; usado só quando houver cobrança
  created_at        timestamptz not null default now()
);

-- Lista de handles reservados (espelha src/lib/urls.ts)
create or replace function public.is_handle_reserved(h text)
returns boolean language sql immutable as $$
  select h = any(array[
    'app','api','admin','auth','painel','entrar','cadastro','sair','logout',
    'recuperar','redefinir','onboarding','assets','static','favicon','robots',
    'sobre','ajuda','termos','privacidade','contato','suporte','blog',
    'mylink','www','mailto','metricas','config','preview','404','null','undefined'
  ])
$$;

create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  handle        text not null unique
                  check (handle ~ '^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$'),
  handle_temporary boolean not null default false,       -- true = precisa escolher handle (login Google)
  display_name  text not null check (char_length(display_name) between 1 and 50),
  bio           text not null default '' check (char_length(bio) <= 300),
  avatar_url    text,
  plan_id       smallint not null default 1 references public.plans(id),
  plan_valid_until timestamptz,                          -- reserva p/ cobrança futura
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Handle reservado é barrado na aplicação (trigger) para manter o CHECK regex simples;
-- validação central: função única usada por trigger e pela RPC de disponibilidade
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
```

## 2. Temas, páginas e links

```sql
-- 0002_themes_pages_links.sql
create table public.themes (
  slug        text primary key,                          -- 'aurora', 'meia-noite'…
  name        text not null,                             -- 'Aurora'
  is_dark     boolean not null default false,
  tokens      jsonb not null,                            -- ver seção 6
  position    smallint not null default 0,
  created_at  timestamptz not null default now()
);

create table public.pages (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 60),
  slug        text check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$'),  -- null = página principal (servida em /{handle})
  theme_slug  text not null default 'aurora' references public.themes(slug),
  layout      public.layout_kind  not null default 'lista',
  button_style public.button_kind not null default 'solido',
  font_body   text not null default 'inter',             -- 'inter' | 'jakarta' | 'sora' | 'nunito'
  overrides   jsonb not null default '{}'::jsonb,        -- {background, surface, text, accent, radius?}
  published   boolean not null default false,
  position    smallint not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint pages_slug_unico_por_dono unique (owner_id, slug)
  -- página principal é identificada por slug IS NULL
);

create index pages_owner_idx on public.pages (owner_id, position);

create table public.links (
  id          uuid primary key default gen_random_uuid(),
  page_id     uuid not null references public.pages(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 80),
  url         text not null check (url ~* '^(https?://|mailto:|tel:)'),
  icon        text not null default 'link',              -- slug do mapa de ícones (doc 08 §5)
  highlighted boolean not null default false,
  enabled     boolean not null default true,
  position    smallint not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index links_page_position_idx on public.links (page_id, position);
```

> Nota: a "página principal" é simplesmente a página de `slug IS NULL`, servida em `/{handle}`; as demais, em `/{handle}/{slug}`.

## 3. Métricas (eventos brutos)

```sql
-- 0003_click_events.sql
create table public.click_events (
  id           bigint generated always as identity primary key,
  page_id      uuid not null references public.pages(id) on delete cascade,
  link_id      uuid references public.links(id) on delete set null,  -- null = pageview
  kind         public.event_kind not null default 'click',
  occurred_at  timestamptz not null default now(),
  device       text check (device in ('mobile', 'tablet', 'desktop')),
  referer_host text,
  country      text                                                            -- fase futura (IP → país)
);

create index click_events_page_time_idx  on public.click_events (page_id, occurred_at desc);
create index click_events_link_time_idx  on public.click_events (link_id, occurred_at desc)
  where link_id is not null;
-- agregação diária fica na RPC get_metrics (doc 09); sem tabela de rollup na fase 1
```

```sql
-- 0003b_custom_domains.sql (futuro — modelado, sem UI)
create table public.custom_domains (
  id          uuid primary key default gen_random_uuid(),
  page_id     uuid not null unique references public.pages(id) on delete cascade,
  domain      text not null unique,
  verified    boolean not null default false,
  created_at  timestamptz not null default now()
);
```

## 4. Triggers e funções

```sql
-- 0006_functions_triggers.sql

-- 4.1 updated_at automático (aplicar em profiles, pages, links)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- 4.2 Criação de perfil ao criar usuário (e-mail/senha traz handle no metadata; Google não)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_handle text := lower(trim(new.raw_user_meta_data ->> 'handle'));
  v_name   text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
                            split_part(new.email, '@', 1));
begin
  if v_handle is not null and v_handle <> '' then
    perform public.check_handle(v_handle);               -- pode falhar o cadastro se ocupado/reservado
    insert into public.profiles (id, handle, display_name)
    values (new.id, v_handle, v_name);
  else
    -- login social: handle provisório; onboarding força a escolha
    insert into public.profiles (id, handle, handle_temporary, display_name)
    values (new.id, 'usuario-' || substr(md5(new.id::text), 1, 8), true, v_name);
  end if;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4.3 Limite de páginas por plano (antes de INSERT)
create or replace function public.enforce_page_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_max integer; v_count integer;
begin
  select p.max_pages into v_max
    from public.plans p join public.profiles pr on pr.plan_id = p.id
   where pr.id = new.owner_id;
  select count(*) into v_count from public.pages where owner_id = new.owner_id;
  if v_max >= 0 and v_count >= v_max then
    raise exception 'Limite de % página(s) atingido no seu plano. Faça upgrade para criar mais.', v_max;
  end if;
  return new;
end $$;

create trigger pages_limit_before_insert
  before insert on public.pages
  for each row execute function public.enforce_page_limit();

-- 4.4 Limite de links por página (INSERT ou troca de página)
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
    raise exception 'Limite de % link(s) por página atingido no seu plano.', v_max;
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

-- 4.5 Handle único + minúsculas (INSERT e UPDATE de handle)
-- OLD não existe em INSERT: a função distingue operação antes de ler OLD.
create or replace function public.guard_handle()
returns trigger language plpgsql as $$
begin
  new.handle := lower(trim(new.handle));
  if new.handle_temporary then
    return new;                                   -- handle provisório (login social): só unicidade do índice
  end if;
  if tg_op = 'UPDATE' and new.handle = old.handle then
    return new;                                   -- mesmo valor: unicidade já garantida pelo índice UNIQUE
  end if;
  perform public.check_handle(new.handle);
  return new;
end $$;

create trigger profiles_guard_handle
  before insert or update of handle on public.profiles
  for each row execute function public.guard_handle();
```

## 5. RPCs (funções chamáveis pelo cliente)

```sql
-- Disponibilidade de handle (debounce do formulário de cadastro)
create or replace function public.is_handle_available(h text)
returns boolean language sql security definer set search_path = public as $$
  select not exists (select 1 from public.profiles where handle = lower(trim(h)))
     and not public.is_handle_reserved(lower(trim(h)))
     and h ~ '^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$'
$$;

-- Reordenar links em lote (drag-and-drop) — atomicamente (qualquer descompasso
-- lança exceção e desfaz a transação inteira), só pelo dono
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
    raise exception 'Não foi possível salvar a ordem dos links.';  -- rollback automático
  end if;
end $$;

-- Métricas agregadas (doc 09): dono vê apenas o que é seu, respeitando a janela do plano
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

  if v_window is not null then   -- -1 (Pro) = sem recorte; Free = últimos 30 dias
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
       and e.occurred_at >= v_from and e.occurred_at < p_to + 1),  -- predicates sargáveis
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
```

## 6. Row Level Security (RLS)

Princípio: **anônimo lê apenas conteúdo publicado; dono lê e escreve o que é seu; ninguém escreve métrica pelo cliente.**

```sql
-- 0004_rls.sql
alter table public.plans         enable row level security;
alter table public.profiles      enable row level security;
alter table public.themes        enable row level security;
alter table public.pages         enable row level security;
alter table public.links         enable row level security;
alter table public.click_events  enable row level security;
alter table public.custom_domains enable row level security;

-- plans e themes: leitura pública (necessário para UI de upgrade e temas)
create policy plans_leitura_publica on public.plans for select using (true);
create policy themes_leitura_publica on public.themes for select using (true);

-- profiles: leitura pública (a página pública precisa de handle/nome/bio/avatar);
-- a tabela NUNCA contém e-mail — e-mail fica só em auth.users.
create policy profiles_leitura_publica on public.profiles for select using (true);
create policy profiles_update_dono on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
-- (INSERT/DELETE de profiles: apenas pelo trigger security definer / cascade)

-- pages
create policy pages_publicas on public.pages
  for select using (published = true);                    -- visitante vê só publicadas
create policy pages_dono on public.pages
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- links
create policy links_pagina_publica on public.links
  for select using (exists (select 1 from public.pages p
                             where p.id = page_id and p.published = true));
create policy links_dono on public.links
  for all using (exists (select 1 from public.pages p
                          where p.id = page_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.pages p
                       where p.id = page_id and p.owner_id = auth.uid()));

-- click_events: sem policies de cliente => nenhum cliente lê ou escreve.
-- Escrita: Edge Function com service_role. Leitura: RPC get_metrics (security definer).
alter table public.click_events force row level security;

-- custom_domains: dono da página (futuro)
create policy custom_domains_dono on public.custom_domains
  for all using (exists (select 1 from public.pages p
                          where p.id = page_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.pages p
                       where p.id = page_id and p.owner_id = auth.uid()));
```

**Verificação obrigatória (doc 12):** com a anon key, confirmar que `select` em `pages` não publicadas retorna vazio, `click_events` devolve erro/linha nenhuma, e `auth.users` é inacessível.

## 7. Storage (avatar)

```sql
-- 0005_storage.sql
-- MIME e tamanho máximo são configuração do BUCKET (não da policy):
-- imagem ≤ 2 MB e apenas webp/png/jpeg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152,
        array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;

-- leitura pública
create policy avatars_leitura_publica on storage.objects
  for select using (bucket_id = 'avatars');

-- escrita: apenas o próprio usuário, apenas na pasta = seu uid
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
```

Convensão de caminho: `avatars/{auth.uid()}/avatar.webp` (sobrescrito a cada troca; versionar por timestamp se cache incomodar: `avatar-{unix}.webp`).

## 8. Seed (`supabase/seed.sql`)

**Planos:**

| code | nome | max_pages | max_links_per_page | metrics_days | custom_domain | preço |
|---|---|---|---|---|---|---|
| `free` | Gratuito | 1 | 5 | 30 | false | R$ 0 |
| `pro` | Pro | -1 (ilimitado) | -1 (ilimitado) | -1 (histórico todo) | true | R$ 19,90/mês (referência; sem cobrança nesta fase) |

**Temas** (`tokens` JSONB — chaves: `background`, `backgroundGradient`, `surface`, `text`, `textMuted`, `accent`, `accentText`, `radius`, `buttonShadow`):

| slug | nome | estilo |
|---|---|---|
| `aurora` | Aurora | fundo violeta→rosa, cards translúcidos, claro (padrão) |
| `meia-noite` | Meia-noite | preto + neon ciano, escuro |
| `minimalista` | Minimalista | branco, texto preto, sem sombras |
| `praia` | Praia | areia/verde-mar, cantos arredondados |
| `neon` | Neon | preto + magenta, bordas brilhantes |
| `cafe` | Café | tons de marrom/off-white, aconchegante |

## 9. Acessos e operação

| Acesso | Uso |
|---|---|
| `anon` (chave pública) | SPA em produção — todo acesso passa pelo RLS |
| `authenticated` | Usuário logado |
| `service_role` | **só** na Edge Function `track-click` (segredo no Supabase) |
| Postgres | Dashboard Supabase para migrações/administração (sem UI admin própria nesta fase) |

**Rotina:** `npm run db:types` após cada migração; `pg_dump` semanal manual enquanto no plano Free (sem backup automático).
