import { supabase } from '@/lib/supabase';
import type { Perfil, Plano } from '@/types/domain';

type PlanoRow = {
  id: number; code: string; name: string; max_pages: number; max_links_per_page: number;
  metrics_days: number; custom_domain: boolean; price_monthly_cents: number;
};

type PerfilRow = {
  id: string; handle: string; handle_temporary: boolean; display_name: string;
  bio: string; avatar_url: string | null; role: 'user' | 'admin'; status: 'ativo' | 'bloqueado';
  plans: PlanoRow;
};

export function paraPlano(r: PlanoRow): Plano {
  return {
    id: r.id, codigo: r.code, nome: r.name, maxPaginas: r.max_pages,
    maxLinksPorPagina: r.max_links_per_page, janelaMetricasDias: r.metrics_days,
    dominioProprio: r.custom_domain, precoMensalCentavos: r.price_monthly_cents,
  };
}

function paraPerfil(r: PerfilRow): Perfil {
  return {
    id: r.id, handle: r.handle, handleTemporario: r.handle_temporary,
    nome: r.display_name, bio: r.bio, avatarUrl: r.avatar_url,
    papel: r.role, status: r.status, plano: paraPlano(r.plans),
  };
}

const COLUNAS = 'id, handle, handle_temporary, display_name, bio, avatar_url, role, status, plans(*)';

export async function buscarMeuPerfil(): Promise<Perfil | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from('profiles').select(COLUNAS).eq('id', user.id).single();
  if (error) throw error;
  return paraPerfil(data as unknown as PerfilRow);
}

export async function buscarPorHandle(handle: string): Promise<Perfil | null> {
  const { data, error } = await supabase.from('profiles').select(COLUNAS).eq('handle', handle).single();
  if (error) {
    if (error.code === 'PGRST116') return null; // nenhuma linha
    throw error;
  }
  return paraPerfil(data as unknown as PerfilRow);
}

export async function atualizarPerfil(patch: {
  nome?: string; bio?: string; handle?: string; avatarUrl?: string;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sessão expirada. Entre novamente.');
  const corpo: Record<string, unknown> = {};
  if (patch.nome !== undefined) corpo.display_name = patch.nome;
  if (patch.bio !== undefined) corpo.bio = patch.bio;
  if (patch.handle !== undefined) corpo.handle = patch.handle;
  if (patch.avatarUrl !== undefined) corpo.avatar_url = patch.avatarUrl;
  const { error } = await supabase.from('profiles').update(corpo).eq('id', user.id);
  if (error) throw error;
}

/** Redimensiona no cliente (WebP 512×512, ≤100 KB) e envia para avatars/{uid}/. */
export async function enviarAvatar(arquivo: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sessão expirada. Entre novamente.');

  const bitmap = await criarQuadradoWebp(arquivo);
  const caminho = `${user.id}/avatar-${Date.now()}.webp`;
  const { error } = await supabase.storage.from('avatars').upload(caminho, bitmap, {
    contentType: 'image/webp',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('avatars').getPublicUrl(caminho);
  return data.publicUrl;
}

async function criarQuadradoWebp(arquivo: File): Promise<Blob> {
  const img = await carregarImagem(arquivo);
  const lado = Math.min(img.width, img.height);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, 512, 512);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível processar a imagem.'))), 'image/webp', 0.82);
  });
}

function carregarImagem(arquivo: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Arquivo de imagem inválido.')); };
    img.src = url;
  });
}
