import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BarChart3, Copy, ExternalLink, Eye, Plus, Settings2, Trash2,
} from 'lucide-react';
import type { Metricas, Pagina } from '@/types/domain';
import { criarPagina, listarMinhas, atualizarPagina, removerPagina } from '@/services/pages';
import { buscarMetricas } from '@/services/metrics';
import { siteUrl } from '@/lib/supabase';
import { diasAtrasIso, formatarNumero, hojeIso } from '@/lib/format';
import { traduzirErro } from '@/services/erros';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useSession } from '@/hooks/useSession';
import { Btn, Confirmar, Etiqueta, Osso, useToast, Vazio } from '@/components/ui';

export function urlPublica(p: Pick<Pagina, 'slug'>, handle: string): string {
  return p.slug ? `${siteUrl}/${handle}/${p.slug}` : `${siteUrl}/${handle}`;
}

function copiar(texto: string, avisar: (t: string, tipo?: 'ok' | 'erro' | 'info') => void) {
  void navigator.clipboard.writeText(texto)
    .then(() => avisar('Link copiado!'))
    .catch(() => avisar('Não foi possível copiar. Copie manualmente: ' + texto, 'erro'));
}

/* ----------------------------------------------------------- Dashboard */

export function Dashboard() {
  const { perfil } = useSession();
  const avisar = useToast();
  const [paginas, setPaginas] = useState<Pagina[] | null>(null);
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const lista = await listarMinhas();
      setPaginas(lista);
      if (lista[0]) setMetricas(await buscarMetricas(lista[0].id, diasAtrasIso(7), hojeIso()));
    } catch (e) {
      setErro(traduzirErro(e));
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  const principal = paginas?.[0] ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Olá, {perfil?.nome?.split(' ')[0]} 👋</h1>
        <p className="text-sm text-ink-500">Aqui está o resumo da sua página.</p>
      </div>

      {erro && <p className="rounded-xl bg-danger-500/10 px-4 py-3 text-sm text-danger-600">{erro}</p>}

      {!paginas && !erro && (
        <div className="grid gap-4"><Osso className="h-32" /><Osso className="h-24" /></div>
      )}

      {principal && (
        <section className="rounded-2xl bg-ink-900 p-6 text-white shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">{principal.titulo}</h2>
              <p className="text-sm text-white/60">mylink.com.br/{perfil?.handle}{principal.slug ? `/${principal.slug}` : ''}</p>
            </div>
            {principal.publicada ? <Etiqueta tom="ok">● Publicada</Etiqueta> : <Etiqueta tom="alerta">Rascunho</Etiqueta>}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to={`/painel/paginas/${principal.id}`} className="tap flex items-center rounded-xl bg-brand-500 px-4 text-sm font-semibold hover:bg-brand-600">
              <Settings2 size={16} className="mr-1.5" aria-hidden /> Abrir editor
            </Link>
            <a href={urlPublica(principal, perfil?.handle ?? '')} target="_blank" rel="noreferrer"
              className="tap flex items-center rounded-xl border border-white/30 px-4 text-sm font-semibold hover:bg-white/10">
              <ExternalLink size={16} className="mr-1.5" aria-hidden /> Ver página
            </a>
            <button onClick={() => copiar(urlPublica(principal, perfil?.handle ?? ''), avisar)}
              className="tap flex items-center rounded-xl border border-white/30 px-4 text-sm font-semibold hover:bg-white/10">
              <Copy size={16} className="mr-1.5" aria-hidden /> Copiar link
            </button>
          </div>
        </section>
      )}

      {paginas?.length === 0 && (
        <Vazio
          titulo="Crie sua primeira página"
          texto="Sua página fica no ar em uma URL única que é só sua."
          acao={<BotaoCriarPagina aposCriar={carregar} />}
        />
      )}

      {principal && (
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-card">
            <p className="text-sm text-ink-500">Visualizações (7 dias)</p>
            <p className="mt-1 text-3xl font-bold">{formatarNumero(metricas?.totais.views ?? 0)}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-card">
            <p className="text-sm text-ink-500">Cliques (7 dias)</p>
            <p className="mt-1 text-3xl font-bold">{formatarNumero(metricas?.totais.clicks ?? 0)}</p>
          </div>
          <Link to={`/painel/paginas/${principal.id}/metricas`}
            className="tap flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-300 p-5 text-sm font-semibold text-ink-700 hover:border-brand-500 hover:text-brand-600">
            <BarChart3 size={18} aria-hidden /> Ver todas as métricas
          </Link>
        </section>
      )}
    </div>
  );
}

/* -------------------------------------------------------- Minhas páginas */

export function BotaoCriarPagina({ aposCriar }: { aposCriar: () => Promise<void> | void }) {
  const avisar = useToast();
  const navegar = useNavigate();
  const [criando, setCriando] = useState(false);

  async function criar() {
    setCriando(true);
    try {
      const pagina = await criarPagina();
      await aposCriar();
      navegar(`/painel/paginas/${pagina.id}`);
    } catch (e) {
      avisar(traduzirErro(e), 'erro');
    } finally {
      setCriando(false);
    }
  }

  return <Btn onClick={() => void criar()} carregando={criando}><Plus size={16} aria-hidden />Nova página</Btn>;
}

export function MinhasPaginas() {
  const { perfil } = useSession();
  const avisar = useToast();
  const { ilimitadoPaginas } = usePlanLimits();
  const [paginas, setPaginas] = useState<Pagina[] | null>(null);
  const [excluindo, setExcluindo] = useState<Pagina | null>(null);

  const carregar = useCallback(async () => {
    try { setPaginas(await listarMinhas()); } catch (e) { avisar(traduzirErro(e), 'erro'); }
  }, [avisar]);

  useEffect(() => { void carregar(); }, [carregar]);

  const noLimite = !ilimitadoPaginas && (paginas?.length ?? 0) >= (perfil?.plano.maxPaginas ?? 1);

  async function alternarPublicacao(p: Pagina) {
    try {
      await atualizarPagina(p.id, { publicada: !p.publicada });
      await carregar();
      avisar(p.publicada ? 'Página despublicada.' : 'Página no ar!');
    } catch (e) { avisar(traduzirErro(e), 'erro'); }
  }

  async function excluir() {
    if (!excluindo) return;
    try {
      await removerPagina(excluindo.id);
      avisar('Página excluída.');
      setExcluindo(null);
      await carregar();
    } catch (e) { avisar(traduzirErro(e), 'erro'); }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Minhas páginas</h1>
          <p className="text-sm text-ink-500">
            {paginas ? `${paginas.length} de ${ilimitadoPaginas ? '∞' : perfil?.plano.maxPaginas} páginas` : '…'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {noLimite && (
            <span className="hidden text-xs font-medium text-ink-500 sm:block">
              Seu plano permite {perfil?.plano.maxPaginas} página(s). <Link to="/painel/configuracoes" className="text-brand-600">Fale com o administrador</Link>.
            </span>
          )}
          <BotaoCriarPagina aposCriar={carregar} />
        </div>
      </div>

      {!paginas && <Osso className="h-28" />}

      {paginas?.length === 0 && (
        <Vazio titulo="Nenhuma página ainda" texto="Crie sua primeira página e comece a compartilhar seus links."
          acao={<BotaoCriarPagina aposCriar={carregar} />} />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {paginas?.map((p) => (
          <article key={p.id} className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate font-bold">{p.titulo}</h2>
                <p className="truncate text-xs text-ink-500">mylink.com.br/{perfil?.handle}{p.slug ? `/${p.slug}` : ''}</p>
              </div>
              {p.publicada ? <Etiqueta tom="ok">● Publicada</Etiqueta> : <Etiqueta tom="alerta">Rascunho</Etiqueta>}
            </div>
            <div className="mt-auto flex flex-wrap gap-2">
              <Link to={`/painel/paginas/${p.id}`} className="tap flex items-center rounded-xl bg-brand-500 px-3 text-sm font-semibold text-white hover:bg-brand-600">
                Abrir editor
              </Link>
              <Link to={`/painel/paginas/${p.id}/metricas`} className="tap flex items-center rounded-xl border border-ink-900/15 px-3 text-sm font-semibold hover:bg-ink-900/5">
                <BarChart3 size={15} className="mr-1" aria-hidden /> Métricas
              </Link>
              <button onClick={() => copiar(urlPublica(p, perfil?.handle ?? ''), avisar)}
                className="tap flex items-center rounded-xl border border-ink-900/15 px-3 text-sm font-semibold hover:bg-ink-900/5">
                <Copy size={15} className="mr-1" aria-hidden /> Copiar
              </button>
              <button onClick={() => void alternarPublicacao(p)}
                className="tap flex items-center rounded-xl border border-ink-900/15 px-3 text-sm font-semibold hover:bg-ink-900/5">
                <Eye size={15} className="mr-1" aria-hidden /> {p.publicada ? 'Despublicar' : 'Publicar'}
              </button>
              <button onClick={() => setExcluindo(p)} aria-label={`Excluir ${p.titulo}`}
                className="tap ml-auto grid place-items-center rounded-xl p-2.5 text-danger-500 hover:bg-danger-500/10">
                <Trash2 size={17} aria-hidden />
              </button>
            </div>
          </article>
        ))}
      </div>

      <Confirmar
        aberto={Boolean(excluindo)}
        titulo="Excluir página"
        texto={`Tem certeza que deseja excluir "${excluindo?.titulo}"? Todos os links e métricas serão apagados.`}
        confirmar="Excluir" perigo
        aoCancelar={() => setExcluindo(null)}
        aoConfirmar={() => void excluir()}
      />
    </div>
  );
}
