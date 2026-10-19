// Aplica migrações num projeto Supabase remoto e verifica que o RLS está ativo.
// Uso (a senha/vai só por variável de ambiente CONN, nunca no repositório):
//   CONN="postgresql://postgres:SENHA@host:5432/postgres" \
//   node remote-apply.mjs <arquivo1.sql> [arquivo2.sql ...]
import { readFileSync } from 'node:fs';
import pg from 'pg';

const conn = process.env.CONN;
if (!conn) {
  console.error('Variável CONN ausente.');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: conn,
  // certificado do Supabase em endpoints gerenciados (padrão da documentação deles)
  ssl: { rejectUnauthorized: false },
});

const arquivos = process.argv.slice(2);
// sem arquivos: modo verificação apenas

try {
  await client.connect();

  for (const arquivo of arquivos) {
    const sql = readFileSync(arquivo, 'utf8');
    await client.query(sql); // protocolo simples: falha => rollback do arquivo
    console.log(`OK  aplicado: ${arquivo}`);
  }

  // ---------- verificação: todo o banco público com RLS ----------
  const tabelas = await client.query(`
    select c.relname,
           c.relrowsecurity as rls,
           c.relforcerowsecurity as forca,
           (select count(*) from pg_policies p
             where p.schemaname = 'public' and p.tablename = c.relname) as policies
      from pg_class c
     where c.relnamespace = 'public'::regnamespace
       and c.relkind = 'r'
     order by c.relname
  `);

  console.log('\nTabelas públicas (RLS):');
  let falhas = 0;
  for (const t of tabelas.rows) {
    const ok = t.rls === true;
    if (!ok) falhas++;
    console.log(
      `  ${ok ? '✓' : '✗'} ${t.relname.padEnd(18)} rls=${t.rls} force=${t.forca} policies=${t.policies}`,
    );
  }

  const click = tabelas.rows.find((t) => t.relname === 'click_events');
  if (!click || click.rls !== true || click.forca !== true) {
    console.log('✗ click_events deveria ter RLS + FORCE (sem policies de cliente)');
    falhas++;
  }
  if (click && Number(click.policies) !== 0) {
    console.log('✗ click_events não deveria ter policies de cliente');
    falhas++;
  }

  const semPolicy = tabelas.rows.filter((t) => t.relname !== 'click_events' && Number(t.policies) === 0);
  if (semPolicy.length > 0) {
    console.log(`✗ tabelas sem policy: ${semPolicy.map((t) => t.relname).join(', ')}`);
    falhas += semPolicy.length;
  }

  // seeds
  const plano = await client.query('select count(*)::int as n from public.plans');
  const temas = await client.query('select count(*)::int as n from public.themes');
  console.log(`\nSeed: plans=${plano.rows[0].n} (esperado 2), themes=${temas.rows[0].n} (esperado 6)`);
  if (plano.rows[0].n !== 2 || temas.rows[0].n !== 6) falhas++;

  // prova behavioural: como anon, LEITURA pública funciona e ESCRITA é barrada
  await client.query(`
    do $$
    begin
      perform set_config('request.jwt.claim.sub', '', false);
      set role anon;
      perform (select count(*) from public.pages);
      perform (select count(*) from public.profiles);
      perform (select count(*) from public.links);
      perform (select count(*) from public.plans);
      perform (select count(*) from public.themes);
      reset role;
      raise notice 'RLS anon OK — leitura pública permitida';
    end $$;
  `).catch((e) => { throw new Error(`leitura anon falhou (policy/grant): ${e.message}`); });

  await client.query(`
    do $$
    begin
      perform set_config('request.jwt.claim.sub', '', false);
      set role anon;
      begin
        insert into public.pages (owner_id, title)
        values (gen_random_uuid(), 'x');
        raise exception 'FALHA: escrita anon aceita';
      exception when others then
        if sqlerrm like 'FALHA%' then raise; end if;
        if sqlerrm not like '%row-level security policy%' then raise; end if;
      end;
      reset role;
      raise notice 'RLS anon OK — escrita bloqueada por policy';
    end $$;
  `).catch((e) => { throw new Error(`prova anon falhou: ${e.message}`); });

  console.log(falhas === 0 ? '\nVERIFICACAO OK — todo o banco público com RLS' : `\nVERIFICACAO COM ${falhas} FALHA(S)`);
  process.exit(falhas === 0 ? 0 : 1);
} catch (e) {
  console.error('ERRO:', e.message);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
