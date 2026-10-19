-- Stubs mínimos para validar o schema do Mylink num PostgreSQL padrão.
-- Em produção estes objetos existem no Supabase (auth.*, storage.*, papéis).
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end $$;

create schema if not exists auth;
create schema if not exists storage;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema storage to anon, authenticated, service_role;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select on auth.users to anon, authenticated, service_role;

create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

-- espelha o Supabase: claims JSON quando presente; caso contrário deriva do claim sub
create or replace function auth.jwt() returns jsonb
language sql stable as $$
  select case
    when nullif(current_setting('request.jwt.claims', true), '') is not null
      then current_setting('request.jwt.claims', true)::jsonb
    when nullif(current_setting('request.jwt.claim.sub', true), '') is not null
      then jsonb_build_object('sub', current_setting('request.jwt.claim.sub', true))
    else '{}'::jsonb end
$$;

create table if not exists storage.buckets (
  id text primary key,
  name text,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text not null,
  owner uuid,
  created_at timestamptz not null default now(),
  metadata jsonb
);
alter table storage.objects enable row level security;

create or replace function storage.foldername(_name text) returns text[]
language sql immutable as $$
  select (string_to_array(_name, '/'))[1 : array_length(string_to_array(_name, '/'), 1) - 1]
$$;
