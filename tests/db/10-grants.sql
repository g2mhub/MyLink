-- Grants equivalentes ao ambiente Supabase (após migrações)
grant all on all tables in schema public to anon, authenticated, service_role;
grant usage on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;
grant all on storage.objects, storage.buckets to anon, authenticated, service_role;
