import { supabase } from '@/lib/supabase';
import type { Tema, TemasTokens } from '@/types/domain';

type TemaRow = { slug: string; name: string; is_dark: boolean; tokens: TemasTokens };

function paraTema(r: TemaRow): Tema {
  return { slug: r.slug, nome: r.name, isDark: r.is_dark, tokens: r.tokens };
}

export async function listarTemas(): Promise<Tema[]> {
  const { data, error } = await supabase.from('themes').select('slug, name, is_dark, tokens').order('position');
  if (error) throw error;
  return (data as unknown as TemaRow[]).map(paraTema);
}

/** Mescla tokens do tema com sobrescritas do usuário (doc 07 §5). */
export function tokensFinais(tema: Tema | undefined, sobrescritas: TemasTokens): TemasTokens {
  return { ...(tema?.tokens ?? {}), ...sobrescritas };
}
