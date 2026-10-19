import { supabaseConfigurado } from '@/lib/supabase';

// Tracking best-effort (doc 04 §5): métrica nunca bloqueia a navegação.

const FUNCAO = () => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-click`;

async function chamarTrack(corpo: Record<string, string>): Promise<{ ok: boolean; url?: string }> {
  if (!supabaseConfigurado) return { ok: false };
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 800);
    const resposta = await fetch(FUNCAO(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
      },
      body: JSON.stringify(corpo),
      signal: ctrl.signal,
      keepalive: true,
    });
    clearTimeout(timer);
    if (!resposta.ok) return { ok: false };
    return (await resposta.json()) as { ok: boolean; url?: string };
  } catch {
    return { ok: false };
  }
}

export function registrarPageview(pageId: string): void {
  void chamarTrack({ acao: 'view', paginaId: pageId });
}

export async function registrarClique(linkId: string): Promise<string | null> {
  const r = await chamarTrack({ acao: 'click', linkId });
  return r.ok && r.url ? r.url : null;
}
