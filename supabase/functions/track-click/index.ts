// Supabase Edge Function: track-click
// Grava pageviews e cliques com service_role; devolve o url validado do link.
// Deploy: supabase functions deploy track-click

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const BOT_RE = /bot|crawl|spider|slurp|preview|lighthouse|headless|python|curl|wget/i;

// rate limit por IP (melhor esforço; isolamentos são efêmeros)
const buckets = new Map<string, { count: number; reset: number }>();
function allowed(ip: string): boolean {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || now > b.reset) {
    buckets.set(ip, { count: 1, reset: now + 60_000 });
    return true;
  }
  b.count += 1;
  return b.count <= 120;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, erro: 'Método não permitido.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'desconhecido';
  if (!allowed(ip)) {
    return new Response(JSON.stringify({ ok: false, erro: 'Muitas requisições.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const ua = req.headers.get('user-agent') ?? '';
  const referer = req.headers.get('referer');

  let body: { acao?: string; paginaId?: string; linkId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, erro: 'Corpo inválido.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const { acao, paginaId, linkId } = body;
  if (acao !== 'view' && acao !== 'click') return json({ ok: false, erro: 'Ação inválida.' }, 400);
  if (acao === 'view' && !paginaId) return json({ ok: false, erro: 'paginaId obrigatório.' }, 400);
  if (acao === 'click' && !linkId) return json({ ok: false, erro: 'linkId obrigatório.' }, 400);

  // bot: responde ok sem gravar
  if (BOT_RE.test(ua)) return json({ ok: true });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const device = /mobile|android|iphone|ipad/i.test(ua) ? 'mobile'
    : /ipad|tablet/i.test(ua) ? 'tablet' : 'desktop';
  const refererHost = referer ? (() => { try { return new URL(referer).host; } catch { return null; } })() : null;

  if (acao === 'click') {
    const { data: link, error } = await admin
      .from('links').select('id, url, page_id, pages!inner(id, published)')
      .eq('id', linkId).eq('enabled', true).single();
    if (error || !link || !(link as unknown as { pages: { published: boolean } }).pages.published) {
      return json({ ok: false, erro: 'Link não encontrado.' }, 404);
    }
    const { error: insErr } = await admin.from('click_events').insert({
      page_id: (link as { page_id: string }).page_id,
      link_id: linkId,
      kind: 'click',
      device,
      referer_host: refererHost,
    });
    if (insErr) console.error('track-click insert', insErr.message);
    return json({ ok: true, url: (link as { url: string }).url });
  }

  // view: valida página publicada
  const { data: page } = await admin.from('pages').select('id, published').eq('id', paginaId).single();
  if (!page || !page.published) return json({ ok: false, erro: 'Página não encontrada.' }, 404);
  const { error: insErr } = await admin.from('click_events').insert({
    page_id: paginaId,
    link_id: null,
    kind: 'view',
    device,
    referer_host: refererHost,
  });
  if (insErr) console.error('track-click insert view', insErr.message);
  return json({ ok: true });
});
