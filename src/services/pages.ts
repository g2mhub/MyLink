import { supabase } from '@/lib/supabase';
import type { EstiloBotao, Layout, Pagina } from '@/types/domain';

type PaginaRow = {
  id: string; title: string; slug: string | null; published: boolean; theme_slug: string;
  layout: Layout; button_style: EstiloBotao; font_body: string; overrides: Record<string, unknown>;
};

function paraPagina(r: PaginaRow): Pagina {
  return {
    id: r.id, titulo: r.title, slug: r.slug, publicada: r.published, tema: r.theme_slug,
    layout: r.layout, botao: r.button_style, fonte: r.font_body, sobrescritas: r.overrides ?? {},
  };
}

const COLUNAS = 'id, title, slug, published, theme_slug, layout, button_style, font_body, overrides';

export async function listarMinhas(): Promise<Pagina[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sessão expirada.');
  const { data, error } = await supabase
    .from('pages').select(COLUNAS).eq('owner_id', user.id).order('position').order('created_at');
  if (error) throw error;
  return (data as unknown as PaginaRow[]).map(paraPagina);
}

export async function criarPagina(): Promise<Pagina> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sessão expirada.');
  const { data, error } = await supabase
    .from('pages')
    .insert({ owner_id: user.id, title: 'Minha página' })
    .select(COLUNAS).single();
  if (error) throw error;
  return paraPagina(data as unknown as PaginaRow);
}

export async function atualizarPagina(id: string, patch: Partial<{
  titulo: string; slug: string | null; publicada: boolean; tema: string;
  layout: Layout; botao: EstiloBotao; fonte: string; sobrescritas: Record<string, unknown>;
}>): Promise<void> {
  const corpo: Record<string, unknown> = {};
  if (patch.titulo !== undefined) corpo.title = patch.titulo;
  if (patch.slug !== undefined) corpo.slug = patch.slug;
  if (patch.publicada !== undefined) corpo.published = patch.publicada;
  if (patch.tema !== undefined) corpo.theme_slug = patch.tema;
  if (patch.layout !== undefined) corpo.layout = patch.layout;
  if (patch.botao !== undefined) corpo.botao = patch.botao;
  if (patch.fonte !== undefined) corpo.font_body = patch.fonte;
  if (patch.sobrescritas !== undefined) corpo.overrides = patch.sobrescritas;
  const { error } = await supabase.from('pages').update(corpo).eq('id', id);
  if (error) throw error;
}

export async function removerPagina(id: string): Promise<void> {
  const { error } = await supabase.from('pages').delete().eq('id', id);
  if (error) throw error;
}

/** Busca página publicada para a URL pública (perfil + página em uma consulta). */
export async function buscarPublica(handle: string, slug?: string): Promise<Pagina | null> {
  const { data: perfil } = await supabase
    .from('profiles').select('id').eq('handle', handle).single();
  if (!perfil) return null;
  let q = supabase.from('pages').select(COLUNAS).eq('owner_id', perfil.id).eq('published', true);
  q = slug ? q.eq('slug', slug) : q.is('slug', null);
  const { data, error } = await q.single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return paraPagina(data as unknown as PaginaRow);
}
