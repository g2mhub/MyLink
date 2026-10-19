import { supabase } from '@/lib/supabase';
import type { Plano, UsuarioAdmin } from '@/types/domain';
import { paraPlano } from '@/services/profiles';

type UsuarioAdminRow = {
  id: string; handle: string; display_name: string; email: string; avatar_url: string | null;
  plano: string; status: 'ativo' | 'bloqueado'; criado_em: string; paginas: number; cliques: number;
};

export async function listarUsuarios(): Promise<UsuarioAdmin[]> {
  const { data, error } = await supabase.rpc('admin_list_users');
  if (error) throw error;
  return (data as unknown as UsuarioAdminRow[]).map((r) => ({
    id: r.id, handle: r.handle, displayName: r.display_name, email: r.email,
    avatarUrl: r.avatar_url, plano: r.plano, status: r.status, criadoEm: r.criado_em,
    paginas: Number(r.paginas), cliques: Number(r.cliques),
  }));
}

export async function definirStatus(userId: string, status: 'ativo' | 'bloqueado'): Promise<void> {
  const { error } = await supabase.rpc('admin_set_user_status', { p_user: userId, p_status: status });
  if (error) throw error;
}

export async function atribuirPlano(userId: string, planId: number): Promise<void> {
  const { error } = await supabase.rpc('admin_assign_plan', { p_user: userId, p_plan: planId });
  if (error) throw error;
}

export async function listarPlanos(): Promise<Plano[]> {
  const { data, error } = await supabase.from('plans').select('*').order('id');
  if (error) throw error;
  return (data as unknown as Parameters<typeof paraPlano>[0][]).map(paraPlano);
}

export type PlanoDados = {
  code: string; name: string; max_pages: number; max_links_per_page: number;
  metrics_days: number; custom_domain: boolean; price_monthly_cents: number;
};

export async function criarPlano(dados: PlanoDados): Promise<void> {
  const { error } = await supabase.from('plans').insert(dados);
  if (error) throw error;
}

export async function atualizarPlano(id: number, patch: Partial<PlanoDados>): Promise<void> {
  const { error } = await supabase.from('plans').update(patch).eq('id', id);
  if (error) throw error;
}

export async function removerPlano(id: number): Promise<void> {
  const { error } = await supabase.from('plans').delete().eq('id', id);
  if (error) throw error;
}
