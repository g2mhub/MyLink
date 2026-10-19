import { supabase } from '@/lib/supabase';
import type { Metricas } from '@/types/domain';

type MetricasBruta = {
  de: string; ate: string; janela_dias: number | null;
  totais: { views?: number; clicks?: number } | null;
  por_dia: { dia: string; views: number; clicks: number }[] | null;
  por_link: { link_id: string | null; titulo: string; icone: string; url: string; clicks: number }[] | null;
};

export async function buscarMetricas(pageId: string, de: string, ate: string): Promise<Metricas> {
  const { data, error } = await supabase.rpc('get_metrics', {
    p_page_id: pageId, p_from: de, p_to: ate,
  });
  if (error) throw error;
  const b = data as unknown as MetricasBruta;
  return {
    de: b.de, ate: b.ate, janelaDias: b.janela_dias,
    totais: { views: b.totais?.views ?? 0, clicks: b.totais?.clicks ?? 0 },
    porDia: b.por_dia ?? [],
    porLink: (b.por_link ?? []).map((l) => ({
      linkId: l.link_id, titulo: l.titulo, icone: l.icone, url: l.url, clicks: l.clicks,
    })),
  };
}
