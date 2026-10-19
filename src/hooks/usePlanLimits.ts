import { useSession } from '@/hooks/useSession';

/** Limites do plano com flags prontas para a UI (doc 10 §2). */
export function usePlanLimits() {
  const { perfil } = useSession();
  const plano = perfil?.plano;

  return {
    plano,
    ilimitadoPaginas: (plano?.maxPaginas ?? -1) < 0,
    ilimitadoLinks: (plano?.maxLinksPorPagina ?? 1) < 0,
    ehPro: plano?.codigo === 'pro',
  };
}

export function limiteAtingido(atual: number, maximo: number): boolean {
  return maximo >= 0 && atual >= maximo;
}
