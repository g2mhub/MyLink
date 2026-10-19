import { useCallback, useEffect, useState } from 'react';
import { Link as RLink, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Lock } from 'lucide-react';
import type { Metricas as MetricasTipo, Pagina } from '@/types/domain';
import { listarMinhas } from '@/services/pages';
import { buscarMetricas } from '@/services/metrics';
import { baixarCsv, diasAtrasIso, formatarNumero, hojeIso } from '@/lib/format';
import { iconeDe } from '@/components/icons';
import { traduzirErro } from '@/services/erros';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { Btn, Etiqueta, Osso, useToast, Vazio } from '@/components/ui';

const PERIODOS: { dias: number; rotulo: string; pro?: boolean }[] = [
  { dias: 7, rotulo: '7 dias' },
  { dias: 30, rotulo: '30 dias' },
  { dias: 90, rotulo: '90 dias', pro: true },
];

export function MetricasTela() {
  const { id } = useParams<{ id: string }>();
  const avisar = useToast();
  const { ehPro } = usePlanLimits();
  const [pagina, setPagina] = useState<Pagina | null>(null);
  const [periodo, setPeriodo] = useState(7);
  const [metricas, setMetricas] = useState<MetricasTipo | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    if (!id) return;
    setCarregando(true);
    try {
      if (!pagina) {
        const lista = await listarMinhas();
        setPagina(lista.find((p) => p.id === id) ?? null);
      }
      setMetricas(await buscarMetricas(id, diasAtrasIso(periodo), hojeIso()));
    } catch (e) {
      avisar(traduzirErro(e), 'erro');
    } finally {
      setCarregando(false);
    }
  }, [id, periodo, pagina, avisar]);

  useEffect(() => { void carregar(); }, [carregar]);

  const maxDia = Math.max(1, ...(metricas?.porDia ?? []).map((d) => Math.max(d.views, d.clicks)));
  const ctr = metricas && metricas.totais.views > 0
    ? Math.round((metricas.totais.clicks / metricas.totais.views) * 100)
    : null;

  function exportarCsv() {
    if (!metricas || !pagina) return;
    const linhas: (string | number)[][] = [
      ['Mylink — métricas da página', pagina.titulo],
      ['Período', `${metricas.de} a ${metricas.ate}`],
      [],
      ['Data', 'Visualizações', 'Cliques'],
      ...metricas.porDia.map((d) => [d.dia, d.views, d.clicks]),
      [],
      ['Link', 'URL', 'Cliques'],
      ...metricas.porLink.map((l) => [l.titulo, l.url, l.clicks]),
    ];
    baixarCsv(`metricas-${pagina.slug ?? 'pagina'}-${metricas.de}-${metricas.ate}.csv`, linhas);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <RLink to="/painel/paginas" className="tap grid place-items-center rounded-xl border border-ink-900/15 bg-white" aria-label="Voltar">
          <ArrowLeft size={18} aria-hidden />
        </RLink>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">Métricas — {pagina?.titulo ?? '…'}</h1>
          <p className="text-xs text-ink-500">Visualizações e cliques da sua página pública.</p>
        </div>
        <Btn variante="secundario" onClick={exportarCsv} disabled={!metricas}>
          <Download size={16} aria-hidden /> Baixar CSV
        </Btn>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Período">
        {PERIODOS.map(({ dias, rotulo, pro }) => {
          const bloqueado = pro && !ehPro;
          return (
            <button key={dias} disabled={bloqueado} onClick={() => setPeriodo(dias)}
              className={`tap flex items-center gap-1.5 rounded-xl px-4 text-sm font-semibold ${
                periodo === dias ? 'bg-ink-900 text-white' : 'bg-white text-ink-700 hover:bg-ink-900/5'
              } ${bloqueado ? 'opacity-60' : ''}`}
              title={bloqueado ? 'Disponível no plano Pro' : undefined}>
              {bloqueado && <Lock size={13} aria-hidden />} {rotulo}
            </button>
          );
        })}
      </div>

      {carregando && <Osso className="h-64" />}

      {!carregando && metricas && (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-white p-5 shadow-card">
              <p className="text-sm text-ink-500">Visualizações</p>
              <p className="mt-1 text-3xl font-bold">{formatarNumero(metricas.totais.views)}</p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-card">
              <p className="text-sm text-ink-500">Cliques</p>
              <p className="mt-1 text-3xl font-bold">{formatarNumero(metricas.totais.clicks)}</p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-card">
              <p className="text-sm text-ink-500">Taxa de cliques</p>
              <p className="mt-1 text-3xl font-bold">{ctr === null ? '—' : `${ctr}%`}</p>
            </div>
          </section>

          {metricas.janelaDias !== null && (
            <Etiqueta tom="alerta">Dados disponíveis dos últimos {metricas.janelaDias} dias no seu plano</Etiqueta>
          )}

          <section className="rounded-2xl bg-white p-6 shadow-card">
            <h2 className="text-sm font-semibold text-ink-500">Por dia</h2>
            {metricas.porDia.length === 0 ? (
              <Vazio titulo="Sem dados neste período" texto="Quando alguém visitar sua página, os números aparecem aqui." />
            ) : (
              <>
                <div className="mt-4 flex h-40 items-end gap-1.5" role="img"
                  aria-label={`Gráfico de visualizações e cliques dos últimos ${periodo} dias`}>
                  {metricas.porDia.map((d) => (
                    <div key={d.dia} className="flex flex-1 flex-col items-center gap-1" title={`${d.dia}: ${d.views} views, ${d.clicks} cliques`}>
                      <div className="flex w-full items-end justify-center gap-0.5" style={{ height: '100%' }}>
                        <div className="w-1/2 rounded-t bg-brand-500/40" style={{ height: `${(d.views / maxDia) * 100}%` }} aria-hidden />
                        <div className="w-1/2 rounded-t bg-brand-500" style={{ height: `${(d.clicks / maxDia) * 100}%` }} aria-hidden />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-ink-500">
                  <span>{metricas.porDia[0]?.dia}</span>
                  <span className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-brand-500/40" />views</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-brand-500" />cliques</span>
                  </span>
                  <span>{metricas.porDia.at(-1)?.dia}</span>
                </div>
              </>
            )}
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-card">
            <h2 className="text-sm font-semibold text-ink-500">Cliques por link</h2>
            {metricas.porLink.length === 0 ? (
              <p className="mt-3 text-sm text-ink-500">Nenhum clique no período.</p>
            ) : (
              <ul className="mt-4 flex flex-col divide-y divide-ink-900/5">
                {metricas.porLink.map((l) => {
                  const Icone = iconeDe(l.icone);
                  const pct = metricas.totais.clicks > 0 ? Math.round((l.clicks / metricas.totais.clicks) * 100) : 0;
                  return (
                    <li key={l.linkId ?? l.url} className="flex items-center gap-3 py-3">
                      <Icone size={18} className="shrink-0 text-ink-700" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{l.titulo}</p>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink-900/5">
                          <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} aria-hidden />
                        </div>
                      </div>
                      <span className="text-sm font-bold">{formatarNumero(l.clicks)}</span>
                      <span className="w-10 text-right text-xs text-ink-500">{pct}%</span>
                      <a href={l.url} target="_blank" rel="noreferrer nofollow"
                        className="tap flex items-center rounded-lg border border-ink-900/15 px-2 text-xs font-semibold hover:bg-ink-900/5">
                        Abrir
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
