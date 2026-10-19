import { supabase } from '@/lib/supabase';
import type { Link } from '@/types/domain';

type LinkRow = {
  id: string; page_id: string; title: string; url: string; icon: string;
  highlighted: boolean; enabled: boolean; position: number;
};

function paraLink(r: LinkRow): Link {
  return {
    id: r.id, paginaId: r.page_id, titulo: r.title, url: r.url, icone: r.icon,
    destaque: r.highlighted, ativo: r.enabled, posicao: r.position,
  };
}

const COLUNAS = 'id, page_id, title, url, icon, highlighted, enabled, position';

export async function listarLinks(pageId: string, apenasAtivos = false): Promise<Link[]> {
  let q = supabase.from('links').select(COLUNAS).eq('page_id', pageId).order('position');
  if (apenasAtivos) q = q.eq('enabled', true);
  const { data, error } = await q;
  if (error) throw error;
  return (data as unknown as LinkRow[]).map(paraLink);
}

export async function criarLink(pageId: string, dados: {
  titulo: string; url: string; icone: string; destaque: boolean;
}): Promise<Link> {
  const { data, error } = await supabase
    .from('links')
    .insert({
      page_id: pageId, title: dados.titulo, url: dados.url,
      icon: dados.icone, highlighted: dados.destaque,
      position: 1000, // renumera depois via reordenar()
    })
    .select(COLUNAS).single();
  if (error) throw error;
  return paraLink(data as unknown as LinkRow);
}

export async function atualizarLink(id: string, patch: Partial<{
  titulo: string; url: string; icone: string; destaque: boolean; ativo: boolean;
}>): Promise<void> {
  const corpo: Record<string, unknown> = {};
  if (patch.titulo !== undefined) corpo.title = patch.titulo;
  if (patch.url !== undefined) corpo.url = patch.url;
  if (patch.icone !== undefined) corpo.icon = patch.icone;
  if (patch.destaque !== undefined) corpo.highlighted = patch.destaque;
  if (patch.ativo !== undefined) corpo.enabled = patch.ativo;
  const { error } = await supabase.from('links').update(corpo).eq('id', id);
  if (error) throw error;
}

export async function removerLink(id: string): Promise<void> {
  const { error } = await supabase.from('links').delete().eq('id', id);
  if (error) throw error;
}

/** Reordena atomicamente no banco (RPC reorder_links, doc 03 §5). */
export async function reordenarLinks(pageId: string, idsOrdenados: string[]): Promise<void> {
  const { error } = await supabase.rpc('reorder_links', {
    p_page_id: pageId,
    p_ids: idsOrdenados,
  });
  if (error) throw error;
}
